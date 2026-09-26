import { Router } from 'express';
import {
  getPublicServices,
  getServiceById,
  getAllServicesAdmin,
  createService,
  updateService,
  deleteService,
  getServicePackages,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  getServiceAddons,
  createServiceAddon,
  updateServiceAddon,
  deleteServiceAddon,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/serviceController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

// Public endpoints
router.get('/', getPublicServices);
router.get('/categories', getCategories);
router.get('/:id', getServiceById);
router.get('/:id/packages', getServicePackages);
router.get('/:id/addons', getServiceAddons);

// Admin Service endpoints (Requires SERVICES permission)
router.get('/admin/all', authenticateAdmin, authorize('services', 'view'), getAllServicesAdmin);
router.post('/admin', authenticateAdmin, authorize('services', 'create'), recordAuditLog('create_service', 'services'), createService);
router.put('/admin/:id', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_service', 'services'), updateService);
router.delete('/admin/:id', authenticateAdmin, authorize('services', 'delete'), recordAuditLog('delete_service', 'services'), deleteService);

// Admin Package endpoints
router.post('/admin/:id/packages', authenticateAdmin, authorize('services', 'create'), recordAuditLog('create_package', 'services'), createServicePackage);
router.put('/admin/:id/packages/:packageId', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_package', 'services'), updateServicePackage);
router.patch('/admin/:id/packages/:packageId', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_package', 'services'), updateServicePackage);
router.delete('/admin/:id/packages/:packageId', authenticateAdmin, authorize('services', 'delete'), recordAuditLog('delete_package', 'services'), deleteServicePackage);
router.put('/admin/packages/:id', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_package', 'services'), updateServicePackage);
router.patch('/admin/packages/:id', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_package', 'services'), updateServicePackage);
router.delete('/admin/packages/:id', authenticateAdmin, authorize('services', 'delete'), recordAuditLog('delete_package', 'services'), deleteServicePackage);

// Admin Add-on endpoints
router.post('/admin/:id/addons', authenticateAdmin, authorize('services', 'create'), recordAuditLog('create_addon', 'services'), createServiceAddon);
router.put('/admin/:id/addons/:addonId', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_addon', 'services'), updateServiceAddon);
router.patch('/admin/:id/addons/:addonId', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_addon', 'services'), updateServiceAddon);
router.delete('/admin/:id/addons/:addonId', authenticateAdmin, authorize('services', 'delete'), recordAuditLog('delete_addon', 'services'), deleteServiceAddon);
router.put('/admin/addons/:id', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_addon', 'services'), updateServiceAddon);
router.patch('/admin/addons/:id', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_addon', 'services'), updateServiceAddon);
router.delete('/admin/addons/:id', authenticateAdmin, authorize('services', 'delete'), recordAuditLog('delete_addon', 'services'), deleteServiceAddon);

// Admin Category endpoints
router.post('/admin/categories', authenticateAdmin, authorize('services', 'create'), recordAuditLog('create_category', 'services'), createCategory);
router.put('/admin/categories/:id', authenticateAdmin, authorize('services', 'edit'), recordAuditLog('update_category', 'services'), updateCategory);
router.delete('/admin/categories/:id', authenticateAdmin, authorize('services', 'delete'), recordAuditLog('delete_category', 'services'), deleteCategory);

export default router;
