import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { AllowedFileTypes, MaxFileSizes, ResourceType } from '../types/upload.types.js';

/**
 * Create file filter based on allowed types
 */
function createFileFilter(allowedTypes: readonly string[]) {
  return (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
  ): void => {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    
    if (!extension) {
      callback(new Error('Could not determine file extension'));
      return;
    }

    if (!allowedTypes.includes(extension)) {
      callback(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
      return;
    }

    callback(null, true);
  };
}

/**
 * Base multer configuration with memory storage
 * Files are stored in memory as Buffer for streaming to Cloudinary
 */
const storage = multer.memoryStorage();

/**
 * Upload middleware for product images
 * - Max 10 images per request
 * - Max 2MB per file
 * - Allowed formats: jpg, jpeg, png, webp, gif, avif
 */
export const uploadProductImages = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.image,
    files: 10,
  },
  fileFilter: createFileFilter(AllowedFileTypes.images),
}).array('images', 10);

/**
 * Upload middleware for single product image
 * - Max 2MB per file
 * - Allowed formats: jpg, jpeg, png, webp, gif, avif
 */
export const uploadProductImage = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.image,
    files: 1,
  },
  fileFilter: createFileFilter(AllowedFileTypes.images),
}).single('image');

/**
 * Upload middleware for product video
 * - Max 6MB per file
 * - Allowed formats: mp4, webm, mov, avi
 */
export const uploadProductVideo = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.video,
    files: 1,
  },
  fileFilter: createFileFilter(AllowedFileTypes.videos),
}).single('video');

/**
 * Upload middleware for shop logo
 * - Max 2MB per file
 * - Allowed formats: jpg, jpeg, png, webp
 */
export const uploadShopLogo = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.image,
    files: 1,
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'webp']),
}).single('logo');

/**
 * Upload middleware for shop banner
 * - Max 2MB per file
 * - Allowed formats: jpg, jpeg, png, webp
 */
export const uploadShopBanner = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.image,
    files: 1,
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'webp']),
}).single('banner');

/**
 * Upload middleware for user avatar
 * - Max 2MB per file
 * - Allowed formats: jpg, jpeg, png, webp
 */
export const uploadUserAvatar = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.image,
    files: 1,
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'webp']),
}).single('avatar');

/**
 * Upload middleware for category image
 * - Max 2MB per file
 * - Allowed formats: jpg, jpeg, png, webp
 */
export const uploadCategoryImage = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.image,
    files: 1,
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'webp']),
}).single('image');

/**
 * Upload middleware for KYC documents (secure)
 * - Max 20MB per file
 * - Allowed formats: jpg, jpeg, png, pdf
 */
export const uploadKycDocument = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.document,
    files: 1,
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'pdf']),
}).single('document');

/**
 * Upload middleware for multiple KYC documents
 * - Max 5 documents per request
 * - Max 20MB per file
 * - Allowed formats: jpg, jpeg, png, pdf
 */
export const uploadKycDocuments = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.document,
    files: 5,
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'pdf']),
}).array('documents', 5);

/**
 * Upload middleware for vendor documents (secure)
 * - Max 20MB per file
 * - Allowed formats: jpg, jpeg, png, pdf, doc, docx
 */
export const uploadVendorDocument = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.document,
    files: 1,
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']),
}).single('document');

/**
 * Upload middleware for multiple vendor documents
 * - Max 10 documents per request
 * - Max 20MB per file
 */
export const uploadVendorDocuments = multer({
  storage,
  limits: {
    fileSize: MaxFileSizes.document,
    files: 10,
  },
  fileFilter: createFileFilter(['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']),
}).array('documents', 10);

/**
 * Generic upload middleware factory
 * Create custom upload middleware with specific settings
 */
export function createUploadMiddleware(options: {
  fieldName: string;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes: readonly string[];
}) {
  const { fieldName, maxFiles = 1, maxFileSize = MaxFileSizes.image, allowedTypes } = options;

  const multerConfig = multer({
    storage,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
    },
    fileFilter: createFileFilter(allowedTypes),
  });

  return maxFiles === 1 
    ? multerConfig.single(fieldName)
    : multerConfig.array(fieldName, maxFiles);
}

/**
 * Handle multer errors with user-friendly messages
 */
export function handleMulterError(error: Error): string {
  if (error.message.includes('File too large')) {
    return 'File size exceeds the maximum allowed limit';
  }
  if (error.message.includes('Too many files')) {
    return 'Too many files uploaded at once';
  }
  if (error.message.includes('Invalid file type')) {
    return error.message;
  }
  if (error.message.includes('Unexpected field')) {
    return 'Unexpected file field name in request';
  }
  return 'File upload failed';
}
