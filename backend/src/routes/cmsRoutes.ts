import { Router } from 'express';
import {
  getPublishedCMSContent,
  getDraftCMSContent,
  updateDraftCMSContent,
  publishCMSContent,
  resetCMSContent,
} from '../controllers/cmsController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

// Public: Customer website gets published content only
router.get('/', getPublishedCMSContent);

// Protected Admin Actions
router.get(
  '/admin/draft',
  authenticateAdmin,
  authorize('content', 'view'),
  getDraftCMSContent
);

router.put(
  '/admin/draft',
  authenticateAdmin,
  authorize('content', 'edit'),
  recordAuditLog('update_cms_draft', 'content'),
  updateDraftCMSContent
);

router.post(
  '/admin/publish',
  authenticateAdmin,
  authorize('content', 'edit'),
  recordAuditLog('publish_cms_content', 'content'),
  publishCMSContent
);

router.post(
  '/admin/reset',
  authenticateAdmin,
  authorize('content', 'edit'),
  recordAuditLog('reset_cms_content', 'content'),
  resetCMSContent
);

export default router;
