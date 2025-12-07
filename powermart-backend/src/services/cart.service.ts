import { prisma } from '../../lib/prisma.ts';
import type {
  AddToCartRequest,
  UpdateCartItemRequest,
  CartResponse,
  CartItemResponse,
} from '../types/cart.types.ts';

/**
 * Get or create cart for user
 */
async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              discount: true,
              deliveryCharge: true,
              stock: true,
              status: true,
              images: { select: { url: true }, take: 1 },
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              value: true,
              priceDiff: true,
              stock: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                discount: true,
                deliveryCharge: true,
                stock: true,
                status: true,
                images: { select: { url: true }, take: 1 },
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                value: true,
                priceDiff: true,
                stock: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  return cart;
}

/**
 * Get user's cart
 */
export async function getCart(userId: string): Promise<CartResponse> {
  const cart = await getOrCreateCart(userId);
  return mapCartToResponse(cart);
}

/**
 * Add item to cart (upsert if already exists)
 */
export async function addToCart(
  userId: string,
  data: AddToCartRequest
): Promise<CartResponse> {
  // Validate product exists and is active
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    select: {
      id: true,
      name: true,
      price: true,
      discount: true,
      deliveryCharge: true,
      stock: true,
      status: true,
      shopId: true,
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  if (product.status !== 'ACTIVE') {
    throw new Error('Product is not available');
  }

  // Validate variant if provided
  let variant = null;
  if (data.variantId) {
    variant = await prisma.productVariant.findUnique({
      where: { id: data.variantId },
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    if (variant.productId !== data.productId) {
      throw new Error('Variant does not belong to this product');
    }
  }

  // Check stock
  const availableStock = variant ? variant.stock : product.stock;
  if (data.quantity > availableStock) {
    throw new Error(`Insufficient stock. Only ${availableStock} available.`);
  }

  // Get or create cart
  const cart = await getOrCreateCart(userId);

  // Calculate price snapshot
  const basePrice = product.price - (product.discount ?? 0);
  const variantPriceDiff = variant?.priceDiff ?? 0;
  const priceSnapshot = basePrice + variantPriceDiff;
  const deliveryChargeSnapshot = product.deliveryCharge;

  // Upsert cart item - use findFirst because variantId can be null
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: data.productId,
      variantId: data.variantId ?? null,
    },
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + data.quantity;
    if (newQuantity > availableStock) {
      throw new Error(`Cannot add more. Only ${availableStock} available.`);
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: newQuantity,
        priceSnapshot,
        deliveryChargeSnapshot,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: data.productId,
        variantId: data.variantId ?? null,
        quantity: data.quantity,
        priceSnapshot,
        deliveryChargeSnapshot,
      },
    });
  }

  // Return updated cart
  return getCart(userId);
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  userId: string,
  itemId: string,
  data: UpdateCartItemRequest
): Promise<CartResponse> {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: {
      product: { select: { stock: true, status: true } },
      variant: { select: { stock: true } },
    },
  });

  if (!cartItem) {
    throw new Error('Cart item not found');
  }

  if (cartItem.product.status !== 'ACTIVE') {
    throw new Error('Product is no longer available');
  }

  const availableStock = cartItem.variant?.stock ?? cartItem.product.stock;

  if (data.quantity > availableStock) {
    throw new Error(`Insufficient stock. Only ${availableStock} available.`);
  }

  if (data.quantity <= 0) {
    // Remove item if quantity is 0 or less
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: data.quantity },
    });
  }

  return getCart(userId);
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  userId: string,
  itemId: string
): Promise<CartResponse> {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!cartItem) {
    throw new Error('Cart item not found');
  }

  await prisma.cartItem.delete({ where: { id: itemId } });

  return getCart(userId);
}

/**
 * Clear entire cart
 */
export async function clearCart(userId: string): Promise<CartResponse> {
  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return getCart(userId);
}

/**
 * Validate cart items before checkout (check stock & status)
 */
export async function validateCartForCheckout(userId: string): Promise<{
  valid: boolean;
  errors: string[];
  cart: CartResponse;
}> {
  const cart = await getOrCreateCart(userId);
  const errors: string[] = [];

  for (const item of cart.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product) {
      errors.push(`Product ${item.productId} no longer exists`);
      continue;
    }

    if (product.status !== 'ACTIVE') {
      errors.push(`Product "${product.name}" is no longer available`);
      continue;
    }

    let availableStock = product.stock;
    if (item.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
      });
      if (variant) {
        availableStock = variant.stock;
      }
    }

    if (item.quantity > availableStock) {
      errors.push(
        `Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${availableStock}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cart: mapCartToResponse(cart),
  };
}

/**
 * Get cart items for order creation (internal use)
 */
export async function getCartItemsForOrder(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { shop: true },
          },
          variant: true,
        },
      },
    },
  });

  return cart?.items.map((item) => ({
    ...item,
    priceSnapshot: item.priceSnapshot,
    deliveryChargeSnapshot: item.deliveryChargeSnapshot,
  })) ?? [];
}

/**
 * Clear cart after successful order (internal use)
 */
export async function clearCartAfterOrder(userId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }
}

// Helper to map cart to response
function mapCartToResponse(cart: any): CartResponse {
  const items: CartItemResponse[] = cart.items.map((item: any) => {
    const itemTotal = item.priceSnapshot * item.quantity;
    const deliveryTotal = item.deliveryChargeSnapshot * item.quantity;

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      priceSnapshot: item.priceSnapshot,
      deliveryChargeSnapshot: item.deliveryChargeSnapshot,
      itemTotal,
      deliveryTotal,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            discount: item.product.discount,
            deliveryCharge: item.product.deliveryCharge,
            stock: item.product.stock,
            status: item.product.status,
            image: item.product.images?.[0]?.url ?? null,
          }
        : undefined,
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            value: item.variant.value,
            priceDiff: item.variant.priceDiff,
            stock: item.variant.stock,
          }
        : undefined,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const totalDelivery = items.reduce((sum, item) => sum + item.deliveryTotal, 0);
  const total = subtotal + totalDelivery;

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    itemCount: items.length,
    subtotal,
    totalDelivery,
    total,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}
