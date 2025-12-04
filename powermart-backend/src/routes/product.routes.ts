import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation.middleware.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { isVendor, attachVendor, ownsShop, ownsProduct } from '../middleware/vendor.middleware.ts';
import * as productController from '../controllers/product.controller.ts';

const router = Router();

// Validation rules
const createProductValidation = [
  body('name').notEmpty().trim().withMessage('Product name is required'),
  body('description').optional().isString().trim(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discount').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['DRAFT', 'ACTIVE', 'INACTIVE']),
  body('stock').optional().isInt({ min: 0 }),
  body('sku').optional().isString().trim(),
  body('categoryId').optional().isUUID(),
  body('images').optional().isArray(),
  body('images.*').optional().isURL().withMessage('Invalid image URL'),
  body('variants').optional().isArray(),
  body('variants.*.name').optional().notEmpty(),
  body('variants.*.value').optional().notEmpty(),
  body('variants.*.priceDiff').optional().isFloat(),
  body('variants.*.stock').optional().isInt({ min: 0 }),
];

const updateProductValidation = [
  body('name').optional().isString().trim().notEmpty(),
  body('description').optional().isString().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['DRAFT', 'ACTIVE', 'INACTIVE']),
  body('stock').optional().isInt({ min: 0 }),
  body('sku').optional().isString().trim(),
  body('categoryId').optional().isUUID(),
];

const shopIdValidation = [
  param('shopId').isUUID().withMessage('Invalid shop ID'),
];

const productIdValidation = [
  param('productId').isUUID().withMessage('Invalid product ID'),
];

const imageValidation = [
  body('url').isURL().withMessage('Valid image URL is required'),
];

const variantValidation = [
  body('name').notEmpty().withMessage('Variant name is required'),
  body('value').notEmpty().withMessage('Variant value is required'),
  body('priceDiff').optional().isFloat(),
  body('stock').optional().isInt({ min: 0 }),
];

const updateVariantValidation = [
  body('name').optional().isString().notEmpty(),
  body('value').optional().isString().notEmpty(),
  body('priceDiff').optional().isFloat(),
  body('stock').optional().isInt({ min: 0 }),
];

// All routes require authentication and vendor role
router.use(authenticate, isVendor, attachVendor);

// ===== Product CRUD Routes (scoped to shop) =====

// Create product in a shop
router.post(
  '/shops/:shopId/products',
  shopIdValidation,
  createProductValidation,
  validate,
  ownsShop,
  productController.createProduct
);

// Get all products in a shop (with filters and pagination)
router.get(
  '/shops/:shopId/products',
  shopIdValidation,
  validate,
  ownsShop,
  productController.getProductsByShop
);

// ===== Single Product Routes =====

// Get product by ID
router.get(
  '/products/:productId',
  productIdValidation,
  validate,
  ownsProduct,
  productController.getProductById
);

// Update product
router.put(
  '/products/:productId',
  productIdValidation,
  updateProductValidation,
  validate,
  ownsProduct,
  productController.updateProduct
);

// Delete product
router.delete(
  '/products/:productId',
  productIdValidation,
  validate,
  ownsProduct,
  productController.deleteProduct
);

// ===== Product Images =====

// Add image to product
router.post(
  '/products/:productId/images',
  productIdValidation,
  imageValidation,
  validate,
  ownsProduct,
  productController.addProductImage
);

// Delete product image
router.delete(
  '/products/:productId/images/:imageId',
  productIdValidation,
  param('imageId').isUUID(),
  validate,
  ownsProduct,
  productController.deleteProductImage
);

// ===== Product Variants =====

// Add variant to product
router.post(
  '/products/:productId/variants',
  productIdValidation,
  variantValidation,
  validate,
  ownsProduct,
  productController.addProductVariant
);

// Update product variant
router.put(
  '/products/:productId/variants/:variantId',
  productIdValidation,
  param('variantId').isUUID(),
  updateVariantValidation,
  validate,
  ownsProduct,
  productController.updateProductVariant
);

// Delete product variant
router.delete(
  '/products/:productId/variants/:variantId',
  productIdValidation,
  param('variantId').isUUID(),
  validate,
  ownsProduct,
  productController.deleteProductVariant
);

export default router;
