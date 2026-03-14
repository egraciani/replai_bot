import type { BusinessData, GoogleReview, PlaceResult } from "./types.js";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const BASE = "https://places.googleapis.com/v1/places";

const headers = {
  "Content-Type": "application/json",
  "X-Goog-Api-Key": API_KEY,
};

async function resolveShortUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return res.url;
  } catch {
    return url;
  }
}

function extractQueryFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    const q = u.searchParams.get("q");
    if (q) return q;
    return null;
  } catch {
    return null;
  }
}

function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text) || text.includes("maps.google") || text.includes("goo.gl");
}

export async function findBusiness(query: string): Promise<PlaceResult | null> {
  let searchQuery = query;

  if (isUrl(query)) {
    const resolved = await resolveShortUrl(query);
    searchQuery = extractQueryFromUrl(resolved) ?? query;
  }

  const res = await fetch(`${BASE}:searchText`, {
    method: "POST",
    headers: {
      ...headers,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating",
    },
    body: JSON.stringify({ textQuery: searchQuery, languageCode: "es" }),
  });

  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName: { text: string };
      formattedAddress: string;
      rating?: number;
    }>;
  };

  if (!data.places?.length) return null;

  const place = data.places[0];
  return {
    placeId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    rating: place.rating ?? 0,
  };
}

export async function getBusinessReviews(placeId: string): Promise<BusinessData> {
  const res = await fetch(`${BASE}/${placeId}`, {
    headers: {
      ...headers,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,rating,userRatingCount,reviews,types",
    },
  });

  const data = (await res.json()) as {
    displayName: { text: string };
    formattedAddress: string;
    rating: number;
    userRatingCount: number;
    types?: string[];
    reviews?: Array<{
      rating: number;
      relativePublishTimeDescription: string;
      text?: { text: string };
      authorAttribution: { displayName: string };
    }>;
  };

  const typeMap: Record<string, string> = {
    restaurant: "restaurante",
    food: "restaurante",
    cafe: "café",
    bar: "bar",
    lodging: "hotel",
    health_and_beauty: "negocio de salud y belleza",
    doctor: "clínica",
    dentist: "clínica dental",
    beauty_salon: "salón de belleza",
    hair_care: "peluquería",
    gym: "gimnasio",
    store: "tienda",
    clothing_store: "tienda de ropa",
    supermarket: "supermercado",
  };

  const rawTypes = data.types ?? [];
  const businessType = rawTypes.map((t) => typeMap[t]).find(Boolean) ?? "negocio";

  const reviews: GoogleReview[] = (data.reviews ?? [])
    .filter((r) => r.text?.text && r.text.text.trim().length > 10)
    .slice(0, 5)
    .map((r) => ({
      author_name: r.authorAttribution.displayName,
      rating: r.rating,
      text: r.text!.text,
      relative_time_description: r.relativePublishTimeDescription,
    }));

  return {
    name: data.displayName.text,
    address: data.formattedAddress,
    rating: data.rating,
    totalReviews: data.userRatingCount,
    type: businessType,
    reviews,
  };
}

export function selectReviewsForExamples(reviews: GoogleReview[]): GoogleReview[] {
  if (reviews.length <= 3) return reviews;

  const negative = reviews.filter((r) => r.rating <= 3);
  const positive = reviews.filter((r) => r.rating > 3);

  const selected: GoogleReview[] = [];

  // Include at least 1 negative review if available
  if (negative.length > 0) {
    selected.push(negative[0]);
  }

  // Fill the rest with highest-rated reviews not already selected
  for (const r of positive) {
    if (selected.length >= 3) break;
    selected.push(r);
  }

  // If still under 3, fill from remaining negatives
  for (const r of negative.slice(1)) {
    if (selected.length >= 3) break;
    selected.push(r);
  }

  return selected.slice(0, 3);
}
