import type { Context } from "grammy";
import { resolveUser } from "../middleware/auth.js";

export async function handleHelp(ctx: Context) {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  const user = await resolveUser(telegramUserId);

  if (user) {
    await ctx.reply(
      "*autoreplai* — Comandos disponibles:\n\n" +
        "/resenas — Ver reseñas pendientes\n" +
        "/plan — Ver tu plan y uso\n" +
        "/demo — Probar autoreplai con cualquier negocio\n" +
        "/ayuda — Ver esta ayuda",
      { parse_mode: "Markdown" }
    );
  } else {
    await ctx.reply(
      "*autoreplai* — Responde tus reseñas de Google con IA\n\n" +
        "/demo — Probar autoreplai gratis\n" +
        "/vincular CODIGO — Vincular tu cuenta\n\n" +
        "Regístrate en autoreplai.com para empezar.",
      { parse_mode: "Markdown" }
    );
  }
}
