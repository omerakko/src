export interface Painting {
  id: number;
  title: string;
  medium: string;
  year: number;
  imageurl: string;
  // Pixel dimensions recorded at upload. Optional because rows created
  // before the columns existed, or with an unreadable header, have none —
  // the gallery falls back to a default ratio for those.
  imagewidth?: number | null;
  imageheight?: number | null;
  categories: string[];
  description?: string;
  price?: number;
  isavailable: boolean;
  order: number;
  featured: boolean;
}

export interface PaintingsResponse {
  paintings: Painting[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface FeaturedResponse {
  paintings: Painting[];
}
