import { Router } from 'express';
import {
  getAllTechniciansAdmin,
  getTechnicianProfileAdmin,
  createTechnicianAdmin,
  updateTechnicianAdmin,
  toggleTechnicianAvailabilityAdmin,
  deleteTechnicianAdmin,
  getPublicTechnicians,
} from '../controllers/technicianController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

// Public: customer /team page gets active technicians
router.get('/public', getPublicTechnicians);

// All technician management routes below require admin authentication
router.use(authenticateAdmin);

// List all technicians (accessible to technicians viewers and order managers for assignment)
router.get(
  '/',
  (req: any, res, next) => {
    if (req.admin?.role === 'owner' || req.admin?.role === 'super_admin') return next();
    const perms = req.admin?.granularPermissions || [];
    if (
      perms.includes('technicians.view') ||
      perms.includes('technicians.edit') ||
      perms.includes('technicians.*') ||
      perms.includes('orders.view') ||
      perms.includes('orders.edit') ||
      perms.includes('orders.assign') ||
      perms.includes('orders.*') ||
      perms.includes('*')
    ) {
      return next();
    }
    return authorize('technicians', 'view')(req, res, next);
  },
  getAllTechniciansAdmin
);

// Get single technician profile with live dashboard KPIs and filtered orders
router.get('/:id', authorize('technicians', 'view'), getTechnicianProfileAdmin);

// Create technician
router.post(
  '/',
  authorize('technicians', 'create'),
  recordAuditLog('create_technician', 'technicians'),
  createTechnicianAdmin
);

// Update technician
router.put(
  '/:id',
  authorize('technicians', 'edit'),
  recordAuditLog('update_technician', 'technicians'),
  updateTechnicianAdmin
);

// Toggle availability status
router.patch(
  '/:id/availability',
  authorize('technicians', 'edit'),
  recordAuditLog('toggle_availability', 'technicians'),
  toggleTechnicianAvailabilityAdmin
);

// Delete technician
router.delete(
  '/:id',
  authorize('technicians', 'delete'),
  recordAuditLog('delete_technician', 'technicians'),
  deleteTechnicianAdmin
);

export default router;
