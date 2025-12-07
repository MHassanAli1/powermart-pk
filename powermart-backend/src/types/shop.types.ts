import { ProductStatus } from '../../prisma/generated/enums.ts';

// Request DTOs
export interface CreateShopRequest {
  name: string;
  description?: string;
  address?: string;
  logo?: string;
}

export interface UpdateShopRequest {
  name?: string;
  description?: string;
  address?: string;
  logo?: string;
}

// Response DTOs
export interface ShopResponse {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  address: string | null;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopWithProductsResponse extends ShopResponse {
  products: ProductBasicResponse[];
}

export interface ProductBasicResponse {
  id: string;
  name: string;
  price: number;
  discount: number | null;
  status: ProductStatus;
  stock: number;
}

// Product Types
export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  discount?: number;
  status?: ProductStatus;
  stock?: number;
  sku?: string;
  deliveryCharge?: number;
  categoryId?: string;
  images?: string[];
  variants?: ProductVariantInput[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  discount?: number;
  status?: ProductStatus;
  stock?: number;
  sku?: string;
  deliveryCharge?: number;
  categoryId?: string;
}

export interface ProductVariantInput {
  name: string;
  value: string;
  priceDiff?: number;
  stock?: number;
}

// Response DTOs
export interface ProductResponse {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  price: number;
  discount: number | null;
  deliveryCharge: number;
  status: ProductStatus;
  stock: number;
  sku: string | null;
  categoryId: string | null;
  avgRating?: number | undefined;
  reviewCount?: number | undefined;
  totalSold?: number | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDetailResponse extends ProductResponse {
  category: ProductCategoryResponse | null;
  images: ProductImageResponse[];
  variants: ProductVariantResponse[];
}

export interface ProductCategoryResponse {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface ProductImageResponse {
  id: string;
  url: string;
  createdAt: Date;
}

export interface ProductVariantResponse {
  id: string;
  name: string;
  value: string;
  priceDiff: number | null;
  stock: number;
  createdAt: Date;
}

// Image/Variant Operations
export interface AddProductImageRequest {
  url: string;
}

export interface AddProductVariantRequest {
  name: string;
  value: string;
  priceDiff?: number;
  stock?: number;
}

export interface UpdateProductVariantRequest {
  name?: string;
  value?: string;
  priceDiff?: number;
  stock?: number;
}

// Pagination
export interface PaginatedProductsResponse {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductFilters {
  status?: ProductStatus;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
