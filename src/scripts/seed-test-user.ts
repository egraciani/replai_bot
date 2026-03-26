/**
 * Creates a test user + business + persona in the DB
 * and starts the onboarding flow in Telegram.
 *
 * Usage:
 *   TELEGRAM_CHAT_ID=<your_chat_id> npx tsx src/scripts/seed-test-user.ts
 *
 * To get your Telegram chat ID: message @userinfobot on Telegram.
 */

import "dotenv/config";
import { prisma } from "../db.js";

const chatId = process.env.TELEGRAM_CHAT_ID;
if (!chatId) {
  console.error("❌ Set TELEGRAM_CHAT_ID env var to your Telegram chat ID.");
  console.error("   Get it by messaging @userinfobot on Telegram.");
  process.exit(1);
}

async function main() {
  // Create user
  const user = await prisma.user.upsert({
    where: { telegramChatId: chatId },
    update: {},
    create: { telegramChatId: chatId },
  });

  // Create business (using the mock test business)
  const business = await prisma.business.upsert({
    where: { id: "test-business-001" },
    update: {},
    create: {
      id: "test-business-001",
      userId: user.id,
      name: "Restaurante Casa Buenaventura",
      placeId: "test-place-id",
      timezone: "Europe/Madrid",
      summaryTime: "09:00",
      autopilotEnabled: false,
    },
  });

  console.log(`✅ User created: ${user.id}`);
  console.log(`✅ Business created: ${business.name}`);
  console.log(`\n👉 Now send this to your bot on Telegram:`);
  console.log(`   /start onboard_test\n`);

  // Create a valid onboarding token so /start onboard_test works
  await prisma.onboardingToken.upsert({
    where: { token: "test" },
    update: { expiresAt: new Date(Date.now() + 60 * 60 * 1000), usedAt: null },
    create: {
      userId: user.id,
      token: "test",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  console.log(`✅ Onboarding token created (valid 1 hour)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
