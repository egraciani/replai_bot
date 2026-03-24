import Anthropic from "@anthropic-ai/sdk";
import type { GoogleReview, GenerateResult } from "./types.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
});

export async function generateInsights(
  reviews: GoogleReview[],
  businessName: string,
  businessType: string
): Promise<string> {
  const reviewsText = reviews
    .map(
      (r, i) =>
        `${i + 1}. ⭐${r.rating}/5 — ${r.author_name} (${r.relative_time_description}): "${r.text}"`
    )
    .join("\n\n");

  const allPositive = reviews.every((r) => r.rating >= 4);

  const prompt = `Eres un experto en reputación online para negocios locales.
Analiza estas ${reviews.length} reseñas reales de "${businessName}", un ${businessType}:

${reviewsText}

Responde en español con este formato exacto (máx. 150 palabras en total):

🌟 *Puntos fuertes*: [lo que los clientes mencionan positivamente con más frecuencia]${
    allPositive
      ? "\n🌟 *También destacan*: [segundo punto fuerte mencionado]"
      : "\n⚠️ *Área de mejora*: [quejas o sugerencias recurrentes]"
  }
💡 *Consejo*: [una acción concreta y específica para mejorar la reputación online de este negocio]

Sé específico, menciona detalles del negocio. No uses frases genéricas.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text.trim();
}

export async function generateDemoResponse(
  review: GoogleReview,
  businessName: string,
  businessType: string
): Promise<string> {
  const stars = "⭐".repeat(review.rating);
  const prompt = `Eres el responsable de comunicación de "${businessName}", un ${businessType}.
Un cliente ha dejado esta reseña en Google:

${stars} (${review.rating}/5) — ${review.author_name} (${review.relative_time_description})
"${review.text}"

Escribe una respuesta profesional, cálida y personalizada en español.
- Máximo 120 palabras.
- Responde específicamente al contenido de la reseña (menciona detalles concretos si los hay).
- Si la reseña es positiva, agradece y refuerza la experiencia.
- Si es negativa, muestra empatía, pide disculpas y ofrece solución.
- Firma como equipo de ${businessName}.
- No uses frases genéricas como "Gracias por tu opinión".
- Tono: profesional pero cercano.

Escribe solo la respuesta, sin explicaciones adicionales.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text.trim();
}

export async function generateReviewResponse(
  reviewText: string,
  authorName: string,
  rating: number,
  businessName: string,
  businessType: string = "negocio"
): Promise<GenerateResult> {
  const stars = "⭐".repeat(rating);
  const prompt = `Eres el responsable de comunicación de "${businessName}", un ${businessType}.
Un cliente ha dejado esta reseña en Google:

${stars} (${rating}/5) — ${authorName}
"${reviewText}"

Escribe una respuesta profesional, cálida y personalizada en español.
- Máximo 120 palabras.
- Responde específicamente al contenido de la reseña (menciona detalles concretos si los hay).
- Si la reseña es positiva, agradece y refuerza la experiencia.
- Si es negativa, muestra empatía, pide disculpas y ofrece solución.
- Firma como equipo de ${businessName}.
- No uses frases genéricas como "Gracias por tu opinión".
- Tono: profesional pero cercano.

Escribe solo la respuesta, sin explicaciones adicionales.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  return {
    text: block.text.trim(),
    model: "claude-sonnet-4-6",
    promptTokens: message.usage.input_tokens,
    completionTokens: message.usage.output_tokens,
  };
}
