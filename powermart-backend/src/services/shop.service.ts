import { prisma } from '../../lib/prisma.ts';
import type {
  CreateShopRequest,
  UpdateShopRequest,
  ShopResponse,
  ShopWithProductsResponse,
} from '../types/shop.types.ts';

export async function createShop(
  vendorId: string,
  data: CreateShopRequest
): Promise<ShopResponse> {
  const shop = await prisma.shop.create({
    data: {
      vendorId,
      name: data.name,
      description: data.description ?? null,
      address: data.address ?? null,
      logo: data.logo ?? null,
    },
  });

  return {
    id: shop.id,
    vendorId: shop.vendorId,
    name: shop.name,
    description: shop.description,
    address: shop.address,
    logo: shop.logo,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
}

export async function getShopsByVendorId(vendorId: string): Promise<ShopResponse[]> {
  const shops = await prisma.shop.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  });

  return shops.map((shop: any) => ({
    id: shop.id,
    vendorId: shop.vendorId,
    name: shop.name,
    description: shop.description,
    address: shop.address,
    logo: shop.logo,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  }));
}

export async function getShopById(shopId: string): Promise<ShopWithProductsResponse | null> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          price: true,
          discount: true,
          status: true,
          stock: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!shop) {
    return null;
  }

  return {
    id: shop.id,
    vendorId: shop.vendorId,
    name: shop.name,
    description: shop.description,
    address: shop.address,
    logo: shop.logo,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
    products: shop.products,
  };
}

export async function updateShop(
  shopId: string,
  data: UpdateShopRequest
): Promise<ShopResponse> {
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.logo !== undefined) updateData.logo = data.logo;

  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: updateData,
  });

  return {
    id: shop.id,
    vendorId: shop.vendorId,
    name: shop.name,
    description: shop.description,
    address: shop.address,
    logo: shop.logo,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
}

export async function deleteShop(shopId: string): Promise<void> {
  await prisma.shop.delete({
    where: { id: shopId },
  });
}

export async function isShopOwnedByVendor(shopId: string, vendorId: string): Promise<boolean> {
  const shop = await prisma.shop.findFirst({
    where: {
      id: shopId,
      vendorId,
    },
  });

  return !!shop;
}

export async function getShopVendorId(shopId: string): Promise<string | null> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { vendorId: true },
  });

  return shop?.vendorId ?? null;
}
