import type { Business } from "@prisma/client";
import mockData from "../mock/reviews.json";

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
