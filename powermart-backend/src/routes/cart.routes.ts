import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.middleware.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import * as cartController from '../controllers/cart.controller.ts';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// Validation rules
const addToCartValidation = [
  body('productId').isUUID().withMessage('Valid product ID is required'),
  body('variantId').optional().isUUID().withMessage('Invalid variant ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

const updateCartItemValidation = [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or greater'),
];

const itemIdValidation = [
  param('itemId').isUUID().withMessage('Invalid item ID'),
];

// ===== Cart Routes =====

// Get user's cart
router.get('/', cartController.getCart);

// Validate cart for checkout
router.get('/validate', cartController.validateCart);

// Add item to cart
router.post('/items', addToCartValidation, validate, cartController.addToCart);

// Update cart item quantity
router.put(
  '/items/:itemId',
  itemIdValidation,
  updateCartItemValidation,
  validate,
  cartController.updateCartItem
);

// Remove item from cart
router.delete(
  '/items/:itemId',
  itemIdValidation,
  validate,
  cartController.removeFromCart
);

// Clear entire cart
router.delete('/', cartController.clearCart);

export default router;
