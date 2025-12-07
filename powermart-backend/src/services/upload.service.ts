import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';
import {
  cloudinary as configuredCloudinary,
  CloudinaryFolders,
  AssetType,
  generateSignedUrl,
  generatePrivateUrl,
  deleteAsset,
  deleteAssets,
} from '../../lib/cloudinary.js';
import {
  type UploadResult,
  type UploadOptions,
  ResourceType,
  UploadAccess,
  type ImageTransformation,
  type SecureUrlResponse,
  type FileValidationResult,
  AllowedFileTypes,
  MaxFileSizes,
} from '../types/upload.types.js';

/**
 * Map Cloudinary response to our UploadResult type
 */
function mapToUploadResult(response: UploadApiResponse): UploadResult {
  return {
    publicId: response.public_id,
    url: response.url,
    secureUrl: response.secure_url,
    format: response.format,
    width: response.width,
    height: response.height,
    bytes: response.bytes,
    resourceType: response.resource_type,
    createdAt: response.created_at,
    folder: response.folder ?? '',
    originalFilename: response.original_filename ?? '',
    duration: response.duration,
  };
}

/**
 * Upload a file buffer to Cloudinary
 */
async function uploadBuffer(
  buffer: Buffer,
  options: {
    folder: string;
    resourceType: string;
    type: string;
    publicId?: string | undefined;
    transformation?: ImageTransformation | undefined;
  }
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    // Build upload options, only including publicId if defined
    const uploadOptions: {
      folder: string;
      resource_type: 'image' | 'video' | 'raw';
      type: 'upload' | 'private' | 'authenticated';
      public_id?: string;
      transformation?: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string | number;
        fetch_format?: string;
      };
    } = {
      folder: options.folder,
      resource_type: options.resourceType as 'image' | 'video' | 'raw',
      type: options.type as 'upload' | 'private' | 'authenticated',
    };

    // Only add publicId if it's defined
    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    // Only add transformation if it's defined, and only include defined properties
    if (options.transformation) {
      const trans: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string | number;
        fetch_format?: string;
      } = {};
      
      if (options.transformation.width !== undefined) trans.width = options.transformation.width;
      if (options.transformation.height !== undefined) trans.height = options.transformation.height;
      if (options.transformation.crop !== undefined) trans.crop = options.transformation.crop;
      if (options.transformation.quality !== undefined) trans.quality = options.transformation.quality;
      if (options.transformation.format !== undefined) trans.fetch_format = options.transformation.format;
      
      uploadOptions.transformation = trans;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Upload failed - no result returned'));
        }
      }
    );

    // Create readable stream from buffer and pipe to upload stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

/**
 * Validate file type and size
 */
export function validateFile(
  file: Express.Multer.File,
  resourceType: ResourceType = ResourceType.IMAGE,
  allowedFormats?: string[]
): FileValidationResult {
  // Get file extension
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  
  if (!extension) {
    return { isValid: false, error: 'Could not determine file extension' };
  }

  // Determine allowed formats based on resource type
  let formats: readonly string[];
  let maxSize: number;

  switch (resourceType) {
    case ResourceType.IMAGE:
      formats = allowedFormats ?? AllowedFileTypes.images;
      maxSize = MaxFileSizes.image;
      break;
    case ResourceType.VIDEO:
      formats = allowedFormats ?? AllowedFileTypes.videos;
      maxSize = MaxFileSizes.video;
      break;
    case ResourceType.RAW:
      formats = allowedFormats ?? AllowedFileTypes.documents;
      maxSize = MaxFileSizes.document;
      break;
    default:
      formats = AllowedFileTypes.images;
      maxSize = MaxFileSizes.image;
  }

  // Check file extension
  if (!formats.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${formats.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { isValid: true };
}

/**
 * Upload a public image (products, avatars, logos)
 */
export async function uploadPublicImage(
  file: Express.Multer.File,
  folder: string,
  transformation?: ImageTransformation
): Promise<UploadResult> {
  const validation = validateFile(file, ResourceType.IMAGE);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const response = await uploadBuffer(file.buffer, {
    folder,
    resourceType: 'image',
    type: AssetType.PUBLIC,
    transformation,
  });

  return mapToUploadResult(response);
}

/**
 * Upload a public video (product videos)
 */
export async function uploadPublicVideo(
  file: Express.Multer.File,
  folder: string
): Promise<UploadResult> {
  const validation = validateFile(file, ResourceType.VIDEO);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const response = await uploadBuffer(file.buffer, {
    folder,
    resourceType: 'video',
    type: AssetType.PUBLIC,
  });

  return mapToUploadResult(response);
}

/**
 * Upload a private/secure document (KYC, vendor documents)
 * These require signed URLs to access
 */
export async function uploadSecureDocument(
  file: Express.Multer.File,
  folder: string,
  usePrivate: boolean = true
): Promise<UploadResult> {
  const validation = validateFile(file, ResourceType.RAW);
  if (!validation.isValid) {
    // Also allow images for ID documents
    const imageValidation = validateFile(file, ResourceType.IMAGE);
    if (!imageValidation.isValid) {
      throw new Error(validation.error);
    }
  }

  // Determine resource type based on file
  const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  const imageFormats: string[] = [...AllowedFileTypes.images];
  const isImage = imageFormats.includes(extension);
  const resourceType = isImage ? 'image' : 'raw';

  const response = await uploadBuffer(file.buffer, {
    folder,
    resourceType,
    type: usePrivate ? AssetType.PRIVATE : AssetType.AUTHENTICATED,
  });

  return mapToUploadResult(response);
}

/**
 * Upload product images (public)
 */
export async function uploadProductImages(
  files: Express.Multer.File[],
  productId?: string
): Promise<UploadResult[]> {
  const folder = productId 
    ? `${CloudinaryFolders.PRODUCTS}/${productId}`
    : CloudinaryFolders.PRODUCTS;

  const uploadPromises = files.map(file => 
    uploadPublicImage(file, folder, {
      width: 1200,
      height: 1200,
      crop: 'limit',
      quality: 'auto',
      format: 'auto',
    })
  );

  return Promise.all(uploadPromises);
}

/**
 * Upload product video (public)
 */
export async function uploadProductVideo(
  file: Express.Multer.File,
  productId?: string
): Promise<UploadResult> {
  const folder = productId
    ? `${CloudinaryFolders.PRODUCT_VIDEOS}/${productId}`
    : CloudinaryFolders.PRODUCT_VIDEOS;

  return uploadPublicVideo(file, folder);
}

/**
 * Upload shop logo (public)
 */
export async function uploadShopLogo(
  file: Express.Multer.File,
  shopId: string
): Promise<UploadResult> {
  return uploadPublicImage(file, `${CloudinaryFolders.SHOP_LOGOS}/${shopId}`, {
    width: 500,
    height: 500,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  });
}

/**
 * Upload shop banner (public)
 */
export async function uploadShopBanner(
  file: Express.Multer.File,
  shopId: string
): Promise<UploadResult> {
  return uploadPublicImage(file, `${CloudinaryFolders.SHOP_BANNERS}/${shopId}`, {
    width: 1920,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  });
}

/**
 * Upload user avatar (public)
 * Public so customers can see vendor/user profiles for trust
 */
export async function uploadUserAvatar(
  file: Express.Multer.File,
  userId: string
): Promise<UploadResult> {
  return uploadPublicImage(file, `${CloudinaryFolders.USER_AVATARS}/${userId}`, {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  });
}

/**
 * Upload category image (public)
 */
export async function uploadCategoryImage(
  file: Express.Multer.File,
  categoryId?: string
): Promise<UploadResult> {
  const folder = categoryId
    ? `${CloudinaryFolders.CATEGORIES}/${categoryId}`
    : CloudinaryFolders.CATEGORIES;

  return uploadPublicImage(file, folder, {
    width: 800,
    height: 800,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  });
}

/**
 * Upload KYC document (private - requires signed URL)
 */
export async function uploadKycDocument(
  file: Express.Multer.File,
  userId: string,
  documentType: string
): Promise<UploadResult> {
  const folder = `${CloudinaryFolders.KYC_DOCUMENTS}/${userId}/${documentType}`;
  return uploadSecureDocument(file, folder, true);
}

/**
 * Upload vendor document (private - requires signed URL)
 */
export async function uploadVendorDocument(
  file: Express.Multer.File,
  vendorId: string,
  documentType: string
): Promise<UploadResult> {
  const folder = `${CloudinaryFolders.VENDOR_DOCUMENTS}/${vendorId}/${documentType}`;
  return uploadSecureDocument(file, folder, true);
}

/**
 * Get a signed URL for accessing a private/authenticated asset
 */
export function getSecureUrl(
  publicId: string,
  isPrivate: boolean = true,
  expiresInSeconds: number = 3600
): SecureUrlResponse {
  const url = isPrivate 
    ? generatePrivateUrl(publicId, expiresInSeconds)
    : generateSignedUrl(publicId, expiresInSeconds);

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return { url, expiresAt };
}

/**
 * Delete a single asset
 */
export async function removeAsset(
  publicId: string,
  resourceType: ResourceType = ResourceType.IMAGE
): Promise<boolean> {
  const result = await deleteAsset(publicId, resourceType);
  return result.result === 'ok';
}

/**
 * Delete multiple assets
 */
export async function removeAssets(
  publicIds: string[],
  resourceType: ResourceType = ResourceType.IMAGE
): Promise<Record<string, string>> {
  const result = await deleteAssets(publicIds, resourceType);
  return result.deleted;
}

/**
 * Upload multiple images with batch processing
 */
export async function uploadBatch(
  files: Express.Multer.File[],
  options: UploadOptions
): Promise<UploadResult[]> {
  const resourceType = options.resourceType ?? ResourceType.IMAGE;
  const access = options.access ?? UploadAccess.PUBLIC;

  const uploadPromises = files.map(async (file) => {
    const validation = validateFile(file, resourceType, options.allowedFormats);
    if (!validation.isValid) {
      throw new Error(`File ${file.originalname}: ${validation.error}`);
    }

    const response = await uploadBuffer(file.buffer, {
      folder: options.folder,
      resourceType,
      type: access === UploadAccess.PUBLIC ? AssetType.PUBLIC : AssetType.PRIVATE,
      transformation: options.transformation,
    });

    return mapToUploadResult(response);
  });

  return Promise.all(uploadPromises);
}
