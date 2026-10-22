import { Request, Response } from 'express';
import prisma from '../utils/db';
import {
  calculateRequiredCredits,
  hasSufficientCredits,
  deductCredits,
  addCredits,
  getCreditBalance,
} from '../services/creditService';

/**
 * POST /api/coding/check-credits
 * Check if user has sufficient credits for a coding task
 */
export async function checkCredits(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { textLength } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    const requiredCredits = calculateRequiredCredits(textLength);
    const currentBalance = await getCreditBalance(userId);
    const sufficient = currentBalance >= requiredCredits;

    return res.json({
      success: true,
      data: {
        requiredCredits,
        currentBalance,
        sufficient,
      },
    });
  } catch (error) {
    console.error('Check credits error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '检查积分失败' },
    });
  }
}

/**
 * POST /api/coding/analyze
 * Perform coding analysis with credit deduction
 */
export async function analyze(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { text, theory, depth, domain } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_NO_TOKEN', message: '未登录' },
      });
    }

    // Validate input
    if (!text) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请输入文本' },
      });
    }

    // Check character limit
    if (text.length > 100000) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '文本长度不能超过100,000字符' },
      });
    }

    // Handle zero-character input
    if (text.length === 0) {
      return res.json({
        success: true,
        data: {
          result: null,
          creditsDeducted: 0,
          remainingBalance: await getCreditBalance(userId),
          message: '无文本内容，未扣除积分',
        },
      });
    }

    // Calculate required credits
    const requiredCredits = calculateRequiredCredits(text.length);

    // Check if user has sufficient credits
    const sufficient = await hasSufficientCredits(userId, requiredCredits);
    if (!sufficient) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'CREDIT_INSUFFICIENT',
          message: '积分不足，请签到或充值',
          data: {
            requiredCredits,
            currentBalance: await getCreditBalance(userId),
          },
        },
      });
    }

    // Perform coding analysis (placeholder for actual API call)
    // In real implementation, this would call an external API
    const codingResult = await performCodingAnalysis(text, theory, depth, domain);

    // If analysis failed, don't deduct credits
    if (!codingResult.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'CODING_ERROR', message: codingResult.error || '编码分析失败' },
      });
    }

    // Deduct credits and record the coding task. These are sequential:
    // deductCredits manages its own transaction, so nesting it here would
    // violate Prisma's single-interactive-transaction rule.
    let remainingBalance: number;
    try {
      const deduction = await deductCredits(userId, requiredCredits, '编码消耗');
      try {
        await prisma.codingTask.create({
          data: {
            userId,
            inputTextLength: text.length,
            creditsConsumed: requiredCredits,
            theory: String(theory ?? 'procedural'),
            depth: String(depth ?? 'std'),
            resultStored: true,
          },
        });
      } catch (taskError) {
        // Do not keep credits without a stored task record.
        await addCredits(userId, requiredCredits, 'admin_adjustment', '编码任务创建失败自动退款');
        throw taskError;
      }
      remainingBalance = deduction.balance;
    } catch (deductionError) {
      console.error('Credit deduction error:', deductionError);
      // Return error but don't charge for failed transactions
      return res.status(500).json({
        success: false,
        error: { code: 'TRANSACTION_ERROR', message: '积分扣除失败，请重试' },
      });
    }

    return res.json({
      success: true,
      data: {
        result: codingResult.result,
        creditsDeducted: requiredCredits,
        remainingBalance,
      },
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '分析失败' },
    });
  }
}

/**
 * Perform actual coding analysis
 * This is a placeholder - in production, this would call an external API
 */
async function performCodingAnalysis(
  text: string,
  theory: string,
  depth: string,
  domain?: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  // Placeholder implementation
  // In production, this would integrate with an actual coding analysis API
  try {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return mock result for now
    return {
      success: true,
      result: {
        theory,
        depth,
        domain,
        textLength: text.length,
        // Mock coding results
        openCoding: [
          { code: '概念1', count: 5, examples: ['示例文本1', '示例文本2'] },
          { code: '概念2', count: 3, examples: ['示例文本3'] },
        ],
        axialCoding: [
          { category: '类别A', codes: ['概念1', '概念2'], relations: '因果关系' },
        ],
        selectiveCoding: {
          coreCategory: '核心概念',
          story: '这是一个扎根理论的故事线...',
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: '编码分析服务暂时不可用',
    };
  }
}
