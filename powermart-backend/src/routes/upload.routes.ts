import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import * as uploadMiddleware from '../middleware/upload.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authenticateVendor } from '../middleware/vendor.middleware.js';

const router = Router();

// ==================== Public Asset Routes ====================

/**
 * Upload product images (public)
 * POST /api/upload/product/images
 * Body: multipart/form-data with 'images' field (up to 10 images)
 * Optional body field: productId
 */
router.post(
  '/product/images',
  authenticate,
  uploadMiddleware.uploadProductImages,
  uploadController.handleUploadError,
  uploadController.uploadProductImages
);

/**
 * Upload product video (public)
 * POST /api/upload/product/video
 * Body: multipart/form-data with 'video' field
 * Optional body field: productId
 */
router.post(
  '/product/video',
  authenticate,
  uploadMiddleware.uploadProductVideo,
  uploadController.handleUploadError,
  uploadController.uploadProductVideo
);

/**
 * Upload shop logo (public)
 * POST /api/upload/shop/logo
 * Body: multipart/form-data with 'logo' field and 'shopId'
 */
router.post(
  '/shop/logo',
  authenticateVendor,
  uploadMiddleware.uploadShopLogo,
  uploadController.handleUploadError,
  uploadController.uploadShopLogo
);

/**
 * Upload shop banner (public)
 * POST /api/upload/shop/banner
 * Body: multipart/form-data with 'banner' field and 'shopId'
 */
router.post(
  '/shop/banner',
  authenticateVendor,
  uploadMiddleware.uploadShopBanner,
  uploadController.handleUploadError,
  uploadController.uploadShopBanner
);

/**
 * Upload user avatar (public)
 * POST /api/upload/user/avatar
 * Body: multipart/form-data with 'avatar' field
 */
router.post(
  '/user/avatar',
  authenticate,
  uploadMiddleware.uploadUserAvatar,
  uploadController.handleUploadError,
  uploadController.uploadUserAvatar
);

/**
 * Upload category image (public, admin only)
 * POST /api/upload/category/image
 * Body: multipart/form-data with 'image' field
 * Optional body field: categoryId
 */
router.post(
  '/category/image',
  authenticate,
  uploadMiddleware.uploadCategoryImage,
  uploadController.handleUploadError,
  uploadController.uploadCategoryImage
);

// ==================== Secure Asset Routes ====================

/**
 * Upload KYC document (private/secure)
 * POST /api/upload/kyc/document
 * Body: multipart/form-data with 'document' field and 'documentType'
 * documentType: 'cnic_front' | 'cnic_back' | 'business_license' | 'tax_certificate' | 'other'
 */
router.post(
  '/kyc/document',
  authenticate,
  uploadMiddleware.uploadKycDocument,
  uploadController.handleUploadError,
  uploadController.uploadKycDocument
);

/**
 * Upload multiple KYC documents (private/secure)
 * POST /api/upload/kyc/documents
 * Body: multipart/form-data with 'documents' field (up to 5) and 'documentType'
 */
router.post(
  '/kyc/documents',
  authenticate,
  uploadMiddleware.uploadKycDocuments,
  uploadController.handleUploadError,
  uploadController.uploadKycDocument // Will handle multiple files
);

/**
 * Upload vendor document (private/secure)
 * POST /api/upload/vendor/document
 * Body: multipart/form-data with 'document' field and 'documentType'
 */
router.post(
  '/vendor/document',
  authenticateVendor,
  uploadMiddleware.uploadVendorDocument,
  uploadController.handleUploadError,
  uploadController.uploadVendorDocument
);

/**
 * Get secure URL for a private document
 * POST /api/upload/secure-url
 * Body: { publicId: string, expiresIn?: number (seconds) }
 * Only the document owner or admin can access
 */
router.post(
  '/secure-url',
  authenticate,
  uploadController.getSecureUrl
);

// ==================== Asset Management Routes ====================

/**
 * Delete an asset (admin only)
 * DELETE /api/upload/asset
 * Body: { publicId: string, resourceType?: 'image' | 'video' | 'raw' }
 */
router.delete(
  '/asset',
  authenticate,
  uploadController.deleteAsset
);

export default router;
