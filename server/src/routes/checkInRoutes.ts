import { Router } from 'express';
import { checkIn, getCheckInStatusHandler } from '../controllers/checkInController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.post('/', authMiddleware, checkIn);
router.get('/status', authMiddleware, getCheckInStatusHandler);

export default router;
