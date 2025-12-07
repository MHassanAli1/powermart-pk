import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import * as vendorService from '../services/vendor.service.ts';
import * as phoneService from '../services/phone.service.ts';
import type { SendPhoneOTPRequest, VerifyPhoneRequest } from '../types/auth.types.ts';

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

/**
 * Send phone verification OTP
 * POST /api/vendors/phone/send-otp
 */
export async function sendPhoneOTP(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = (req as any).vendor;
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor profile not found' });
      return;
    }

    const { phoneNumber }: SendPhoneOTPRequest = req.body;

    // If new phone number provided, update and verify; otherwise resend to existing
    let result;
    if (phoneNumber && phoneNumber !== vendor.phoneNumber) {
      result = await phoneService.updateAndVerifyPhone(vendor.id, phoneNumber);
    } else {
      result = await phoneService.resendPhoneVerificationOTP(vendor.id);
    }

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send OTP';
    res.status(400).json({ success: false, error: message });
  }
}

/**
 * Verify phone OTP
 * POST /api/vendors/phone/verify
 */
export async function verifyPhone(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = (req as any).vendor;
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor profile not found' });
      return;
    }

    const { phoneNumber, otpCode }: VerifyPhoneRequest = req.body;

    if (!otpCode) {
      res.status(400).json({ success: false, error: 'OTP code is required' });
      return;
    }

    const result = await phoneService.verifyPhoneOTP(
      vendor.id,
      phoneNumber ?? vendor.phoneNumber,
      otpCode
    );

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify phone';
    res.status(400).json({ success: false, error: message });
  }
}

/**
 * Get phone verification status
 * GET /api/vendors/phone/status
 */
export async function getPhoneStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vendor = (req as any).vendor;
    if (!vendor) {
      res.status(404).json({ success: false, error: 'Vendor profile not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        phoneNumber: vendor.phoneNumber,
        isVerified: vendor.phoneVerified,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get phone status';
    res.status(500).json({ success: false, error: message });
  }
}
