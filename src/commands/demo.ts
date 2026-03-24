import { Bot, InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import {
  findBusiness,
  getBusinessReviews,
  selectReviewsForExamples,
} from "../google.js";
import { generateDemoResponse, generateInsights } from "../claude.js";
import { getState, setState } from "../conversation.js";
import type { PlaceResult } from "../types.js";

const DEMO_URL = process.env.DEMO_URL ?? "https://autoreplai.com";

export function registerDemoHandlers(bot: Bot) {
  bot.callbackQuery("confirm_yes", async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const chatId = ctx.chat!.id;
    const state = getState(chatId);

    if (state.step !== "confirming") return;

    const { candidate } = state;
    setState(chatId, { step: "generating", placeId: candidate.placeId });

    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply(
      "⏳ Buscando reseñas y generando respuestas de ejemplo...\n_(esto puede tardar unos segundos)_",
      { parse_mode: "Markdown" }
    );

    await runDemo(chatId, candidate, ctx);
  });

  bot.callbackQuery("confirm_no", async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const chatId = ctx.chat!.id;

    setState(chatId, { step: "waiting_business" });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply(
      "No hay problema. ✍️ Escribe el nombre correcto o pega el enlace de Google Maps de tu negocio:"
    );
  });
}

export async function handleDemoStart(ctx: Context) {
  const chatId = ctx.chat!.id;
  setState(chatId, { step: "waiting_business" });

  await ctx.reply(
    "👋 ¡Hola! Soy el bot de *autoreplai*.\n\n" +
      "Te voy a mostrar en vivo cómo respondería autoreplai a las reseñas reales de tu negocio en Google.\n\n" +
      "✍️ *¿Cuál es el nombre de tu negocio?*\n" +
      "Puedes escribir el nombre o pegar un enlace de Google Maps.",
    { parse_mode: "Markdown" }
  );
}

export async function handleDemoText(ctx: Context) {
  const chatId = ctx.chat!.id;
  const state = getState(chatId);
  const text = ctx.message!.text!.trim();

  if (state.step === "waiting_business") {
    await ctx.reply("🔍 Buscando tu negocio...");

    let place: PlaceResult | null = null;
    try {
      place = await findBusiness(text);
    } catch (err) {
      console.error("findBusiness error:", err);
    }

    if (!place) {
      await ctx.reply(
        "❌ No encontré ningún negocio con ese nombre.\n" +
          "Intenta ser más específico (ciudad, tipo de negocio) o pega el enlace de Google Maps."
      );
      return;
    }

    setState(chatId, { step: "confirming", candidate: place });

    const stars = place.rating ? `⭐ ${place.rating}` : "Sin valoraciones";
    const keyboard = new InlineKeyboard()
      .text("✅ Sí, es este", "confirm_yes")
      .text("❌ No, otro", "confirm_no");

    await ctx.reply(
      `📍 *${place.name}*\n${place.address}\n${stars}\n\n¿Es este tu negocio?`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
    return;
  }

  if (state.step === "generating") {
    await ctx.reply("⏳ Generando tu demo, un momento...");
    return;
  }

  if (state.step === "done") {
    await ctx.reply(
      "Envía /demo para hacer una nueva demo o escribe el nombre de otro negocio."
    );
  }
}

async function runDemo(
  chatId: number,
  candidate: PlaceResult,
  ctx: { reply: (text: string, opts?: object) => Promise<unknown> }
) {
  let business;
  try {
    business = await getBusinessReviews(candidate.placeId);
  } catch (err) {
    console.error("getBusinessReviews error:", err);
    setState(chatId, { step: "waiting_business" });
    await ctx.reply(
      "❌ No pude obtener las reseñas. Intenta con otro negocio o escribe /reset."
    );
    return;
  }

  if (!business.reviews.length) {
    setState(chatId, { step: "done" });
    await ctx.reply(
      `_${business.name}_ no tiene reseñas con texto suficiente para generar ejemplos.\n\n` +
        "Prueba con otro negocio — /demo",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const exampleReviews = selectReviewsForExamples(business.reviews);

  await ctx.reply(
    `✅ *${business.name}* · ⭐ ${business.rating} (${business.totalReviews} reseñas)\n\n` +
      `Aquí tienes ${exampleReviews.length} ejemplo${exampleReviews.length > 1 ? "s" : ""} de respuesta generada por autoreplai:`,
    { parse_mode: "Markdown" }
  );

  const responses = await Promise.all(
    exampleReviews.map((review, i) =>
      generateDemoResponse(review, business.name, business.type).catch(
        (err) => {
          console.error(`generateDemoResponse error for review ${i}:`, err);
          return "_(error generando respuesta)_";
        }
      )
    )
  );

  for (let i = 0; i < exampleReviews.length; i++) {
    const review = exampleReviews[i];
    const stars =
      "⭐".repeat(review.rating) + "☆".repeat(5 - review.rating);

    const msg =
      `*Reseña ${i + 1}/${exampleReviews.length}* — ${stars}\n` +
      `👤 *${review.author_name}* · ${review.relative_time_description}\n` +
      `💬 _"${review.text.slice(0, 200)}${review.text.length > 200 ? "…" : ""}"_\n\n` +
      `📝 *Respuesta generada por autoreplai:*\n${responses[i]}`;

    await ctx.reply(msg, { parse_mode: "Markdown" });

    if (i < exampleReviews.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  let insights: string;
  try {
    insights = await generateInsights(
      business.reviews,
      business.name,
      business.type
    );
  } catch (err) {
    console.error("generateInsights error:", err);
    insights = "_(error generando análisis)_";
  }

  await ctx.reply(`📊 *Análisis de tus reseñas*\n\n${insights}`, {
    parse_mode: "Markdown",
  });

  setState(chatId, { step: "done" });

  await ctx.reply(
    "🎉 *¿Te imaginas esto para cada reseña, de forma automática, todos los días?*\n\n" +
      "autoreplai responde tus reseñas de Google con IA — en menos de 1 hora desde que llegan.\n\n" +
      `👉 [Empieza gratis en autoreplai.com](${DEMO_URL})`,
    { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
  );
}
