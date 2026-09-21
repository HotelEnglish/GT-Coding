import { Router } from 'express';
import { getCreditHistory, getUsageStats } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.get('/credit-history', authMiddleware, getCreditHistory);
router.get('/usage-stats', authMiddleware, getUsageStats);

export default router;
