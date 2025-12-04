import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import * as categoryService from '../services/category.service.ts';

// ===== Public Controllers =====

export async function getRootCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await categoryService.getRootCategories();
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getCategoryTree(req: Request, res: Response): Promise<void> {
  try {
    const tree = await categoryService.getCategoryTree();
    res.status(200).json({ success: true, data: tree });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get category tree';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getCategoryBySlug(req: Request, res: Response): Promise<void> {
  try {
    const slug = req.params.slug;
    if (!slug) {
      res.status(400).json({ success: false, error: 'Slug is required' });
      return;
    }

    const category = await categoryService.getCategoryBySlug(slug);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get category';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getCategoryById(req: Request, res: Response): Promise<void> {
  try {
    const categoryId = req.params.categoryId;
    if (!categoryId) {
      res.status(400).json({ success: false, error: 'Category ID is required' });
      return;
    }

    const category = await categoryService.getCategoryById(categoryId);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get category';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getSubcategories(req: Request, res: Response): Promise<void> {
  try {
    const categoryId = req.params.categoryId;
    if (!categoryId) {
      res.status(400).json({ success: false, error: 'Category ID is required' });
      return;
    }

    const subcategories = await categoryService.getSubcategories(categoryId);
    res.status(200).json({ success: true, data: subcategories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get subcategories';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getCategoryBreadcrumb(req: Request, res: Response): Promise<void> {
  try {
    const categoryId = req.params.categoryId;
    if (!categoryId) {
      res.status(400).json({ success: false, error: 'Category ID is required' });
      return;
    }

    const breadcrumb = await categoryService.getCategoryBreadcrumb(categoryId);
    res.status(200).json({ success: true, data: breadcrumb });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get breadcrumb';
    res.status(500).json({ success: false, error: message });
  }
}

// ===== Admin Controllers =====

export async function getAllCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await categoryService.getAllCategories(includeInactive);
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    res.status(500).json({ success: false, error: message });
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    res.status(400).json({ success: false, error: message });
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const categoryId = req.params.categoryId;
    if (!categoryId) {
      res.status(400).json({ success: false, error: 'Category ID is required' });
      return;
    }

    const category = await categoryService.updateCategory(categoryId, req.body);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update category';
    res.status(400).json({ success: false, error: message });
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const categoryId = req.params.categoryId;
    if (!categoryId) {
      res.status(400).json({ success: false, error: 'Category ID is required' });
      return;
    }

    await categoryService.deleteCategory(categoryId);
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    res.status(400).json({ success: false, error: message });
  }
}

export async function deactivateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const categoryId = req.params.categoryId;
    if (!categoryId) {
      res.status(400).json({ success: false, error: 'Category ID is required' });
      return;
    }

    await categoryService.deactivateCategory(categoryId);
    res.status(200).json({ success: true, message: 'Category and subcategories deactivated' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate category';
    res.status(400).json({ success: false, error: message });
  }
}
