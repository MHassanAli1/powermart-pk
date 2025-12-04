import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import * as shopService from '../services/shop.service.ts';

export async function createShop(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = (req as any).vendor;
    if (!vendor) {
      res.status(403).json({ success: false, error: 'Vendor profile required' });
      return;
    }

    const shop = await shopService.createShop(vendor.id, req.body);
    res.status(201).json({ success: true, data: shop });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create shop';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getMyShops(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = (req as any).vendor;
    if (!vendor) {
      res.status(403).json({ success: false, error: 'Vendor profile required' });
      return;
    }

    const shops = await shopService.getShopsByVendorId(vendor.id);
    res.status(200).json({ success: true, data: shops });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get shops';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getShopById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const shopId = req.params.shopId;
    if (!shopId) {
      res.status(400).json({ success: false, error: 'Shop ID is required' });
      return;
    }
    const shop = await shopService.getShopById(shopId);

    if (!shop) {
      res.status(404).json({ success: false, error: 'Shop not found' });
      return;
    }

    res.status(200).json({ success: true, data: shop });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get shop';
    res.status(500).json({ success: false, error: message });
  }
}

export async function updateShop(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const shopId = req.params.shopId;
    if (!shopId) {
      res.status(400).json({ success: false, error: 'Shop ID is required' });
      return;
    }
    const shop = await shopService.updateShop(shopId, req.body);
    res.status(200).json({ success: true, data: shop });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update shop';
    res.status(400).json({ success: false, error: message });
  }
}

export async function deleteShop(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const shopId = req.params.shopId;
    if (!shopId) {
      res.status(400).json({ success: false, error: 'Shop ID is required' });
      return;
    }
    await shopService.deleteShop(shopId);
    res.status(200).json({ success: true, message: 'Shop deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete shop';
    res.status(400).json({ success: false, error: message });
  }
}
