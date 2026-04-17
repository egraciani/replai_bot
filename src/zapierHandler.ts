import { bot } from "./botInstance.js";
import { supabase } from "./supabase.js";
import { generateReply } from "./services/replyGenerator.js";
import { detectLanguage } from "./services/languageDetector.js";
import type { GmbReview } from "./services/reviewFetcher.js";

const STAR_MAP: Record<string, GmbReview["starRating"]> = {
  ONE: "ONE", TWO: "TWO", THREE: "THREE", FOUR: "FOUR", FIVE: "FIVE",
};

const STAR_TO_INT: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

interface ZapierPayload {
  reviewId: string;
  starRating: string;
  comment?: string;
  reviewer?: { displayName?: string };
  createTime?: string;
}

export async function handleZapierReview(
  body: unknown,
  secret: string
): Promise<{ ok: boolean; message: string; reply?: string }> {

  // 1. Validar secret
  if (secret !== (process.env.ZAPIER_WEBHOOK_SECRET ?? "")) {
    console.warn("[zapier] Unauthorized request — invalid secret");
    return { ok: false, message: "unauthorized" };
  }

  const p = body as ZapierPayload;
  const reviewId = p.reviewId;
  const starRating = (STAR_MAP[p.starRating] ?? "THREE") as GmbReview["starRating"];
  const rating = STAR_TO_INT[p.starRating] ?? 3;
  const reviewText = p.comment ?? "";
  const author = p.reviewer?.displayName ?? "Cliente";

  console.log(`[zapier] Incoming review reviewId=${reviewId} starRating=${p.starRating} author=${author}`);

  // 2. Buscar negocio Wuolah con autopilot activo
  const { data: business } = await supabase
    .from("businesses")
    .select("*, personas(*)")
    .ilike("name", "%wuolah%")
    .eq("autopilot_enabled", true)
    .maybeSingle();

  if (!business) {
    console.log("[zapier] No Wuolah business with autopilot enabled");
    return { ok: false, message: "no active business" };
  }

  // 3. Dedup — si ya está procesada, devolver la reply guardada (idempotente)
  const { data: existing } = await supabase
    .from("reply_logs")
    .select("id, generated_reply")
    .eq("review_id", reviewId)
    .maybeSingle();

  if (existing) {
    console.log(`[zapier] Review ${reviewId} already processed → returning cached reply`);
    return { ok: true, message: "already processed", reply: existing.generated_reply };
  }

  // 4. Construir GmbReview + detectar idioma
  const review: GmbReview = {
    reviewId,
    reviewer: { displayName: author, isAnonymous: !author || author === "Cliente" },
    starRating,
    comment: reviewText,
    createTime: p.createTime ?? new Date().toISOString(),
    reviewReply: null,
  };

  const personaRow = Array.isArray(business.personas) ? business.personas[0] ?? null : null;
  const personaLanguage = personaRow?.language ?? "es";
  const language = detectLanguage(reviewText, personaLanguage);

  // 5. Generar reply con la persona del negocio
  const persona = personaRow
    ? {
        tone: personaRow.tone,
        goodInstructions: personaRow.good_instructions,
        mediumInstructions: personaRow.medium_instructions,
        badInstructions: personaRow.bad_instructions,
        language: personaRow.language,
      }
    : {
        tone: "warm",
        goodInstructions: "Thank the customer warmly and invite them back.",
        mediumInstructions: "Acknowledge their feedback and offer to improve.",
        badInstructions: "Apologize sincerely and offer to resolve the issue.",
        language: "es",
      };

  const generatedReply = await generateReply(review, business.name, persona, language);

  // 6. Insertar en reply_logs — Zapier publicará en GMB en el siguiente step del Zap
  await supabase.from("reply_logs").insert({
    business_id: business.id,
    review_id: reviewId,
    review_text: reviewText,
    review_rating: rating,
    review_language: language,
    review_author: author,
    generated_reply: generatedReply,
    status: "POSTED",
    posted_at: new Date().toISOString(),
  });

  // 7. Notificar a TODOS los usuarios que hayan hecho onboarding con Wuolah
  //    (cada usuario que identifica Wuolah crea su propio business row)
  const { data: wuolahBusinesses } = await supabase
    .from("businesses")
    .select("user_id")
    .ilike("name", "%wuolah%");

  const userIds = (wuolahBusinesses ?? []).map((b: { user_id: string }) => b.user_id);

  const { data: links } = await supabase
    .from("telegram_links")
    .select("telegram_user_id")
    .in("user_id", userIds);

  const stars = "⭐".repeat(rating);
  const msg =
    `${stars} *Nueva reseña de ${author}*\n\n` +
    `_"${reviewText}"_\n\n` +
    `✅ *Respuesta publicada automáticamente:*\n` +
    `_"${generatedReply}"_`;

  for (const link of links ?? []) {
    await bot.api
      .sendMessage(String(link.telegram_user_id), msg, { parse_mode: "Markdown" })
      .catch((e) => console.error("[zapier] sendMessage error:", e.message));
  }

  console.log(`[zapier] Processed review ${reviewId} for ${business.name} → reply generated and Telegram notified`);
  return { ok: true, message: "processed", reply: generatedReply };
}
