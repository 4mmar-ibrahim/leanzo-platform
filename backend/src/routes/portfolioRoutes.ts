import { Router } from 'express';
import {
  getPublicPortfolio,
  getAllPortfolioAdmin,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
} from '../controllers/portfolioController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

router.get('/', getPublicPortfolio);

// Admin Gallery / Portfolio endpoints
router.get('/admin', authenticateAdmin, authorize('gallery', 'view'), getAllPortfolioAdmin);
router.post('/admin', authenticateAdmin, authorize('gallery', 'create'), recordAuditLog('create_portfolio', 'gallery'), createPortfolioItem);
router.put('/admin/:id', authenticateAdmin, authorize('gallery', 'edit'), recordAuditLog('update_portfolio', 'gallery'), updatePortfolioItem);
router.delete('/admin/:id', authenticateAdmin, authorize('gallery', 'delete'), recordAuditLog('delete_portfolio', 'gallery'), deletePortfolioItem);

export default router;
