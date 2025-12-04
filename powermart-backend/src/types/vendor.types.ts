import { KYCStatus } from '../../prisma/generated/enums.ts';

// Request DTOs
export interface RegisterVendorRequest {
  name: string;
  phoneNumber: string;
  address?: string;
  website?: string;
}

export interface UpdateVendorRequest {
  name?: string;
  address?: string;
  website?: string;
}

// Response DTOs
export interface VendorResponse {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  phoneVerified: boolean;
  address: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorWithShopsResponse extends VendorResponse {
  shops: ShopBasicResponse[];
}

export interface ShopBasicResponse {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
}

// KYC Types
export interface SubmitKYCRequest {
  documents: KYCDocumentInput[];
  bankDetails: BankDetailsInput[];
}

export interface KYCDocumentInput {
  documentType: 'CNIC' | 'PASSPORT' | 'LICENSE';
  documentNumber: string;
  frontImageURL?: string;
  backImageURL?: string;
}

export interface BankDetailsInput {
  accountTitle: string;
  bankName: string;
  branchName?: string;
  branchCode?: string;
  iban?: string;
  accountNumber: string;
  isPrimary?: boolean;
}

export interface KYCResponse {
  id: string;
  vendorId: string;
  status: KYCStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
  documents: KYCDocumentResponse[];
  bankDetails: BankDetailsResponse[];
}

export interface KYCDocumentResponse {
  id: string;
  documentType: string;
  documentNumber: string;
  frontImageURL: string | null;
  backImageURL: string | null;
  uploadedAt: Date;
}

export interface BankDetailsResponse {
  id: string;
  accountTitle: string;
  bankName: string;
  branchName: string | null;
  branchCode: string | null;
  iban: string | null;
  accountNumber: string;
  isPrimary: boolean;
  createdAt: Date;
}
