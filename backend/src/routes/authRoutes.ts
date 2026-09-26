import { Router } from 'express';
import {
  registerCustomer,
  loginCustomer,
  refreshTokenCustomer,
  logoutCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addCustomerAddress,
  deleteCustomerAddress,
} from '../controllers/authController.js';
import { authenticateCustomer } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

router.post('/register', authLimiter, registerCustomer);
router.post('/login', authLimiter, loginCustomer);
router.post('/refresh', refreshTokenCustomer);
router.post('/logout', logoutCustomer);
router.get('/profile', authenticateCustomer, getCustomerProfile);
router.put('/profile', authenticateCustomer, updateCustomerProfile);
router.post('/addresses', authenticateCustomer, addCustomerAddress);
router.delete('/addresses/:addressId', authenticateCustomer, deleteCustomerAddress);

export default router;
