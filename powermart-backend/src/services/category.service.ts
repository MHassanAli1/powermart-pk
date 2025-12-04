import { prisma } from '../../lib/prisma.ts';
import type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryResponse,
  CategoryWithChildrenResponse,
  CategoryTreeResponse,
  CategoryBreadcrumb,
} from '../types/category.types.ts';

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Map category to response
function mapCategoryToResponse(category: any): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    parentId: category.parentId,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

// Create a new category
export async function createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
  const slug = data.slug || generateSlug(data.name);

  // Check if slug already exists
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    throw new Error('Category with this slug already exists');
  }

  // If parentId provided, verify parent exists
  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
    if (!parent) {
      throw new Error('Parent category not found');
    }
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description ?? null,
      image: data.image ?? null,
      parentId: data.parentId ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  return mapCategoryToResponse(category);
}

// Get all root categories (no parent)
export async function getRootCategories(): Promise<CategoryWithChildrenResponse[]> {
  const categories = await prisma.category.findMany({
    where: { parentId: null, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return categories.map((cat: any) => ({
    ...mapCategoryToResponse(cat),
    children: cat.children.map(mapCategoryToResponse),
  }));
}

// Get all categories (flat list)
export async function getAllCategories(includeInactive: boolean = false): Promise<CategoryResponse[]> {
  const where = includeInactive ? {} : { isActive: true };
  
  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
  });

  return categories.map(mapCategoryToResponse);
}

// Get category by ID with children
export async function getCategoryById(categoryId: string): Promise<CategoryWithChildrenResponse | null> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!category) {
    return null;
  }

  return {
    ...mapCategoryToResponse(category),
    children: category.children.map(mapCategoryToResponse),
  };
}

// Get category by slug
export async function getCategoryBySlug(slug: string): Promise<CategoryWithChildrenResponse | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!category) {
    return null;
  }

  return {
    ...mapCategoryToResponse(category),
    children: category.children.map(mapCategoryToResponse),
  };
}

// Get subcategories of a category
export async function getSubcategories(parentId: string): Promise<CategoryResponse[]> {
  const categories = await prisma.category.findMany({
    where: { parentId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return categories.map(mapCategoryToResponse);
}

// Get full category tree (recursive)
export async function getCategoryTree(): Promise<CategoryTreeResponse[]> {
  const allCategories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Build tree structure
  const categoryMap = new Map<string, CategoryTreeResponse>();
  const rootCategories: CategoryTreeResponse[] = [];

  // First pass: create all nodes
  allCategories.forEach((cat: any) => {
    categoryMap.set(cat.id, {
      ...mapCategoryToResponse(cat),
      children: [],
      productCount: cat._count.products,
    });
  });

  // Second pass: build tree
  allCategories.forEach((cat: any) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      categoryMap.get(cat.parentId)!.children.push(node);
    } else {
      rootCategories.push(node);
    }
  });

  return rootCategories;
}

// Get breadcrumb path for a category
export async function getCategoryBreadcrumb(categoryId: string): Promise<CategoryBreadcrumb[]> {
  const breadcrumb: CategoryBreadcrumb[] = [];
  let currentId: string | null = categoryId;

  while (currentId) {
    const category = await prisma.category.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, slug: true, parentId: true },
    });

    if (!category) break;

    breadcrumb.unshift({
      id: category.id,
      name: category.name,
      slug: category.slug,
    });

    currentId = category.parentId;
  }

  return breadcrumb;
}

// Update category
export async function updateCategory(
  categoryId: string,
  data: UpdateCategoryRequest
): Promise<CategoryResponse> {
  // Check if category exists
  const existing = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!existing) {
    throw new Error('Category not found');
  }

  // If changing slug, check for duplicates
  if (data.slug && data.slug !== existing.slug) {
    const slugExists = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (slugExists) {
      throw new Error('Category with this slug already exists');
    }
  }

  // If changing parent, validate
  if (data.parentId !== undefined) {
    if (data.parentId === categoryId) {
      throw new Error('Category cannot be its own parent');
    }
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        throw new Error('Parent category not found');
      }
      // Check for circular reference
      const descendants = await getDescendantIds(categoryId);
      if (descendants.includes(data.parentId)) {
        throw new Error('Cannot set a descendant as parent (circular reference)');
      }
    }
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.parentId !== undefined) updateData.parentId = data.parentId;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: updateData,
  });

  return mapCategoryToResponse(category);
}

// Get all descendant IDs (for circular reference check)
async function getDescendantIds(categoryId: string): Promise<string[]> {
  const descendants: string[] = [];
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });

  for (const child of children) {
    descendants.push(child.id);
    const childDescendants = await getDescendantIds(child.id);
    descendants.push(...childDescendants);
  }

  return descendants;
}

// Delete category
export async function deleteCategory(categoryId: string): Promise<void> {
  // Check if category has children
  const childCount = await prisma.category.count({ where: { parentId: categoryId } });
  if (childCount > 0) {
    throw new Error('Cannot delete category with subcategories. Delete or move subcategories first.');
  }

  // Check if category has products
  const productCount = await prisma.product.count({ where: { categoryId } });
  if (productCount > 0) {
    throw new Error('Cannot delete category with products. Remove products from this category first.');
  }

  await prisma.category.delete({ where: { id: categoryId } });
}

// Soft delete (deactivate) category and all descendants
export async function deactivateCategory(categoryId: string): Promise<void> {
  const descendantIds = await getDescendantIds(categoryId);
  const allIds = [categoryId, ...descendantIds];

  await prisma.category.updateMany({
    where: { id: { in: allIds } },
    data: { isActive: false },
  });
}
