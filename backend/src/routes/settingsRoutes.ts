import { Router } from 'express';
import {
  getPublicSettings,
  getAllSettingsAdmin,
  updateSettingsAdmin,
  encryptAllDataAdmin,
  getEncryptionStatusAdmin,
  getEncryptionLogsAdmin,
  wipeAllDataAdmin,
} from '../controllers/settingsController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

router.get('/public', getPublicSettings);

// Root settings and Admin settings endpoints (Require admin auth)
router.get('/', authenticateAdmin, authorize('settings', 'view'), getAllSettingsAdmin);
router.get('/admin', authenticateAdmin, authorize('settings', 'view'), getAllSettingsAdmin);
router.put('/admin', authenticateAdmin, authorize('settings', 'edit'), recordAuditLog('update_system_settings', 'settings'), updateSettingsAdmin);

// Data Encryption & Data Wipe
router.get('/admin/encryption-status', authenticateAdmin, authorize('settings', 'view'), getEncryptionStatusAdmin);
router.get('/admin/encryption-logs', authenticateAdmin, authorize('settings', 'view'), getEncryptionLogsAdmin);
router.post('/admin/encrypt-all-data', authenticateAdmin, authorize('settings', 'edit'), recordAuditLog('encrypt_all_data', 'settings'), encryptAllDataAdmin);
router.post('/admin/wipe-all-data', authenticateAdmin, authorize('settings', 'edit'), recordAuditLog('wipe_all_data', 'settings'), wipeAllDataAdmin);

export default router;

