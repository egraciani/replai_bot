// Load .env only in local dev (Cloud Run sets K_SERVICE automatically)
if (!process.env.K_SERVICE) {
  const { config } = await import("dotenv");
  config();
}

import { createServer } from "node:http";
import { Bot, webhookCallback } from "grammy";
import { getState } from "./conversation.js";
import { handleLink } from "./commands/link.js";
import { registerDemoHandlers, handleDemoStart, handleDemoText } from "./commands/demo.js";
import { registerReviewHandlers, handleResenas } from "./commands/reviews.js";
import { registerGenerateHandlers, handleEditText } from "./commands/generate.js";
import { handlePlan } from "./commands/plan.js";
import { handleHelp } from "./commands/help.js";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// ── Commands ─────────────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const param = ctx.match;

  // Deep link: t.me/autoreplai_bot?start=LINK_XXXXXX
  if (param && param.startsWith("LINK_")) {
    await handleLink(ctx, param.replace("LINK_", ""));
    return;
  }

  await handleHelp(ctx);
});

bot.command("vincular", async (ctx) => {
  const code = ctx.match;
  if (!code) {
    await ctx.reply(
      "Uso: /vincular CODIGO\n\nObtén tu código en autoreplai.com"
    );
    return;
  }
  await handleLink(ctx, code);
});

bot.command("demo", handleDemoStart);
bot.command("reset", handleDemoStart);
bot.command("resenas", handleResenas);
bot.command("plan", handlePlan);
bot.command(["help", "ayuda"], handleHelp);

// ── Callback query handlers ──────────────────────────────────────────────────

registerDemoHandlers(bot);
registerReviewHandlers(bot);
registerGenerateHandlers(bot);

// ── Text messages ────────────────────────────────────────────────────────────

bot.on("message:text", async (ctx) => {
  const state = getState(ctx.chat.id);

  // Production: editing a response
  if (state.step === "editing") {
    await handleEditText(ctx);
    return;
  }

  // Demo flow: business search, confirmation, etc.
  if (
    state.step === "waiting_business" ||
    state.step === "confirming" ||
    state.step === "generating" ||
    state.step === "done"
  ) {
    await handleDemoText(ctx);
    return;
  }

  // Idle: show help
  await handleHelp(ctx);
});

// ── Error handler ────────────────────────────────────────────────────────────

bot.catch((err) => {
  console.error("Bot error:", err.message);
});

// ── Start bot ────────────────────────────────────────────────────────────────

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
    await bot.api.setWebhook(`${process.env.WEBHOOK_URL}/webhook`, {
      secret_token: secret,
    });
  }

  server.listen(port, () => {
    console.log(`autoreplai bot webhook server listening on :${port}`);
  });
} else {
  await bot.api.deleteWebhook();
  bot.start({
    onStart: () => console.log("autoreplai bot is running (polling)"),
  });
}
