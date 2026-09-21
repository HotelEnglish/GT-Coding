import { Request, Response } from 'express';
import { performCheckIn, getCheckInStatus } from '../services/checkInService';

/**
 * POST /api/checkin
 * Perform daily check-in
 */
export async function checkIn(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const result = await performCheckIn(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'CHECKIN_ALREADY_TODAY', message: result.message },
      });
    }

    return res.json({
      success: true,
      data: {
        creditsAwarded: result.creditsAwarded,
        bonusAwarded: result.bonusAwarded,
        consecutiveDays: result.consecutiveDays,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '签到失败' },
    });
  }
}

/**
 * GET /api/checkin/status
 * Get check-in status and monthly history
 */
export async function getCheckInStatusHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const status = await getCheckInStatus(userId);

    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get check-in status error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取签到状态失败' },
    });
  }
}
