import { Router } from 'express';
import {
  createBooking,
  calculateBookingPriceHandler,
  getCustomerBookings,
  getBookingById,
  trackOrderPublic,
  getAllBookingsAdmin,
  updateBookingStatus,
  assignTechnicianToBooking,
  deleteBookingAdmin,
  cancelBookingCustomer,
} from '../controllers/bookingController.js';
import { authenticateCustomer, optionalCustomerAuth } from '../middleware/authMiddleware.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

// Price calculation endpoint (Public, authoritative server-side calculation)
router.post('/calculate-price', calculateBookingPriceHandler);

// Customer booking endpoints
router.post('/', optionalCustomerAuth, createBooking);
router.get('/my', authenticateCustomer, getCustomerBookings);
router.get('/track/:id', trackOrderPublic);
router.post('/:id/cancel', optionalCustomerAuth, cancelBookingCustomer);

// Admin Booking & Order management endpoints (Registered BEFORE /:id wildcard)
router.get('/admin/all', authenticateAdmin, authorize('orders', 'view'), getAllBookingsAdmin);
router.get('/admin/:id', authenticateAdmin, authorize('orders', 'view'), getBookingById);
router.put('/admin/:id/status', authenticateAdmin, authorize('orders', 'edit'), recordAuditLog('update_order_status', 'orders'), updateBookingStatus);
router.put('/admin/:id/assign', authenticateAdmin, authorize('orders', 'assign'), recordAuditLog('assign_technician', 'orders'), assignTechnicianToBooking);
router.delete('/admin/:id', authenticateAdmin, authorize('orders', 'delete'), recordAuditLog('delete_order', 'orders'), deleteBookingAdmin);

// Fallback / root endpoints
router.get('/', authenticateAdmin, authorize('orders', 'view'), getAllBookingsAdmin);
router.get('/:id', authenticateCustomer, getBookingById);
router.put('/:id/status', authenticateAdmin, authorize('orders', 'edit'), recordAuditLog('update_order_status', 'orders'), updateBookingStatus);
router.delete('/:id', authenticateAdmin, authorize('orders', 'delete'), recordAuditLog('delete_order', 'orders'), deleteBookingAdmin);

export default router;

