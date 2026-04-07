import { bot } from "../botInstance.js";
import { supabase } from "../supabase.js";
import { starToInt } from "./reviewFetcher.js";
import type { GmbReview } from "./reviewFetcher.js";

const OPS_CHAT_ID = process.env.OPS_TELEGRAM_CHAT_ID;

function starsEmoji(rating: number): string {
  return "⭐".repeat(rating);
}

// ── Manual tier: send review + reply to the client ──────────────────────────

export async function notifyClientManualTier(
  chatId: string,
  logId: string,
  review: GmbReview,
  generatedReply: string,
  businessName: string
): Promise<void> {
  const rating = starToInt(review.starRating);

  await bot.api.sendMessage(
    chatId,
    `📝 *Nueva reseña para ${businessName}*\n\n` +
      `${starsEmoji(rating)} (${rating}/5) — ${review.reviewer.displayName}\n` +
      `_"${review.comment.slice(0, 300)}${review.comment.length > 300 ? "…" : ""}"_\n\n` +
      `💬 *Respuesta sugerida:*\n${generatedReply}\n\n` +
      `Copia la respuesta y pégala en Google Maps.`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📋 Copiar respuesta", callback_data: `copy_reply:${logId}` },
            { text: "🔄 Regenerar", callback_data: `regen_reply:${logId}` },
          ],
        ],
      },
    }
  );
}

// ── Manager tier: send review + reply to ops group ──────────────────────────

export async function notifyOpsManagerTier(
  logId: string,
  review: GmbReview,
  generatedReply: string,
  businessName: string
): Promise<void> {
  if (!OPS_CHAT_ID) {
    console.warn("[notifications] OPS_TELEGRAM_CHAT_ID not set, skipping ops notification");
    return;
  }

  const rating = starToInt(review.starRating);

  await bot.api.sendMessage(
    OPS_CHAT_ID,
    `🔔 *Nueva reseña — ${businessName}*\n\n` +
      `${starsEmoji(rating)} (${rating}/5) — ${review.reviewer.displayName}\n` +
      `_"${review.comment.slice(0, 300)}${review.comment.length > 300 ? "…" : ""}"_\n\n` +
      `💬 *Respuesta generada:*\n${generatedReply}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Marcado como publicado", callback_data: `ops_posted:${logId}` },
            { text: "🔄 Regenerar", callback_data: `ops_regen:${logId}` },
          ],
        ],
      },
    }
  );
}

// ── Manager tier: lighter notification to client ────────────────────────────

export async function notifyClientManagerTier(
  chatId: string,
  review: GmbReview,
  businessName: string
): Promise<void> {
  const rating = starToInt(review.starRating);

  await bot.api.sendMessage(
    chatId,
    `🔔 *Nueva reseña detectada — ${businessName}*\n\n` +
      `${starsEmoji(rating)} (${rating}/5) — ${review.reviewer.displayName}\n` +
      `_"${review.comment.slice(0, 200)}${review.comment.length > 200 ? "…" : ""}"_\n\n` +
      `Nuestro equipo se encargará de responderla.`,
    { parse_mode: "Markdown" }
  );
}

// ── Helper: resolve Telegram chatId from user_id ────────────────────────────

export async function getChatIdForUser(userId: string): Promise<string | null> {
  const { data: link } = await supabase
    .from("telegram_links")
    .select("telegram_user_id")
    .eq("user_id", userId)
    .single();

  return link?.telegram_user_id ? String(link.telegram_user_id) : null;
}
