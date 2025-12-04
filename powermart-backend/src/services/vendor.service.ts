import { prisma } from '../../lib/prisma.ts';
import { UserRole } from '../../prisma/generated/enums.ts';
import type {
  RegisterVendorRequest,
  UpdateVendorRequest,
  VendorResponse,
  VendorWithShopsResponse,
  SubmitKYCRequest,
  KYCResponse,
} from '../types/vendor.types.ts';

export async function registerVendor(
  userId: string,
  data: RegisterVendorRequest
): Promise<VendorResponse> {
  // Check if user exists and is not already a vendor
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendor: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.vendor) {
    throw new Error('User is already registered as a vendor');
  }

  // Check if phone number is already taken
  const existingVendor = await prisma.vendor.findUnique({
    where: { phoneNumber: data.phoneNumber },
  });

  if (existingVendor) {
    throw new Error('Phone number is already registered to another vendor');
  }

  // Create vendor and update user role in a transaction
  const vendor = await prisma.$transaction(async (tx) => {
    // Update user role to VENDOR
    await tx.user.update({
      where: { id: userId },
      data: {
        role: UserRole.VENDOR,
        isVendor: true,
      },
    });

    // Create vendor profile
    return tx.vendor.create({
      data: {
        userId,
        name: data.name,
        phoneNumber: data.phoneNumber,
        address: data.address ?? null,
        website: data.website ?? null,
      },
    });
  });

  return {
    id: vendor.id,
    userId: vendor.userId,
    name: vendor.name,
    phoneNumber: vendor.phoneNumber,
    phoneVerified: vendor.phoneVerified,
    address: vendor.address,
    website: vendor.website,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
}

export async function getVendorByUserId(userId: string): Promise<VendorWithShopsResponse | null> {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    include: {
      shops: {
        select: {
          id: true,
          name: true,
          description: true,
          logo: true,
        },
      },
    },
  });

  if (!vendor) {
    return null;
  }

  return {
    id: vendor.id,
    userId: vendor.userId,
    name: vendor.name,
    phoneNumber: vendor.phoneNumber,
    phoneVerified: vendor.phoneVerified,
    address: vendor.address,
    website: vendor.website,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
    shops: vendor.shops,
  };
}

export async function getVendorById(vendorId: string): Promise<VendorWithShopsResponse | null> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      shops: {
        select: {
          id: true,
          name: true,
          description: true,
          logo: true,
        },
      },
    },
  });

  if (!vendor) {
    return null;
  }

  return {
    id: vendor.id,
    userId: vendor.userId,
    name: vendor.name,
    phoneNumber: vendor.phoneNumber,
    phoneVerified: vendor.phoneVerified,
    address: vendor.address,
    website: vendor.website,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
    shops: vendor.shops,
  };
}

export async function updateVendor(
  vendorId: string,
  data: UpdateVendorRequest
): Promise<VendorResponse> {
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.website !== undefined) updateData.website = data.website;

  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: updateData,
  });

  return {
    id: vendor.id,
    userId: vendor.userId,
    name: vendor.name,
    phoneNumber: vendor.phoneNumber,
    phoneVerified: vendor.phoneVerified,
    address: vendor.address,
    website: vendor.website,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
}

export async function submitKYC(vendorId: string, data: SubmitKYCRequest): Promise<KYCResponse> {
  // Check if vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { kyc: true },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  if (vendor.kyc) {
    throw new Error('KYC has already been submitted. Please wait for review.');
  }

  // Create KYC with documents and bank details
  const kyc = await prisma.vendorKYC.create({
    data: {
      vendorId,
      documents: {
        create: data.documents.map((doc) => ({
          documentType: doc.documentType,
          documentNumber: doc.documentNumber,
          frontImageURL: doc.frontImageURL ?? null,
          backImageURL: doc.backImageURL ?? null,
        })),
      },
      bankDetails: {
        create: data.bankDetails.map((bank) => ({
          accountTitle: bank.accountTitle,
          bankName: bank.bankName,
          branchName: bank.branchName ?? null,
          branchCode: bank.branchCode ?? null,
          iban: bank.iban ?? null,
          accountNumber: bank.accountNumber,
          isPrimary: bank.isPrimary ?? false,
        })),
      },
    },
    include: {
      documents: true,
      bankDetails: true,
    },
  });

  return {
    id: kyc.id,
    vendorId: kyc.vendorId,
    status: kyc.status,
    submittedAt: kyc.submittedAt,
    reviewedAt: kyc.reviewedAt,
    documents: kyc.documents.map((doc: any) => ({
      id: doc.id,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      frontImageURL: doc.frontImageURL,
      backImageURL: doc.backImageURL,
      uploadedAt: doc.uploadedAt,
    })),
    bankDetails: kyc.bankDetails.map((bank: any) => ({
      id: bank.id,
      accountTitle: bank.accountTitle,
      bankName: bank.bankName,
      branchName: bank.branchName,
      branchCode: bank.branchCode,
      iban: bank.iban,
      accountNumber: bank.accountNumber,
      isPrimary: bank.isPrimary,
      createdAt: bank.createdAt,
    })),
  };
}

export async function getKYCStatus(vendorId: string): Promise<KYCResponse | null> {
  const kyc = await prisma.vendorKYC.findUnique({
    where: { vendorId },
    include: {
      documents: true,
      bankDetails: true,
    },
  });

  if (!kyc) {
    return null;
  }

  return {
    id: kyc.id,
    vendorId: kyc.vendorId,
    status: kyc.status,
    submittedAt: kyc.submittedAt,
    reviewedAt: kyc.reviewedAt,
    documents: kyc.documents.map((doc: any) => ({
      id: doc.id,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      frontImageURL: doc.frontImageURL,
      backImageURL: doc.backImageURL,
      uploadedAt: doc.uploadedAt,
    })),
    bankDetails: kyc.bankDetails.map((bank: any) => ({
      id: bank.id,
      accountTitle: bank.accountTitle,
      bankName: bank.bankName,
      branchName: bank.branchName,
      branchCode: bank.branchCode,
      iban: bank.iban,
      accountNumber: bank.accountNumber,
      isPrimary: bank.isPrimary,
      createdAt: bank.createdAt,
    })),
  };
}
