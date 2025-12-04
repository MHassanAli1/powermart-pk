import { Router } from 'express';
import authRoutes from './auth.routes.ts';
import userRoutes from './user.routes.ts';
import vendorRoutes from './vendor.routes.ts';
import shopRoutes from './shop.routes.ts';
import productRoutes from './product.routes.ts';
import categoryRoutes from './category.routes.ts';
import orderRoutes from './order.routes.ts';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vendors', vendorRoutes);
router.use('/shops', shopRoutes);
router.use('/vendor', productRoutes); // Product routes under /vendor prefix
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);

export default router;
