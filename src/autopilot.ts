import "dotenv/config";
import cron from "node-cron";
import { prisma } from "./db.js";
import { fetchNewReviews, starToInt } from "./services/reviewFetcher.js";
import { postReply } from "./services/replyPoster.js";
import { detectLanguage } from "./services/languageDetector.js";
import { generateReply, generateSummaryInsights } from "./services/replyGenerator.js";
import type { Business, Persona } from "@prisma/client";

// ── Poll cycle ────────────────────────────────────────────────────────────────

async function processReviewsForBusiness(
  business: Business & { persona: Persona | null }
): Promise<void> {
  if (!business.persona) {
    console.log(`[autopilot] Skipping ${business.name} — no persona configured`);
    return;
  }

  const token = await prisma.oAuthToken.findUnique({
    where: { userId: business.userId },
  });

  let reviews;
  try {
    reviews = await fetchNewReviews(business, token?.accessToken ?? null);
  } catch (err) {
    console.error(`[autopilot] Failed to fetch reviews for ${business.name}:`, err);
    return;
  }

  console.log(`[autopilot] ${business.name}: ${reviews.length} new review(s)`);

  for (const review of reviews) {
    // Skip already-replied reviews from GMB
    if (review.reviewReply) continue;

    // Dedup guard — skip if already in our log
    const existing = await prisma.replyLog.findUnique({
      where: { reviewId: review.reviewId },
    });
    if (existing) continue;

    const rating = starToInt(review.starRating);
    const language = detectLanguage(review.comment, business.persona.language);

    // Create pending log entry
    const logEntry = await prisma.replyLog.create({
      data: {
        businessId: business.id,
        reviewId: review.reviewId,
        reviewText: review.comment,
        reviewRating: rating,
        reviewLanguage: language,
        generatedReply: "",
        status: "PENDING",
      },
    });

    let replyText: string;
    try {
      replyText = await generateReply(review, business.name, business.persona, language);
    } catch (err) {
      await prisma.replyLog.update({
        where: { id: logEntry.id },
        data: { status: "FAILED", error: String(err) },
      });
      console.error(`[autopilot] Reply generation failed for review ${review.reviewId}:`, err);
      continue;
    }

    // Post with retry (exponential backoff: 2s, 4s, 8s)
    let posted = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await postReply(business, review.reviewId, replyText, token?.accessToken ?? null);
        posted = true;
        break;
      } catch (err) {
        if (attempt < 2) {
          await sleep(2 ** (attempt + 1) * 1000);
        } else {
          await prisma.replyLog.update({
            where: { id: logEntry.id },
            data: {
              generatedReply: replyText,
              status: "FAILED",
              error: String(err),
            },
          });
          console.error(`[autopilot] Failed to post reply for review ${review.reviewId}:`, err);

          // Notify user if token is expired
          if (String(err).includes("401")) {
            await notifyTokenExpired(business);
          }
        }
      }
    }

    if (posted) {
      await prisma.replyLog.update({
        where: { id: logEntry.id },
        data: {
          generatedReply: replyText,
          status: "POSTED",
          postedAt: new Date(),
        },
      });
    }
  }

  // Update lastCheckedAt only after all reviews are processed
  await prisma.business.update({
    where: { id: business.id },
    data: { lastCheckedAt: new Date() },
  });
}

async function notifyTokenExpired(business: Business): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: business.userId } });
  if (!user?.telegramChatId) return;

  // Import bot lazily to avoid circular deps
  const { bot } = await import("./botInstance.js");
  await bot.api.sendMessage(
    user.telegramChatId,
    `⚠️ Perdí acceso a tu cuenta de Google para *${business.name}*.\n\nPor favor, reconecta tu cuenta en replai.app para que el piloto automático siga funcionando.`,
    { parse_mode: "Markdown" }
  );
}

export async function runPollCycle(): Promise<void> {
  const businesses = await prisma.business.findMany({
    where: { autopilotEnabled: true },
    include: { persona: true },
  });

  await Promise.allSettled(businesses.map(processReviewsForBusiness));
}

// ── Daily summary ─────────────────────────────────────────────────────────────

export async function sendDailySummary(business: Business & { persona: Persona | null }): Promise<void> {
  if (!business.persona) return;

  const { bot } = await import("./botInstance.js");
  const user = await prisma.user.findUnique({ where: { id: business.userId } });
  if (!user?.telegramChatId) return;

  const since = new Date();
  since.setHours(since.getHours() - 24);

  const logs = await prisma.replyLog.findMany({
    where: { businessId: business.id, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  if (!logs.length) {
    await bot.api.sendMessage(
      user.telegramChatId,
      `📊 *${business.name}* — sin nuevas reseñas en las últimas 24h.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const posted = logs.filter((l) => l.status === "POSTED").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;
  const byRating: Record<number, number> = {};
  for (const log of logs) {
    byRating[log.reviewRating] = (byRating[log.reviewRating] ?? 0) + 1;
  }

  const ratingLine = [5, 4, 3, 2, 1]
    .filter((r) => byRating[r])
    .map((r) => `${byRating[r]} × ${"⭐".repeat(r)}`)
    .join("  |  ");

  const insights = await generateSummaryInsights(
    logs.map((l) => ({ reviewText: l.reviewText, reviewRating: l.reviewRating })),
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

  await bot.api.sendMessage(user.telegramChatId, msg, { parse_mode: "Markdown" });
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

export function startAutopilot(): void {
  // Poll for new reviews every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[autopilot] Running poll cycle...");
    await runPollCycle();
  });

  // Check every minute if any business is due for a daily summary
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const businesses = await prisma.business.findMany({
      where: { autopilotEnabled: true, summaryTime: hhmm },
      include: { persona: true },
    });

    for (const business of businesses) {
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
