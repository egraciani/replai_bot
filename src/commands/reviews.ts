import { Bot, InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { supabase } from "../supabase.js";
import { requireUser } from "../middleware/auth.js";

export function registerReviewHandlers(bot: Bot) {
  // Business selector callback
  bot.callbackQuery(/^biz:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const businessId = ctx.match![1];
    await showReviews(ctx, ctx.from!.id, businessId, 0);
  });

  // Navigation callback
  bot.callbackQuery(/^nav:(.+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => {});
    const businessId = ctx.match![1];
    const page = parseInt(ctx.match![2], 10);
    await showReviews(ctx, ctx.from!.id, businessId, page);
  });
}

export async function handleResenas(ctx: Context) {
  const user = await requireUser(ctx);
  if (!user) return;

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, location_name")
    .eq("user_id", user.userId);

  if (!businesses?.length) {
    await ctx.reply(
      "No tienes negocios conectados.\n\n" +
        "Conecta tu Google Business en autoreplai.com"
    );
    return;
  }

  if (businesses.length === 1) {
    await showReviews(ctx, ctx.from!.id, businesses[0].id, 0);
    return;
  }

  // Multiple businesses — show selector
  const keyboard = new InlineKeyboard();
  for (const biz of businesses) {
    keyboard.text(
      biz.location_name || biz.name,
      `biz:${biz.id}`
    );
    keyboard.row();
  }

  await ctx.reply("¿De qué negocio quieres ver las reseñas?", {
    reply_markup: keyboard,
  });
}

async function showReviews(
  ctx: Context,
  telegramUserId: number,
  businessId: string,
  page: number
) {
  // Fetch reviews with their responses
  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, author_name, rating, review_text, created_at, responses(id, status)"
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!reviews?.length) {
    await ctx.reply(
      "No hay reseñas importadas para este negocio todavía.\n\n" +
        "Las reseñas se importan automáticamente cuando el servicio está activo."
    );
    return;
  }

  // Filter: only reviews without approved/edited responses
  const pendingReviews = reviews.filter(
    (r) =>
      !r.responses?.length ||
      r.responses.every(
        (resp) => resp.status === "rejected" || resp.status === "pending"
      )
  );

  if (!pendingReviews.length) {
    await ctx.reply("No tienes reseñas pendientes. ¡Estás al día! ✅");
    return;
  }

  const review = pendingReviews[page];
  if (!review) {
    await ctx.reply("No hay más reseñas pendientes.");
    return;
  }

  const stars =
    "⭐".repeat(review.rating) + "☆".repeat(5 - review.rating);
  const total = pendingReviews.length;

  const keyboard = new InlineKeyboard();
  keyboard.text("📝 Generar respuesta", `gen:${review.id}`);
  keyboard.row();

  if (page > 0) {
    keyboard.text("← Anterior", `nav:${businessId}:${page - 1}`);
  }
  if (page < total - 1) {
    keyboard.text("Siguiente →", `nav:${businessId}:${page + 1}`);
  }

  const text = review.review_text || "(sin texto)";

  await ctx.reply(
    `*Reseña ${page + 1}/${total}* — ${stars}\n` +
      `👤 *${review.author_name}*\n` +
      `💬 _"${text.slice(0, 300)}${text.length > 300 ? "…" : ""}"_`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
}
