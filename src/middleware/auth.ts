import type { Context } from "grammy";
import { supabase } from "../supabase.js";

export interface LinkedUser {
  userId: string;
  telegramUserId: number;
}

export async function resolveUser(
  telegramUserId: number
): Promise<LinkedUser | null> {
  const { data, error } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId)
    .single();

  if (error || !data) return null;

  return { userId: data.user_id, telegramUserId };
}

export async function requireUser(ctx: Context): Promise<LinkedUser | null> {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return null;

  const user = await resolveUser(telegramUserId);
  if (!user) {
    await ctx.reply(
      "No tienes una cuenta vinculada.\n\n" +
        "1. Regístrate en autoreplai.com\n" +
        "2. Usa el código de vinculación con /vincular CODIGO"
    );
    return null;
  }
  return user;
}
