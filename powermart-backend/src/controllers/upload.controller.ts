import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.js';
import * as uploadService from '../services/upload.service.js';
import { handleMulterError } from '../middleware/upload.middleware.js';
import { ResourceType } from '../types/upload.types.js';
import type { UploadResult } from '../types/upload.types.js';

/**
 * Upload product images (public)
 * POST /api/upload/product/images
 */
export async function uploadProductImages(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files provided' });
      return;
    }

    const productId = req.body.productId as string | undefined;
    const results = await uploadService.uploadProductImages(files, productId);

    res.status(200).json({
      success: true,
      data: results,
      message: `Successfully uploaded ${results.length} image(s)`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload product video (public)
 * POST /api/upload/product/video
 */
export async function uploadProductVideo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    const productId = req.body.productId as string | undefined;
    const result = await uploadService.uploadProductVideo(file, productId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Video uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload shop logo (public)
 * POST /api/upload/shop/logo
 */
export async function uploadShopLogo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    const { shopId } = req.body;
    if (!shopId) {
      res.status(400).json({ success: false, error: 'Shop ID is required' });
      return;
    }

    const result = await uploadService.uploadShopLogo(file, shopId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Shop logo uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload shop banner (public)
 * POST /api/upload/shop/banner
 */
export async function uploadShopBanner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    const { shopId } = req.body;
    if (!shopId) {
      res.status(400).json({ success: false, error: 'Shop ID is required' });
      return;
    }

    const result = await uploadService.uploadShopBanner(file, shopId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Shop banner uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload user avatar (public)
 * POST /api/upload/user/avatar
 * Public URL returned - visible to all for trust/profiles
 */
export async function uploadUserAvatar(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    // Get user ID from authenticated user or body
    const userId = req.user?.userId ?? req.body.userId;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    const result = await uploadService.uploadUserAvatar(file, userId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload category image (public)
 * POST /api/upload/category/image
 */
export async function uploadCategoryImage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    const categoryId = req.body.categoryId as string | undefined;
    const result = await uploadService.uploadCategoryImage(file, categoryId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Category image uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload KYC document (private/secure)
 * POST /api/upload/kyc/document
 */
export async function uploadKycDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    // Get user ID from authenticated user
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { documentType } = req.body;
    if (!documentType) {
      res.status(400).json({ success: false, error: 'Document type is required' });
      return;
    }

    const result = await uploadService.uploadKycDocument(file, userId, documentType);

    // Don't expose the direct URL for secure documents
    res.status(200).json({
      success: true,
      data: {
        publicId: result.publicId,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.createdAt,
      },
      message: 'KYC document uploaded securely',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload vendor document (private/secure)
 * POST /api/upload/vendor/document
 */
export async function uploadVendorDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    // Get vendor ID from authenticated vendor
    const vendorId = req.vendor?.id;
    if (!vendorId) {
      res.status(401).json({ success: false, error: 'Vendor authentication required' });
      return;
    }

    const { documentType } = req.body;
    if (!documentType) {
      res.status(400).json({ success: false, error: 'Document type is required' });
      return;
    }

    const result = await uploadService.uploadVendorDocument(file, vendorId, documentType);

    // Don't expose the direct URL for secure documents
    res.status(200).json({
      success: true,
      data: {
        publicId: result.publicId,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.createdAt,
      },
      message: 'Vendor document uploaded securely',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get secure URL for a private document
 * POST /api/upload/secure-url
 */
export async function getSecureUrl(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { publicId, expiresIn } = req.body;
    
    if (!publicId) {
      res.status(400).json({ success: false, error: 'Public ID is required' });
      return;
    }

    // Verify the user has access to this document
    const userId = req.user?.userId;
    const vendorId = req.vendor?.id;
    const isAdmin = req.user?.role === 'ADMIN';

    // Check if the publicId belongs to the user/vendor or user is admin
    // Only KYC and vendor docs are private - products/avatars/shop images are public
    const isKycDocument = publicId.includes('/kyc/');
    const isVendorDocument = publicId.includes('/vendor-docs/');

    if (isKycDocument) {
      const documentUserId = publicId.split('/kyc/')[1]?.split('/')[0];
      if (!isAdmin && documentUserId !== userId) {
        res.status(403).json({ success: false, error: 'Access denied to this document' });
        return;
      }
    }

    if (isVendorDocument) {
      const documentVendorId = publicId.split('/vendor-docs/')[1]?.split('/')[0];
      if (!isAdmin && documentVendorId !== vendorId) {
        res.status(403).json({ success: false, error: 'Access denied to this document' });
        return;
      }
    }

    const expiresInSeconds = expiresIn ?? 3600; // Default 1 hour
    const result = uploadService.getSecureUrl(publicId, true, expiresInSeconds);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an asset
 * DELETE /api/upload/asset
 */
export async function deleteAsset(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { publicId, resourceType } = req.body;
    
    if (!publicId) {
      res.status(400).json({ success: false, error: 'Public ID is required' });
      return;
    }

    // Only admins or asset owners can delete
    // You might want to add more specific ownership checks here
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isAdmin) {
      res.status(403).json({ success: false, error: 'Only admins can delete assets' });
      return;
    }

    const type = resourceType as ResourceType ?? ResourceType.IMAGE;
    const success = await uploadService.removeAsset(publicId, type);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Asset deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Asset not found or already deleted',
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Error handler wrapper for multer errors
 */
export function handleUploadError(
  error: Error,
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof Error && error.message) {
    const userMessage = handleMulterError(error);
    res.status(400).json({
      success: false,
      error: userMessage,
    });
    return;
  }
  next(error);
}
