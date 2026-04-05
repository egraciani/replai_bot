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
import { supabase } from "./supabase.js";
import {
  startOnboarding,
  startFreshOnboarding,
  isOnboarding,
  handleOnboardingMessage,
  handleBusinessConfirmCallback,
  handleToneCallback,
} from "./onboarding.js";
import { startAutopilot } from "./autopilot.js";

// ── Logging middleware ─────────────────────────────────────────────────────────

bot.use(async (ctx, next) => {
  const msg = ctx.message;
  if (msg) {
    console.log(`[tg] from=${msg.from?.username ?? msg.from?.id} chat=${msg.chat.id} text=${JSON.stringify(msg.text)}`);
  }
  await next();
});

// ── Commands ──────────────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const param = ctx.match?.trim();

  // Autopilot onboarding deep link: /start onboard_<token>
  if (param?.startsWith("onboard_")) {
    const token = param.slice("onboard_".length);
    console.log(`[onboard] token=${token} chatId=${ctx.chat.id}`);

    const { data: record, error: tokenError } = await supabase
      .from("onboarding_tokens")
      .select("*")
      .eq("token", token)
      .single();

    console.log(`[onboard] record=${JSON.stringify(record)} error=${JSON.stringify(tokenError)}`);

    if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
      // Token invalid/expired — start fresh onboarding with userId from token if available
      await startFreshOnboarding(String(ctx.chat.id), record?.user_id);
      return;
    }

    // Mark token as used
    await supabase
      .from("onboarding_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    // Link Telegram chat to Supabase user
    const { error: linkError } = await supabase.from("telegram_links").upsert(
      { user_id: record.user_id, telegram_user_id: Number(ctx.chat.id) },
      { onConflict: "user_id" }
    );
    if (linkError) console.log(`[onboard] telegram_links error: ${JSON.stringify(linkError)}`);

    // Upsert the business (may already exist if user connected GMB on web)
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", record.user_id)
      .maybeSingle();

    console.log(`[onboard] business=${JSON.stringify(business)} error=${JSON.stringify(bizError)}`);

    let businessId: string;
    if (business) {
      businessId = business.id;
    } else {
      const { data: newBusiness, error: insertError } = await supabase
        .from("businesses")
        .insert({
          user_id: record.user_id,
          name: record.business_name,
          google_account_id: record.gmb_account_id || null,
          google_location_id: record.gmb_location_id || null,
          google_place_id: record.gmb_location_id || "pending",
        })
        .select("id")
        .single();

      console.log(`[onboard] newBusiness=${JSON.stringify(newBusiness)} error=${JSON.stringify(insertError)}`);

      if (!newBusiness) {
        await ctx.reply("❌ No pude crear tu negocio. Por favor, contacta con soporte.");
        return;
      }
      businessId = newBusiness.id;
    }

    console.log(`[onboard] calling startOnboarding chatId=${ctx.chat.id} businessId=${businessId}`);
    await startOnboarding(String(ctx.chat.id), businessId);
    return;
  }

  // Legacy link deep link: /start LINK_XXXXXX
  if (param?.startsWith("LINK_")) {
    await handleLink(ctx, param.replace("LINK_", ""));
    return;
  }

  await startFreshOnboarding(String(ctx.chat.id));
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

  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_user_id", ctx.chat.id)
    .single();
  if (!link) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, autopilot_enabled")
    .eq("user_id", link.user_id)
    .single();
  if (!business) { await ctx.reply("No tienes ningún negocio conectado."); return; }
  if (!business.autopilot_enabled) { await ctx.reply("El piloto automático ya está pausado."); return; }

  await supabase.from("businesses").update({ autopilot_enabled: false }).eq("id", business.id);
  await ctx.reply("⏸ Piloto automático pausado. Usa /resume para reactivarlo.");
});

bot.command("resume", async (ctx) => {
  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_user_id", ctx.chat.id)
    .single();
  if (!link) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", link.user_id)
    .single();
  if (!business) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const { data: persona } = await supabase
    .from("personas")
    .select("id")
    .eq("business_id", business.id)
    .single();
  if (!persona) { await ctx.reply("Completa la configuración primero."); return; }

  await supabase.from("businesses").update({ autopilot_enabled: true }).eq("id", business.id);
  await ctx.reply("▶️ Piloto automático reactivado.");
});

bot.command("status", async (ctx) => {
  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_user_id", ctx.chat.id)
    .single();
  if (!link) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, autopilot_enabled")
    .eq("user_id", link.user_id)
    .single();
  if (!business) { await ctx.reply("No tienes ningún negocio conectado."); return; }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: logs } = await supabase
    .from("reply_logs")
    .select("status")
    .eq("business_id", business.id)
    .gte("created_at", since);

  const posted = (logs ?? []).filter((l) => l.status === "POSTED").length;
  const failed = (logs ?? []).filter((l) => l.status === "FAILED").length;

  await ctx.reply(
    `📊 *Estado — ${business.name}*\n\n` +
      `Piloto: ${business.autopilot_enabled ? "✅ Activo" : "⏸ Pausado"}\n\n` +
      `Últimas 24h:\n• Respondidas: ${posted}\n• Fallidas: ${failed}`,
    { parse_mode: "Markdown" }
  );
});

// ── Callback query handlers ───────────────────────────────────────────────────

registerDemoHandlers(bot);
registerReviewHandlers(bot);
registerGenerateHandlers(bot);

bot.callbackQuery(/^ob_biz_(yes|no)_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const [, answer, chatId] = ctx.match!;
  await handleBusinessConfirmCallback(chatId, answer === "yes");
});

bot.callbackQuery(/^tone_(\w+)_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const [, tone, chatId] = ctx.match!;
  await handleToneCallback(chatId, tone);
});

// ── Text messages ─────────────────────────────────────────────────────────────

bot.on("message:text", async (ctx) => {
  const chatId = String(ctx.chat.id);

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
