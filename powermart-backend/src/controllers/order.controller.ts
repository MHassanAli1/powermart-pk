import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import * as orderService from '../services/order.service.ts';
import type { OrderFilters, UpdateOrderItemStatusRequest } from '../types/order.types.ts';

export async function createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const order = await orderService.createOrder(req.user.userId, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getOrderById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const orderId = req.params.orderId;
    if (!orderId) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await orderService.getOrderById(orderId, req.user.userId);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get order';
    const statusCode = message.includes('Unauthorized') ? 403 : 500;
    res.status(statusCode).json({ success: false, error: message });
  }
}

export async function getUserOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { status, paymentStatus, startDate, endDate, page, limit } = req.query;

    const filters: OrderFilters = {};
    if (status) filters.status = status as any;
    if (paymentStatus) filters.paymentStatus = paymentStatus as any;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 20;

    const result = await orderService.getOrdersByUserId(
      req.user.userId,
      filters,
      pageNum,
      limitNum
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get orders';
    res.status(500).json({ success: false, error: message });
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const orderId = req.params.orderId;
    if (!orderId) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await orderService.updateOrderStatus(orderId, req.body, req.user.userId);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order status';
    const statusCode = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

export async function updatePaymentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const orderId = req.params.orderId;
    if (!orderId) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await orderService.updatePaymentStatus(orderId, req.body, req.user.userId);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update payment status';
    const statusCode = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

export async function updateOrderItemStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const orderId = req.params.orderId;
    const orderItemId = req.params.orderItemId;
    if (!orderId || !orderItemId) {
      res.status(400).json({ success: false, error: 'Order ID and Order Item ID are required' });
      return;
    }

    const payload: UpdateOrderItemStatusRequest = {
      ...req.body,
      estimatedDelivery: req.body.estimatedDelivery
        ? new Date(req.body.estimatedDelivery)
        : undefined,
    };

    const order = await orderService.updateOrderItemStatus(
      orderId,
      orderItemId,
      payload,
      req.user.userId
    );

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order item status';
    const statusCode = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

export async function cancelOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const orderId = req.params.orderId;
    if (!orderId) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await orderService.cancelOrder(orderId, req.user.userId);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel order';
    const statusCode = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}

/**
 * Create order from cart (checkout)
 */
export async function checkoutFromCart(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const order = await orderService.checkoutFromCart(req.user.userId, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to checkout';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: message });
  }
}
