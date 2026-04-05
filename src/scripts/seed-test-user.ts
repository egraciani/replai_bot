/**
 * Creates a test onboarding token in Supabase so /start onboard_test works.
 *
 * Usage:
 *   TELEGRAM_CHAT_ID=<your_chat_id> npx tsx src/scripts/seed-test-user.ts
 *
 * Requires a user already registered in auth.users (sign up on the web app first).
 * To get your Telegram chat ID: message @userinfobot on Telegram.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const chatId = process.env.TELEGRAM_CHAT_ID;
const userEmail = process.env.SEED_USER_EMAIL; // email of an existing auth.users account

if (!chatId) {
  console.error("❌ Set TELEGRAM_CHAT_ID env var.");
  process.exit(1);
}
if (!userEmail) {
  console.error("❌ Set SEED_USER_EMAIL env var (email of an existing Supabase auth user).");
  process.exit(1);
}

// Use service role to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Find the user by email in auth.users
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) { console.error("❌ Failed to list users:", userErr.message); process.exit(1); }

  const user = users.users.find((u) => u.email === userEmail);
  if (!user) {
    console.error(`❌ No auth user found with email: ${userEmail}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.id} (${user.email})`);

  // Upsert business
  const { data: business } = await supabase
    .from("businesses")
    .upsert(
      {
        user_id: user.id,
        name: "Restaurante Casa Buenaventura",
        google_place_id: "test-place-id",
        timezone: "Europe/Madrid",
        summary_time: "09:00",
        autopilot_enabled: false,
      },
      { onConflict: "user_id,google_place_id" }
    )
    .select("id, name")
    .single();

  if (!business) {
    console.error("❌ Failed to upsert business");
    process.exit(1);
  }

  console.log(`✅ Business: ${business.name} (${business.id})`);

  // Create / refresh onboarding token
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { error: tokenErr } = await supabase
    .from("onboarding_tokens")
    .upsert(
      {
        user_id: user.id,
        email: userEmail,
        token: "test",
        gmb_account_id: "",
        gmb_location_id: "",
        business_name: business.name,
        expires_at: expiresAt,
        used_at: null,
      },
      { onConflict: "token" }
    );

  if (tokenErr) { console.error("❌ Failed to upsert token:", tokenErr.message); process.exit(1); }

  console.log(`✅ Onboarding token "test" valid until ${expiresAt}`);
  console.log(`\n👉 Send this to your bot on Telegram:`);
  console.log(`   /start onboard_test\n`);
}

main().catch(console.error);
