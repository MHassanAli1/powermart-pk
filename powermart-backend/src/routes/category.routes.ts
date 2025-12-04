import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.middleware.ts';
import { authenticate, authorize } from '../middleware/auth.middleware.ts';
import * as categoryController from '../controllers/category.controller.ts';
import { UserRole } from '../../prisma/generated/enums.ts';

const router = Router();

// Validation rules
const createCategoryValidation = [
  body('name').notEmpty().trim().withMessage('Category name is required'),
  body('slug').optional().isString().trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('description').optional().isString().trim(),
  body('image').optional().isURL().withMessage('Invalid image URL'),
  body('parentId').optional().isUUID().withMessage('Invalid parent category ID'),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
];

const updateCategoryValidation = [
  body('name').optional().isString().trim().notEmpty(),
  body('slug').optional().isString().trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('description').optional().isString().trim(),
  body('image').optional().isURL().withMessage('Invalid image URL'),
  body('parentId').optional({ nullable: true }).isUUID().withMessage('Invalid parent category ID'),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
];

const categoryIdValidation = [
  param('categoryId').isUUID().withMessage('Invalid category ID'),
];

const slugValidation = [
  param('slug').isString().matches(/^[a-z0-9-]+$/).withMessage('Invalid slug format'),
];

// ===== Public Routes =====

// Get root categories with their direct children
router.get('/', categoryController.getRootCategories);

// Get full category tree
router.get('/tree', categoryController.getCategoryTree);

// Get category by slug (for frontend URLs)
router.get('/slug/:slug', slugValidation, validate, categoryController.getCategoryBySlug);

// Get category by ID
router.get('/:categoryId', categoryIdValidation, validate, categoryController.getCategoryById);

// Get subcategories of a category
router.get('/:categoryId/subcategories', categoryIdValidation, validate, categoryController.getSubcategories);

// Get breadcrumb path
router.get('/:categoryId/breadcrumb', categoryIdValidation, validate, categoryController.getCategoryBreadcrumb);

// ===== Admin Routes =====

// Get all categories (including inactive) - Admin only
router.get(
  '/admin/all',
  authenticate,
  authorize(UserRole.ADMIN),
  categoryController.getAllCategories
);

// Create category - Admin only
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  createCategoryValidation,
  validate,
  categoryController.createCategory
);

// Update category - Admin only
router.put(
  '/:categoryId',
  authenticate,
  authorize(UserRole.ADMIN),
  categoryIdValidation,
  updateCategoryValidation,
  validate,
  categoryController.updateCategory
);

// Delete category - Admin only
router.delete(
  '/:categoryId',
  authenticate,
  authorize(UserRole.ADMIN),
  categoryIdValidation,
  validate,
  categoryController.deleteCategory
);

// Deactivate category and all descendants - Admin only
router.post(
  '/:categoryId/deactivate',
  authenticate,
  authorize(UserRole.ADMIN),
  categoryIdValidation,
  validate,
  categoryController.deactivateCategory
);

export default router;
