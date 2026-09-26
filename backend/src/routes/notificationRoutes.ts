import { Router } from 'express';
import {
  getCustomerNotifications,
  markCustomerNotificationRead,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  clearAllAdminNotifications,
  deleteAdminNotification,
  createAdminNotification,
} from '../controllers/notificationController.js';
import { authenticateCustomer } from '../middleware/authMiddleware.js';
import { authenticateAdmin } from '../middleware/adminAuthMiddleware.js';

const router = Router();

// Customer notifications
router.get('/customer', authenticateCustomer, getCustomerNotifications);
router.put('/customer/:id/read', authenticateCustomer, markCustomerNotificationRead);

// Admin notifications
router.get('/admin', authenticateAdmin, getAdminNotifications);
router.put('/admin/read-all', authenticateAdmin, markAllAdminNotificationsRead);
router.delete('/admin/clear-all', authenticateAdmin, clearAllAdminNotifications);
router.put('/admin/:id/read', authenticateAdmin, markAdminNotificationRead);
router.delete('/admin/:id', authenticateAdmin, deleteAdminNotification);
router.post('/admin', authenticateAdmin, createAdminNotification);

export default router;
