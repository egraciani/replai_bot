import type { Context } from "grammy";
import { supabase } from "../supabase.js";
import { requireUser } from "../middleware/auth.js";

export async function handlePlan(ctx: Context) {
  const user = await requireUser(ctx);
  if (!user) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "responses_used, current_period_end, status, plans(display_name, max_responses_mo, max_businesses)"
    )
    .eq("user_id", user.userId)
    .eq("status", "active")
    .single();

  if (!sub) {
    await ctx.reply("No se encontró tu suscripción. Contacta soporte.");
    return;
  }

  const plan = (sub as any).plans;
  const maxResp =
    plan.max_responses_mo === -1 ? "ilimitadas" : plan.max_responses_mo;

  const { count: bizCount } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.userId);

  const periodEnd = new Date(sub.current_period_end).toLocaleDateString(
    "es-ES",
    { day: "numeric", month: "long", year: "numeric" }
  );

  await ctx.reply(
    `📊 *Tu plan: ${plan.display_name}*\n\n` +
      `Respuestas: ${sub.responses_used}/${maxResp} este mes\n` +
      `Negocios: ${bizCount ?? 0}/${plan.max_businesses}\n\n` +
      `Renueva: ${periodEnd}\n\n` +
      `Gestiona tu plan en autoreplai.com/plan`,
    { parse_mode: "Markdown" }
  );
}
