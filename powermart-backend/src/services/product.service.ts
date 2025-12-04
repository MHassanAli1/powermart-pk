import { prisma } from '../../lib/prisma.ts';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductDetailResponse,
  PaginatedProductsResponse,
  ProductFilters,
  AddProductImageRequest,
  AddProductVariantRequest,
  UpdateProductVariantRequest,
  ProductImageResponse,
  ProductVariantResponse,
} from '../types/shop.types.ts';

export async function createProduct(
  shopId: string,
  data: CreateProductRequest
): Promise<ProductDetailResponse> {
  const createData: any = {
    shop: { connect: { id: shopId } },
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    discount: data.discount ?? null,
    status: data.status ?? 'ACTIVE',
    stock: data.stock ?? 0,
    sku: data.sku ?? null,
  };

  if (data.categoryId) {
    createData.category = { connect: { id: data.categoryId } };
  }

  if (data.images && data.images.length > 0) {
    createData.images = { create: data.images.map((url) => ({ url })) };
  }

  if (data.variants && data.variants.length > 0) {
    createData.variants = {
      create: data.variants.map((v) => ({
        name: v.name,
        value: v.value,
        priceDiff: v.priceDiff ?? null,
        stock: v.stock ?? 0,
      })),
    };
  }

  const product = await prisma.product.create({
    data: createData,
    include: {
      category: true,
      images: true,
      variants: true,
    },
  });

  return mapProductToDetailResponse(product);
}

export async function getProductById(productId: string): Promise<ProductDetailResponse | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      images: true,
      variants: true,
    },
  });

  if (!product) {
    return null;
  }

  return mapProductToDetailResponse(product);
}

export async function getProductsByShopId(
  shopId: string,
  filters: ProductFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedProductsResponse> {
  const where: any = { shopId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) {
      where.price.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      where.price.lte = filters.maxPrice;
    }
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map(mapProductToResponse),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateProduct(
  productId: string,
  data: UpdateProductRequest
): Promise<ProductResponse> {
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.discount !== undefined) updateData.discount = data.discount;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.stock !== undefined) updateData.stock = data.stock;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.categoryId !== undefined) {
    updateData.category = data.categoryId ? { connect: { id: data.categoryId } } : { disconnect: true };
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: updateData,
  });

  return mapProductToResponse(product);
}

export async function deleteProduct(productId: string): Promise<void> {
  await prisma.product.delete({
    where: { id: productId },
  });
}

// Product Images
export async function addProductImage(
  productId: string,
  data: AddProductImageRequest
): Promise<ProductImageResponse> {
  const image = await prisma.productImage.create({
    data: {
      product: { connect: { id: productId } },
      url: data.url,
    },
  });

  return {
    id: image.id,
    url: image.url,
    createdAt: image.createdAt,
  };
}

export async function deleteProductImage(imageId: string): Promise<void> {
  await prisma.productImage.delete({
    where: { id: imageId },
  });
}

// Product Variants
export async function addProductVariant(
  productId: string,
  data: AddProductVariantRequest
): Promise<ProductVariantResponse> {
  const variant = await prisma.productVariant.create({
    data: {
      product: { connect: { id: productId } },
      name: data.name,
      value: data.value,
      priceDiff: data.priceDiff ?? null,
      stock: data.stock ?? 0,
    },
  });

  return {
    id: variant.id,
    name: variant.name,
    value: variant.value,
    priceDiff: variant.priceDiff,
    stock: variant.stock,
    createdAt: variant.createdAt,
  };
}

export async function updateProductVariant(
  variantId: string,
  data: UpdateProductVariantRequest
): Promise<ProductVariantResponse> {
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.priceDiff !== undefined) updateData.priceDiff = data.priceDiff;
  if (data.stock !== undefined) updateData.stock = data.stock;

  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: updateData,
  });

  return {
    id: variant.id,
    name: variant.name,
    value: variant.value,
    priceDiff: variant.priceDiff,
    stock: variant.stock,
    createdAt: variant.createdAt,
  };
}

export async function deleteProductVariant(variantId: string): Promise<void> {
  await prisma.productVariant.delete({
    where: { id: variantId },
  });
}

// Utility to check product ownership
export async function getProductShopId(productId: string): Promise<string | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { shopId: true },
  });

  return product?.shopId ?? null;
}

// Helper functions
function mapProductToResponse(product: any): ProductResponse {
  return {
    id: product.id,
    shopId: product.shopId,
    name: product.name,
    description: product.description,
    price: product.price,
    discount: product.discount,
    status: product.status,
    stock: product.stock,
    sku: product.sku,
    categoryId: product.categoryId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function mapProductToDetailResponse(product: any): ProductDetailResponse {
  return {
    ...mapProductToResponse(product),
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
          parentId: product.category.parentId,
        }
      : null,
    images: product.images.map((img: any) => ({
      id: img.id,
      url: img.url,
      createdAt: img.createdAt,
    })),
    variants: product.variants.map((v: any) => ({
      id: v.id,
      name: v.name,
      value: v.value,
      priceDiff: v.priceDiff,
      stock: v.stock,
      createdAt: v.createdAt,
    })),
  };
}
