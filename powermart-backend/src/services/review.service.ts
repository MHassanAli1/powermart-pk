import { prisma } from '../../lib/prisma.ts';
import type {
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewResponse,
  ReviewSummary,
  PaginatedReviewsResponse,
} from '../types/review.types.ts';

/**
 * Create a product review (buyer only, must have delivered order item)
 */
export async function createReview(
  userId: string,
  data: CreateReviewRequest
): Promise<ReviewResponse> {
  // Validate order item exists, belongs to user, and is delivered
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: data.orderItemId },
    include: {
      order: { select: { userId: true } },
      product: { select: { id: true, name: true } },
    },
  });

  if (!orderItem) {
    throw new Error('Order item not found');
  }

  if (orderItem.order.userId !== userId) {
    throw new Error('Unauthorized: You do not own this order');
  }

  if (orderItem.status !== 'DELIVERED') {
    throw new Error('You can only review delivered items');
  }

  if (orderItem.productId !== data.productId) {
    throw new Error('Product ID does not match order item');
  }

  // Check for existing review
  const existingReview = await prisma.productReview.findUnique({
    where: {
      productId_userId_orderItemId: {
        productId: data.productId,
        userId,
        orderItemId: data.orderItemId,
      },
    },
  });

  if (existingReview) {
    throw new Error('You have already reviewed this item');
  }

  // Create review
  const review = await prisma.productReview.create({
    data: {
      productId: data.productId,
      userId,
      orderId: orderItem.orderId,
      orderItemId: data.orderItemId,
      rating: data.rating,
      comment: data.comment ?? null,
      isVerifiedPurchase: true,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true } },
    },
  });

  return mapReviewToResponse(review);
}

/**
 * Update a review (owner only)
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  data: UpdateReviewRequest
): Promise<ReviewResponse> {
  const review = await prisma.productReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('Review not found');
  }

  if (review.userId !== userId) {
    throw new Error('Unauthorized: You can only edit your own reviews');
  }

  const updateData: { rating?: number; comment?: string | null } = {};
  if (data.rating !== undefined) updateData.rating = data.rating;
  if (data.comment !== undefined) updateData.comment = data.comment ?? null;

  const updatedReview = await prisma.productReview.update({
    where: { id: reviewId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true } },
    },
  });

  return mapReviewToResponse(updatedReview);
}

/**
 * Delete a review (owner only)
 */
export async function deleteReview(
  reviewId: string,
  userId: string
): Promise<void> {
  const review = await prisma.productReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error('Review not found');
  }

  if (review.userId !== userId) {
    throw new Error('Unauthorized: You can only delete your own reviews');
  }

  await prisma.productReview.delete({
    where: { id: reviewId },
  });
}

/**
 * Get reviews for a product (public, paginated)
 */
export async function getProductReviews(
  productId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedReviewsResponse> {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where: { productId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.productReview.count({ where: { productId } }),
  ]);

  return {
    reviews: reviews.map(mapReviewToResponse),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get review summary for a product (avgRating, count)
 */
export async function getProductReviewSummary(
  productId: string
): Promise<ReviewSummary> {
  const aggregation = await prisma.productReview.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { id: true },
  });

  return {
    productId,
    avgRating: aggregation._avg.rating ?? 0,
    reviewCount: aggregation._count.id,
  };
}

/**
 * Get a single review by ID
 */
export async function getReviewById(reviewId: string): Promise<ReviewResponse | null> {
  const review = await prisma.productReview.findUnique({
    where: { id: reviewId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true } },
    },
  });

  if (!review) return null;
  return mapReviewToResponse(review);
}

/**
 * Get user's reviews
 */
export async function getUserReviews(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedReviewsResponse> {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.productReview.count({ where: { userId } }),
  ]);

  return {
    reviews: reviews.map(mapReviewToResponse),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Helper to map Prisma result to response type
function mapReviewToResponse(review: any): ReviewResponse {
  return {
    id: review.id,
    productId: review.productId,
    userId: review.userId,
    orderId: review.orderId,
    orderItemId: review.orderItemId,
    rating: review.rating,
    comment: review.comment,
    isVerifiedPurchase: review.isVerifiedPurchase,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: review.user
      ? {
          id: review.user.id,
          name: review.user.name ?? review.user.email,
        }
      : undefined,
    product: review.product
      ? {
          id: review.product.id,
          name: review.product.name,
        }
      : undefined,
  };
}
