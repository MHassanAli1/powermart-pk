# Order API Architecture Diagram

## Request Flow

```
HTTP Request
    ↓
[Authentication Middleware]
    ↓
[Validation Middleware]
    ↓
[Order Controller]
    ├─ Checks authentication
    ├─ Parses request data
    └─ Calls Service Layer
        ↓
    [Order Service]
    ├─ Validates business logic
    ├─ Checks product existence
    ├─ Verifies stock availability
    ├─ Calculates totals
    ├─ Manages stock updates
    └─ Calls Data Layer
        ↓
    [Prisma ORM]
    ├─ Order model
    ├─ OrderItem model
    ├─ Product model
    ├─ ProductVariant model
    └─ OrderAddress model
        ↓
    [PostgreSQL Database]
        ↓
    [Response back through chain]
        ↓
HTTP Response (with proper status code & format)
```

## Module Structure

```
order-api/
├── types/
│   └── order.types.ts
│       ├── CreateOrderRequest
│       ├── UpdateOrderStatusRequest
│       ├── OrderResponse
│       ├── OrderDetailResponse
│       ├── OrderItemResponse
│       ├── OrderAddressResponse
│       ├── PaginatedOrdersResponse
│       └── OrderFilters
│
├── services/
│   └── order.service.ts
│       ├── createOrder()
│       ├── getOrderById()
│       ├── getOrdersByUserId()
│       ├── updateOrderStatus()
│       ├── updatePaymentStatus()
│       ├── cancelOrder()
│       └── Helper functions
│
├── controllers/
│   └── order.controller.ts
│       ├── createOrder()
│       ├── getOrderById()
│       ├── getUserOrders()
│       ├── updateOrderStatus()
│       ├── updatePaymentStatus()
│       └── cancelOrder()
│
└── routes/
    └── order.routes.ts
        ├── POST /orders
        ├── GET /orders
        ├── GET /orders/:orderId
        ├── PATCH /orders/:orderId/status
        ├── PATCH /orders/:orderId/payment
        └── POST /orders/:orderId/cancel
```

## Order Lifecycle State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    ORDER LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

    [CREATE ORDER]
         ↓
    ┌─────────────┐
    │   PENDING   │ ← Initial state after creation
    └─────────────┘
         ↓
    ┌─────────────┐
    │ CONFIRMED   │ ← After payment
    └─────────────┘
         ↓
    ┌─────────────┐
    │  SHIPPED    │ ← Out for delivery
    └─────────────┘
         ↓
    ┌─────────────┐
    │ DELIVERED   │ ← Reached customer
    └─────────────┘

    Alternative paths:

    PENDING → CANCELLED (stock restored)
    CONFIRMED → CANCELLED (stock restored)
    CONFIRMED → RETURNED
    DELIVERED → RETURNED

    CANCELLED (terminal)
    RETURNED (terminal)
```

## Payment Status Lifecycle

```
┌──────────────────────────────────┐
│     PAYMENT STATUS TRACKING      │
└──────────────────────────────────┘

COD (Cash on Delivery):
    PENDING → PAID (after delivery)

CARD:
    PENDING → PAID (after verification)
           → FAILED (if declined)
           → REFUNDED (if returned)
```

## Data Model Relationships

```
┌──────────────────────────────────────────────────────────┐
│                    ORDER MODEL                           │
├──────────────────────────────────────────────────────────┤
│ id (UUID)                                                │
│ userId (FK → User)                                       │
│ orderNumber (Unique)                                     │
│ status (OrderStatus enum)                                │
│ paymentStatus (PaymentStatus enum)                       │
│ paymentMethod (PaymentMethod enum)                       │
│ subtotalAmount (Float)                                   │
│ discountAmount (Float)                                   │
│ shippingFee (Float)                                      │
│ totalAmount (Float)                                      │
│ notes (String)                                           │
│ shippingAddressId (FK → OrderAddress)                    │
│ placedAt (DateTime)                                      │
│ updatedAt (DateTime)                                     │
│                                                          │
│ ↓ Relations                                              │
│ items → OrderItem[] (1:many)                             │
│ shippingAddress → OrderAddress (1:1)                     │
│ user → User (many:1)                                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                 ORDER ITEM MODEL                         │
├──────────────────────────────────────────────────────────┤
│ id (UUID)                                                │
│ orderId (FK → Order)                                     │
│ productId (FK → Product)                                 │
│ shopId (FK → Shop)                                       │
│ variantId (FK → ProductVariant, optional)                │
│ quantity (Int)                                           │
│ unitPrice (Float)                                        │
│ totalPrice (Float)                                       │
│ createdAt (DateTime)                                     │
│                                                          │
│ ↓ Relations                                              │
│ order → Order (many:1)                                   │
│ product → Product (many:1)                               │
│ variant → ProductVariant (many:1, optional)              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│              ORDER ADDRESS MODEL                         │
├──────────────────────────────────────────────────────────┤
│ id (UUID)                                                │
│ userId (FK → User)                                       │
│ fullName (String)                                        │
│ phoneNumber (String)                                     │
│ line1 (String)                                           │
│ line2 (String, optional)                                 │
│ city (String)                                            │
│ state (String, optional)                                 │
│ postalCode (String, optional)                            │
│ country (String)                                         │
│ notes (String, optional)                                 │
│ createdAt (DateTime)                                     │
│                                                          │
│ ↓ Relations                                              │
│ orders → Order[] (1:many)                                │
│ user → User (many:1)                                     │
└──────────────────────────────────────────────────────────┘
```

## API Endpoint Mapping

```
REST Endpoint              HTTP Method    Controller Function
─────────────────────────────────────────────────────────────
/orders                    POST           createOrder()
/orders                    GET            getUserOrders()
/orders/:orderId           GET            getOrderById()
/orders/:orderId/status    PATCH          updateOrderStatus()
/orders/:orderId/payment   PATCH          updatePaymentStatus()
/orders/:orderId/cancel    POST           cancelOrder()
```

## Validation Chain

```
Input Data
    ↓
┌──────────────────────────┐
│ Express Validator        │
├──────────────────────────┤
│ ✓ Type checks            │
│ ✓ Format validation      │
│ ✓ Required fields        │
│ ✓ Enum values            │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Service Layer            │
├──────────────────────────┤
│ ✓ Business logic         │
│ ✓ Stock verification     │
│ ✓ Address ownership      │
│ ✓ User permissions       │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Database Layer           │
├──────────────────────────┤
│ ✓ Constraints            │
│ ✓ Foreign keys           │
│ ✓ Unique constraints     │
└──────────────────────────┘
    ↓
Valid Order Created
```

## Stock Management Flow

```
Create Order Request
    ↓
┌─────────────────────┐
│ Verify Stock        │ → FAIL: 400 Error
├─────────────────────┤
│ For each item:      │
│ Check qty available │
└─────────────────────┘
    ↓ PASS
┌─────────────────────┐
│ Create Order        │
├─────────────────────┤
│ Begin transaction   │
└─────────────────────┘
    ↓
┌─────────────────────┐
│ Update Stock        │
├─────────────────────┤
│ For each item:      │
│ stock -= quantity   │
└─────────────────────┘
    ↓
┌─────────────────────┐
│ Order Created       │
│ Stock Updated       │
│ Transaction End     │
└─────────────────────┘

Cancellation:
    Cancel Order Request
        ↓
    ┌──────────────────┐
    │ Verify Status    │ → Only PENDING/CONFIRMED
    └──────────────────┘
        ↓
    ┌──────────────────┐
    │ Restore Stock    │
    │ stock += quantity│
    └──────────────────┘
        ↓
    ┌──────────────────┐
    │ Mark Cancelled   │
    └──────────────────┘
```

## Error Handling Strategy

```
Request
    ↓
Try-Catch Block
    ├─ Validation Errors (400)
    │  ├─ Missing fields
    │  ├─ Invalid types
    │  └─ Invalid enum values
    │
    ├─ Authentication Errors (401)
    │  └─ Missing/invalid token
    │
    ├─ Authorization Errors (403)
    │  └─ User doesn't own order
    │
    ├─ Not Found Errors (404)
    │  ├─ Product not found
    │  ├─ Order not found
    │  └─ Address not found
    │
    ├─ Business Logic Errors (400)
    │  ├─ Insufficient stock
    │  ├─ Cannot cancel shipped order
    │  └─ Invalid status transition
    │
    └─ Server Errors (500)
       └─ Database/unexpected errors

All errors return:
{
  "success": false,
  "error": "Error message"
}
```

---

**Created:** December 5, 2025
**Architecture:** Layered (Controller → Service → Data)
**Consistency:** 100% aligned with existing modules
