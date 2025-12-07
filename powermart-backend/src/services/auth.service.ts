import { prisma } from '../../lib/prisma.ts';
import { hashPassword, comparePassword, validatePassword } from '../utils/password.util.ts';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiration,
} from '../utils/jwt.util.ts';
import { sendEmailVerificationOTP } from './verification.service.ts';
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserResponse,
  TokenResponse,
} from '../types/auth.types.ts';
import { type User } from '../../prisma/generated/client.ts';
import { UserRole } from '../../prisma/generated/enums.ts';

/**
 * Convert User to UserResponse (exclude password)
 */
function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  const { email, password, name, role = UserRole.USER } = data;

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name ?? null,
      role,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshTokenValue = generateRefreshToken({
    userId: user.id,
    tokenId: '', // Will be set after creating the record
  });

  // Store refresh token
  const refreshToken = await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: getRefreshTokenExpiration(),
    },
  });

  // Send verification email (fire and forget - don't block registration)
  sendEmailVerificationOTP(user.id, user.email, user.name).catch((err) => {
    console.error('Failed to send verification email:', err);
  });

  return {
    user: toUserResponse(user),
    accessToken,
    refreshToken: refreshToken.token,
  };
}

/**
 * Login user
 */
export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  const { email, password } = data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if account is active
  if (user.status !== 'ACTIVE') {
    throw new Error('Account is not active');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshTokenValue = generateRefreshToken({
    userId: user.id,
    tokenId: '',
  });

  // Store refresh token
  const refreshToken = await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: getRefreshTokenExpiration(),
    },
  });

  return {
    user: toUserResponse(user),
    accessToken,
    refreshToken: refreshToken.token,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(token: string): Promise<TokenResponse> {
  // Verify refresh token
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }

  // Find refresh token in database
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!refreshToken) {
    throw new Error('Refresh token not found');
  }

  // Check if token is expired
  if (refreshToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
    throw new Error('Refresh token expired');
  }

  // Check if user is active
  if (refreshToken.user.status !== 'ACTIVE') {
    throw new Error('Account is not active');
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: refreshToken.user.id,
    email: refreshToken.user.email,
    role: refreshToken.user.role,
  });

  // Optionally rotate refresh token
  const newRefreshTokenValue = generateRefreshToken({
    userId: refreshToken.user.id,
    tokenId: refreshToken.id,
  });

  // Update refresh token
  await prisma.refreshToken.update({
    where: { id: refreshToken.id },
    data: {
      token: newRefreshTokenValue,
      expiresAt: getRefreshTokenExpiration(),
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshTokenValue,
  };
}

/**
 * Logout user (revoke refresh token)
 */
export async function logoutUser(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  return toUserResponse(user);
}
