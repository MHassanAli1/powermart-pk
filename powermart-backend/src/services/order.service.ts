import { prisma } from '../../lib/prisma.ts';
import type {
  CreateOrderRequest,
  OrderDetailResponse,
  OrderResponse,
  PaginatedOrdersResponse,
  OrderFilters,
  UpdateOrderStatusRequest,
  UpdatePaymentStatusRequest,
  UpdateOrderItemStatusRequest,
} from '../types/order.types.ts';
import * as cartService from './cart.service.ts';

// ===== Cart Checkout Types =====
export interface CheckoutFromCartRequest {
  shippingAddressId: string;
  paymentMethod?: 'COD' | 'CARD';
  notes?: string;
}

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXXXXX (where XXXXXX is random)
 */
function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${dateStr}-${random}`;
}

/**
 * Create a new order
 */
export async function createOrder(
  userId: string,
  data: CreateOrderRequest
): Promise<OrderDetailResponse> {
  // Validate shipping address exists and belongs to the user
  const shippingAddress = await prisma.orderAddress.findFirst({
    where: {
      id: data.shippingAddressId,
      userId,
    },
  });

  if (!shippingAddress) {
    throw new Error('Shipping address not found or does not belong to this user');
  }

  // Validate items exist and fetch product/variant details
  const itemsWithDetails = await Promise.all(
    data.items.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { shop: true },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }

      let variant = null;
      if (item.variantId) {
        variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) {
          throw new Error(`Variant with ID ${item.variantId} not found`);
        }

        if (variant.stock < item.quantity) {
          throw new Error(`Insufficient stock for variant ${variant.name}`);
        }
      }

      return {
        product,
        variant,
        quantity: item.quantity,
      };
    })
  );

  // Calculate totals with per-item delivery charge
  let subtotalAmount = 0;
  let discountAmount = 0;
  let deliveryTotal = 0;

  const orderItemsData = itemsWithDetails.map((item) => {
    const basePrice = item.product.price;
    const variantPriceDiff = item.variant?.priceDiff ?? 0;
    const unitPrice = basePrice + variantPriceDiff;
    const itemSubtotal = unitPrice * item.quantity;
    const discount = item.product.discount ? (item.product.discount / 100) * itemSubtotal : 0;
    const deliveryCharge = item.product.deliveryCharge ?? 0;
    const deliveryLine = deliveryCharge * item.quantity;
    const totalPrice = itemSubtotal - discount + deliveryLine;

    subtotalAmount += itemSubtotal;
    discountAmount += discount;
    deliveryTotal += deliveryLine;

    const itemData: any = {
      product: { connect: { id: item.product.id } },
      shop: { connect: { id: item.product.shopId } },
      quantity: item.quantity,
      unitPrice,
      deliveryCharge,
      totalPrice,
      status: 'PENDING',
    };

    if (item.variant) {
      itemData.variant = { connect: { id: item.variant.id } };
    }

    return itemData;
  });

  const shippingFee = 0; // kept at order-level for compatibility
  const totalAmount = subtotalAmount - discountAmount + deliveryTotal + shippingFee;

  // Create order
  const order = await prisma.order.create({
    data: {
      userId,
      orderNumber: generateOrderNumber(),
      status: 'PENDING',
      paymentStatus: data.paymentMethod ? 'PENDING' : null,
      paymentMethod: data.paymentMethod ?? null,
      subtotalAmount,
      discountAmount,
      shippingFee,
      totalAmount,
      notes: data.notes ?? null,
      shippingAddressId: data.shippingAddressId,
      items: {
        create: orderItemsData,
      },
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              value: true,
            },
          },
        },
      },
      shippingAddress: true,
    },
  });

  // Update product stocks
  await Promise.all(
    itemsWithDetails.map((item) =>
      prisma.product.update({
        where: { id: item.product.id },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      })
    )
  );

  return mapOrderToDetailResponse(order);
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string, userId?: string): Promise<OrderDetailResponse | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              value: true,
            },
          },
        },
      },
      shippingAddress: true,
    },
  });

  if (!order) {
    return null;
  }

  // Verify ownership if userId is provided
  if (userId && order.userId !== userId) {
    throw new Error('Unauthorized: You do not own this order');
  }

  return mapOrderToDetailResponse(order);
}

/**
 * Get orders by user ID with pagination and filters
 */
export async function getOrdersByUserId(
  userId: string,
  filters: OrderFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedOrdersResponse> {
  const where: any = { userId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  if (filters.startDate || filters.endDate) {
    where.placedAt = {};
    if (filters.startDate) {
      where.placedAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.placedAt.lte = filters.endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        placedAt: 'desc',
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, value: true } },
          },
        },
        shippingAddress: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    orders: orders.map(mapOrderToResponse),
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  data: UpdateOrderStatusRequest,
  userId: string
): Promise<OrderDetailResponse> {
  // Verify ownership
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.userId !== userId) {
    throw new Error('Unauthorized: You do not own this order');
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: data.status,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              value: true,
            },
          },
        },
      },
      shippingAddress: true,
    },
  });

  return mapOrderToDetailResponse(updatedOrder);
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  orderId: string,
  data: UpdatePaymentStatusRequest,
  userId: string
): Promise<OrderDetailResponse> {
  // Verify ownership
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.userId !== userId) {
    throw new Error('Unauthorized: You do not own this order');
  }

  const updateData: any = {
    paymentStatus: data.paymentStatus,
  };

  if (data.paymentMethod) {
    updateData.paymentMethod = data.paymentMethod;
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              value: true,
            },
          },
        },
      },
      shippingAddress: true,
    },
  });

  return mapOrderToDetailResponse(updatedOrder);
}

/**
 * Update a single order item status/tracking (vendor-only, must own the product's shop)
 */
export async function updateOrderItemStatus(
  orderId: string,
  orderItemId: string,
  data: UpdateOrderItemStatusRequest,
  vendorUserId: string
): Promise<OrderDetailResponse> {
  const orderItem = await prisma.orderItem.findFirst({
    where: { id: orderItemId, orderId },
    include: {
      product: {
        include: {
          shop: {
            include: {
              vendor: {
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!orderItem) {
    throw new Error('Order item not found');
  }

  if (!orderItem.product.shop.vendor || orderItem.product.shop.vendor.userId !== vendorUserId) {
    throw new Error('Unauthorized: You do not own this product');
  }

  const updateData: any = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.trackingCode !== undefined) updateData.trackingCode = data.trackingCode;
  if (data.carrier !== undefined) updateData.carrier = data.carrier;
  if (data.trackingUrl !== undefined) updateData.trackingUrl = data.trackingUrl;
  if (data.estimatedDelivery !== undefined) {
    updateData.estimatedDelivery = new Date(data.estimatedDelivery);
  }
  if (data.status === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  }

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: updateData,
  });

  // Return updated order with items
  const updatedOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, name: true, value: true } },
        },
      },
      shippingAddress: true,
    },
  });

  if (!updatedOrder) {
    throw new Error('Order not found after update');
  }

  return mapOrderToDetailResponse(updatedOrder);
}

/**
 * Cancel order
 */
export async function cancelOrder(orderId: string, userId: string): Promise<OrderDetailResponse> {
  // Verify ownership
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.userId !== userId) {
    throw new Error('Unauthorized: You do not own this order');
  }

  if (order.status === 'CANCELLED') {
    throw new Error('Order is already cancelled');
  }

  if (['SHIPPED', 'DELIVERED'].includes(order.status)) {
    throw new Error('Cannot cancel an order that has been shipped or delivered');
  }

  // Restore product stocks
  await Promise.all(
    order.items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      })
    )
  );

  const cancelledOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              value: true,
            },
          },
        },
      },
      shippingAddress: true,
    },
  });

  return mapOrderToDetailResponse(cancelledOrder);
}

// ============ Helper Functions ============

function mapOrderToResponse(order: any): any {
  return {
    id: order.id,
    userId: order.userId,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    trackingCode: order.trackingCode ?? null,
    carrier: order.carrier ?? null,
    trackingUrl: order.trackingUrl ?? null,
    estimatedDelivery: order.estimatedDelivery ?? null,
    deliveredAt: order.deliveredAt ?? null,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    notes: order.notes,
    shippingAddressId: order.shippingAddressId,
    placedAt: order.placedAt,
    updatedAt: order.updatedAt,
  };
}

function mapOrderToDetailResponse(order: any): OrderDetailResponse {
  return {
    ...mapOrderToResponse(order),
    items:
      order.items?.map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        shopId: item.shopId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        deliveryCharge: item.deliveryCharge,
        totalPrice: item.totalPrice,
        status: item.status ?? 'PENDING',
        trackingCode: item.trackingCode ?? null,
        carrier: item.carrier ?? null,
        trackingUrl: item.trackingUrl ?? null,
        deliveredAt: item.deliveredAt ?? null,
        createdAt: item.createdAt,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              sku: item.product.sku,
            }
          : undefined,
        variant: item.variant
          ? {
              id: item.variant.id,
              name: item.variant.name,
              value: item.variant.value,
            }
          : undefined,
      })) ?? [],
    shippingAddress: order.shippingAddress,
  };
}

/**
 * Create order from cart (checkout)
 */
export async function checkoutFromCart(
  userId: string,
  data: CheckoutFromCartRequest
): Promise<OrderDetailResponse> {
  // Validate cart
  const validation = await cartService.validateCartForCheckout(userId);
  if (!validation.valid) {
    throw new Error(`Cart validation failed: ${validation.errors.join(', ')}`);
  }

  if (validation.cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  // Validate shipping address
  const shippingAddress = await prisma.orderAddress.findFirst({
    where: {
      id: data.shippingAddressId,
      userId,
    },
  });

  if (!shippingAddress) {
    throw new Error('Shipping address not found or does not belong to this user');
  }

  // Get cart items with full details
  const cartItems = await cartService.getCartItemsForOrder(userId);

  // Build order items from cart
  let subtotalAmount = 0;
  let deliveryTotal = 0;

  const orderItemsData = cartItems.map((item) => {
    const unitPrice = item.priceSnapshot;
    const deliveryCharge = item.deliveryChargeSnapshot;
    const itemSubtotal = unitPrice * item.quantity;
    const deliveryLine = deliveryCharge * item.quantity;
    const totalPrice = itemSubtotal + deliveryLine;

    subtotalAmount += itemSubtotal;
    deliveryTotal += deliveryLine;

    const itemData: any = {
      product: { connect: { id: item.productId } },
      shop: { connect: { id: item.product.shopId } },
      quantity: item.quantity,
      unitPrice,
      deliveryCharge,
      totalPrice,
      status: 'PENDING',
    };

    if (item.variantId) {
      itemData.variant = { connect: { id: item.variantId } };
    }

    return itemData;
  });

  const shippingFee = 0;
  const discountAmount = 0;
  const totalAmount = subtotalAmount + deliveryTotal + shippingFee - discountAmount;

  // Create order
  const order = await prisma.order.create({
    data: {
      userId,
      orderNumber: generateOrderNumber(),
      status: 'PENDING',
      paymentStatus: data.paymentMethod ? 'PENDING' : null,
      paymentMethod: data.paymentMethod ?? null,
      subtotalAmount,
      discountAmount,
      shippingFee,
      totalAmount,
      notes: data.notes ?? null,
      shippingAddressId: data.shippingAddressId,
      items: {
        create: orderItemsData,
      },
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, name: true, value: true } },
        },
      },
      shippingAddress: true,
    },
  });

  // Update product stocks
  await Promise.all(
    cartItems.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
        },
      })
    )
  );

  // Also decrement variant stock if applicable
  await Promise.all(
    cartItems
      .filter((item) => item.variantId)
      .map((item) =>
        prisma.productVariant.update({
          where: { id: item.variantId! },
          data: {
            stock: { decrement: item.quantity },
          },
        })
      )
  );

  // Clear cart after successful order
  await cartService.clearCartAfterOrder(userId);

  return mapOrderToDetailResponse(order);
}
