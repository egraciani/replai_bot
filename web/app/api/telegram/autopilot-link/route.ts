import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "autoreplai_bot";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user's business
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, location_name, google_account_id, google_location_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "No business found" }, { status: 404 });
  }

  const businessName = (business.name || business.location_name || "Tu negocio") as string;

  // Delete existing unused tokens for this user
  await supabase
    .from("onboarding_tokens")
    .delete()
    .eq("user_id", user.id)
    .is("used_at", null);

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("onboarding_tokens").insert({
    user_id: user.id,
    email: user.email ?? "",
    token,
    gmb_account_id: business.google_account_id ?? "",
    gmb_location_id: business.google_location_id ?? "",
    business_name: businessName,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Onboarding token insert error:", error);
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }

  return NextResponse.json({
    deepLink: `https://t.me/${BOT_USERNAME}?start=onboard_${token}`,
    businessName,
    expiresAt,
  });
}
