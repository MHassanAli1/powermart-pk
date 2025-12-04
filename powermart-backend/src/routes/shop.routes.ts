import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.middleware.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { isVendor, attachVendor, ownsShop } from '../middleware/vendor.middleware.ts';
import * as shopController from '../controllers/shop.controller.ts';

const router = Router();

// Validation rules
const createShopValidation = [
  body('name').notEmpty().trim().withMessage('Shop name is required'),
  body('description').optional().isString().trim(),
  body('address').optional().isString().trim(),
  body('logo').optional().isURL().withMessage('Invalid logo URL'),
];

const updateShopValidation = [
  body('name').optional().isString().trim().notEmpty(),
  body('description').optional().isString().trim(),
  body('address').optional().isString().trim(),
  body('logo').optional().isURL().withMessage('Invalid logo URL'),
];

const shopIdValidation = [
  param('shopId').isUUID().withMessage('Invalid shop ID'),
];

// All shop routes require authentication and vendor role
router.use(authenticate, isVendor, attachVendor);

// Create a new shop
router.post(
  '/',
  createShopValidation,
  validate,
  shopController.createShop
);

// Get all shops owned by the vendor
router.get('/', shopController.getMyShops);

// Get a specific shop by ID (public info + products for owner)
router.get(
  '/:shopId',
  shopIdValidation,
  validate,
  ownsShop,
  shopController.getShopById
);

// Update shop
router.put(
  '/:shopId',
  shopIdValidation,
  updateShopValidation,
  validate,
  ownsShop,
  shopController.updateShop
);

// Delete shop
router.delete(
  '/:shopId',
  shopIdValidation,
  validate,
  ownsShop,
  shopController.deleteShop
);

export default router;
