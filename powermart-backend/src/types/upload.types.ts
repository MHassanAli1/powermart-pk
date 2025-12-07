/**
 * Upload Types for Cloudinary Integration
 */

export enum ResourceType {
  IMAGE = 'image',
  VIDEO = 'video',
  RAW = 'raw', // For documents like PDFs
}

export enum UploadAccess {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

/**
 * Upload result from Cloudinary
 */
export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width?: number | undefined;
  height?: number | undefined;
  bytes: number;
  resourceType: string;
  createdAt: string;
  folder: string;
  originalFilename: string;
  duration?: number | undefined; // For videos
}

/**
 * Options for uploading files
 */
export interface UploadOptions {
  folder: string;
  resourceType?: ResourceType | undefined;
  access?: UploadAccess | undefined;
  allowedFormats?: string[] | undefined;
  maxFileSize?: number | undefined; // in bytes
  transformation?: ImageTransformation | undefined;
}

/**
 * Image transformation options
 */
export interface ImageTransformation {
  width?: number | undefined;
  height?: number | undefined;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit' | undefined;
  quality?: 'auto' | number | undefined;
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif' | undefined;
}

/**
 * KYC Document upload request
 */
export interface KycDocumentUpload {
  userId: string;
  documentType: 'cnic_front' | 'cnic_back' | 'business_license' | 'tax_certificate' | 'other';
  file: Express.Multer.File;
}

/**
 * Product image upload request
 */
export interface ProductImageUpload {
  productId?: string | undefined; // Optional for new products
  files: Express.Multer.File[];
  isPrimary?: boolean | undefined;
}

/**
 * Upload response for API
 */
export interface UploadResponse {
  success: boolean;
  data?: UploadResult | UploadResult[] | undefined;
  error?: string | undefined;
}

/**
 * Secure URL response for private assets
 */
export interface SecureUrlResponse {
  url: string;
  expiresAt: Date;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string | undefined;
}

/**
 * Allowed file types configuration
 */
export const AllowedFileTypes = {
  images: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
  videos: ['mp4', 'webm', 'mov', 'avi'],
  documents: ['pdf', 'doc', 'docx'],
} as const;

/**
 * Max file size configuration (in bytes)
 */
export const MaxFileSizes = {
  image: 2 * 1024 * 1024, // 2MB
  video: 6 * 1024 * 1024,  // 6MB
  document: 20 * 1024 * 1024, // 20MB
} as const;
