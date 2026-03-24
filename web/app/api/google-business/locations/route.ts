import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google-business";

interface GoogleAccount {
  name: string; // "accounts/123"
  accountName: string;
  type: string;
}

interface GoogleLocation {
  name: string; // "locations/456"
  title: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getValidAccessToken(supabase, user.id);

    // 1. List accounts
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!accountsRes.ok) {
      const body = await accountsRes.text();
      console.error("Google accounts API error:", body);
      return NextResponse.json(
        { error: "Failed to fetch Google Business accounts" },
        { status: 502 }
      );
    }

    const accountsData = await accountsRes.json();
    const accounts: GoogleAccount[] = accountsData.accounts || [];

    // 2. For each account, list locations
    const locations: {
      accountId: string;
      accountName: string;
      locationId: string;
      locationName: string;
      address: string;
    }[] = [];

    for (const account of accounts) {
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!locRes.ok) continue;

      const locData = await locRes.json();
      const locs: GoogleLocation[] = locData.locations || [];

      for (const loc of locs) {
        const addr = loc.storefrontAddress;
        const addressParts = [
          ...(addr?.addressLines || []),
          addr?.locality,
          addr?.administrativeArea,
          addr?.postalCode,
        ].filter(Boolean);

        locations.push({
          accountId: account.name,
          accountName: account.accountName,
          locationId: loc.name,
          locationName: loc.title,
          address: addressParts.join(", "),
        });
      }
    }

    return NextResponse.json({ locations });
  } catch (err) {
    console.error("Locations fetch error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch locations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
