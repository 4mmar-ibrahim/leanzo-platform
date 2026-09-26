import { Router } from 'express';
import { validateCouponHandler } from '../controllers/couponController.js';

const router = Router();

// Public Customer Endpoint for checkout coupon validation
router.post('/validate', validateCouponHandler);

export default router;
