import { Router } from 'express';
import {
  getPublicFAQs,
  getAllFAQsAdmin,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} from '../controllers/faqController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

router.get('/', getPublicFAQs);

// Admin FAQ endpoints (support both /admin and direct with auth)
router.get('/admin', authenticateAdmin, authorize('content', 'view'), getAllFAQsAdmin);
router.get('/admin/all', authenticateAdmin, authorize('content', 'view'), getAllFAQsAdmin);

router.post('/admin', authenticateAdmin, authorize('content', 'create'), recordAuditLog('create_faq', 'content'), createFAQ);
router.post('/', authenticateAdmin, authorize('content', 'create'), recordAuditLog('create_faq', 'content'), createFAQ);

router.put('/admin/:id', authenticateAdmin, authorize('content', 'edit'), recordAuditLog('update_faq', 'content'), updateFAQ);
router.put('/:id', authenticateAdmin, authorize('content', 'edit'), recordAuditLog('update_faq', 'content'), updateFAQ);

router.delete('/admin/:id', authenticateAdmin, authorize('content', 'delete'), recordAuditLog('delete_faq', 'content'), deleteFAQ);
router.delete('/:id', authenticateAdmin, authorize('content', 'delete'), recordAuditLog('delete_faq', 'content'), deleteFAQ);

export default router;
