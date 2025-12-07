import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import { UserRole } from '../../prisma/generated/enums.ts';
import { prisma } from '../../lib/prisma.ts';
import { verifyAccessToken } from '../utils/jwt.util.ts';

/**
 * Combined middleware to authenticate user and verify they are a vendor with vendor profile attached
 * Use this for vendor-only routes that need the vendor object
 */
export function authenticateVendor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // First authenticate the user
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ success: false, error: 'No authorization header provided' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ success: false, error: 'Invalid authorization header format' });
    return;
  }

  const token = parts[1];
  if (!token) {
    res.status(401).json({ success: false, error: 'Token not provided' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;

    // Check if user is a vendor
    if (payload.role !== UserRole.VENDOR) {
      res.status(403).json({ success: false, error: 'Vendor access required' });
      return;
    }

    // Attach vendor profile
    prisma.vendor.findUnique({
      where: { userId: payload.userId },
    }).then(vendor => {
      if (!vendor) {
        res.status(404).json({ success: false, error: 'Vendor profile not found' });
        return;
      }
      (req as any).vendor = vendor;
      next();
    }).catch(() => {
      res.status(500).json({ success: false, error: 'Internal server error' });
    });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

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
