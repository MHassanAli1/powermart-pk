export interface CreateReviewRequest {
  productId: string;
  orderItemId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

export interface ReviewResponse {
  id: string;
  productId: string;
  userId: string;
  orderId: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
  } | undefined;
  product?: {
    id: string;
    name: string;
  } | undefined;
}

export interface ReviewSummary {
  productId: string;
  avgRating: number;
  reviewCount: number;
}

export interface PaginatedReviewsResponse {
  reviews: ReviewResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
