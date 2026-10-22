import { Router, Request, Response, NextFunction } from 'express';
import { checkCredits, analyze } from '../controllers/codingController';
import { authMiddleware } from '../middleware/authMiddleware';

/**
 * Legacy mock coding endpoints are disabled by default (see the v2 workbench
 * plan, Phase 3). Set LEGACY_CODING_ENABLED=true only for local inspection.
 */
function legacyCodingGate(_req: Request, res: Response, next: NextFunction) {
  if (process.env.LEGACY_CODING_ENABLED === 'true') return next();
  return res.status(410).json({
    success: false,
    error: {
      code: 'ENDPOINT_DEPRECATED',
      message: '该接口已停用：请使用 /api/workbench 研究工作台完成有证据溯源的编码分析。',
    },
  });
}

const router = Router();

router.use(legacyCodingGate);

// All routes require authentication
router.post('/check-credits', authMiddleware, checkCredits);
router.post('/analyze', authMiddleware, analyze);

export default router;
