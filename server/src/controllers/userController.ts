import { Request, Response } from 'express';
import {
  getCreditHistory as fetchCreditHistory,
  getUsageStats as fetchUsageStats,
} from '../services/creditService';
import { TransactionType } from '@prisma/client';

/**
 * GET /api/user/credit-history
 * Get user's credit transaction history with pagination
 */
export async function getCreditHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const { page = '1', limit = '20', types, startDate, endDate } = req.query;

    const filters: {
      types?: TransactionType[];
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (types) {
      filters.types = String(types).split(',') as TransactionType[];
    }

    if (startDate) {
      filters.startDate = new Date(String(startDate));
    }

    if (endDate) {
      filters.endDate = new Date(String(endDate));
    }

    const result = await fetchCreditHistory(
      userId,
      parseInt(String(page), 10),
      parseInt(String(limit), 10),
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get credit history error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取积分历史失败' },
    });
  }
}

/**
 * GET /api/user/usage-stats
 * Get user's coding usage statistics
 */
export async function getUsageStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const stats = await fetchUsageStats(userId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取使用统计失败' },
    });
  }
}
