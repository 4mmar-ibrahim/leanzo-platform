import { Router } from 'express';
import {
  uploadDeviceMedia,
  importUrlMedia,
  getAllMedia,
  getMediaById,
  deleteMedia,
  uploadMiddleware,
} from '../controllers/mediaController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

// Publicly readable or authenticated:
// Anyone can view media details / lists if needed (frontend or admin)
router.get('/', getAllMedia);
router.get('/:id', getMediaById);

// Protected Admin Actions:
router.post(
  '/upload',
  authenticateAdmin,
  authorize('media', 'create'),
  uploadMiddleware.single('file'),
  recordAuditLog('upload_device_media', 'media'),
  uploadDeviceMedia
);

router.post(
  '/import-url',
  authenticateAdmin,
  authorize('media', 'create'),
  recordAuditLog('import_url_media', 'media'),
  importUrlMedia
);

router.delete(
  '/:id',
  authenticateAdmin,
  authorize('media', 'delete'),
  recordAuditLog('delete_media', 'media'),
  deleteMedia
);

export default router;
