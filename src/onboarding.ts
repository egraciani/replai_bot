import { InlineKeyboard } from "grammy";
import { supabase } from "./supabase.js";
import { bot } from "./botInstance.js";
import { generateReply } from "./services/replyGenerator.js";
import { fetchReviewsMock, intToStar } from "./services/reviewFetcher.js";
import { findBusiness, getBusinessReviews } from "./google.js";
import type { PlaceResult, ServiceTier } from "./types.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonaPartial {
  tone?: string;
  goodInstructions?: string;
  mediumInstructions?: string;
  badInstructions?: string;
  language?: string;
  businessName?: string;
  placeId?: string;
}

type OnboardingStep =
  | "ask_business_name"
  | "confirm_business"
  | "ask_good"
  | "ask_medium"
  | "ask_bad"
  | "ask_tone"
  | "confirm_sample"
  | "done";

const onboardingState = new Map<
  string, // telegramChatId
  {
    businessId: string | null;
    userId: string | null;    // user_id from token, if available
    step: OnboardingStep;
    attempts: number;
    partial: PersonaPartial;
    placeCandidate?: PlaceResult;
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
    userId: null,
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

/**
 * Start onboarding asking for the business name first (fresh or fallback flow).
 * Pass userId if we have it from a token (to link the account).
 */
export async function startFreshOnboarding(chatId: string, userId?: string): Promise<void> {
  // If we have a userId, check if they already have a business (created via web)
  if (userId) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle();

    if (business) {
      // Link telegram to this user
      await supabase.from("telegram_links").upsert(
        { user_id: userId, telegram_user_id: Number(chatId) },
        { onConflict: "user_id" }
      );
      // Skip business name step — go straight to persona setup
      await startOnboarding(chatId, business.id);
      return;
    }
  }

  onboardingState.set(chatId, {
    businessId: null,
    userId: userId ?? null,
    step: "ask_business_name",
    attempts: 0,
    partial: { language: "es" },
  });

  await bot.api.sendMessage(
    chatId,
    `👋 ¡Hola! Soy el piloto automático de reseñas de Google.\n\n` +
      `Voy a aprender cómo responder a las reseñas de tu negocio. Solo necesito 2 minutos.\n\n` +
      `✍️ ¿Cuál es el nombre de tu negocio? Puedes escribir el nombre o pegar un enlace de Google Maps.`,
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
      await bot.api.sendMessage(chatId, "🔍 Buscando tu negocio...");

      let place: PlaceResult | null = null;
      try {
        place = await findBusiness(text);
      } catch (err) {
        console.error("findBusiness error:", err);
      }

      if (!place) {
        await bot.api.sendMessage(
          chatId,
          `❌ No encontré ningún negocio con ese nombre.\n` +
            `Intenta ser más específico (ciudad, tipo de negocio) o pega el enlace de Google Maps.`
        );
        break;
      }

      state.placeCandidate = place;
      state.step = "confirm_business";

      const stars = place.rating ? `⭐ ${place.rating}` : "";
      const keyboard = new InlineKeyboard()
        .text("✅ Sí, es este", `ob_biz_yes_${chatId}`)
        .text("❌ No, otro", `ob_biz_no_${chatId}`);

      await bot.api.sendMessage(
        chatId,
        `📍 *${place.name}*\n${place.address}${stars ? `\n${stars}` : ""}\n\n¿Es este tu negocio?`,
        { parse_mode: "Markdown", reply_markup: keyboard }
      );
      break;
    }

    case "confirm_business": {
      // Handled by callback query — ignore plain text here
      await bot.api.sendMessage(chatId, "Usa los botones de arriba para confirmar tu negocio.");
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
        await activateAutopilot(chatId, state.businessId, state.userId, state.partial as Required<PersonaPartial>);
      } else {
        state.attempts += 1;
        if (state.attempts >= 3) {
          await bot.api.sendMessage(
            chatId,
            `Voy a guardar esta configuración por ahora. Puedes ajustarla más tarde con /settings.`
          );
          await activateAutopilot(chatId, state.businessId, state.userId, state.partial as Required<PersonaPartial>);
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

export async function handleBusinessConfirmCallback(chatId: string, confirmed: boolean): Promise<void> {
  const state = onboardingState.get(chatId);
  if (!state || state.step !== "confirm_business") return;

  if (!confirmed) {
    state.step = "ask_business_name";
    state.placeCandidate = undefined;
    onboardingState.set(chatId, state);
    await bot.api.sendMessage(
      chatId,
      `No hay problema. ✍️ Escribe el nombre correcto o pega el enlace de Google Maps:`
    );
    return;
  }

  const place = state.placeCandidate!;
  state.partial.businessName = place.name;
  state.partial.placeId = place.placeId;
  state.step = "ask_good";
  onboardingState.set(chatId, state);

  await bot.api.sendMessage(
    chatId,
    `✅ *${place.name}* confirmado.\n\n` +
      `⭐⭐⭐⭐⭐ *¿Cómo quieres responder a las reseñas positivas (4-5 estrellas)?*\n\n` +
      `_Ejemplo: "Agradece el detalle mencionado y invita a volver pronto"_`,
    { parse_mode: "Markdown" }
  );
}

export async function handleToneCallback(chatId: string, tone: string): Promise<void> {
  const state = onboardingState.get(chatId);
  if (!state || state.step !== "ask_tone") return;

  state.partial.tone = tone;
  state.step = "confirm_sample";

  const businessName = state.partial.businessName ?? "tu negocio";

  // Try to get google_place_id if we have a businessId
  let googlePlaceId: string | null = null;
  if (state.businessId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("google_place_id")
      .eq("id", state.businessId)
      .single();
    googlePlaceId = biz?.google_place_id ?? null;
  }

  await bot.api.sendMessage(chatId, `✅ Tono: *${TONE_LABELS[tone] ?? tone}*\n\n⏳ Generando una respuesta de muestra...`, {
    parse_mode: "Markdown",
  });

  try {
    let sample;

    // Try real Places API reviews first
    if (googlePlaceId && googlePlaceId !== "pending") {
      try {
        const placeData = await getBusinessReviews(googlePlaceId);
        const realReview = placeData.reviews.find((r) => r.text.length > 20) ?? placeData.reviews[0];
        if (realReview) {
          sample = {
            reviewId: "sample",
            reviewer: { displayName: realReview.author_name, isAnonymous: false },
            starRating: intToStar(realReview.rating),
            comment: realReview.text,
            createTime: new Date().toISOString(),
            reviewReply: null,
          };
        }
      } catch {
        // Fall through to mock
      }
    }

    // Fall back to mock reviews
    if (!sample) {
      const reviews = await fetchReviewsMock(
        { name: businessName, gmbAccountId: "", gmbLocationId: "", lastCheckedAt: null },
        null
      );
      sample = reviews.find((r) => r.comment.length > 20 && !r.reviewReply) ?? reviews[0];
    }

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
  userId: string | null,
  partial: Required<PersonaPartial>
): Promise<void> {
  let resolvedBusinessId = businessId;

  // No existing business — create shadow user + business
  if (!resolvedBusinessId) {
    let resolvedUserId = userId;

    if (!resolvedUserId) {
      const email = `telegram_${chatId}@autoreplai.app`;
      const { data: { users } } = await supabase.auth.admin.listUsers();
      let existingId = users.find((u) => u.email === email)?.id;

      if (!existingId) {
        const { data: created } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { telegram_chat_id: chatId },
        });
        existingId = created.user?.id;
      }

      if (!existingId) {
        await bot.api.sendMessage(chatId, "❌ No pude crear tu cuenta. Contacta con soporte.");
        return;
      }
      resolvedUserId = existingId;
    }

    // Ensure profile exists
    const email = `telegram_${chatId}@autoreplai.app`;
    await supabase.from("profiles").upsert({ id: resolvedUserId, email }, { onConflict: "id" });

    // Link telegram
    await supabase.from("telegram_links").upsert(
      { user_id: resolvedUserId, telegram_user_id: Number(chatId) },
      { onConflict: "user_id" }
    );

    // Create business
    const { data: biz } = await supabase
      .from("businesses")
      .insert({
        user_id: resolvedUserId,
        name: partial.businessName,
        google_place_id: partial.placeId || "pending",
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

  // Get service tier for tier-aware message
  const { data: tierRow } = await supabase
    .from("businesses")
    .select("service_tier")
    .eq("id", resolvedBusinessId)
    .single();

  const tier: ServiceTier = tierRow?.service_tier ?? "manual";

  onboardingState.delete(chatId);

  const tierMessages: Record<ServiceTier, string> = {
    manual:
      `✅ *¡Configuración completada!*\n\n` +
      `Cuando detecte una nueva reseña, te enviaré una respuesta sugerida por aquí.\n` +
      `Solo tendrás que copiarla y pegarla en Google Maps.\n\n` +
      `Recibirás un resumen diario cada mañana.\n\n` +
      `Comandos útiles:\n` +
      `• /pause — pausar notificaciones\n` +
      `• /resume — reactivar\n` +
      `• /status — ver actividad reciente`,
    manager:
      `✅ *¡Configuración completada!*\n\n` +
      `Nuestro equipo se encargará de publicar las respuestas en Google Maps por ti.\n` +
      `Te notificaremos cuando se detecten nuevas reseñas.\n\n` +
      `Recibirás un resumen diario cada mañana.\n\n` +
      `Comandos útiles:\n` +
      `• /pause — pausar notificaciones\n` +
      `• /resume — reactivar\n` +
      `• /status — ver actividad reciente`,
    automated:
      `✅ *¡Piloto automático activado!*\n\n` +
      `A partir de ahora responderé a tus nuevas reseñas de Google automáticamente.\n\n` +
      `Recibirás un resumen diario cada mañana.\n\n` +
      `Comandos útiles:\n` +
      `• /pause — pausar el piloto automático\n` +
      `• /resume — reactivarlo\n` +
      `• /status — ver actividad reciente`,
  };

  await bot.api.sendMessage(chatId, tierMessages[tier], { parse_mode: "Markdown" });
}
