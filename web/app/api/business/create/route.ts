import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "autoreplai_bot";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { placeId, name, address, rating, reviewCount, serviceTier } = body;

  if (!placeId || !name || !serviceTier) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["manual", "manager", "automated"].includes(serviceTier)) {
    return NextResponse.json({ error: "Invalid service tier" }, { status: 400 });
  }

  // Upsert business
  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let businessId: string;

  if (existingBusiness) {
    await supabase
      .from("businesses")
      .update({
        name,
        google_place_id: placeId,
        location_address: address,
        service_tier: serviceTier,
        user_rating_count: reviewCount ?? null,
      })
      .eq("id", existingBusiness.id);
    businessId = existingBusiness.id;
  } else {
    const { data: newBiz, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        user_id: user.id,
        name,
        google_place_id: placeId,
        location_address: address,
        service_tier: serviceTier,
        user_rating_count: reviewCount ?? null,
      })
      .select("id")
      .single();

    if (bizErr || !newBiz) {
      console.error("Business insert error:", bizErr);
      return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
    }
    businessId = newBiz.id;
  }

  // Generate onboarding token + deep link
  await supabase
    .from("onboarding_tokens")
    .delete()
    .eq("user_id", user.id)
    .is("used_at", null);

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase.from("onboarding_tokens").insert({
    user_id: user.id,
    email: user.email ?? "",
    token,
    gmb_account_id: "",
    gmb_location_id: "",
    business_name: name,
    expires_at: expiresAt,
  });

  const deepLink = `https://t.me/${BOT_USERNAME}?start=onboard_${token}`;

  return NextResponse.json({
    business: { id: businessId, name, serviceTier },
    deepLink,
  });
}
