import { franc } from "franc-min";

// Returns ISO 639-3 code or falls back to the persona's configured language.
// franc-min maps: spa→es, eng→en, fra→fr, deu→de, ita→it, por→pt, etc.

const FRANC_TO_ISO2: Record<string, string> = {
  spa: "es",
  eng: "en",
  fra: "fr",
  deu: "de",
  ita: "it",
  por: "pt",
  nld: "nl",
  cat: "ca",
};

const SUPPORTED = new Set(Object.values(FRANC_TO_ISO2));

export function detectLanguage(text: string, fallback: string): string {
  const trimmed = text.trim();

  // Too short or emoji-only — franc gives garbage results
  if (trimmed.length < 10) return fallback;

  const detected = franc(trimmed);
  if (detected === "und") return fallback;

  const iso2 = FRANC_TO_ISO2[detected];
  if (!iso2 || !SUPPORTED.has(iso2)) return fallback;

  return iso2;
}
