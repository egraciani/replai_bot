export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

export interface BusinessData {
  name: string;
  address: string;
  rating: number;
  totalReviews: number;
  type: string;
  reviews: GoogleReview[];
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number;
}

// Database row types

export interface DbBusiness {
  id: string;
  user_id: string;
  name: string;
  google_place_id: string | null;
  google_location_id: string | null;
  location_name: string | null;
  location_address: string | null;
}

export interface DbReview {
  id: string;
  business_id: string;
  author_name: string;
  rating: number;
  review_text: string;
  google_review_id: string | null;
  created_at: string;
  responses?: DbResponse[];
}

export interface DbResponse {
  id: string;
  review_id: string;
  generated_text: string;
  final_text: string | null;
  status: "pending" | "approved" | "edited" | "rejected";
}

export interface GenerateResult {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}
