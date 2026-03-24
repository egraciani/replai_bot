import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

function generateCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Delete any existing codes for this user
  await supabase.from("link_codes").delete().eq("user_id", user.id);

  const { error } = await supabase.from("link_codes").insert({
    user_id: user.id,
    code,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("Link code insert error:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    deepLink: `https://t.me/autoreplai_bot?start=LINK_${code}`,
  });
}
