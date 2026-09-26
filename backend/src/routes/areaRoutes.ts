import { Router } from 'express';
import {
  getPublicLocations,
  getCitiesByGovernorate,
  getAllLocationsAdmin,
  createGovernorate,
  updateGovernorate,
  toggleGovernorateActive,
  deleteGovernorate,
  addCityToGovernorate,
  updateCityInGovernorate,
  toggleCityActive,
  deleteCityFromGovernorate,
} from '../controllers/areaController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { recordAuditLog } from '../middleware/auditMiddleware.js';

const router = Router();

// Public: customer booking gets available active governorates and cities
router.get('/', getPublicLocations);
router.get('/active', getPublicLocations);
router.get('/:governorateId/cities', getCitiesByGovernorate);

// Admin Governorate management
router.get('/admin', authenticateAdmin, authorize('locations', 'view'), getAllLocationsAdmin);
router.post('/admin', authenticateAdmin, authorize('locations', 'create'), recordAuditLog('create_governorate', 'locations'), createGovernorate);
router.put('/admin/:id', authenticateAdmin, authorize('locations', 'edit'), recordAuditLog('update_governorate', 'locations'), updateGovernorate);
router.patch('/admin/:id/toggle', authenticateAdmin, authorize('locations', 'edit'), recordAuditLog('toggle_governorate', 'locations'), toggleGovernorateActive);
router.delete('/admin/:id', authenticateAdmin, authorize('locations', 'delete'), recordAuditLog('delete_governorate', 'locations'), deleteGovernorate);

// Admin City management within governorates
router.post('/admin/:id/cities', authenticateAdmin, authorize('locations', 'create'), recordAuditLog('create_city', 'locations'), addCityToGovernorate);
router.put('/admin/:id/cities/:cityId', authenticateAdmin, authorize('locations', 'edit'), recordAuditLog('update_city', 'locations'), updateCityInGovernorate);
router.patch('/admin/:id/cities/:cityId/toggle', authenticateAdmin, authorize('locations', 'edit'), recordAuditLog('toggle_city', 'locations'), toggleCityActive);
router.delete('/admin/:id/cities/:cityId', authenticateAdmin, authorize('locations', 'delete'), recordAuditLog('delete_city', 'locations'), deleteCityFromGovernorate);

export default router;
