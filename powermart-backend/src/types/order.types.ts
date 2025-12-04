import type { OrderStatus, PaymentStatus, PaymentMethod } from '../../prisma/generated/enums.ts';

// Request DTOs
export interface CreateOrderRequest {
  items: OrderItemRequest[];
  shippingAddressId: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface OrderItemRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface UpdatePaymentStatusRequest {
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
}

// Response DTOs - Order Address
export interface OrderAddressResponse {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  notes: string | null;
  createdAt: Date;
}

// Response DTOs - Order Item
export interface OrderItemResponse {
  id: string;
  orderId: string;
  productId: string;
  shopId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  product?: {
    id: string;
    name: string;
    sku: string | null;
  };
  variant?: {
    id: string;
    name: string;
    value: string;
  };
}

// Response DTOs - Order
export interface OrderResponse {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  paymentMethod: PaymentMethod | null;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  notes: string | null;
  shippingAddressId: string;
  placedAt: Date;
  updatedAt: Date;
}

export interface OrderDetailResponse extends OrderResponse {
  items: OrderItemResponse[];
  shippingAddress: OrderAddressResponse;
}

// Pagination
export interface PaginatedOrdersResponse {
  orders: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filters
export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
}
