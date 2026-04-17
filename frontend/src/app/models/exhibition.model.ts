export interface ExhibitionPhoto {
  id: number;
  exhibitionId: number;
  title?: string;
  imageurl: string;
  order: number;
}

export interface Exhibition {
  id: number;
  title: string;
  description?: string;
  date: string;
  location?: string;
  order: number;
  photos: ExhibitionPhoto[];
}
