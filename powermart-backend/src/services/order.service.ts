import { prisma } from '../../lib/prisma.ts';
import type {
  CreateOrderRequest,
  OrderDetailResponse,
  OrderResponse,
  PaginatedOrdersResponse,
  OrderFilters,
  UpdateOrderStatusRequest,
  UpdatePaymentStatusRequest,
} from '../types/order.types.ts';

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

  // Calculate totals
  let subtotalAmount = 0;
  let discountAmount = 0;

  const orderItems = itemsWithDetails.map((item) => {
    const basePrice = item.product.price;
    const variantPriceDiff = item.variant?.priceDiff ?? 0;
    const unitPrice = basePrice + variantPriceDiff;
    const totalPrice = unitPrice * item.quantity;

    const discount = item.product.discount ? (item.product.discount / 100) * totalPrice : 0;

    subtotalAmount += totalPrice;
    discountAmount += discount;

    return {
      productId: item.product.id,
      shopId: item.product.shopId,
      variantId: item.variant?.id ?? null,
      quantity: item.quantity,
      unitPrice,
      totalPrice: totalPrice - discount,
    };
  });

  const shippingFee = 0; // Can be calculated based on address/products
  const totalAmount = subtotalAmount - discountAmount + shippingFee;

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
        create: orderItems,
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
        items: true,
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
    id: order.id,
    userId: order.userId,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotalAmount: order.subtotalAmount,
    discountAmount: order.discountAmount,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    notes: order.notes,
    shippingAddressId: order.shippingAddressId,
    placedAt: order.placedAt,
    updatedAt: order.updatedAt,
    items: order.items || [],
    shippingAddress: order.shippingAddress,
  };
}
