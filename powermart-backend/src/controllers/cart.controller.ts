import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import * as cartService from '../services/cart.service.ts';

/**
 * Get user's cart
 */
export async function getCart(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const cart = await cartService.getCart(req.user.userId);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get cart';
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * Add item to cart
 */
export async function addToCart(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const cart = await cartService.addToCart(req.user.userId, req.body);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add item to cart';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const itemId = req.params.itemId;
    if (!itemId) {
      res.status(400).json({ success: false, error: 'Item ID is required' });
      return;
    }

    const cart = await cartService.updateCartItem(req.user.userId, itemId, req.body);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update cart item';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const itemId = req.params.itemId;
    if (!itemId) {
      res.status(400).json({ success: false, error: 'Item ID is required' });
      return;
    }

    const cart = await cartService.removeFromCart(req.user.userId, itemId);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove item from cart';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const cart = await cartService.clearCart(req.user.userId);
    res.status(200).json({ success: true, data: cart, message: 'Cart cleared successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear cart';
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * Validate cart for checkout
 */
export async function validateCart(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await cartService.validateCartForCheckout(req.user.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate cart';
    res.status(500).json({ success: false, error: message });
  }
}
