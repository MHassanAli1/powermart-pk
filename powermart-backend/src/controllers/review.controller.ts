import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import * as reviewService from '../services/review.service.ts';

/**
 * Create a product review (buyer only, must have delivered order item)
 */
export async function createReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const review = await reviewService.createReview(req.user.userId, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create review';
    const statusCode = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

/**
 * Update a review (owner only)
 */
export async function updateReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const reviewId = req.params.reviewId;
    if (!reviewId) {
      res.status(400).json({ success: false, error: 'Review ID is required' });
      return;
    }

    const review = await reviewService.updateReview(reviewId, req.user.userId, req.body);
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update review';
    const statusCode = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

/**
 * Delete a review (owner only)
 */
export async function deleteReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const reviewId = req.params.reviewId;
    if (!reviewId) {
      res.status(400).json({ success: false, error: 'Review ID is required' });
      return;
    }

    await reviewService.deleteReview(reviewId, req.user.userId);
    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete review';
    const statusCode = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

/**
 * Get a single review by ID
 */
export async function getReviewById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const reviewId = req.params.reviewId;
    if (!reviewId) {
      res.status(400).json({ success: false, error: 'Review ID is required' });
      return;
    }

    const review = await reviewService.getReviewById(reviewId);
    if (!review) {
      res.status(404).json({ success: false, error: 'Review not found' });
      return;
    }

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get review';
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * Get reviews for a product (public, paginated)
 */
export async function getProductReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const productId = req.params.productId;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await reviewService.getProductReviews(productId, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get product reviews';
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * Get review summary for a product (avgRating, count)
 */
export async function getProductReviewSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const productId = req.params.productId;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const summary = await reviewService.getProductReviewSummary(productId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get review summary';
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * Get authenticated user's reviews
 */
export async function getUserReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await reviewService.getUserReviews(req.user.userId, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user reviews';
    res.status(500).json({ success: false, error: message });
  }
}
