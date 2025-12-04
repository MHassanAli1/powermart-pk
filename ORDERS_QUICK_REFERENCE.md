# Quick Reference: Order APIs

## Available Endpoints

### 1. Create Order

```bash
POST /api/orders
```

**Body:**

```json
{
  "items": [
    { "productId": "uuid", "quantity": 2, "variantId": "uuid (optional)" }
  ],
  "shippingAddressId": "uuid",
  "paymentMethod": "COD",
  "notes": "Special instructions"
}
```

**Response:** 201 Created with full order details

---

### 2. List User Orders

```bash
GET /api/orders?page=1&limit=20&status=PENDING&paymentStatus=PAID&startDate=2025-12-01
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED | RETURNED
- `paymentStatus` - PENDING | PAID | FAILED | REFUNDED
- `startDate` - ISO 8601 date
- `endDate` - ISO 8601 date

**Response:** 200 OK with paginated orders array

---

### 3. Get Order Details

```bash
GET /api/orders/:orderId
```

**Response:** 200 OK with full order including items and shipping address

---

### 4. Update Order Status

```bash
PATCH /api/orders/:orderId/status
```

**Body:**

```json
{
  "status": "SHIPPED"
}
```

**Valid Statuses:** PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED | RETURNED

---

### 5. Update Payment Status

```bash
PATCH /api/orders/:orderId/payment
```

**Body:**

```json
{
  "paymentStatus": "PAID",
  "paymentMethod": "CARD"
}
```

**Valid Payment Statuses:** PENDING | PAID | FAILED | REFUNDED
**Valid Methods:** COD | CARD

---

### 6. Cancel Order

```bash
POST /api/orders/:orderId/cancel
```

**Response:** 200 OK with cancelled order
**Notes:**

- Only PENDING or CONFIRMED orders can be cancelled
- Stock is automatically restored

---

## Key Features

✅ **Stock Management**

- Validates stock before creating order
- Decrements stock on order creation
- Restores stock on cancellation

✅ **Pricing**

- Calculates subtotal with discounts
- Supports product-level discounts
- Includes shipping fees (currently 0)
- Generates total with formula: `subtotal - discount + shipping`

✅ **Order Tracking**

- Unique order number: `ORD-YYYYMMDD-XXXXXX`
- Status lifecycle: PENDING → CONFIRMED → SHIPPED → DELIVERED
- Payment tracking: PENDING → PAID or FAILED or REFUNDED
- Supports refunds and returns

✅ **Security**

- All endpoints require authentication
- User ownership verification on all endpoints
- Cannot access or modify other users' orders

✅ **Filtering & Pagination**

- List orders with multiple filters
- Date range filtering (startDate, endDate)
- Status and payment status filtering
- Configurable pagination (page, limit)

---

## Error Responses

### 400 Bad Request

```json
{ "success": false, "error": "Insufficient stock for product XYZ" }
```

### 401 Unauthorized

```json
{ "success": false, "error": "Authentication required" }
```

### 403 Forbidden

```json
{ "success": false, "error": "Unauthorized: You do not own this order" }
```

### 404 Not Found

```json
{ "success": false, "error": "Order not found" }
```

---

## File Structure

```
src/
├── types/order.types.ts              # Type definitions
├── services/order.service.ts          # Business logic
├── controllers/order.controller.ts    # HTTP handlers
└── routes/order.routes.ts             # Route definitions
```

---

## Implementation Highlights

1. **Consistent with Codebase**

   - Follows same patterns as product, shop, vendor modules
   - Uses established middleware (auth, validation)
   - Same response format and error handling

2. **Database Integration**

   - Leverages existing Prisma schema
   - Uses Order, OrderItem, OrderAddress, Product, ProductVariant models
   - Maintains referential integrity

3. **Validation**

   - Input validation using express-validator
   - Business logic validation (stock, addresses)
   - Enum validation for status and payment fields

4. **Safety**
   - User ownership checks on all endpoints
   - Transaction-like consistency
   - Proper error propagation and handling

---

## Testing Tips

1. **Create Test Address First**

   - Need a valid shipping address before creating orders
   - Address must belong to authenticated user

2. **Stock Considerations**

   - Products must have sufficient stock
   - Variants must have sufficient stock
   - Stock is decremented atomically

3. **Order Lifecycle**

   - New orders start in PENDING status
   - Payment status is optional (depends on payment method)
   - Status transitions: PENDING → CONFIRMED → SHIPPED → DELIVERED

4. **Cancellation Rules**
   - Can only cancel PENDING or CONFIRMED orders
   - Stock is restored immediately on cancellation
   - Cannot cancel SHIPPED or DELIVERED orders
