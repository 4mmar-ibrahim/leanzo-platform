import { Router } from 'express';
import {
  getCustomerNotifications,
  markCustomerNotificationRead,
  markAllCustomerNotificationsRead,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  clearAllAdminNotifications,
  deleteAdminNotification,
  createAdminNotification,
  cleanupDuplicateNotifications,
} from '../controllers/notificationController.js';
import { authenticateCustomer } from '../middleware/authMiddleware.js';
import { authenticateAdmin, authorize, requireOwner } from '../middleware/adminAuthMiddleware.js';

const router = Router();

// Customer notifications
router.get('/customer', authenticateCustomer, getCustomerNotifications);
router.put('/customer/read-all', authenticateCustomer, markAllCustomerNotificationsRead);
router.put('/customer/:id/read', authenticateCustomer, markCustomerNotificationRead);

// Admin notifications
router.get('/admin', authenticateAdmin, authorize('dashboard', 'view'), getAdminNotifications);
router.put('/admin/read-all', authenticateAdmin, authorize('dashboard', 'view'), markAllAdminNotificationsRead);
router.delete('/admin/clear-all', authenticateAdmin, requireOwner, clearAllAdminNotifications);
router.post('/admin/cleanup-duplicates', authenticateAdmin, requireOwner, cleanupDuplicateNotifications);
router.put('/admin/:id/read', authenticateAdmin, authorize('dashboard', 'view'), markAdminNotificationRead);
router.delete('/admin/:id', authenticateAdmin, requireOwner, deleteAdminNotification);
router.post('/admin', authenticateAdmin, authorize('dashboard', 'edit'), createAdminNotification);

export default router;
