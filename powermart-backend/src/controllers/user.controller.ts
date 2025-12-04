import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import { prisma } from '../../lib/prisma.ts';

/**
 * Get all users (Admin only)
 * GET /api/users
 */
export async function getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    });
  }
}

/**
 * Get user by ID (Admin only)
 * GET /api/users/:id
 */
export async function getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user',
    });
  }
}

/**
 * Update user (Admin only)
 * PUT /api/users/:id
 */
export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);
    const { name, role, status, isVerified } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status }),
        ...(isVerified !== undefined && { isVerified }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
}

/**
 * Delete user (Admin only)
 * DELETE /api/users/:id
 */
export async function deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);

    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    });
  }
}
