
export interface ReviewData {
  url: string;
  review: string;
  starRating: number;
  name: string;
  email: string;
  location: string;
  date: string;
  isVerified: string; // "TRUE" or "FALSE" or ""
}

export interface GenerationStats {
  url: string;
  count: number;
  averageRating: number;
}
