import { Router } from 'express';
import { getAnalytics, getAIInsights, getDashboardKPIsFromAnalytics } from '../controllers/analyticsController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';

const router = Router();

router.get('/', authenticateAdmin, authorize('analytics', 'view'), getAnalytics);
router.get('/overview', authenticateAdmin, authorize('analytics', 'view'), getAnalytics);
router.get('/kpis', authenticateAdmin, getDashboardKPIsFromAnalytics);
router.get('/ai', authenticateAdmin, authorize('analytics', 'view'), getAIInsights);

export default router;

