import type { Context } from "grammy";
import { resolveUser } from "../middleware/auth.js";
import { supabase } from "../supabase.js";

export async function handleHelp(ctx: Context) {
  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) return;

  const user = await resolveUser(telegramUserId);

  if (user) {
    // Check service tier
    const { data: business } = await supabase
      .from("businesses")
      .select("service_tier")
      .eq("user_id", user.userId)
      .maybeSingle();

    const tier = business?.service_tier ?? "manual";

    let tierHelp: string;
    if (tier === "manual") {
      tierHelp =
        "Servicio: *Manual* — recibes respuestas sugeridas por Telegram para copiar y pegar en Google Maps.";
    } else if (tier === "manager") {
      tierHelp =
        "Servicio: *Manager* — nuestro equipo publica las respuestas por ti en Google Maps.";
    } else {
      tierHelp =
        "Servicio: *Automático* — las respuestas se publican automáticamente.";
    }

    await ctx.reply(
      `*autoreplai* — Comandos disponibles:\n\n` +
        `${tierHelp}\n\n` +
        `/status — Ver estado y actividad reciente\n` +
        `/pause — Pausar notificaciones\n` +
        `/resume — Reactivar notificaciones\n` +
        `/plan — Ver tu plan y uso\n` +
        `/demo — Probar autoreplai con cualquier negocio\n` +
        `/ayuda — Ver esta ayuda`,
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
