import { createRequire } from "module";
import { createHash } from "crypto";
import { getBusinessReviews } from "../google.js";
import { supabase } from "../supabase.js";
import type { ServiceTier } from "../types.js";

interface Business {
  name: string;
  gmbAccountId: string;
  gmbLocationId: string;
  lastCheckedAt: Date | null;
}

interface PlacesBusiness {
  id: string;
  name: string;
  googlePlaceId: string;
  serviceTier: ServiceTier;
  lastCheckedAt: Date | null;
}

const require = createRequire(import.meta.url);
const mockData = require("../mock/reviews.json") as { reviews: unknown[] };

export interface GmbReview {
  reviewId: string;
  reviewer: { displayName: string; isAnonymous: boolean };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment: string;
  createTime: string;
  reviewReply: { comment: string; updateTime: string } | null;
}

const STAR_TO_INT: Record<GmbReview["starRating"], number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

export function starToInt(star: GmbReview["starRating"]): number {
  return STAR_TO_INT[star];
}

// ── Real GMB fetcher (used in production) ───────────────────────────────────

export async function fetchReviewsGmb(
  business: Business,
  accessToken: string,
  since: Date | null
): Promise<GmbReview[]> {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${business.gmbAccountId}/locations/${business.gmbLocationId}/reviews?pageSize=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GMB reviews fetch failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { reviews?: GmbReview[] };
  const reviews = data.reviews ?? [];

  if (!since) return reviews;
  return reviews.filter((r) => new Date(r.createTime) > since);
}

// ── Mock fetcher (used in development) ──────────────────────────────────────

export async function fetchReviewsMock(
  _business: Business,
  since: Date | null
): Promise<GmbReview[]> {
  const reviews = mockData.reviews as GmbReview[];
  if (!since) return reviews;
  return reviews.filter((r) => new Date(r.createTime) > since);
}

// ── Places API fetcher (manual/manager tiers) ──────────────────────────────

function reviewFingerprint(author: string, rating: number, text: string): string {
  const input = `${author}|${rating}|${text.slice(0, 100)}`;
  return createHash("md5").update(input).digest("hex");
}

export async function fetchReviewsPlaces(
  placeId: string,
  knownReviewIds: Set<string>
): Promise<GmbReview[]> {
  const data = await getBusinessReviews(placeId);

  return data.reviews
    .map((r) => {
      const id = reviewFingerprint(r.author_name, r.rating, r.text);
      return {
        reviewId: id,
        reviewer: { displayName: r.author_name, isAnonymous: false },
        starRating: intToStar(r.rating),
        comment: r.text,
        createTime: new Date().toISOString(),
        reviewReply: null,
      } as GmbReview;
    })
    .filter((r) => !knownReviewIds.has(r.reviewId));
}

const INT_TO_STAR: Record<number, GmbReview["starRating"]> = {
  1: "ONE", 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE",
};

export function intToStar(n: number): GmbReview["starRating"] {
  return INT_TO_STAR[Math.max(1, Math.min(5, Math.round(n)))] ?? "THREE";
}

// ── Auto-select based on env ─────────────────────────────────────────────────

export async function fetchNewReviews(
  business: Business,
  accessToken: string | null
): Promise<GmbReview[]> {
  const since = business.lastCheckedAt;
  if (process.env.REPLY_SERVICE === "gmb" && accessToken) {
    return fetchReviewsGmb(business, accessToken, since);
  }
  return fetchReviewsMock(business, since);
}
