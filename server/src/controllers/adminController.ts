import { Request, Response } from 'express';
import prisma from '../utils/db';
import { comparePassword } from '../utils/password';
import { generateSecureToken, hashToken } from '../utils/jwt';
import { addCredits } from '../services/creditService';
import { sendOrderStatusEmail } from '../services/emailService';

/**
 * POST /api/admin/login
 * Admin login
 */
export async function adminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await prisma.adminUser.findUnique({ where: { email } });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_INVALID_CREDENTIALS', message: '邮箱或密码错误' },
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, admin.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_INVALID_CREDENTIALS', message: '邮箱或密码错误' },
      });
    }

    // Create admin session (2 hours expiration)
    const sessionToken = generateSecureToken();
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        tokenHash,
        expiresAt,
      },
    });

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Set admin session cookie
    res.cookie('admin_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    return res.json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
        },
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '登录失败' },
    });
  }
}

/**
 * POST /api/admin/logout
 * Admin logout
 */
export async function adminLogout(req: Request, res: Response) {
  try {
    const token = req.cookies?.admin_session_token;

    if (token) {
      const tokenHash = hashToken(token);
      await prisma.adminSession.deleteMany({ where: { tokenHash } });
    }

    res.clearCookie('admin_session_token');

    return res.json({
      success: true,
      data: { message: '已退出登录' },
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '退出失败' },
    });
  }
}

/**
 * Log admin action
 */
async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: any
) {
  await prisma.adminActionLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details,
    },
  });
}

/**
 * GET /api/admin/orders
 * Get all orders with search/filter
 */
export async function getOrders(req: Request, res: Response) {
  try {
    const { status, userEmail, orderId, startDate, endDate, page = '1', limit = '20' } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (userEmail) {
      where.user = { email: { contains: String(userEmail), mode: 'insensitive' } };
    }

    if (orderId) {
      where.id = orderId;
    }

    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(String(startDate));
      if (endDate) where.submittedAt.lte = new Date(String(endDate));
    }

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);

    const [orders, total] = await Promise.all([
      prisma.rechargeOrder.findMany({
        where,
        include: {
          user: { select: { id: true, email: true } },
          processedBy: { select: { id: true, email: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.rechargeOrder.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: orders,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < total,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取订单列表失败' },
    });
  }
}

/**
 * POST /api/admin/orders/:orderId/approve
 * Approve a recharge order
 */
export async function approveOrder(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const adminId = req.adminUser?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const order = await prisma.rechargeOrder.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '订单不存在' },
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '订单已处理' },
      });
    }

    // Update order and add credits in transaction
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.rechargeOrder.update({
        where: { id: orderId },
        data: {
          status: 'approved',
          processedById: adminId,
          processedAt: new Date(),
        },
      });

      // Add credits to user
      await addCredits(order.userId, order.credits, 'recharge', `充值-${order.planId}`, orderId);

      // Log admin action
      await logAdminAction(adminId, 'approve_order', 'order', orderId, {
        orderNumber: order.orderNumber,
        credits: order.credits,
      });
    });

    // Send notification email
    await sendOrderStatusEmail(order.user.email, order.orderNumber, 'approved', order.credits);

    return res.json({
      success: true,
      data: { message: '订单已通过' },
    });
  } catch (error) {
    console.error('Approve order error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '审批失败' },
    });
  }
}

/**
 * POST /api/admin/orders/:orderId/reject
 * Reject a recharge order
 */
export async function rejectOrder(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const adminId = req.adminUser?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const order = await prisma.rechargeOrder.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '订单不存在' },
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '订单已处理' },
      });
    }

    // Update order status
    await prisma.rechargeOrder.update({
      where: { id: orderId },
      data: {
        status: 'rejected',
        processedById: adminId,
        processedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Log admin action
    await logAdminAction(adminId, 'reject_order', 'order', orderId, {
      orderNumber: order.orderNumber,
      reason,
    });

    // Send notification email
    await sendOrderStatusEmail(order.user.email, order.orderNumber, 'rejected', undefined, reason);

    return res.json({
      success: true,
      data: { message: '订单已拒绝' },
    });
  } catch (error) {
    console.error('Reject order error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '拒绝失败' },
    });
  }
}

/**
 * GET /api/admin/users
 * Get all users with search
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const { email, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (email) {
      where.email = { contains: String(email), mode: 'insensitive' };
    }

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          creditBalance: true,
          _count: { select: { codingTasks: true } },
        },
        orderBy: { registeredAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: users.map((user) => ({
          id: user.id,
          email: user.email,
          registeredAt: user.registeredAt,
          creditBalance: user.creditBalance?.balance ?? 0,
          status: user.status,
          totalCodingTasks: user._count.codingTasks,
        })),
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < total,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取用户列表失败' },
    });
  }
}

/**
 * POST /api/admin/users/:userId/toggle-status
 * Enable or disable a user account
 */
export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { enable } = req.body;
    const adminId = req.adminUser?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '用户不存在' },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: enable ? 'active' : 'disabled' },
    });

    // If disabling, invalidate all sessions
    if (!enable) {
      await prisma.session.deleteMany({ where: { userId } });
    }

    // Log admin action
    await logAdminAction(adminId, enable ? 'enable_user' : 'disable_user', 'user', userId);

    return res.json({
      success: true,
      data: { message: enable ? '账户已启用' : '账户已禁用' },
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '操作失败' },
    });
  }
}

/**
 * POST /api/admin/users/:userId/add-credits
 * Manually add credits to user account
 */
export async function addUserCredits(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    const adminId = req.adminUser?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '积分数量必须大于0' },
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请填写调整原因' },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '用户不存在' },
      });
    }

    // Add credits
    const result = await addCredits(userId, amount, 'admin_adjustment', reason, undefined, adminId);

    // Log admin action
    await logAdminAction(adminId, 'add_credits', 'user', userId, { amount, reason });

    return res.json({
      success: true,
      data: {
        message: '积分已添加',
        newBalance: result.balance,
      },
    });
  } catch (error) {
    console.error('Add credits error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '操作失败' },
    });
  }
}

/**
 * GET /api/admin/statistics
 * Get system statistics
 */
export async function getStatistics(_req: Request, res: Response) {
  try {
    const [
      totalUsers,
      totalTasks,
      totalCreditsConsumed,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.codingTask.count(),
      prisma.codingTask.aggregate({ _sum: { creditsConsumed: true } }),
      prisma.rechargeOrder.aggregate({
        where: { status: 'approved' },
        _sum: { credits: true },
      }),
    ]);

    // Get daily stats for past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [dailyUsers, dailyTasks, dailyRevenue] = await Promise.all([
      prisma.user.groupBy({
        by: ['registeredAt'],
        where: { registeredAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      prisma.codingTask.groupBy({
        by: ['completedAt'],
        where: { completedAt: { gte: thirtyDaysAgo } },
        _count: true,
        _sum: { creditsConsumed: true },
      }),
      prisma.rechargeOrder.groupBy({
        by: ['processedAt'],
        where: { status: 'approved', processedAt: { gte: thirtyDaysAgo } },
        _sum: { credits: true },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalTasks,
        totalCreditsConsumed: totalCreditsConsumed._sum.creditsConsumed || 0,
        totalRevenue: totalRevenue._sum.credits || 0,
        dailyStats: { users: dailyUsers, tasks: dailyTasks, revenue: dailyRevenue },
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取统计数据失败' },
    });
  }
}
