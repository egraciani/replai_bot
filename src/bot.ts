// Load .env only in local dev (Cloud Run sets K_SERVICE automatically)
if (!process.env.K_SERVICE) {
  const { config } = await import("dotenv");
  config();
}

import { createServer } from "node:http";
import { webhookCallback } from "grammy";
import { bot } from "./botInstance.js";
import { getState } from "./conversation.js";
import { handleLink } from "./commands/link.js";
import { registerDemoHandlers, handleDemoStart, handleDemoText } from "./commands/demo.js";
import { registerReviewHandlers, handleResenas } from "./commands/reviews.js";
import { registerGenerateHandlers, handleEditText } from "./commands/generate.js";
import { handlePlan } from "./commands/plan.js";
import { handleHelp } from "./commands/help.js";
import { prisma } from "./db.js";
import {
  startOnboarding,
  isOnboarding,
  handleOnboardingMessage,
  handleToneCallback,
} from "./onboarding.js";
import { startAutopilot } from "./autopilot.js";

// ── Commands ──────────────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const param = ctx.match?.trim();

  // Autopilot onboarding deep link: /start onboard_<token>
  if (param?.startsWith("onboard_")) {
    const token = param.slice("onboard_".length);
    const record = await prisma.onboardingToken.findUnique({ where: { token } });

    if (!record) {
      await ctx.reply("❌ Este enlace no es válido. Vuelve a replai.app para obtener uno nuevo.");
      return;
    }
    if (record.usedAt || record.expiresAt < new Date()) {
      await ctx.reply("⏰ Este enlace ha expirado o ya fue usado. Vuelve a replai.app para obtener uno nuevo.");
      return;
    }

    await prisma.onboardingToken.update({ where: { token }, data: { usedAt: new Date() } });
    await prisma.user.update({
      where: { id: record.userId },
      data: { telegramChatId: String(ctx.chat.id) },
    });

    const business = await prisma.business.findFirst({ where: { userId: record.userId } });
    if (!business) {
      await ctx.reply("❌ No encontré tu negocio. Por favor, contacta con soporte.");
      return;
    }

    await startOnboarding(String(ctx.chat.id), business.id);
    return;
  }

  // Legacy link deep link: /start LINK_XXXXXX
  if (param?.startsWith("LINK_")) {
    await handleLink(ctx, param.replace("LINK_", ""));
    return;
  }

  await handleHelp(ctx);
});

bot.command("vincular", async (ctx) => {
  const code = ctx.match;
  if (!code) {
    await ctx.reply("Uso: /vincular CODIGO\n\nObtén tu código en autoreplai.com");
    return;
  }
  await handleLink(ctx, code);
});

bot.command("demo", handleDemoStart);
bot.command("reset", handleDemoStart);
bot.command("resenas", handleResenas);
bot.command("plan", handlePlan);
bot.command(["help", "ayuda"], handleHelp);

// ── Autopilot commands ────────────────────────────────────────────────────────

bot.command("pause", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
  if (!user) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const business = await prisma.business.findFirst({ where: { userId: user.id, autopilotEnabled: true } });
  if (!business) { await ctx.reply("El piloto automático ya está pausado."); return; }

  await prisma.business.update({ where: { id: business.id }, data: { autopilotEnabled: false } });
  await ctx.reply("⏸ Piloto automático pausado. Usa /resume para reactivarlo.");
});

bot.command("resume", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
  if (!user) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const business = await prisma.business.findFirst({ where: { userId: user.id } });
  if (!business) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const persona = await prisma.persona.findUnique({ where: { businessId: business.id } });
  if (!persona) { await ctx.reply("Completa la configuración primero."); return; }

  await prisma.business.update({ where: { id: business.id }, data: { autopilotEnabled: true } });
  await ctx.reply("▶️ Piloto automático reactivado.");
});

bot.command("status", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const user = await prisma.user.findUnique({ where: { telegramChatId: chatId } });
  if (!user) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const business = await prisma.business.findFirst({ where: { userId: user.id } });
  if (!business) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const logs = await prisma.replyLog.findMany({ where: { businessId: business.id, createdAt: { gte: since } } });

  const posted = logs.filter((l) => l.status === "POSTED").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;

  await ctx.reply(
    `📊 *Estado — ${business.name}*\n\n` +
      `Piloto: ${business.autopilotEnabled ? "✅ Activo" : "⏸ Pausado"}\n\n` +
      `Últimas 24h:\n• Respondidas: ${posted}\n• Fallidas: ${failed}`,
    { parse_mode: "Markdown" }
  );
});

// ── Callback query handlers ───────────────────────────────────────────────────

registerDemoHandlers(bot);
registerReviewHandlers(bot);
registerGenerateHandlers(bot);

bot.callbackQuery(/^tone_(\w+)_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const [, tone, chatId] = ctx.match!;
  await handleToneCallback(chatId, tone);
});

// ── Text messages ─────────────────────────────────────────────────────────────

bot.on("message:text", async (ctx) => {
  const chatId = String(ctx.chat.id);

  // Route to onboarding if active
  if (isOnboarding(chatId)) {
    await handleOnboardingMessage(chatId, ctx.message.text.trim());
    return;
  }

  const state = getState(ctx.chat.id);

  if (state.step === "editing") {
    await handleEditText(ctx);
    return;
  }

  if (
    state.step === "waiting_business" ||
    state.step === "confirming" ||
    state.step === "generating" ||
    state.step === "done"
  ) {
    await handleDemoText(ctx);
    return;
  }

  await handleHelp(ctx);
});

// ── Error handler ─────────────────────────────────────────────────────────────

bot.catch((err) => {
  console.error("Bot error:", err.message);
});

// ── Start ─────────────────────────────────────────────────────────────────────

startAutopilot();

if (process.env.K_SERVICE) {
  const secret = process.env.WEBHOOK_SECRET ?? "";
  const handleWebhook = webhookCallback(bot, "http", {
    secretToken: secret,
    timeoutMilliseconds: 55_000,
  });
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
    await bot.api.setWebhook(`${process.env.WEBHOOK_URL}/webhook`, { secret_token: secret });
  }

  server.listen(port, () => console.log(`🤖 replai bot webhook server listening on :${port}`));
} else {
  await bot.api.deleteWebhook();
  bot.start({ onStart: () => console.log("🤖 replai bot is running (polling)") });
}
