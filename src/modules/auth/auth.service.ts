import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { prisma } from '../../config/db';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    name: string
  ): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    // Create refresh token
    const refreshTokenString = signRefreshToken(user.id, user.email);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenString,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Sign access token
    const accessToken = signAccessToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken: refreshTokenString,
    };
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // Create refresh token
    const refreshTokenString = signRefreshToken(user.id, user.email);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenString,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Sign access token
    const accessToken = signAccessToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken: refreshTokenString,
    };
  }

  /**
   * Refresh tokens (rotate old refresh token, issue new one)
   */
  async refresh(oldRefreshToken: string): Promise<AuthResponse> {
    // Verify old token
    let payload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      throw new Error('User not found');
    }

    // Delete old refresh token from DB
    await prisma.refreshToken.deleteMany({
      where: {
        token: oldRefreshToken,
      },
    });

    // Create new refresh token
    const newRefreshTokenString = signRefreshToken(user.id, user.email);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshTokenString,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Sign new access token
    const accessToken = signAccessToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken: newRefreshTokenString,
    };
  }

  /**
   * Logout (delete refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
      },
    });
  }

  /**
   * Get current user (by ID)
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        defaultTone: true,
        defaultLanguage: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
