import { Router } from 'express';
import {
  listBackups,
  getSystemAudit,
  createBackup,
  downloadBackup,
  validateUploadedArchive,
  restoreFromDevice,
  restoreBackup,
  deleteBackup,
  backupUpload,
} from '../controllers/backupController.js';
import { authenticateAdmin, authorize, requireOwner } from '../middleware/adminAuthMiddleware.js';

const router = Router();

// All backup operations require admin authentication
router.use(authenticateAdmin);

// View database coverage audit, backup history & download
router.get('/audit', authorize('settings', 'view'), getSystemAudit);
router.get('/', authorize('settings', 'view'), listBackups);
router.get('/:id/download', authorize('settings', 'view'), downloadBackup);

// Create backup point
router.post('/', authorize('settings', 'edit'), createBackup);

// Device import: Validate uploaded archive (preview without executing)
router.post('/validate-archive', authorize('settings', 'view'), backupUpload.single('file'), validateUploadedArchive);

// High privilege operations: Device restore and saved backup restore (restricted to Owner)
router.post('/restore-from-device', requireOwner, backupUpload.single('file'), restoreFromDevice);
router.post('/:id/restore', requireOwner, restoreBackup);
router.delete('/:id', requireOwner, deleteBackup);

export default router;
