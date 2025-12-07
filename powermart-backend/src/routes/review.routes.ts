import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.middleware.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import * as reviewController from '../controllers/review.controller.ts';

const router = Router();

// Validation rules
const createReviewValidation = [
  body('productId').isUUID().withMessage('Valid product ID is required'),
  body('orderItemId').isUUID().withMessage('Valid order item ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().trim().isLength({ max: 2000 }),
];

const updateReviewValidation = [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().trim().isLength({ max: 2000 }),
];

const reviewIdValidation = [
  param('reviewId').isUUID().withMessage('Invalid review ID'),
];

const productIdValidation = [
  param('productId').isUUID().withMessage('Invalid product ID'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

// ===== Public Routes =====

// Get reviews for a product (public)
router.get(
  '/products/:productId/reviews',
  productIdValidation,
  paginationValidation,
  validate,
  reviewController.getProductReviews
);

// Get review summary for a product (public)
router.get(
  '/products/:productId/reviews/summary',
  productIdValidation,
  validate,
  reviewController.getProductReviewSummary
);

// Get single review by ID (public)
router.get(
  '/:reviewId',
  reviewIdValidation,
  validate,
  reviewController.getReviewById
);

// ===== Authenticated Routes =====

// Get current user's reviews
router.get(
  '/me',
  authenticate,
  paginationValidation,
  validate,
  reviewController.getUserReviews
);

// Create a review (buyer only)
router.post(
  '/',
  authenticate,
  createReviewValidation,
  validate,
  reviewController.createReview
);

// Update a review (owner only)
router.put(
  '/:reviewId',
  authenticate,
  reviewIdValidation,
  updateReviewValidation,
  validate,
  reviewController.updateReview
);

// Delete a review (owner only)
router.delete(
  '/:reviewId',
  authenticate,
  reviewIdValidation,
  validate,
  reviewController.deleteReview
);

export default router;
