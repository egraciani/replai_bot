import { Bot, InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { supabase } from "../supabase.js";
import { requireUser } from "../middleware/auth.js";
import { generateReviewResponse } from "../claude.js";
import { getState, setState, resetState } from "../conversation.js";

export function registerGenerateHandlers(bot: Bot) {
  // Generate response
  bot.callbackQuery(/^gen:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Generando respuesta..." }).catch(() => {});
    const reviewId = ctx.match![1];
    await handleGenerate(ctx, reviewId);
  });

  // Approve response
  bot.callbackQuery(/^apr:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const responseId = ctx.match![1];
    await handleApprove(ctx, responseId);
  });

  // Reject response
  bot.callbackQuery(/^rej:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const responseId = ctx.match![1];
    await handleReject(ctx, responseId);
  });

  // Edit response
  bot.callbackQuery(/^edt:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const responseId = ctx.match![1];
    await handleEditStart(ctx, responseId);
  });
}

async function handleGenerate(ctx: Context, reviewId: string) {
  const user = await requireUser(ctx);
  if (!user) return;

  // Check quota
  const { data: canGenerate } = await supabase.rpc("can_generate_response", {
    p_user_id: user.userId,
  });

  if (!canGenerate) {
    await ctx.reply(
      "Has alcanzado el límite de respuestas de tu plan.\n\n" +
        "Actualiza tu plan en autoreplai.com/plan"
    );
    return;
  }

  // Fetch review + business info
  const { data: review, error } = await supabase
    .from("reviews")
    .select(
      "id, author_name, rating, review_text, businesses(name, location_name)"
    )
    .eq("id", reviewId)
    .single();

  if (error || !review) {
    await ctx.reply("No se encontró la reseña.");
    return;
  }

  const biz = (review as any).businesses;
  const businessName = biz?.location_name || biz?.name || "Negocio";

  await ctx.reply("⏳ Generando respuesta...");

  try {
    const result = await generateReviewResponse(
      review.review_text || "",
      review.author_name,
      review.rating,
      businessName
    );

    // Save to DB (increment_responses_used trigger fires on insert)
    const { data: response, error: insertError } = await supabase
      .from("responses")
      .insert({
        review_id: reviewId,
        generated_text: result.text,
        status: "pending",
        model_used: result.model,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
      })
      .select("id")
      .single();

    if (insertError || !response) {
      console.error("Response insert error:", insertError);
      await ctx.reply("Error al guardar la respuesta. Inténtalo de nuevo.");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("✅ Aprobar", `apr:${response.id}`)
      .text("✏️ Editar", `edt:${response.id}`)
      .text("❌ Rechazar", `rej:${response.id}`);

    await ctx.reply(
      `📝 *Respuesta generada:*\n\n${result.text}`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  } catch (err) {
    console.error("generateReviewResponse error:", err);
    await ctx.reply("Error al generar la respuesta. Inténtalo de nuevo.");
  }
}

async function handleApprove(ctx: Context, responseId: string) {
  const { error } = await supabase
    .from("responses")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", responseId);

  if (error) {
    await ctx.reply("Error al aprobar la respuesta.");
    return;
  }

  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await ctx.reply("Respuesta aprobada. ✅\n\nSe publicará en tu ficha de Google.");
}

async function handleReject(ctx: Context, responseId: string) {
  const { error } = await supabase
    .from("responses")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
    })
    .eq("id", responseId);

  if (error) {
    await ctx.reply("Error al rechazar la respuesta.");
    return;
  }

  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await ctx.reply("Respuesta rechazada.");
}

async function handleEditStart(ctx: Context, responseId: string) {
  const chatId = ctx.chat!.id;
  setState(chatId, { step: "editing", responseId });

  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await ctx.reply(
    "✏️ Escribe la versión editada de la respuesta:\n\n" +
      "_(o envía /cancelar para cancelar la edición)_",
    { parse_mode: "Markdown" }
  );
}

export async function handleEditText(ctx: Context) {
  const chatId = ctx.chat!.id;
  const state = getState(chatId);

  if (state.step !== "editing") return;

  const text = ctx.message?.text?.trim();
  if (!text) return;

  if (text === "/cancelar") {
    resetState(chatId);
    await ctx.reply("Edición cancelada.");
    return;
  }

  const { error } = await supabase
    .from("responses")
    .update({
      final_text: text,
      status: "edited",
      approved_at: new Date().toISOString(),
    })
    .eq("id", state.responseId);

  resetState(chatId);

  if (error) {
    await ctx.reply("Error al guardar la edición.");
    return;
  }

  await ctx.reply("Respuesta editada y guardada. ✅");
}
