import { SupabaseClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "./encryption";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/business.manage";

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;
  return { clientId, clientSecret, redirectUri };
}

/** Build the Google OAuth authorization URL */
export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = getCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/** Exchange an authorization code for access + refresh tokens */
export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${body}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

/** Refresh an expired access token */
export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed: ${body}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    expiresIn: data.expires_in as number,
  };
}

/**
 * Get a valid (non-expired) access token for the user.
 * Reads from DB, refreshes if needed, and updates DB.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: row, error } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !row) {
    throw new Error("Google Business not connected");
  }

  const accessToken = decrypt(row.access_token);
  const refreshTokenPlain = decrypt(row.refresh_token);
  const expiresAt = new Date(row.token_expires_at);

  // If token is still valid (with 60s buffer), return it
  if (expiresAt.getTime() - Date.now() > 60_000) {
    return accessToken;
  }

  // Refresh the token
  const refreshed = await refreshAccessToken(refreshTokenPlain);
  const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);

  await supabase
    .from("google_tokens")
    .update({
      access_token: encrypt(refreshed.accessToken),
      token_expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return refreshed.accessToken;
}
