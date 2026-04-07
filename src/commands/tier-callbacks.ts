import type { Bot, Context } from "grammy";
import { supabase } from "../supabase.js";
import { generateReply } from "../services/replyGenerator.js";
import type { GmbReview } from "../services/reviewFetcher.js";
import { intToStar } from "../services/reviewFetcher.js";

async function getLogWithPersona(logId: string) {
  const { data: log } = await supabase
    .from("reply_logs")
    .select("*, businesses(id, name, personas(*))")
    .eq("id", logId)
    .single();
  return log;
}

function buildReviewFromLog(log: {
  review_text: string;
  review_rating: number;
  review_author: string | null;
}): GmbReview {
  return {
    reviewId: "regen",
    reviewer: { displayName: log.review_author ?? "Cliente", isAnonymous: false },
    starRating: intToStar(log.review_rating),
    comment: log.review_text,
    createTime: new Date().toISOString(),
    reviewReply: null,
  };
}

export function registerTierCallbacks(bot: Bot): void {
  // Copy reply — sends as plain text for easy copying
  bot.callbackQuery(/^copy_reply:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const logId = ctx.match![1];

    const { data: log } = await supabase
      .from("reply_logs")
      .select("generated_reply")
      .eq("id", logId)
      .single();

    if (!log?.generated_reply) {
      await ctx.reply("No encontré la respuesta.");
      return;
    }

    await ctx.reply(log.generated_reply);
  });

  // Regenerate reply — generates a new reply with the same persona
  bot.callbackQuery(/^regen_reply:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("Regenerando...").catch(() => {});
    const logId = ctx.match![1];

    const log = await getLogWithPersona(logId);
    if (!log?.businesses?.personas) {
      await ctx.reply("No pude regenerar — configuración no encontrada.");
      return;
    }

    const persona = Array.isArray(log.businesses.personas)
      ? log.businesses.personas[0]
      : log.businesses.personas;

    const review = buildReviewFromLog(log);
    const personaForGenerator = {
      id: "regen",
      businessId: log.businesses.id,
      tone: persona.tone,
      goodInstructions: persona.good_instructions,
      mediumInstructions: persona.medium_instructions,
      badInstructions: persona.bad_instructions,
      language: persona.language,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const newReply = await generateReply(
        review,
        log.businesses.name,
        personaForGenerator,
        log.review_language
      );

      await supabase
        .from("reply_logs")
        .update({ generated_reply: newReply })
        .eq("id", logId);

      await ctx.reply(
        `🔄 *Respuesta regenerada:*\n\n${newReply}`,
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
    } catch {
      await ctx.reply("Error al regenerar la respuesta. Intenta de nuevo.");
    }
  });

  // Ops: mark as posted
  bot.callbackQuery(/^ops_posted:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("Marcado como publicado").catch(() => {});
    const logId = ctx.match![1];

    const opsUser = ctx.from?.first_name ?? ctx.from?.username ?? "ops";

    await supabase
      .from("reply_logs")
      .update({
        status: "POSTED",
        posted_at: new Date().toISOString(),
        ops_posted_by: opsUser,
      })
      .eq("id", logId);

    await ctx.editMessageReplyMarkup({
      reply_markup: {
        inline_keyboard: [
          [{ text: `✅ Publicado por ${opsUser}`, callback_data: "noop" }],
        ],
      },
    }).catch(() => {});
  });

  // Ops: regenerate
  bot.callbackQuery(/^ops_regen:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("Regenerando...").catch(() => {});
    const logId = ctx.match![1];

    const log = await getLogWithPersona(logId);
    if (!log?.businesses?.personas) {
      await ctx.reply("No pude regenerar — configuración no encontrada.");
      return;
    }

    const persona = Array.isArray(log.businesses.personas)
      ? log.businesses.personas[0]
      : log.businesses.personas;

    const review = buildReviewFromLog(log);
    const personaForGenerator = {
      id: "regen",
      businessId: log.businesses.id,
      tone: persona.tone,
      goodInstructions: persona.good_instructions,
      mediumInstructions: persona.medium_instructions,
      badInstructions: persona.bad_instructions,
      language: persona.language,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const newReply = await generateReply(
        review,
        log.businesses.name,
        personaForGenerator,
        log.review_language
      );

      await supabase
        .from("reply_logs")
        .update({ generated_reply: newReply })
        .eq("id", logId);

      await ctx.reply(
        `🔄 *Respuesta regenerada para ${log.businesses.name}:*\n\n${newReply}`,
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
    } catch {
      await ctx.reply("Error al regenerar la respuesta.");
    }
  });

  // Noop callback for disabled buttons
  bot.callbackQuery("noop", async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
  });
}
