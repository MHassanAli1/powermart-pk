// Request DTOs
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

// Response DTOs
export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryWithChildrenResponse extends CategoryResponse {
  children: CategoryResponse[];
}

export interface CategoryTreeResponse extends CategoryResponse {
  children: CategoryTreeResponse[];
  productCount?: number;
}

export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
}
