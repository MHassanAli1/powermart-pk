import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.middleware.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import { isVendor, attachVendor } from '../middleware/vendor.middleware.ts';
import * as vendorController from '../controllers/vendor.controller.ts';

const router = Router();

// Validation rules
const registerVendorValidation = [
  body('name').notEmpty().trim().withMessage('Vendor name is required'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Invalid phone number format'),
  body('address').optional().isString().trim(),
  body('website').optional().isURL().withMessage('Invalid website URL'),
];

const updateVendorValidation = [
  body('name').optional().isString().trim().notEmpty(),
  body('address').optional().isString().trim(),
  body('website').optional().isURL().withMessage('Invalid website URL'),
];

const submitKYCValidation = [
  body('documents')
    .isArray({ min: 1 })
    .withMessage('At least one document is required'),
  body('documents.*.documentType')
    .isIn(['CNIC', 'PASSPORT', 'LICENSE'])
    .withMessage('Invalid document type'),
  body('documents.*.documentNumber')
    .notEmpty()
    .withMessage('Document number is required'),
  body('documents.*.frontImageURL').optional().isURL(),
  body('documents.*.backImageURL').optional().isURL(),
  body('bankDetails')
    .isArray({ min: 1 })
    .withMessage('At least one bank detail is required'),
  body('bankDetails.*.accountTitle')
    .notEmpty()
    .withMessage('Account title is required'),
  body('bankDetails.*.bankName')
    .notEmpty()
    .withMessage('Bank name is required'),
  body('bankDetails.*.accountNumber')
    .notEmpty()
    .withMessage('Account number is required'),
  body('bankDetails.*.branchName').optional().isString(),
  body('bankDetails.*.branchCode').optional().isString(),
  body('bankDetails.*.iban').optional().isString(),
  body('bankDetails.*.isPrimary').optional().isBoolean(),
];

// Public routes (require authentication but not vendor role)
// Register as a vendor - converts USER to VENDOR
router.post(
  '/register',
  authenticate,
  registerVendorValidation,
  validate,
  vendorController.registerVendor
);

// Protected vendor routes
// Get current vendor profile
router.get(
  '/profile',
  authenticate,
  isVendor,
  attachVendor,
  vendorController.getVendorProfile
);

// Update vendor profile
router.put(
  '/profile',
  authenticate,
  isVendor,
  attachVendor,
  updateVendorValidation,
  validate,
  vendorController.updateVendorProfile
);

// Submit KYC documents
router.post(
  '/kyc',
  authenticate,
  isVendor,
  attachVendor,
  submitKYCValidation,
  validate,
  vendorController.submitKYC
);

// Get KYC status
router.get(
  '/kyc',
  authenticate,
  isVendor,
  attachVendor,
  vendorController.getKYCStatus
);

// Phone verification routes
const phoneVerificationValidation = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Invalid phone number format'),
];

const verifyPhoneOTPValidation = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Invalid phone number format'),
  body('otpCode')
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
];

// Send phone OTP for verification
router.post(
  '/phone/send-otp',
  authenticate,
  isVendor,
  attachVendor,
  phoneVerificationValidation,
  validate,
  vendorController.sendPhoneOTP
);

// Verify phone OTP
router.post(
  '/phone/verify',
  authenticate,
  isVendor,
  attachVendor,
  verifyPhoneOTPValidation,
  validate,
  vendorController.verifyPhone
);

// Get phone verification status
router.get(
  '/phone/status',
  authenticate,
  isVendor,
  attachVendor,
  vendorController.getPhoneStatus
);

export default router;
