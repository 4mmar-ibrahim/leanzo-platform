import { Router } from 'express';
import {
  getAllCustomersAdmin,
  getCustomerDetailsAdmin,
  createCustomerAdmin,
  updateCustomerStatusAdmin,
  deleteCustomerAdmin,
  restoreCustomerAdmin,
  resetCustomerPasswordAdmin,
} from '../controllers/customerController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

router.get('/', authenticateAdmin, authorize('customers', 'view'), getAllCustomersAdmin);
router.post('/', authenticateAdmin, authorize('customers', 'edit'), recordAuditLog('create_customer', 'customers'), createCustomerAdmin);
router.get('/:id', authenticateAdmin, authorize('customers', 'view'), getCustomerDetailsAdmin);
router.put('/:id', authenticateAdmin, authorize('customers', 'edit'), recordAuditLog('update_customer', 'customers'), updateCustomerStatusAdmin);
router.patch('/:id', authenticateAdmin, authorize('customers', 'edit'), recordAuditLog('update_customer', 'customers'), updateCustomerStatusAdmin);
router.patch('/:id/status', authenticateAdmin, authorize('customers', 'edit'), recordAuditLog('update_customer', 'customers'), updateCustomerStatusAdmin);
router.post('/:id/restore', authenticateAdmin, authorize('customers', 'edit'), recordAuditLog('restore_customer', 'customers'), restoreCustomerAdmin);
router.post('/:id/password', authenticateAdmin, authorize('customers', 'edit'), recordAuditLog('reset_customer_password', 'customers'), resetCustomerPasswordAdmin);
router.delete('/:id', authenticateAdmin, authorize('customers', 'delete'), recordAuditLog('delete_customer_soft', 'customers'), deleteCustomerAdmin);

export default router;
