import { Router } from 'express';
import {
  getPublishedZoConfigs,
  getPublishedConfigByPageId,
  getAllZoConfigsAdmin,
  updateZoDraftConfig,
  publishZoPageConfig,
  publishAllZoPages,
} from '../controllers/zoController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

// Customer endpoints: only published configs visible
router.get('/published', getPublishedZoConfigs);
router.get('/published/:pageId', getPublishedConfigByPageId);

// Admin endpoints: draft, edit, publish
router.get('/admin', authenticateAdmin, authorize('zo', 'view'), getAllZoConfigsAdmin);
router.put('/admin/draft/:pageId', authenticateAdmin, authorize('zo', 'edit'), recordAuditLog('update_zo_draft', 'zo'), updateZoDraftConfig);
router.post('/admin/publish/:pageId', authenticateAdmin, authorize('zo', 'publish'), recordAuditLog('publish_zo_page', 'zo'), publishZoPageConfig);
router.post('/admin/publish-all', authenticateAdmin, authorize('zo', 'publish'), recordAuditLog('publish_all_zo', 'zo'), publishAllZoPages);

export default router;
