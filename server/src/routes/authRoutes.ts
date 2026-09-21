import { Router } from 'express';
import {
  sendVerification,
  register,
  login,
  logout,
  resetPassword,
  getCurrentUser,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { verificationCodeRateLimiter, loginRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post('/send-verification', verificationCodeRateLimiter, sendVerification);
router.post('/register', register);
router.post('/login', loginRateLimiter, login);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authMiddleware, getCurrentUser);
router.post('/logout', logout);

export default router;
