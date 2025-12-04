import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import * as vendorService from '../services/vendor.service.ts';

export async function registerVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const vendor = await vendorService.registerVendor(req.user.userId, req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register vendor';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getVendorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor profile not found' });
      return;
    }

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get vendor profile';
    res.status(500).json({ success: false, error: message });
  }
}

export async function updateVendorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = (req as any).vendor;
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor profile not found' });
      return;
    }

    const updatedVendor = await vendorService.updateVendor(vendor.id, req.body);
    res.status(200).json({ success: true, data: updatedVendor });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update vendor profile';
    res.status(400).json({ success: false, error: message });
  }
}

export async function submitKYC(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = (req as any).vendor;
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor profile not found' });
      return;
    }

    const kyc = await vendorService.submitKYC(vendor.id, req.body);
    res.status(201).json({ success: true, data: kyc });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit KYC';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getKYCStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = (req as any).vendor;
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor profile not found' });
      return;
    }

    const kyc = await vendorService.getKYCStatus(vendor.id);
    if (!kyc) {
      res.status(404).json({ success: false, error: 'KYC not submitted yet' });
      return;
    }

    res.status(200).json({ success: true, data: kyc });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get KYC status';
    res.status(500).json({ success: false, error: message });
  }
}
