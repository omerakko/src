export interface Painting {
  id: number;
  title: string;
  medium: string;
  year: number;
  imageurl: string;
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
