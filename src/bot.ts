// Load .env only in local dev (Cloud Run sets K_SERVICE automatically)
if (!process.env.K_SERVICE) {
  const { config } = await import("dotenv");
  config();
}

import { createServer } from "node:http";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { findBusiness, getBusinessReviews, selectReviewsForExamples } from "./google.js";
import { generateDemoResponse, generateInsights } from "./claude.js";
import { getState, setState } from "./conversation.js";
import type { PlaceResult } from "./types.js";

const DEMO_URL = process.env.DEMO_URL ?? "https://replai.app";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// ── /start ──────────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;
  setState(chatId, { step: "waiting_business" });

  await ctx.reply(
    "👋 ¡Hola! Soy el bot de *replai*.\n\n" +
      "Te voy a mostrar en vivo cómo respondería replai a las reseñas reales de tu negocio en Google.\n\n" +
      "✍️ *¿Cuál es el nombre de tu negocio?*\n" +
      "Puedes escribir el nombre o pegar un enlace de Google Maps.",
    { parse_mode: "Markdown" }
  );
});

// ── /reset ───────────────────────────────────────────────────────────────────
bot.command("reset", async (ctx) => {
  setState(ctx.chat.id, { step: "waiting_business" });
  await ctx.reply("🔄 Reiniciado. ¿Cuál es el nombre de tu negocio?");
});

// ── Callback: confirm business ────────────────────────────────────────────────
bot.callbackQuery("confirm_yes", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const chatId = ctx.chat!.id;
  const state = getState(chatId);

  if (state.step !== "confirming") return;

  const { candidate } = state;
  setState(chatId, { step: "generating", placeId: candidate.placeId });

  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await ctx.reply("⏳ Buscando reseñas y generando respuestas de ejemplo...\n_(esto puede tardar unos segundos)_", {
    parse_mode: "Markdown",
  });

  await runDemo(ctx.chat!.id, candidate, ctx);
});

bot.callbackQuery("confirm_no", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const chatId = ctx.chat!.id;

  setState(chatId, { step: "waiting_business" });
  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await ctx.reply("No hay problema. ✍️ Escribe el nombre correcto o pega el enlace de Google Maps de tu negocio:");
});

// ── Text messages ─────────────────────────────────────────────────────────────
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const state = getState(chatId);
  const text = ctx.message.text.trim();

  if (state.step === "idle") {
    setState(chatId, { step: "waiting_business" });
    await ctx.reply(
      "👋 ¡Hola! Envía /start para comenzar la demo de *replai*.",
      { parse_mode: "Markdown" }
    );
    return;
  }

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
    await ctx.reply("Envía /start para hacer una nueva demo o /reset para buscar otro negocio.");
  }
});

// ── Demo runner ───────────────────────────────────────────────────────────────
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
    await ctx.reply("❌ No pude obtener las reseñas. Intenta con otro negocio o escribe /reset.");
    return;
  }

  if (!business.reviews.length) {
    setState(chatId, { step: "done" });
    await ctx.reply(
      `_${business.name}_ no tiene reseñas con texto suficiente para generar ejemplos.\n\n` +
        "Prueba con otro negocio — /reset",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const exampleReviews = selectReviewsForExamples(business.reviews);

  await ctx.reply(
    `✅ *${business.name}* · ⭐ ${business.rating} (${business.totalReviews} reseñas)\n\n` +
      `Aquí tienes ${exampleReviews.length} ejemplo${exampleReviews.length > 1 ? "s" : ""} de respuesta generada por replai:`,
    { parse_mode: "Markdown" }
  );

  // Generate all responses in parallel
  const responses = await Promise.all(
    exampleReviews.map((review, i) =>
      generateDemoResponse(review, business.name, business.type).catch((err) => {
        console.error(`generateDemoResponse error for review ${i}:`, err);
        return "_(error generando respuesta)_";
      })
    )
  );

  for (let i = 0; i < exampleReviews.length; i++) {
    const review = exampleReviews[i];
    const stars = "⭐".repeat(review.rating) + "☆".repeat(5 - review.rating);

    const msg =
      `*Reseña ${i + 1}/${exampleReviews.length}* — ${stars}\n` +
      `👤 *${review.author_name}* · ${review.relative_time_description}\n` +
      `💬 _"${review.text.slice(0, 200)}${review.text.length > 200 ? "…" : ""}"_\n\n` +
      `📝 *Respuesta generada por replai:*\n${responses[i]}`;

    await ctx.reply(msg, { parse_mode: "Markdown" });

    if (i < exampleReviews.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  // Generate insights from all reviews
  let insights: string;
  try {
    insights = await generateInsights(business.reviews, business.name, business.type);
  } catch (err) {
    console.error("generateInsights error:", err);
    insights = "_(error generando análisis)_";
  }

  await ctx.reply(
    `📊 *Análisis de tus reseñas*\n\n${insights}`,
    { parse_mode: "Markdown" }
  );

  setState(chatId, { step: "done" });

  await ctx.reply(
    "🎉 *¿Te imaginas esto para cada reseña, de forma automática, todos los días?*\n\n" +
      "replai responde tus reseñas de Google con IA — en menos de 1 hora desde que llegan.\n\n" +
      `👉 [Empieza gratis en replai.app](${DEMO_URL})`,
    { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
  );
}

// ── Error handler ─────────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error("Bot error:", err.message);
});

// ── Start bot ─────────────────────────────────────────────────────────────────
if (process.env.K_SERVICE) {
  // ── Cloud Run: always start HTTP server ───────────────────────────────
  const secret = process.env.WEBHOOK_SECRET ?? "";
  const handleWebhook = webhookCallback(bot, "http", { secretToken: secret });
  const port = Number(process.env.PORT) || 8080;

  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method === "POST" && req.url === "/webhook") {
      await handleWebhook(req, res);
      return;
    }

    res.writeHead(404).end();
  });

  if (process.env.WEBHOOK_URL) {
    await bot.api.setWebhook(`${process.env.WEBHOOK_URL}/webhook`, {
      secret_token: secret,
    });
  }

  server.listen(port, () => {
    console.log(`🤖 replai_bot webhook server listening on :${port}`);
  });
} else {
  // ── Polling mode (local dev) ──────────────────────────────────────────
  await bot.api.deleteWebhook();
  bot.start({
    onStart: () => console.log("🤖 replai_bot is running (polling)"),
  });
}
