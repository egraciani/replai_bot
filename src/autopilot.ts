import cron from "node-cron";
import { supabase } from "./supabase.js";
import { fetchNewReviews, starToInt } from "./services/reviewFetcher.js";
import { postReply } from "./services/replyPoster.js";
import { detectLanguage } from "./services/languageDetector.js";
import { generateReply, generateSummaryInsights } from "./services/replyGenerator.js";
import { decrypt } from "./encryption.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Persona {
  tone: string;
  good_instructions: string;
  medium_instructions: string;
  bad_instructions: string;
  language: string;
}

interface Business {
  id: string;
  user_id: string;
  name: string;
  google_account_id: string | null;
  google_location_id: string | null;
  autopilot_enabled: boolean;
  last_checked_at: string | null;
  timezone: string;
  summary_time: string;
  personas: Persona | null;
}

// ── Poll cycle ────────────────────────────────────────────────────────────────

async function processReviewsForBusiness(business: Business): Promise<void> {
  if (!business.personas) {
    console.log(`[autopilot] Skipping ${business.name} — no persona configured`);
    return;
  }

  const persona = business.personas;

  // Get access token — only needed for real GMB; mock skips this
  let accessToken: string | null = null;
  if (process.env.REPLY_SERVICE === "gmb") {
    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("access_token")
      .eq("user_id", business.user_id)
      .single();

    if (tokenRow?.access_token) {
      try {
        accessToken = decrypt(tokenRow.access_token);
      } catch (err) {
        console.error(`[autopilot] Failed to decrypt token for ${business.name}:`, err);
        return;
      }
    }
  }

  // Build a Business-like object for the review fetcher (uses snake_case GMB fields)
  const fetcherBusiness = {
    id: business.id,
    name: business.name,
    gmbAccountId: business.google_account_id ?? "",
    gmbLocationId: business.google_location_id ?? "",
    lastCheckedAt: business.last_checked_at ? new Date(business.last_checked_at) : null,
  } as Parameters<typeof fetchNewReviews>[0];

  let reviews;
  try {
    reviews = await fetchNewReviews(fetcherBusiness, accessToken);
  } catch (err) {
    console.error(`[autopilot] Failed to fetch reviews for ${business.name}:`, err);
    return;
  }

  console.log(`[autopilot] ${business.name}: ${reviews.length} new review(s)`);

  for (const review of reviews) {
    if (review.reviewReply) continue;

    // Dedup guard
    const { data: existing } = await supabase
      .from("reply_logs")
      .select("id")
      .eq("review_id", review.reviewId)
      .maybeSingle();
    if (existing) continue;

    const rating = starToInt(review.starRating);
    const language = detectLanguage(review.comment, persona.language);

    // Map persona to the shape generateReply expects (camelCase)
    const personaForGenerator = {
      id: "autopilot",
      businessId: business.id,
      tone: persona.tone,
      goodInstructions: persona.good_instructions,
      mediumInstructions: persona.medium_instructions,
      badInstructions: persona.bad_instructions,
      language: persona.language,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create pending log entry
    const { data: logEntry, error: insertErr } = await supabase
      .from("reply_logs")
      .insert({
        business_id: business.id,
        review_id: review.reviewId,
        review_text: review.comment,
        review_rating: rating,
        review_language: language,
        generated_reply: "",
        status: "PENDING",
      })
      .select("id")
      .single();

    if (insertErr || !logEntry) {
      console.error(`[autopilot] Failed to create log entry for review ${review.reviewId}:`, insertErr);
      continue;
    }

    let replyText: string;
    try {
      replyText = await generateReply(review, business.name, personaForGenerator, language);
    } catch (err) {
      await supabase
        .from("reply_logs")
        .update({ status: "FAILED", error: String(err) })
        .eq("id", logEntry.id);
      console.error(`[autopilot] Reply generation failed for review ${review.reviewId}:`, err);
      continue;
    }

    // Post with retry (exponential backoff: 2s, 4s, 8s)
    let posted = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await postReply(fetcherBusiness as Parameters<typeof postReply>[0], review.reviewId, replyText, accessToken);
        posted = true;
        break;
      } catch (err) {
        if (attempt < 2) {
          await sleep(2 ** (attempt + 1) * 1000);
        } else {
          await supabase
            .from("reply_logs")
            .update({ generated_reply: replyText, status: "FAILED", error: String(err) })
            .eq("id", logEntry.id);
          console.error(`[autopilot] Failed to post reply for review ${review.reviewId}:`, err);

          if (String(err).includes("401")) {
            await notifyTokenExpired(business);
          }
        }
      }
    }

    if (posted) {
      await supabase
        .from("reply_logs")
        .update({ generated_reply: replyText, status: "POSTED", posted_at: new Date().toISOString() })
        .eq("id", logEntry.id);
    }
  }

  // Update last_checked_at after all reviews are processed
  await supabase
    .from("businesses")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", business.id);
}

async function notifyTokenExpired(business: Business): Promise<void> {
  const { data: link } = await supabase
    .from("telegram_links")
    .select("telegram_user_id")
    .eq("user_id", business.user_id)
    .single();

  if (!link?.telegram_user_id) return;

  const { bot } = await import("./botInstance.js");
  await bot.api.sendMessage(
    String(link.telegram_user_id),
    `⚠️ Perdí acceso a tu cuenta de Google para *${business.name}*.\n\nPor favor, reconecta tu cuenta en replai.app para que el piloto automático siga funcionando.`,
    { parse_mode: "Markdown" }
  );
}

export async function runPollCycle(): Promise<void> {
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("*, personas(*)")
    .eq("autopilot_enabled", true);

  if (error) {
    console.error("[autopilot] Failed to fetch businesses:", error);
    return;
  }

  await Promise.allSettled((businesses ?? []).map(processReviewsForBusiness));
}

// ── Daily summary ─────────────────────────────────────────────────────────────

export async function sendDailySummary(business: Business): Promise<void> {
  if (!business.personas) return;

  const { data: link } = await supabase
    .from("telegram_links")
    .select("telegram_user_id")
    .eq("user_id", business.user_id)
    .single();

  if (!link?.telegram_user_id) return;

  const { bot } = await import("./botInstance.js");
  const chatId = String(link.telegram_user_id);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: logs } = await supabase
    .from("reply_logs")
    .select("status, review_rating, review_text, generated_reply")
    .eq("business_id", business.id)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (!logs?.length) {
    await bot.api.sendMessage(
      chatId,
      `📊 *${business.name}* — sin nuevas reseñas en las últimas 24h.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const posted = logs.filter((l) => l.status === "POSTED").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;
  const byRating: Record<number, number> = {};
  for (const log of logs) {
    byRating[log.review_rating] = (byRating[log.review_rating] ?? 0) + 1;
  }

  const ratingLine = [5, 4, 3, 2, 1]
    .filter((r) => byRating[r])
    .map((r) => `${byRating[r]} × ${"⭐".repeat(r)}`)
    .join("  |  ");

  const insights = await generateSummaryInsights(
    logs.map((l) => ({ reviewText: l.review_text, reviewRating: l.review_rating })),
    business.name
  );

  const positiveLines = insights.positive.map((p) => `  • ${p}`).join("\n");
  const negativeLine = insights.negative ? `\n⚠️ *Queja recurrente:* ${insights.negative}` : "";
  const failedLine = failed > 0 ? `\n⚠️ ${failed} respuesta(s) fallida(s) — revisa /status` : "";

  const msg =
    `📊 *Resumen de ayer — ${business.name}*\n\n` +
    `⭐ Nuevas reseñas: ${logs.length}\n  ${ratingLine}\n` +
    `📝 Respondidas automáticamente: ${posted}${failedLine}\n\n` +
    `💡 *Lo que mencionan tus clientes:*\n${positiveLines}${negativeLine}`;

  await bot.api.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

export function startAutopilot(): void {
  cron.schedule("*/15 * * * *", async () => {
    console.log("[autopilot] Running poll cycle...");
    await runPollCycle();
  });

  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const { data: businesses } = await supabase
      .from("businesses")
      .select("*, personas(*)")
      .eq("autopilot_enabled", true)
      .eq("summary_time", hhmm);

    for (const business of businesses ?? []) {
      await sendDailySummary(business).catch((err) =>
        console.error(`[autopilot] Summary failed for ${business.name}:`, err)
      );
    }
  });

  console.log("🤖 Autopilot started — polling every 15 min, summaries at configured times");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
