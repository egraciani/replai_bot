import { supabase } from "./supabase.js";
import { bot } from "./botInstance.js";
import { generateReply } from "./services/replyGenerator.js";
import { fetchReviewsMock } from "./services/reviewFetcher.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonaPartial {
  tone?: string;
  goodInstructions?: string;
  mediumInstructions?: string;
  badInstructions?: string;
  language?: string;
  businessName?: string;
}

type OnboardingStep =
  | "ask_business_name"
  | "ask_good"
  | "ask_medium"
  | "ask_bad"
  | "ask_tone"
  | "confirm_sample"
  | "done";

const onboardingState = new Map<
  string, // telegramChatId
  {
    businessId: string | null; // null for fresh (no-web-account) onboarding
    step: OnboardingStep;
    attempts: number;
    partial: PersonaPartial;
  }
>();

const TONE_OPTIONS = ["warm", "formal", "funny", "professional"] as const;
const TONE_LABELS: Record<string, string> = {
  warm: "Cercano y amable",
  formal: "Formal y profesional",
  funny: "Distendido y con humor",
  professional: "Profesional y pulido",
};

// ── Public API ────────────────────────────────────────────────────────────────

/** Start onboarding for a user who linked via the web dashboard (has a businessId already). */
export async function startOnboarding(chatId: string, businessId: string): Promise<void> {
  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .single();

  if (!business) {
    await bot.api.sendMessage(chatId, "❌ No encontré tu negocio. Por favor, contacta con soporte.");
    return;
  }

  onboardingState.set(chatId, {
    businessId,
    step: "ask_good",
    attempts: 0,
    partial: { language: "es", businessName: business.name },
  });

  await bot.api.sendMessage(
    chatId,
    `👋 ¡Hola! Voy a aprender cómo quieres responder a las reseñas de *${business.name}*.\n\n` +
      `Solo necesito 2 minutos. ¡Empecemos!\n\n` +
      `⭐⭐⭐⭐⭐ *¿Cómo quieres responder a las reseñas positivas (4-5 estrellas)?*\n\n` +
      `_Ejemplo: "Agradece el detalle mencionado y invita a volver pronto"_`,
    { parse_mode: "Markdown" }
  );
}

/** Start onboarding for a fresh Telegram user with no web account. */
export async function startFreshOnboarding(chatId: string): Promise<void> {
  onboardingState.set(chatId, {
    businessId: null,
    step: "ask_business_name",
    attempts: 0,
    partial: { language: "es" },
  });

  await bot.api.sendMessage(
    chatId,
    `👋 ¡Hola! Soy el piloto automático de reseñas de Google.\n\n` +
      `Voy a aprender cómo responder a las reseñas de tu negocio. Solo necesito 2 minutos.\n\n` +
      `¿Cómo se llama tu negocio?`,
  );
}

export function isOnboarding(chatId: string): boolean {
  return onboardingState.has(chatId);
}

export async function handleOnboardingMessage(chatId: string, text: string): Promise<void> {
  const state = onboardingState.get(chatId);
  if (!state) return;

  switch (state.step) {
    case "ask_business_name": {
      state.partial.businessName = text;
      state.step = "ask_good";
      await bot.api.sendMessage(
        chatId,
        `✅ Perfecto, *${text}*.\n\n` +
          `⭐⭐⭐⭐⭐ *¿Cómo quieres responder a las reseñas positivas (4-5 estrellas)?*\n\n` +
          `_Ejemplo: "Agradece el detalle mencionado y invita a volver pronto"_`,
        { parse_mode: "Markdown" }
      );
      break;
    }

    case "ask_good": {
      state.partial.goodInstructions = text;
      state.step = "ask_medium";
      await bot.api.sendMessage(
        chatId,
        `✅ Perfecto.\n\n` +
          `⭐⭐⭐ *¿Y para las reseñas mixtas (3-4 estrellas)?*\n\n` +
          `_Ejemplo: "Agradece lo positivo y ofrece mejorar en lo que menciona como negativo"_`,
        { parse_mode: "Markdown" }
      );
      break;
    }

    case "ask_medium": {
      state.partial.mediumInstructions = text;
      state.step = "ask_bad";
      await bot.api.sendMessage(
        chatId,
        `✅ Anotado.\n\n` +
          `⭐⭐ *¿Y para las reseñas negativas (1-2 estrellas)?*\n\n` +
          `_Ejemplo: "Muestra empatía, pide disculpas y ofrece resolver el problema fuera de línea"_`,
        { parse_mode: "Markdown" }
      );
      break;
    }

    case "ask_bad": {
      state.partial.badInstructions = text;
      state.step = "ask_tone";

      const toneButtons = TONE_OPTIONS.map((t) => [
        { text: TONE_LABELS[t], callback_data: `tone_${t}_${chatId}` },
      ]);

      await bot.api.sendMessage(
        chatId,
        `✅ Genial.\n\n🎨 *¿Cómo describirías el tono general de tu negocio?*`,
        {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: toneButtons },
        }
      );
      break;
    }

    case "ask_tone": {
      // Handled by callback query
      break;
    }

    case "confirm_sample": {
      const lower = text.toLowerCase().trim();
      if (lower === "sí" || lower === "si" || lower === "yes") {
        await activateAutopilot(chatId, state.businessId, state.partial as Required<PersonaPartial>);
      } else {
        state.attempts += 1;
        if (state.attempts >= 3) {
          await bot.api.sendMessage(
            chatId,
            `Voy a guardar esta configuración por ahora. Puedes ajustarla más tarde con /settings.`
          );
          await activateAutopilot(chatId, state.businessId, state.partial as Required<PersonaPartial>);
        } else {
          state.step = "ask_good";
          state.partial = { language: state.partial.language, businessName: state.partial.businessName };
          await bot.api.sendMessage(
            chatId,
            `No hay problema. Volvamos a empezar.\n\n` +
              `⭐⭐⭐⭐⭐ *¿Cómo quieres responder a las reseñas positivas?*`,
            { parse_mode: "Markdown" }
          );
        }
      }
      break;
    }
  }

  onboardingState.set(chatId, state);
}

export async function handleToneCallback(chatId: string, tone: string): Promise<void> {
  const state = onboardingState.get(chatId);
  if (!state || state.step !== "ask_tone") return;

  state.partial.tone = tone;
  state.step = "confirm_sample";

  const businessName = state.partial.businessName ?? "tu negocio";

  await bot.api.sendMessage(chatId, `✅ Tono: *${TONE_LABELS[tone] ?? tone}*\n\n⏳ Generando una respuesta de muestra...`, {
    parse_mode: "Markdown",
  });

  try {
    const reviews = await fetchReviewsMock(
      { name: businessName, gmbAccountId: "", gmbLocationId: "", lastCheckedAt: null },
      null
    );
    const sample = reviews.find((r) => r.comment.length > 20 && !r.reviewReply) ?? reviews[0];

    const personaForGenerator = {
      id: "preview",
      businessId: state.businessId ?? "preview",
      tone: state.partial.tone ?? "warm",
      goodInstructions: state.partial.goodInstructions ?? "",
      mediumInstructions: state.partial.mediumInstructions ?? "",
      badInstructions: state.partial.badInstructions ?? "",
      language: state.partial.language ?? "es",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sampleReply = await generateReply(sample, businessName, personaForGenerator, personaForGenerator.language);

    await bot.api.sendMessage(
      chatId,
      `📝 *Así respondería yo a esta reseña:*\n\n` +
        `_"${sample.comment.slice(0, 120)}${sample.comment.length > 120 ? "…" : ""}"_\n\n` +
        `*Mi respuesta:*\n${sampleReply}\n\n` +
        `¿Refleja el estilo de tu negocio? Responde *Sí* para activar el piloto automático, o *No* para ajustar.`,
      { parse_mode: "Markdown" }
    );
  } catch {
    await bot.api.sendMessage(
      chatId,
      `¿Listo para activar el piloto automático? Responde *Sí* para empezar, o *No* para ajustar algo.`,
      { parse_mode: "Markdown" }
    );
  }

  onboardingState.set(chatId, state);
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function activateAutopilot(
  chatId: string,
  businessId: string | null,
  partial: Required<PersonaPartial>
): Promise<void> {
  let resolvedBusinessId = businessId;

  // Fresh onboarding (no web account) — create shadow user + business
  if (!resolvedBusinessId) {
    const email = `telegram_${chatId}@autoreplai.app`;

    // Create or reuse shadow auth user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    let userId = users.find((u) => u.email === email)?.id;

    if (!userId) {
      const { data: created } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { telegram_chat_id: chatId },
      });
      userId = created.user?.id;
    }

    if (!userId) {
      await bot.api.sendMessage(chatId, "❌ No pude crear tu cuenta. Contacta con soporte.");
      return;
    }

    // Ensure profile exists
    await supabase.from("profiles").upsert({ id: userId, email }, { onConflict: "id" });

    // Link telegram
    await supabase.from("telegram_links").upsert(
      { user_id: userId, telegram_user_id: Number(chatId) },
      { onConflict: "user_id" }
    );

    // Create business
    const { data: biz } = await supabase
      .from("businesses")
      .insert({
        user_id: userId,
        name: partial.businessName,
        google_account_id: null,
        google_location_id: null,
        google_place_id: "pending",
      })
      .select("id")
      .single();

    if (!biz) {
      await bot.api.sendMessage(chatId, "❌ No pude crear tu negocio. Contacta con soporte.");
      return;
    }
    resolvedBusinessId = biz.id;
  }

  await supabase.from("personas").upsert(
    {
      business_id: resolvedBusinessId,
      tone: partial.tone,
      good_instructions: partial.goodInstructions,
      medium_instructions: partial.mediumInstructions,
      bad_instructions: partial.badInstructions,
      language: partial.language,
    },
    { onConflict: "business_id" }
  );

  await supabase
    .from("businesses")
    .update({ autopilot_enabled: true })
    .eq("id", resolvedBusinessId);

  onboardingState.delete(chatId);

  await bot.api.sendMessage(
    chatId,
    `✅ *¡Piloto automático activado!*\n\n` +
      `A partir de ahora responderé a tus nuevas reseñas de Google automáticamente.\n\n` +
      `Recibirás un resumen diario cada mañana.\n\n` +
      `Comandos útiles:\n` +
      `• /pause — pausar el piloto automático\n` +
      `• /resume — reactivarlo\n` +
      `• /status — ver actividad reciente`,
    { parse_mode: "Markdown" }
  );
}
