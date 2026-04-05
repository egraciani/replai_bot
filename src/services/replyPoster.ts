interface Business {
  name: string;
  gmbAccountId: string;
  gmbLocationId: string;
}

// ── Real GMB reply poster ─────────────────────────────────────────────────────

export async function postReplyGmb(
  business: Business,
  reviewId: string,
  reply: string,
  accessToken: string
): Promise<void> {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${business.gmbAccountId}/locations/${business.gmbLocationId}/reviews/${reviewId}/reply`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: reply }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GMB reply POST failed ${res.status}: ${body}`);
  }
}

// ── Mock reply poster ─────────────────────────────────────────────────────────

export async function postReplyMock(
  business: Business,
  reviewId: string,
  reply: string
): Promise<void> {
  console.log(
    `[MOCK] Posted reply to review ${reviewId} for "${business.name}":\n  "${reply.slice(0, 80)}..."`
  );
}

// ── Auto-select based on env ──────────────────────────────────────────────────

export async function postReply(
  business: Business,
  reviewId: string,
  reply: string,
  accessToken: string | null
): Promise<void> {
  if (process.env.REPLY_SERVICE === "gmb" && accessToken) {
    return postReplyGmb(business, reviewId, reply, accessToken);
  }
  return postReplyMock(business, reviewId, reply);
}
