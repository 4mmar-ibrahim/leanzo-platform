import { Router } from 'express';
import {
  getCouponsAdmin,
  getCouponByIdAdmin,
  createCouponAdmin,
  updateCouponAdmin,
  deleteCouponAdmin,
  getCouponUsageAdmin,
} from '../controllers/couponController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';

const router = Router();

// Protect all admin coupon routes
router.use(authenticateAdmin);

router.get('/', authorize('coupons', 'view'), getCouponsAdmin);
router.get('/:id', authorize('coupons', 'view'), getCouponByIdAdmin);
router.post('/', authorize('coupons', 'create'), createCouponAdmin);
router.patch('/:id', authorize('coupons', 'edit'), updateCouponAdmin);
router.delete('/:id', authorize('coupons', 'delete'), deleteCouponAdmin);
router.get('/:id/usage', authorize('coupons', 'view'), getCouponUsageAdmin);

export default router;
