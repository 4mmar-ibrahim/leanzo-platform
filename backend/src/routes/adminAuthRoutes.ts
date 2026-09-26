import { Router } from 'express';
import {
  loginAdmin,
  getAdminProfile,
  getAllAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminModulesMetadata,
  getAllRolesAdmin,
  createRoleAdmin,
  updateRoleAdmin,
  changeOwnerPassword,
  updateOwnerProfile,
  changeUserPassword,
  refreshTokenAdmin,
  logoutAdmin,
} from '../controllers/adminAuthController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

router.post('/login', authLimiter, loginAdmin);
router.post('/refresh', refreshTokenAdmin);
router.post('/logout', logoutAdmin);
router.get('/me', authenticateAdmin, getAdminProfile);

// Owner Profile & Password operations (Exclusive to Platform Owner)
router.put('/owner/profile', authenticateAdmin, updateOwnerProfile);
router.put('/owner/change-password', authenticateAdmin, changeOwnerPassword);

// Modules metadata for matrix UI
router.get('/modules', authenticateAdmin, getAdminModulesMetadata);

// Admin User Management routes (Requires USERS view/create/edit/delete/password permissions)
router.get('/', authenticateAdmin, authorize('users', 'view'), getAllAdminUsers);
router.get('/users', authenticateAdmin, authorize('users', 'view'), getAllAdminUsers);
router.post('/users', authenticateAdmin, authorize('users', 'create'), createAdminUser);
router.put('/users/:id', authenticateAdmin, authorize('users', 'edit'), updateAdminUser);
router.delete('/users/:id', authenticateAdmin, authorize('users', 'delete'), deleteAdminUser);
router.put('/users/:id/change-password', authenticateAdmin, changeUserPassword);

// Roles Management routes
router.get('/roles', authenticateAdmin, authorize('users', 'view'), getAllRolesAdmin);
router.post('/roles', authenticateAdmin, authorize('users', 'create'), createRoleAdmin);
router.put('/roles/:id', authenticateAdmin, authorize('users', 'edit'), updateRoleAdmin);

export default router;
