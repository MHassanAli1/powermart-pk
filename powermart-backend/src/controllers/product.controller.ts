import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import * as productService from '../services/product.service.ts';
import type { ProductFilters } from '../types/shop.types.ts';

export async function createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const shopId = req.params.shopId;
    if (!shopId) {
      res.status(400).json({ success: false, error: 'Shop ID is required' });
      return;
    }
    const product = await productService.createProduct(shopId, req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getProductsByShop(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const shopId = req.params.shopId;
    if (!shopId) {
      res.status(400).json({ success: false, error: 'Shop ID is required' });
      return;
    }
    const { status, categoryId, minPrice, maxPrice, search, page, limit } = req.query;

    const filters: ProductFilters = {};
    if (status) filters.status = status as any;
    if (categoryId) filters.categoryId = categoryId as string;
    if (minPrice) filters.minPrice = parseFloat(minPrice as string);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);
    if (search) filters.search = search as string;

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;

    const result = await productService.getProductsByShopId(shopId, filters, pageNum, limitNum);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get products';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getProductById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const productId = req.params.productId;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }
    const product = await productService.getProductById(productId);

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get product';
    res.status(500).json({ success: false, error: message });
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const productId = req.params.productId;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }
    const product = await productService.updateProduct(productId, req.body);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    res.status(400).json({ success: false, error: message });
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const productId = req.params.productId;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }
    await productService.deleteProduct(productId);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete product';
    res.status(400).json({ success: false, error: message });
  }
}

// Product Images
export async function addProductImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const productId = req.params.productId;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }
    const image = await productService.addProductImage(productId, req.body);
    res.status(201).json({ success: true, data: image });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add product image';
    res.status(400).json({ success: false, error: message });
  }
}

export async function deleteProductImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const imageId = req.params.imageId;
    if (!imageId) {
      res.status(400).json({ success: false, error: 'Image ID is required' });
      return;
    }
    await productService.deleteProductImage(imageId);
    res.status(200).json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete product image';
    res.status(400).json({ success: false, error: message });
  }
}

// Product Variants
export async function addProductVariant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const productId = req.params.productId;
    if (!productId) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }
    const variant = await productService.addProductVariant(productId, req.body);
    res.status(201).json({ success: true, data: variant });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add product variant';
    res.status(400).json({ success: false, error: message });
  }
}

export async function updateProductVariant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const variantId = req.params.variantId;
    if (!variantId) {
      res.status(400).json({ success: false, error: 'Variant ID is required' });
      return;
    }
    const variant = await productService.updateProductVariant(variantId, req.body);
    res.status(200).json({ success: true, data: variant });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product variant';
    res.status(400).json({ success: false, error: message });
  }
}

export async function deleteProductVariant(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const variantId = req.params.variantId;
    if (!variantId) {
      res.status(400).json({ success: false, error: 'Variant ID is required' });
      return;
    }
    await productService.deleteProductVariant(variantId);
    res.status(200).json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete product variant';
    res.status(400).json({ success: false, error: message });
  }
}
