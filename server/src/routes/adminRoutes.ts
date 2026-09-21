import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  getOrders,
  approveOrder,
  rejectOrder,
  getUsers,
  toggleUserStatus,
  addUserCredits,
  getStatistics,
} from '../controllers/adminController';
import { adminAuthMiddleware } from '../middleware/adminMiddleware';

const router = Router();

// Public admin routes
router.post('/login', adminLogin);

// Protected admin routes
router.post('/logout', adminAuthMiddleware, adminLogout);
router.get('/orders', adminAuthMiddleware, getOrders);
router.post('/orders/:orderId/approve', adminAuthMiddleware, approveOrder);
router.post('/orders/:orderId/reject', adminAuthMiddleware, rejectOrder);
router.get('/users', adminAuthMiddleware, getUsers);
router.post('/users/:userId/toggle-status', adminAuthMiddleware, toggleUserStatus);
router.post('/users/:userId/add-credits', adminAuthMiddleware, addUserCredits);
router.get('/statistics', adminAuthMiddleware, getStatistics);

export default router;
