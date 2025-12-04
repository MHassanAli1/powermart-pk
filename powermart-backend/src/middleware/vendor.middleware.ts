import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import { UserRole } from '../../prisma/generated/enums.ts';
import { prisma } from '../../lib/prisma.ts';

/**
 * Middleware to check if the authenticated user is a vendor
 */
export function isVendor(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (req.user.role !== UserRole.VENDOR) {
    res.status(403).json({ success: false, error: 'Vendor access required' });
    return;
  }

  next();
}

/**
 * Middleware to attach vendor info to the request
 * Should be used after authenticate and isVendor middlewares
 */
export async function attachVendor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.userId },
    });

    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor profile not found' });
      return;
    }

    // Attach vendor to request for use in controllers
    (req as any).vendor = vendor;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Middleware to verify that the vendor owns the specified shop
 * Expects shopId in req.params.shopId
 */
export async function ownsShop(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const shopId = req.params.shopId;
    const vendor = (req as any).vendor;

    if (!vendor) {
      res.status(403).json({ success: false, error: 'Vendor profile required' });
      return;
    }

    if (!shopId) {
      res.status(400).json({ success: false, error: 'Shop ID is required' });
      return;
    }

    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        vendorId: vendor.id,
      },
    });

    if (!shop) {
      res.status(404).json({ success: false, error: 'Shop not found or access denied' });
      return;
    }

    (req as any).shop = shop;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Middleware to verify that the vendor owns the product (via shop ownership)
 * Expects productId in req.params.productId
 */
export async function ownsProduct(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const productId = req.params.productId;
    const vendor = (req as any).vendor;

    if (!vendor) {
      res.status(403).json({ success: false, error: 'Vendor profile required' });
      return;
    }

    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: { id: productId },
      include: {
        shop: {
          select: { vendorId: true },
        },
      },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    if ((product as any).shop.vendorId !== vendor.id) {
      res.status(403).json({ success: false, error: 'Access denied to this product' });
      return;
    }

    (req as any).product = product;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
