import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const url: string = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Resolve short URLs and extract search query
  let searchQuery = url;
  if (/^https?:\/\//i.test(url) || url.includes("maps.google") || url.includes("goo.gl")) {
    try {
      const resolved = await fetch(url, { redirect: "follow" }).then((r) => r.url);
      const parsed = new URL(resolved);
      const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/@]+)/);
      if (placeMatch) {
        searchQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      } else if (parsed.searchParams.get("q")) {
        searchQuery = parsed.searchParams.get("q")!;
      }
    } catch {
      // Use raw URL as query
    }
  }

  // Call Places API Text Search
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: searchQuery, languageCode: "es" }),
  });

  if (!res.ok) {
    console.error("Places API error:", await res.text());
    return NextResponse.json({ error: "No se pudo buscar el negocio" }, { status: 502 });
  }

  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName: { text: string };
      formattedAddress: string;
      rating?: number;
      userRatingCount?: number;
    }>;
  };

  if (!data.places?.length) {
    return NextResponse.json({ error: "No se encontró ningún negocio con esa URL" }, { status: 404 });
  }

  const place = data.places[0];
  return NextResponse.json({
    placeId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    rating: place.rating ?? 0,
    reviewCount: place.userRatingCount ?? 0,
  });
}
