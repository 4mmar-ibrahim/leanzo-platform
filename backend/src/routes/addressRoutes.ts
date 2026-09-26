import { Router } from 'express';
import {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  setDefaultAddress,
  deleteCustomerAddress,
} from '../controllers/addressController.js';
import { optionalCustomerAuth, authenticateCustomer } from '../middleware/authMiddleware.js';

const router = Router();

// All address management operations require customer authentication
router.use(authenticateCustomer);

router.get('/', getCustomerAddresses);
router.post('/', createCustomerAddress);
router.patch('/:id', updateCustomerAddress);
router.patch('/:id/default', setDefaultAddress);
router.delete('/:id', deleteCustomerAddress);

export default router;
