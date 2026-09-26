import { Router } from 'express';
import {
  submitContactMessage,
  getAllContactMessagesAdmin,
  updateContactMessageStatus,
} from '../controllers/contactController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { contactLimiter } from '../middleware/rateLimitMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

router.post('/', contactLimiter, submitContactMessage);

// Admin Contact endpoints
router.get('/admin', authenticateAdmin, authorize('content', 'view'), getAllContactMessagesAdmin);
router.put('/admin/:id/status', authenticateAdmin, authorize('content', 'edit'), recordAuditLog('update_contact_status', 'content'), updateContactMessageStatus);

export default router;
