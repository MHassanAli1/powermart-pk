import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation.middleware.ts';
import { authenticate, authorize } from '../middleware/auth.middleware.ts';
import * as orderController from '../controllers/order.controller.ts';
import { UserRole, OrderItemStatus } from '../../prisma/generated/enums.ts';

const router = Router();

// Validation rules
const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isUUID().withMessage('Invalid product ID'),
  body('items.*.variantId').optional().isUUID(),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddressId').isUUID().withMessage('Valid shipping address ID is required'),
  body('paymentMethod').optional().isIn(['COD', 'CARD']),
  body('notes').optional().isString().trim(),
];

const updateOrderStatusValidation = [
  body('status')
    .isIn(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'])
    .withMessage('Invalid order status'),
];

const updatePaymentStatusValidation = [
  body('paymentStatus')
    .isIn(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
    .withMessage('Invalid payment status'),
  body('paymentMethod').optional().isIn(['COD', 'CARD']),
];

const updateOrderItemStatusValidation = [
  body('status')
    .isIn(Object.values(OrderItemStatus))
    .withMessage('Invalid order item status'),
  body('trackingCode').optional().isString().trim(),
  body('carrier').optional().isString().trim(),
  body('trackingUrl').optional().isString().trim(),
  body('estimatedDelivery').optional().isISO8601().toDate(),
];

const orderIdValidation = [
  param('orderId').isUUID().withMessage('Invalid order ID'),
];

const checkoutValidation = [
  body('shippingAddressId').isUUID().withMessage('Valid shipping address ID is required'),
  body('paymentMethod').optional().isIn(['COD', 'CARD']),
  body('notes').optional().isString().trim(),
];

// All routes require authentication
router.use(authenticate);

// ===== Order CRUD Routes =====

// Create new order (from items array)
router.post('/', createOrderValidation, validate, orderController.createOrder);

// Create order from cart (checkout)
router.post('/checkout', checkoutValidation, validate, orderController.checkoutFromCart);

// Get all orders for the authenticated user (with filters and pagination)
router.get('/', orderController.getUserOrders);

// ===== Single Order Routes =====

// Get order by ID
router.get('/:orderId', orderIdValidation, validate, orderController.getOrderById);

// Vendor: update specific order item status/tracking
router.patch(
  '/:orderId/items/:orderItemId/status',
  authorize(UserRole.VENDOR),
  orderIdValidation,
  [param('orderItemId').isUUID().withMessage('Invalid order item ID')],
  updateOrderItemStatusValidation,
  validate,
  orderController.updateOrderItemStatus
);

// Update order status
router.patch(
  '/:orderId/status',
  orderIdValidation,
  updateOrderStatusValidation,
  validate,
  orderController.updateOrderStatus
);

// Update payment status
router.patch(
  '/:orderId/payment',
  orderIdValidation,
  updatePaymentStatusValidation,
  validate,
  orderController.updatePaymentStatus
);

// Cancel order
router.post('/:orderId/cancel', orderIdValidation, validate, orderController.cancelOrder);

export default router;
