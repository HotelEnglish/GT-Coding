import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';
import { hashToken } from '../utils/jwt';

// Extend Express Request type to include admin user
declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware for admin routes
 * Validates admin session token from HTTP-only cookie
 * Admin sessions expire after 2 hours of inactivity
 */
export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.admin_session_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ADMIN_AUTH_NO_TOKEN',
          message: '管理员未登录',
        },
      });
    }

    // Hash the token to find in database
    const tokenHash = hashToken(token);

    // Find admin session with valid token
    const session = await prisma.adminSession.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ADMIN_AUTH_INVALID_SESSION',
          message: '管理员登录已过期，请重新登录',
        },
      });
    }

    // Check if session has expired (2 hours for admin)
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.adminSession.delete({ where: { id: session.id } });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'ADMIN_AUTH_SESSION_EXPIRED',
          message: '管理员登录已过期，请重新登录',
        },
      });
    }

    // Update last accessed time
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { lastAccessedAt: new Date() },
    });

    // Attach admin user to request
    req.adminUser = {
      id: session.admin.id,
      email: session.admin.email,
    };

    return next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
}
