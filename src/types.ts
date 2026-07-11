export interface Series {
  id: string;
  name: string;
  author?: string;
  publisher?: string;
  status: 'ongoing' | 'completed' | 'on_hold' | 'dropped';
  coverUrl?: string; // base64 or URL
  totalVolumes?: number; // Total planned volumes
  userId: string;
  createdAt: number;
}

export interface Volume {
  id: string;
  seriesId: string;
  volumeNumber: number;
  status: 'owned' | 'wishlist';
  purchaseDate?: string; // YYYY-MM-DD
  purchaseSource?: string; // Nguồn mua
  price?: number; // Giá mua
  notes?: string; // Ghi chú
  photoUrl?: string; // base64 photo of the book / purchase bill
  releaseDate?: string; // Ngày phát hành từ NXB
  createdAt: number;
}
