import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';
import { hashToken } from '../utils/jwt';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware for user routes
 * Validates session token from HTTP-only cookie
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.session_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_NO_TOKEN',
          message: '未登录，请先登录',
        },
      });
    }

    // Hash the token to find in database
    const tokenHash = hashToken(token);

    // Find session with valid token
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_SESSION',
          message: '登录已过期，请重新登录',
        },
      });
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_SESSION_EXPIRED',
          message: '登录已过期，请重新登录',
        },
      });
    }

    // Check if user account is disabled
    if (session.user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_ACCOUNT_DISABLED',
          message: '账户已被禁用，请联系管理员',
        },
      });
    }

    // Update last accessed time
    await prisma.session.update({
      where: { id: session.id },
      data: { lastAccessedAt: new Date() },
    });

    // Attach user to request
    req.user = {
      id: session.user.id,
      email: session.user.email,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
}

/**
 * Optional authentication middleware
 * Sets user if logged in, but doesn't require authentication
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.session_token;

    if (token) {
      const tokenHash = hashToken(token);
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (session && session.expiresAt >= new Date() && session.user.status === 'active') {
        await prisma.session.update({
          where: { id: session.id },
          data: { lastAccessedAt: new Date() },
        });

        req.user = {
          id: session.user.id,
          email: session.user.email,
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
}
