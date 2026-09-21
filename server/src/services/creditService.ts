import prisma from '../utils/db';
import { TransactionType } from '@prisma/client';

/**
 * Credit to character conversion rate
 * 1 credit = 10 characters
 */
export const CREDITS_PER_CHARACTER = 10;

/**
 * Calculate required credits for a given character count
 */
export function calculateRequiredCredits(characterCount: number): number {
  return Math.ceil(characterCount / CREDITS_PER_CHARACTER);
}

/**
 * Calculate character quota for a given credit amount
 */
export function calculateCharacterQuota(credits: number): number {
  return credits * CREDITS_PER_CHARACTER;
}

/**
 * Get user's current credit balance
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const balance = await prisma.creditBalance.findUnique({
    where: { userId },
  });

  return balance?.balance ?? 0;
}

/**
 * Check if user has sufficient credits
 */
export async function hasSufficientCredits(userId: string, requiredCredits: number): Promise<boolean> {
  const balance = await getCreditBalance(userId);
  return balance >= requiredCredits;
}

/**
 * Generate a unique transaction number
 */
function generateTransactionNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
}

/**
 * Add credits to user's balance (atomic transaction)
 * Used for: registration bonus, check-in rewards, recharge, admin adjustments
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  relatedId?: string,
  adminId?: string
): Promise<{ balance: number; transactionNumber: string }> {
  return await prisma.$transaction(async (tx) => {
    // Get or create credit balance record
    let creditBalance = await tx.creditBalance.findUnique({
      where: { userId },
    });

    if (!creditBalance) {
      creditBalance = await tx.creditBalance.create({
        data: { userId, balance: 0 },
      });
    }

    // Update balance
    const newBalance = creditBalance.balance + amount;
    
    await tx.creditBalance.update({
      where: { userId },
      data: { balance: newBalance },
    });

    // Create transaction record
    const transactionNumber = generateTransactionNumber();
    
    await tx.creditTransaction.create({
      data: {
        transactionNumber,
        userId,
        adminId: adminId || null,
        type,
        amount,
        balanceAfter: newBalance,
        description,
        relatedId: relatedId || null,
      },
    });

    return { balance: newBalance, transactionNumber };
  });
}

/**
 * Deduct credits from user's balance (atomic transaction)
 * Used for: coding consumption
 * @throws Error if insufficient balance
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  relatedId?: string
): Promise<{ balance: number; transactionNumber: string }> {
  return await prisma.$transaction(async (tx) => {
    // Get current balance with lock
    const creditBalance = await tx.creditBalance.findUnique({
      where: { userId },
    });

    if (!creditBalance || creditBalance.balance < amount) {
      throw new Error('积分不足，请签到或充值');
    }

    // Update balance
    const newBalance = creditBalance.balance - amount;
    
    await tx.creditBalance.update({
      where: { userId },
      data: { balance: newBalance },
    });

    // Create transaction record
    const transactionNumber = generateTransactionNumber();
    
    await tx.creditTransaction.create({
      data: {
        transactionNumber,
        userId,
        type: 'coding_consumption',
        amount: -amount, // Negative for deduction
        balanceAfter: newBalance,
        description,
        relatedId: relatedId || null,
      },
    });

    return { balance: newBalance, transactionNumber };
  });
}

/**
 * Get user's credit transaction history with pagination
 */
export async function getCreditHistory(
  userId: string,
  page: number = 1,
  limit: number = 20,
  filters?: {
    types?: TransactionType[];
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where: any = { userId };

  if (filters?.types && filters.types.length > 0) {
    where.type = { in: filters.types };
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.creditTransaction.count({ where }),
  ]);

  return {
    items: transactions,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

/**
 * Get user's usage statistics
 */
export async function getUsageStats(userId: string) {
  const [totalTasks, totalCharacters, totalCreditsConsumed] = await Promise.all([
    prisma.codingTask.count({ where: { userId } }),
    prisma.codingTask.aggregate({
      where: { userId },
      _sum: { inputTextLength: true },
    }),
    prisma.codingTask.aggregate({
      where: { userId },
      _sum: { creditsConsumed: true },
    }),
  ]);

  // Get daily usage for past 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyTasks = await prisma.codingTask.groupBy({
    by: ['completedAt'],
    where: {
      userId,
      completedAt: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
    _sum: { inputTextLength: true, creditsConsumed: true },
  });

  // Process daily usage - group by date string
  const dailyUsage: { [date: string]: { tasks: number; characters: number; credits: number } } = {};
  
  dailyTasks.forEach((task) => {
    const dateStr = task.completedAt.toISOString().split('T')[0];
    if (!dailyUsage[dateStr]) {
      dailyUsage[dateStr] = { tasks: 0, characters: 0, credits: 0 };
    }
    dailyUsage[dateStr].tasks += task._count.id;
    dailyUsage[dateStr].characters += task._sum.inputTextLength || 0;
    dailyUsage[dateStr].credits += task._sum.creditsConsumed || 0;
  });

  return {
    totalTasks,
    totalCharacters: totalCharacters._sum.inputTextLength || 0,
    totalCreditsConsumed: totalCreditsConsumed._sum.creditsConsumed || 0,
    dailyUsage: Object.entries(dailyUsage).map(([date, stats]) => ({
      date,
      ...stats,
    })),
  };
}
