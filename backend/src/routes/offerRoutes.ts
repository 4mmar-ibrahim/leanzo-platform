import { Router } from 'express';
import {
  getPublicOffers,
  getAllOffersAdmin,
  createOffer,
  updateOffer,
  toggleOfferActive,
  deleteOffer,
} from '../controllers/offerController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

// Public customer endpoint: returns only currently active, non-expired, non-scheduled offers
router.get('/', getPublicOffers);

// Admin Offer endpoints
router.get('/admin', authenticateAdmin, authorize('offers', 'view'), getAllOffersAdmin);
router.post('/admin', authenticateAdmin, authorize('offers', 'create'), recordAuditLog('create_offer', 'offers'), createOffer);
router.put('/admin/:id', authenticateAdmin, authorize('offers', 'edit'), recordAuditLog('update_offer', 'offers'), updateOffer);
router.patch('/admin/:id/toggle', authenticateAdmin, authorize('offers', 'edit'), recordAuditLog('toggle_offer', 'offers'), toggleOfferActive);
router.delete('/admin/:id', authenticateAdmin, authorize('offers', 'delete'), recordAuditLog('delete_offer', 'offers'), deleteOffer);

export default router;
