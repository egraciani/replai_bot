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
  // Use legacy Places API to get reviews sorted by newest
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "name,formatted_address,rating,user_ratings_total,reviews,types",
    reviews_sort: "newest",
    language: "es",
    key: API_KEY,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );

  const json = (await res.json()) as {
    result: {
      name: string;
      formatted_address: string;
      rating: number;
      user_ratings_total: number;
      types?: string[];
      reviews?: Array<{
        author_name: string;
        rating: number;
        text: string;
        relative_time_description: string;
      }>;
    };
  };

  const data = json.result;

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
    .filter((r) => r.text && r.text.trim().length > 10)
    .slice(0, 5)
    .map((r) => ({
      author_name: r.author_name,
      rating: r.rating,
      text: r.text,
      relative_time_description: r.relative_time_description,
    }));

  return {
    name: data.name,
    address: data.formatted_address,
    rating: data.rating,
    totalReviews: data.user_ratings_total,
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
