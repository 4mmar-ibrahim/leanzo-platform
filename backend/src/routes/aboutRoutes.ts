import { Router } from 'express';
import { getAboutContent, updateAboutContent } from '../controllers/aboutController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

router.get('/', getAboutContent);
router.put('/', authenticateAdmin, authorize('content', 'edit'), recordAuditLog('update_about_content', 'content'), updateAboutContent);

export default router;
