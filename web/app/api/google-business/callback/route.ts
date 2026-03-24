import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google-business";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/bienvenida?error=google_denied`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${origin}/register`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    await supabase.from("google_tokens").upsert(
      {
        user_id: user.id,
        access_token: encrypt(tokens.accessToken),
        refresh_token: encrypt(tokens.refreshToken),
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(`${origin}/dashboard/select-business`);
  } catch (err) {
    console.error("Google Business callback error:", err);
    return NextResponse.redirect(`${origin}/bienvenida?error=token_exchange`);
  }
}
