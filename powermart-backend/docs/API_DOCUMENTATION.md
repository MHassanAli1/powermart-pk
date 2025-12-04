# PowerMart Backend API Documentation

## Overview

PowerMart is a multivendor e-commerce platform built with:
- **Framework**: Express.js 5.1.0 with TypeScript
- **ORM**: Prisma 7.0.1 with PostgreSQL
- **Authentication**: JWT with refresh tokens
- **Validation**: express-validator

---

## Table of Contents

1. [Authentication](#authentication)
2. [Vendor Management](#vendor-management)
3. [Shop Management](#shop-management)
4. [Product Management](#product-management)
5. [Category Management](#category-management)

---

## Base URL

```
http://localhost:3000/api
```

---

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Endpoints

#### POST `/auth/register`
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

#### POST `/auth/login`
Login and get access tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

#### POST `/auth/logout`
Logout and invalidate refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

## Vendor Management

### Register as Vendor

#### POST `/vendors/register`
Register authenticated user as a vendor.

**Authentication:** Required (USER role)

**Request Body:**
```json
{
  "businessName": "My Electronics Store",
  "businessType": "ELECTRONICS",
  "phone": "+1234567890",
  "address": "123 Business Street",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA"
}
```

**Response:** `201 Created`
```json
{
  "message": "Vendor registered successfully",
  "vendor": {
    "id": "uuid",
    "userId": "user_uuid",
    "businessName": "My Electronics Store",
    "businessType": "ELECTRONICS",
    "phone": "+1234567890",
    "address": "123 Business Street",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "isVerified": false,
    "createdAt": "2024-12-04T12:00:00.000Z",
    "updatedAt": "2024-12-04T12:00:00.000Z"
  }
}
```

### Get Vendor Profile

#### GET `/vendors/profile`
Get current vendor's profile.

**Authentication:** Required (VENDOR role)

**Response:** `200 OK`
```json
{
  "vendor": {
    "id": "uuid",
    "userId": "user_uuid",
    "businessName": "My Electronics Store",
    "businessType": "ELECTRONICS",
    "phone": "+1234567890",
    "address": "123 Business Street",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "isVerified": true,
    "createdAt": "2024-12-04T12:00:00.000Z",
    "updatedAt": "2024-12-04T12:00:00.000Z"
  }
}
```

### Update Vendor Profile

#### PUT `/vendors/profile`
Update vendor profile.

**Authentication:** Required (VENDOR role)

**Request Body:** (all fields optional)
```json
{
  "businessName": "Updated Business Name",
  "phone": "+0987654321",
  "address": "456 New Address"
}
```

**Response:** `200 OK`
```json
{
  "message": "Vendor profile updated successfully",
  "vendor": { ... }
}
```

### KYC Submission

#### POST `/vendors/kyc`
Submit KYC documents for verification.

**Authentication:** Required (VENDOR role)

**Request Body:**
```json
{
  "documentType": "NATIONAL_ID",
  "documentNumber": "ID123456789",
  "frontImageURL": "https://storage.example.com/front.jpg",
  "backImageURL": "https://storage.example.com/back.jpg"
}
```

**Response:** `201 Created`
```json
{
  "message": "KYC documents submitted successfully",
  "kycDocument": {
    "id": "uuid",
    "documentType": "NATIONAL_ID",
    "documentNumber": "ID123456789",
    "frontImageURL": "https://storage.example.com/front.jpg",
    "backImageURL": "https://storage.example.com/back.jpg",
    "status": "PENDING",
    "submittedAt": "2024-12-04T12:00:00.000Z"
  }
}
```

#### GET `/vendors/kyc`
Get KYC status and documents.

**Authentication:** Required (VENDOR role)

**Response:** `200 OK`
```json
{
  "kyc": {
    "status": "PENDING",
    "documents": [
      {
        "id": "uuid",
        "documentType": "NATIONAL_ID",
        "status": "PENDING",
        "submittedAt": "2024-12-04T12:00:00.000Z"
      }
    ]
  }
}
```

---

## Shop Management

### Create Shop

#### POST `/shops`
Create a new shop.

**Authentication:** Required (VENDOR role)

**Request Body:**
```json
{
  "name": "Electronics Hub",
  "description": "Your one-stop shop for electronics",
  "logoURL": "https://storage.example.com/logo.png",
  "bannerURL": "https://storage.example.com/banner.png"
}
```

**Response:** `201 Created`
```json
{
  "message": "Shop created successfully",
  "shop": {
    "id": "uuid",
    "vendorId": "vendor_uuid",
    "name": "Electronics Hub",
    "slug": "electronics-hub",
    "description": "Your one-stop shop for electronics",
    "logoURL": "https://storage.example.com/logo.png",
    "bannerURL": "https://storage.example.com/banner.png",
    "isActive": true,
    "createdAt": "2024-12-04T12:00:00.000Z",
    "updatedAt": "2024-12-04T12:00:00.000Z"
  }
}
```

### Get Vendor's Shops

#### GET `/shops`
Get all shops owned by the authenticated vendor.

**Authentication:** Required (VENDOR role)

**Response:** `200 OK`
```json
{
  "shops": [
    {
      "id": "uuid",
      "name": "Electronics Hub",
      "slug": "electronics-hub",
      "isActive": true,
      ...
    }
  ]
}
```

### Get Shop by ID

#### GET `/shops/:shopId`
Get a specific shop.

**Authentication:** Required (VENDOR role, must own shop)

**Response:** `200 OK`
```json
{
  "shop": { ... }
}
```

### Update Shop

#### PUT `/shops/:shopId`
Update shop details.

**Authentication:** Required (VENDOR role, must own shop)

**Request Body:** (all fields optional)
```json
{
  "name": "New Shop Name",
  "description": "Updated description",
  "isActive": false
}
```

**Response:** `200 OK`
```json
{
  "message": "Shop updated successfully",
  "shop": { ... }
}
```

### Delete Shop

#### DELETE `/shops/:shopId`
Delete a shop (soft delete by setting isActive to false).

**Authentication:** Required (VENDOR role, must own shop)

**Response:** `200 OK`
```json
{
  "message": "Shop deleted successfully"
}
```

---

## Product Management

### Create Product

#### POST `/vendor/products`
Create a new product.

**Authentication:** Required (VENDOR role, must own the shop)

**Request Body:**
```json
{
  "shopId": "shop_uuid",
  "name": "Wireless Headphones",
  "description": "Premium wireless headphones with noise cancellation",
  "price": 199.99,
  "discount": 10,
  "stock": 100,
  "sku": "WH-001",
  "categoryId": "category_uuid",
  "status": "ACTIVE",
  "images": [
    { "url": "https://storage.example.com/product1.jpg" },
    { "url": "https://storage.example.com/product2.jpg" }
  ],
  "variants": [
    { "name": "Color", "value": "Black", "priceDiff": 0, "stock": 50 },
    { "name": "Color", "value": "White", "priceDiff": 10, "stock": 50 }
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "Product created successfully",
  "product": {
    "id": "uuid",
    "shopId": "shop_uuid",
    "name": "Wireless Headphones",
    "description": "Premium wireless headphones with noise cancellation",
    "price": 199.99,
    "discount": 10,
    "stock": 100,
    "sku": "WH-001",
    "status": "ACTIVE",
    "category": {
      "id": "category_uuid",
      "name": "Electronics",
      "slug": "electronics",
      "parentId": null
    },
    "images": [...],
    "variants": [...],
    "createdAt": "2024-12-04T12:00:00.000Z",
    "updatedAt": "2024-12-04T12:00:00.000Z"
  }
}
```

### Get Shop Products

#### GET `/vendor/shops/:shopId/products`
Get all products for a shop with filtering and pagination.

**Authentication:** Required (VENDOR role, must own shop)

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string: ACTIVE, INACTIVE, OUT_OF_STOCK)
- `categoryId` (string)
- `minPrice` (number)
- `maxPrice` (number)
- `search` (string)

**Response:** `200 OK`
```json
{
  "products": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Get Product by ID

#### GET `/vendor/products/:productId`
Get a specific product with full details.

**Authentication:** Required (VENDOR role, must own product's shop)

**Response:** `200 OK`
```json
{
  "product": {
    "id": "uuid",
    "name": "Wireless Headphones",
    "category": {
      "id": "category_uuid",
      "name": "Audio",
      "slug": "audio",
      "parentId": "parent_category_uuid"
    },
    "images": [...],
    "variants": [...],
    ...
  }
}
```

### Update Product

#### PUT `/vendor/products/:productId`
Update product details.

**Authentication:** Required (VENDOR role, must own product's shop)

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Product Name",
  "price": 179.99,
  "status": "INACTIVE"
}
```

**Response:** `200 OK`
```json
{
  "message": "Product updated successfully",
  "product": { ... }
}
```

### Delete Product

#### DELETE `/vendor/products/:productId`
Delete a product.

**Authentication:** Required (VENDOR role, must own product's shop)

**Response:** `200 OK`
```json
{
  "message": "Product deleted successfully"
}
```

### Product Images

#### POST `/vendor/products/:productId/images`
Add image to product.

**Request Body:**
```json
{
  "url": "https://storage.example.com/new-image.jpg"
}
```

#### DELETE `/vendor/products/:productId/images/:imageId`
Delete product image.

### Product Variants

#### POST `/vendor/products/:productId/variants`
Add variant to product.

**Request Body:**
```json
{
  "name": "Size",
  "value": "Large",
  "priceDiff": 20,
  "stock": 25
}
```

#### PUT `/vendor/products/:productId/variants/:variantId`
Update product variant.

#### DELETE `/vendor/products/:productId/variants/:variantId`
Delete product variant.

---

## Category Management

Categories support a hierarchical structure with parent-child relationships.

### Public Endpoints (No Authentication Required)

#### GET `/categories`
Get all root categories (no parent).

**Query Parameters:**
- `includeInactive` (boolean, default: false)

**Response:** `200 OK`
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and accessories",
      "image": "https://storage.example.com/electronics.jpg",
      "parentId": null,
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2024-12-04T12:00:00.000Z",
      "updatedAt": "2024-12-04T12:00:00.000Z"
    }
  ]
}
```

#### GET `/categories/all`
Get all categories (flat list).

**Query Parameters:**
- `includeInactive` (boolean, default: false)

**Response:** `200 OK`
```json
{
  "categories": [...]
}
```

#### GET `/categories/tree`
Get full category hierarchy as a nested tree.

**Response:** `200 OK`
```json
{
  "tree": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "children": [
        {
          "id": "uuid",
          "name": "Audio",
          "slug": "audio",
          "children": [
            {
              "id": "uuid",
              "name": "Headphones",
              "slug": "headphones",
              "children": []
            }
          ]
        },
        {
          "id": "uuid",
          "name": "Smartphones",
          "slug": "smartphones",
          "children": []
        }
      ]
    }
  ]
}
```

#### GET `/categories/slug/:slug`
Get category by URL-friendly slug.

**Response:** `200 OK`
```json
{
  "category": {
    "id": "uuid",
    "name": "Headphones",
    "slug": "headphones",
    "parentId": "audio_uuid",
    ...
  }
}
```

#### GET `/categories/:categoryId/subcategories`
Get direct subcategories of a category.

**Response:** `200 OK`
```json
{
  "subcategories": [...]
}
```

#### GET `/categories/:categoryId/breadcrumb`
Get category breadcrumb path from root to the category.

**Response:** `200 OK`
```json
{
  "breadcrumb": [
    { "id": "uuid", "name": "Electronics", "slug": "electronics" },
    { "id": "uuid", "name": "Audio", "slug": "audio" },
    { "id": "uuid", "name": "Headphones", "slug": "headphones" }
  ]
}
```

### Admin Endpoints (Authentication Required)

#### POST `/categories`
Create a new category.

**Authentication:** Required (ADMIN role)

**Request Body:**
```json
{
  "name": "Headphones",
  "slug": "headphones",
  "description": "All types of headphones",
  "image": "https://storage.example.com/headphones.jpg",
  "parentId": "audio_category_uuid",
  "sortOrder": 1
}
```

**Response:** `201 Created`
```json
{
  "message": "Category created successfully",
  "category": { ... }
}
```

#### GET `/categories/:categoryId`
Get category by ID.

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "category": { ... }
}
```

#### PUT `/categories/:categoryId`
Update category.

**Authentication:** Required (ADMIN role)

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "isActive": false,
  "sortOrder": 2,
  "parentId": "new_parent_uuid"
}
```

**Response:** `200 OK`
```json
{
  "message": "Category updated successfully",
  "category": { ... }
}
```

#### DELETE `/categories/:categoryId`
Delete category (hard delete).

**Authentication:** Required (ADMIN role)

**Response:** `200 OK`
```json
{
  "message": "Category deleted successfully"
}
```

#### PATCH `/categories/:categoryId/deactivate`
Soft delete - deactivate category and all its subcategories.

**Authentication:** Required (ADMIN role)

**Response:** `200 OK`
```json
{
  "message": "Category and subcategories deactivated successfully"
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Database Schema

### Core Models

- **User**: Basic user authentication
- **Vendor**: Business information linked to User
- **VendorKYC**: KYC verification status
- **KYCDocument**: KYC document uploads
- **VendorBankDetails**: Payment information
- **Shop**: Vendor's storefront
- **Category**: Hierarchical product categories (supports subcategories)
- **Product**: Products with status, pricing, stock
- **ProductImage**: Product gallery images
- **ProductVariant**: Product variations (size, color, etc.)

### Category Hierarchy

Categories support unlimited nesting depth:
```
Electronics (parentId: null)
├── Audio (parentId: electronics_id)
│   ├── Headphones (parentId: audio_id)
│   ├── Speakers (parentId: audio_id)
│   └── Microphones (parentId: audio_id)
├── Smartphones (parentId: electronics_id)
└── Laptops (parentId: electronics_id)
```

---

## Architecture

### Project Structure

```
powermart-backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Auth, validation, vendor checks
│   ├── routes/          # Route definitions
│   ├── types/           # TypeScript interfaces
│   └── utils/           # JWT, password utilities
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Migration history
└── lib/
    └── prisma.ts        # Prisma client singleton
```

### Middleware Stack

1. **authenticate**: Validates JWT token
2. **isVendor**: Ensures user has VENDOR role
3. **attachVendor**: Loads vendor profile to request
4. **ownsShop**: Validates shop ownership
5. **ownsProduct**: Validates product ownership (via shop)

---

## Implementation Summary

### What Was Built

1. **Vendor Module**
   - Vendor registration (upgrades USER to VENDOR role)
   - Profile management
   - KYC document submission
   - KYC status tracking

2. **Shop Module**
   - Full CRUD operations
   - Auto-generated URL slugs
   - Active/inactive status

3. **Product Module**
   - Full CRUD with shop ownership validation
   - Image management (add/delete)
   - Variant management (add/update/delete)
   - Filtering (status, category, price range, search)
   - Pagination

4. **Category Module**
   - Hierarchical structure (unlimited depth)
   - URL-friendly slugs
   - Tree view for navigation
   - Breadcrumb generation
   - Soft delete (deactivate with children)

### Schema Changes Made

1. Fixed duplicate `frontImageURL` field in `KYCDocument`
2. Added missing `phoneOTPs` relation in `Vendor`
3. Enhanced `Category` model with:
   - `parentId` (self-referential for hierarchy)
   - `slug` (unique, URL-friendly)
   - `description`, `image`
   - `isActive`, `sortOrder`
   - Timestamps (`createdAt`, `updatedAt`)

### Migrations Applied

1. `20251129154010_initial_migration`
2. `20251204181630_auth_integrated`
3. `20251204210743_fix_vendor_phone_otp_relation`
4. `20251204213436_add_category_hierarchy`
