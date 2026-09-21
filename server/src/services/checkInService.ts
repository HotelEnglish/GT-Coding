import prisma from '../utils/db';
import { addCredits } from './creditService';

/**
 * China Standard Time offset (UTC+8)
 */
const CHINA_TIMEZONE_OFFSET = 8 * 60; // minutes

/**
 * Get current date in China Standard Time (UTC+8)
 * Returns date string in format YYYY-MM-DD
 */
function getChinaDateString(date: Date = new Date()): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const chinaTime = new Date(utc + CHINA_TIMEZONE_OFFSET * 60000);
  return chinaTime.toISOString().split('T')[0];
}

/**
 * Get next check-in time (00:00:00 next day in China timezone)
 */
export function getNextCheckInTime(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const chinaTime = new Date(utc + CHINA_TIMEZONE_OFFSET * 60000);
  
  // Set to next day 00:00:00 China time
  chinaTime.setDate(chinaTime.getDate() + 1);
  chinaTime.setHours(0, 0, 0, 0);
  
  // Convert back to UTC
  return new Date(chinaTime.getTime() - CHINA_TIMEZONE_OFFSET * 60000);
}

/**
 * Calculate consecutive check-in bonus
 * - 3 days: +5 credits
 * - 7 days: +10 credits
 * - 30 days: +50 credits
 * Bonuses are awarded only once per milestone per cycle
 */
function calculateBonus(consecutiveDays: number): { bonus: number; milestone: string | null } {
  if (consecutiveDays >= 30) {
    return { bonus: 50, milestone: '30天连续签到' };
  }
  if (consecutiveDays >= 7) {
    return { bonus: 10, milestone: '7天连续签到' };
  }
  if (consecutiveDays >= 3) {
    return { bonus: 5, milestone: '3天连续签到' };
  }
  return { bonus: 0, milestone: null };
}

/**
 * Perform daily check-in
 */
export async function performCheckIn(userId: string): Promise<{
  success: boolean;
  creditsAwarded: number;
  bonusAwarded: number;
  consecutiveDays: number;
  message: string;
}> {
  const today = getChinaDateString();

  // Check if already checked in today
  const existingCheckIn = await prisma.checkIn.findUnique({
    where: {
      userId_checkInDate: {
        userId,
        checkInDate: today,
      },
    },
  });

  if (existingCheckIn) {
    return {
      success: false,
      creditsAwarded: 0,
      bonusAwarded: 0,
      consecutiveDays: 0,
      message: '今日已签到',
    };
  }

  // Get yesterday's check-in to calculate consecutive days
  const yesterday = getChinaDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const yesterdayCheckIn = await prisma.checkIn.findUnique({
    where: {
      userId_checkInDate: {
        userId,
        checkInDate: yesterday,
      },
    },
  });

  // Calculate consecutive days
  let consecutiveDays = 1;
  if (yesterdayCheckIn) {
    consecutiveDays = yesterdayCheckIn.consecutiveDays + 1;
  }

  // Calculate bonus
  const { bonus, milestone } = calculateBonus(consecutiveDays);
  const totalCredits = 2 + bonus; // Base 2 credits + bonus

  try {
    // Create check-in record and add credits in a transaction
    await prisma.$transaction(async (tx) => {
      // Create check-in record
      await tx.checkIn.create({
        data: {
          userId,
          checkInDate: today,
          checkedInAt: new Date(),
          creditsAwarded: 2,
          bonusAwarded: bonus,
          consecutiveDays,
        },
      });

      // Add base credits
      await addCredits(userId, 2, 'check_in', '每日签到', today);

      // Add bonus if applicable
      if (bonus > 0) {
        await addCredits(userId, bonus, 'check_in_bonus', milestone!, today);
      }
    });

    return {
      success: true,
      creditsAwarded: 2,
      bonusAwarded: bonus,
      consecutiveDays,
      message: milestone
        ? `签到成功！获得${totalCredits}积分（含${milestone}奖励${bonus}积分）`
        : `签到成功！获得${totalCredits}积分`,
    };
  } catch (error) {
    console.error('Check-in error:', error);
    throw new Error('签到失败，请稍后重试');
  }
}

/**
 * Get user's check-in status
 */
export async function getCheckInStatus(userId: string): Promise<{
  hasCheckedInToday: boolean;
  consecutiveDays: number;
  nextCheckInTime: Date | null;
  monthlyHistory: string[];
}> {
  const today = getChinaDateString();

  // Get today's check-in
  const todayCheckIn = await prisma.checkIn.findUnique({
    where: {
      userId_checkInDate: {
        userId,
        checkInDate: today,
      },
    },
  });

  // Get consecutive days from yesterday if today not checked in
  let consecutiveDays = 0;
  if (todayCheckIn) {
    consecutiveDays = todayCheckIn.consecutiveDays;
  } else {
    const yesterday = getChinaDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const yesterdayCheckIn = await prisma.checkIn.findUnique({
      where: {
        userId_checkInDate: {
          userId,
          checkInDate: yesterday,
        },
      },
    });
    consecutiveDays = yesterdayCheckIn ? yesterdayCheckIn.consecutiveDays : 0;
  }

  // Get monthly history (current month in China timezone)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const chinaTime = new Date(utc + CHINA_TIMEZONE_OFFSET * 60000);
  const year = chinaTime.getFullYear();
  const month = String(chinaTime.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${month}`;

  const monthlyCheckIns = await prisma.checkIn.findMany({
    where: {
      userId,
      checkInDate: { startsWith: monthPrefix },
    },
    select: { checkInDate: true },
    orderBy: { checkInDate: 'asc' },
  });

  return {
    hasCheckedInToday: !!todayCheckIn,
    consecutiveDays,
    nextCheckInTime: todayCheckIn ? getNextCheckInTime() : null,
    monthlyHistory: monthlyCheckIns.map((c) => c.checkInDate),
  };
}
