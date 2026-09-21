import { Request, Response } from 'express';
import prisma from '../utils/db';

/**
 * GET /api/recharge/plans
 * Get available recharge plans
 */
export async function getPlans(_req: Request, res: Response) {
  try {
    const plans = await prisma.rechargePlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    return res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取充值套餐失败' },
    });
  }
}

/**
 * POST /api/recharge/order
 * Create a new recharge order
 */
export async function createOrder(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { planId, paymentTime, transactionLast4 } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    // Get plan details
    const plan = await prisma.rechargePlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '无效的充值套餐' },
      });
    }

    // Validate transaction last 4 digits
    if (!transactionLast4 || !/^\d{4}$/.test(transactionLast4)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请输入正确的交易号后4位' },
      });
    }

    // Check for duplicate transaction (same last 4 digits within 24 hours)
    const recentOrder = await prisma.rechargeOrder.findFirst({
      where: {
        transactionLast4,
        submittedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentOrder) {
      return res.status(400).json({
        success: false,
        error: { code: 'ORDER_DUPLICATE_TRANSACTION', message: '该交易号已使用' },
      });
    }

    // Generate order number
    const orderNumber = `ORD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create order
    const order = await prisma.rechargeOrder.create({
      data: {
        orderNumber,
        userId,
        planId,
        credits: plan.credits,
        paymentTime: new Date(paymentTime),
        transactionLast4,
        status: 'pending',
      },
    });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        message: '订单已提交，等待审核',
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '创建订单失败' },
    });
  }
}

/**
 * GET /api/recharge/orders
 * Get user's recharge orders
 */
export async function getUserOrders(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const orders = await prisma.rechargeOrder.findMany({
      where: { userId },
      include: {
        processedBy: { select: { email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取订单列表失败' },
    });
  }
}
