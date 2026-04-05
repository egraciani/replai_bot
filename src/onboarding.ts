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
}

type OnboardingStep =
  | "ask_good"
  | "ask_medium"
  | "ask_bad"
  | "ask_tone"
  | "confirm_sample"
  | "done";

const onboardingState = new Map<
  string, // telegramChatId
  {
    businessId: string;
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
    partial: { language: "es" },
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

export function isOnboarding(chatId: string): boolean {
  return onboardingState.has(chatId);
}

export async function handleOnboardingMessage(chatId: string, text: string): Promise<void> {
  const state = onboardingState.get(chatId);
  if (!state) return;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", state.businessId)
    .single();
  if (!business) return;

  switch (state.step) {
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
          state.partial = { language: state.partial.language };
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

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", state.businessId)
    .single();
  if (!business) return;

  await bot.api.sendMessage(chatId, `✅ Tono: *${TONE_LABELS[tone] ?? tone}*\n\n⏳ Generando una respuesta de muestra...`, {
    parse_mode: "Markdown",
  });

  try {
    const reviews = await fetchReviewsMock(
      { name: business.name, gmbAccountId: "", gmbLocationId: "", lastCheckedAt: null },
      null
    );
    const sample = reviews.find((r) => r.comment.length > 20 && !r.reviewReply) ?? reviews[0];

    const personaForGenerator = {
      id: "preview",
      businessId: state.businessId,
      tone: state.partial.tone ?? "warm",
      goodInstructions: state.partial.goodInstructions ?? "",
      mediumInstructions: state.partial.mediumInstructions ?? "",
      badInstructions: state.partial.badInstructions ?? "",
      language: state.partial.language ?? "es",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const sampleReply = await generateReply(sample, business.name, personaForGenerator, personaForGenerator.language);

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
  businessId: string,
  partial: Required<PersonaPartial>
): Promise<void> {
  await supabase.from("personas").upsert(
    {
      business_id: businessId,
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
    .eq("id", businessId);

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
