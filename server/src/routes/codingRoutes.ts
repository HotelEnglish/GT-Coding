import { Router } from 'express';
import { checkCredits, analyze } from '../controllers/codingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.post('/check-credits', authMiddleware, checkCredits);
router.post('/analyze', authMiddleware, analyze);

export default router;
