import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.ts';
import { authenticate, authorize } from '../middleware/auth.middleware.ts';
import { UserRole } from '../../prisma/generated/enums.ts';

const router = Router();

// All user routes require authentication and admin role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
