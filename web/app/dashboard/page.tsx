import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import AutopilotCard from "./autopilot-card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Check if the user has a business connected
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, location_name, google_account_id, google_location_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) redirect("/bienvenida");

  const businessName = (business.name || business.location_name || "Tu negocio") as string;

  // Generate autopilot deeplink — use admin client to bypass RLS on onboarding_tokens
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { randomUUID } = await import("crypto");
  const token = randomUUID();

  // Delete stale unused tokens and insert fresh one
  await admin.from("onboarding_tokens").delete().eq("user_id", user.id).is("used_at", null);
  const { error: insertError } = await admin.from("onboarding_tokens").insert({
    user_id: user.id,
    email: user.email ?? "",
    token,
    gmb_account_id: business.google_account_id ?? "",
    gmb_location_id: business.google_location_id ?? "",
    business_name: businessName,
    expires_at: expiresAt,
  });
  if (insertError) console.error("[dashboard] onboarding_tokens insert error:", insertError);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "autoreplai_bot";
  const deepLink = `https://t.me/${botUsername}?start=onboard_${token}`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        </div>

        <AutopilotCard businessName={businessName} initialDeepLink={deepLink} />
      </div>
    </div>
  );
}
