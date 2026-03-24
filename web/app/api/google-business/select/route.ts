import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { accountId, locationId, locationName, address } = body;

  if (!accountId || !locationId || !locationName) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("businesses").upsert(
    {
      user_id: user.id,
      google_account_id: accountId,
      google_location_id: locationId,
      location_name: locationName,
      location_address: address || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,google_location_id" }
  );

  if (error) {
    console.error("Business upsert error:", error);
    return NextResponse.json(
      { error: "Failed to save business" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
