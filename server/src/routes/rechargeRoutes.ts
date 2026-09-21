import { Router } from 'express';
import { getPlans, createOrder, getUserOrders } from '../controllers/rechargeController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public route
router.get('/plans', getPlans);

// Protected routes
router.post('/order', authMiddleware, createOrder);
router.get('/orders', authMiddleware, getUserOrders);

export default router;
