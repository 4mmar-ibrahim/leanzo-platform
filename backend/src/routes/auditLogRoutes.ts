import { Router } from 'express';
import { getAuditLogs, exportAuditLogsCSV, purgeAuditLogs } from '../controllers/auditLogController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';

const router = Router();

router.get('/', authenticateAdmin, authorize('activity_logs', 'view'), getAuditLogs);
router.get('/export', authenticateAdmin, authorize('activity_logs', 'view'), exportAuditLogsCSV);
router.delete('/purge', authenticateAdmin, authorize('activity_logs', 'delete'), purgeAuditLogs);

export default router;

