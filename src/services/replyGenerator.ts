import Anthropic from "@anthropic-ai/sdk";
import type { Persona } from "@prisma/client";
import type { GmbReview } from "./reviewFetcher.js";
import { starToInt } from "./reviewFetcher.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sentimentInstructions(rating: number, persona: Persona): string {
  if (rating >= 5) return persona.goodInstructions;
  if (rating >= 3) return persona.mediumInstructions;
  return persona.badInstructions;
}

function toneDescription(tone: string): string {
  const map: Record<string, string> = {
    warm: "warm and friendly",
    formal: "formal and professional",
    funny: "light-hearted and slightly humorous",
    professional: "professional and polished",
  };
  return map[tone] ?? "professional";
}

export async function generateReply(
  review: GmbReview,
  businessName: string,
  persona: Persona,
  replyLanguage: string
): Promise<string> {
  const rating = starToInt(review.starRating);
  const stars = "⭐".repeat(rating);
  const instructions = sentimentInstructions(rating, persona);

  const prompt = `You are responding to a Google review on behalf of "${businessName}".

Review (${stars} ${rating}/5) by ${review.reviewer.displayName}:
"${review.comment}"

Reply instructions from the business owner:
- Tone: ${toneDescription(persona.tone)}
- For this type of review (${rating <= 2 ? "negative" : rating <= 4 ? "mixed" : "positive"}): ${instructions}

Rules:
- Write ONLY the reply text, no explanations
- Maximum 120 words
- Write in ${replyLanguage === "es" ? "Spanish" : replyLanguage === "en" ? "English" : replyLanguage === "fr" ? "French" : replyLanguage === "de" ? "German" : replyLanguage === "it" ? "Italian" : "the same language as the review"}
- Mention specific details from the review if any
- Do NOT use generic phrases like "Thank you for your feedback"
- Sign as the team of ${businessName}`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response type");
  return block.text.trim();
}

export async function generateSummaryInsights(
  reviews: Array<{ reviewText: string; reviewRating: number }>,
  businessName: string
): Promise<{ positive: string[]; negative: string | null }> {
  if (!reviews.length) return { positive: [], negative: null };

  const reviewsText = reviews
    .map((r, i) => `${i + 1}. ⭐${r.reviewRating}/5: "${r.reviewText.slice(0, 150)}"`)
    .join("\n");

  const prompt = `Analyze these customer reviews for "${businessName}" and extract themes.
Return a JSON object with:
- "positive": array of exactly 2 short phrases (max 5 words each) describing what customers praise most
- "negative": one short phrase (max 5 words) describing the most common complaint, or null if no clear complaints

Reviews:
${reviewsText}

Return only valid JSON, no markdown.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response type");

  try {
    return JSON.parse(block.text.trim());
  } catch {
    return { positive: [], negative: null };
  }
}
