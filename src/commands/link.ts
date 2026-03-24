import type { Context } from "grammy";
import { supabase } from "../supabase.js";

export async function handleLink(ctx: Context, code: string): Promise<void> {
  const telegramUserId = ctx.from!.id;

  // Check if already linked
  const { data: existing } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (existing) {
    await ctx.reply("Tu cuenta de Telegram ya está vinculada a autoreplai. ✅");
    return;
  }

  // Look up code
  const { data: codeRow } = await supabase
    .from("link_codes")
    .select("user_id, expires_at")
    .eq("code", code.toUpperCase())
    .single();

  if (!codeRow || new Date(codeRow.expires_at) < new Date()) {
    await ctx.reply(
      "Código inválido o expirado.\nGenera uno nuevo en autoreplai.com"
    );
    return;
  }

  // Create the link
  const { error } = await supabase.from("telegram_links").insert({
    user_id: codeRow.user_id,
    telegram_user_id: telegramUserId,
    telegram_username: ctx.from!.username ?? null,
    telegram_first_name: ctx.from!.first_name ?? null,
  });

  if (error) {
    console.error("Link insert error:", error);
    await ctx.reply("Error al vincular tu cuenta. Inténtalo de nuevo.");
    return;
  }

  // Delete used code
  await supabase.from("link_codes").delete().eq("code", code.toUpperCase());

  await ctx.reply(
    "Cuenta vinculada exitosamente. ✅\n\n" +
      "Usa /resenas para ver tus reseñas pendientes.\n" +
      "Usa /plan para ver tu plan y uso."
  );
}
