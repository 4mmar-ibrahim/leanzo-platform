import { Router } from 'express';
import {
  getPublicReviews,
  getAllReviewsAdmin,
  createReview,
  updateReview,
  deleteReview,
  clearAllReviews,
} from '../controllers/reviewController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

router.get('/', getPublicReviews);

// Admin Review endpoints
router.get('/admin', authenticateAdmin, authorize('content', 'view'), getAllReviewsAdmin);
router.get('/admin/all', authenticateAdmin, authorize('content', 'view'), getAllReviewsAdmin);

router.post('/admin', authenticateAdmin, authorize('content', 'create'), recordAuditLog('create_review', 'content'), createReview);
router.post('/', authenticateAdmin, authorize('content', 'create'), recordAuditLog('create_review', 'content'), createReview);

router.put('/admin/:id', authenticateAdmin, authorize('content', 'edit'), recordAuditLog('update_review', 'content'), updateReview);
router.put('/:id', authenticateAdmin, authorize('content', 'edit'), recordAuditLog('update_review', 'content'), updateReview);

// Bulk delete all reviews
router.delete('/admin/all', authenticateAdmin, authorize('content', 'delete'), recordAuditLog('clear_all_reviews', 'content'), clearAllReviews);
router.delete('/all', authenticateAdmin, authorize('content', 'delete'), recordAuditLog('clear_all_reviews', 'content'), clearAllReviews);

router.delete('/admin/:id', authenticateAdmin, authorize('content', 'delete'), recordAuditLog('delete_review', 'content'), deleteReview);
router.delete('/:id', authenticateAdmin, authorize('content', 'delete'), recordAuditLog('delete_review', 'content'), deleteReview);

export default router;
