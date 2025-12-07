import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
// Only configure if all required env vars are present
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Always use HTTPS
  });
}

/**
 * Asset types for different security levels
 */
export enum AssetType {
  /** Public assets - accessible by anyone */
  PUBLIC = 'upload',
  /** Private assets - requires signed URL, no public access */
  PRIVATE = 'private',
  /** Authenticated assets - requires signed URL with token */
  AUTHENTICATED = 'authenticated',
}

/**
 * Folder structure for organized asset management
 */
export const CloudinaryFolders = {
  // Public folders
  PRODUCTS: 'powermart/products',
  PRODUCT_VIDEOS: 'powermart/products/videos',
  SHOP_LOGOS: 'powermart/shops/logos',
  SHOP_BANNERS: 'powermart/shops/banners',
  USER_AVATARS: 'powermart/users/avatars',
  CATEGORIES: 'powermart/categories',
  
  // Secure folders (private/authenticated)
  KYC_DOCUMENTS: 'powermart/secure/kyc',
  VENDOR_DOCUMENTS: 'powermart/secure/vendor-docs',
} as const;

/**
 * Generate a signed URL for private/authenticated assets
 * @param publicId - The public ID of the asset
 * @param expiresInSeconds - URL expiration time (default 1 hour)
 * @returns Signed URL string
 */
export function generateSignedUrl(
  publicId: string, 
  expiresInSeconds: number = 3600
): string {
  const timestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'authenticated',
    expires_at: timestamp,
    secure: true,
  });
}

/**
 * Generate a signed URL for private assets (stricter than authenticated)
 * @param publicId - The public ID of the asset
 * @param expiresInSeconds - URL expiration time (default 1 hour)
 * @returns Signed URL string
 */
export function generatePrivateUrl(
  publicId: string,
  expiresInSeconds: number = 3600
): string {
  const timestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'private',
    expires_at: timestamp,
    secure: true,
  });
}

/**
 * Delete an asset from Cloudinary
 * @param publicId - The public ID of the asset to delete
 * @param resourceType - Type of resource (image, video, raw)
 */
export async function deleteAsset(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ result: string }> {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Delete multiple assets from Cloudinary
 * @param publicIds - Array of public IDs to delete
 * @param resourceType - Type of resource (image, video, raw)
 */
export async function deleteAssets(
  publicIds: string[],
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ deleted: Record<string, string> }> {
  return cloudinary.api.delete_resources(publicIds, { resource_type: resourceType });
}

export { cloudinary };
export default cloudinary;
