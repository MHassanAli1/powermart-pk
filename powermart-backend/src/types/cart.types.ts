export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartItemResponse {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  priceSnapshot: number;
  deliveryChargeSnapshot: number;
  itemTotal: number;
  deliveryTotal: number;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    price: number;
    discount: number | null;
    deliveryCharge: number;
    stock: number;
    status: string;
    image: string | null;
  };
  variant?: {
    id: string;
    name: string;
    value: string;
    priceDiff: number | null;
    stock: number;
  };
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItemResponse[];
  itemCount: number;
  subtotal: number;
  totalDelivery: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}
