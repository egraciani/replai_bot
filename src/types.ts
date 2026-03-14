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
