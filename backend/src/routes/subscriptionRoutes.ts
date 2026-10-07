import { Router } from 'express';
import {
  listPlansPublic,
  listPlansAdmin,
  getPlanById,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan,
} from '../controllers/subscriptionPlanController.js';
import {
  createCustomerSubscription,
  getMySubscriptions,
  getMySubscriptionById,
  cancelVisitCustomer,
  rescheduleVisitCustomer,
  renewSubscriptionCustomer,
  getAllSubscriptionsAdmin,
  getSubscriptionByIdAdmin,
  updateSubscriptionStatusAdmin,
  getAllVisitsAdmin,
  assignTechnicianToVisitAdmin,
  updateVisitStatusAdmin,
  rescheduleVisitAdmin,
  cancelVisitAdmin,
  getAllRenewalsAdmin,
  getSubscriptionSettingsHandler,
  updateSubscriptionSettingsHandler,
  getSubscriptionAnalyticsHandler,
  triggerSubscriptionScheduler,
} from '../controllers/subscriptionController.js';
import { authenticateCustomer, optionalCustomerAuth } from '../middleware/authMiddleware.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';

const router = Router();

// ==========================================
// 1. Subscription Plans Endpoints
// ==========================================
router.get('/plans', listPlansPublic);
router.get(['/plans/admin', '/admin/plans'], authenticateAdmin, authorize('subscriptions', 'view'), listPlansAdmin);
router.get('/plans/:id', getPlanById);
router.post(['/plans', '/admin/plans'], authenticateAdmin, authorize('subscriptions', 'edit'), createPlan);
router.put(['/plans/:id', '/admin/plans/:id'], authenticateAdmin, authorize('subscriptions', 'edit'), updatePlan);
router.patch(['/plans/:id/status', '/admin/plans/:id/status'], authenticateAdmin, authorize('subscriptions', 'edit'), togglePlanStatus);
router.delete(['/plans/:id', '/admin/plans/:id'], authenticateAdmin, authorize('subscriptions', 'delete'), deletePlan);

// ==========================================
// 2. Customer Subscriptions Endpoints
// ==========================================
router.post('/', optionalCustomerAuth, createCustomerSubscription);
router.get('/my', authenticateCustomer, getMySubscriptions);
router.get('/my/:id', authenticateCustomer, getMySubscriptionById);
router.post('/visits/:visitId/cancel', optionalCustomerAuth, cancelVisitCustomer);
router.post('/visits/:visitId/reschedule', optionalCustomerAuth, rescheduleVisitCustomer);
router.post('/:id/renew', optionalCustomerAuth, renewSubscriptionCustomer);

// ==========================================
// 3. Admin Subscriptions Management Endpoints
// ==========================================
router.get(['/admin/all', '/admin', '/all'], authenticateAdmin, authorize('subscriptions', 'view'), getAllSubscriptionsAdmin);
router.get(['/admin/analytics', '/analytics'], authenticateAdmin, authorize('subscriptions', 'view'), getSubscriptionAnalyticsHandler);
router.post(['/admin/run-scheduler', '/run-scheduler'], authenticateAdmin, authorize('subscriptions', 'edit'), triggerSubscriptionScheduler);
router.get(['/admin/settings', '/settings'], authenticateAdmin, authorize('subscriptions', 'view'), getSubscriptionSettingsHandler);
router.put(['/admin/settings', '/settings'], authenticateAdmin, authorize('subscriptions', 'edit'), updateSubscriptionSettingsHandler);
router.get(['/admin/renewals', '/renewals'], authenticateAdmin, authorize('subscriptions', 'view'), getAllRenewalsAdmin);

// Admin Visits
router.get(['/admin/visits/all', '/admin/visits', '/visits/all'], authenticateAdmin, authorize('subscriptions', 'view'), getAllVisitsAdmin);
router.put(['/admin/visits/:visitId/assign', '/visits/:visitId/assign'], authenticateAdmin, authorize('subscriptions', 'edit'), assignTechnicianToVisitAdmin);
router.put(['/admin/visits/:visitId/status', '/visits/:visitId/status'], authenticateAdmin, authorize('subscriptions', 'edit'), updateVisitStatusAdmin);
router.post(['/admin/visits/:visitId/reschedule', '/visits/:visitId/reschedule'], authenticateAdmin, authorize('subscriptions', 'edit'), rescheduleVisitAdmin);
router.post(['/admin/visits/:visitId/cancel', '/visits/:visitId/cancel'], authenticateAdmin, authorize('subscriptions', 'edit'), cancelVisitAdmin);

// Admin Subscription Detail & Status
router.get(['/admin/:id', '/:id'], authenticateAdmin, authorize('subscriptions', 'view'), getSubscriptionByIdAdmin);
router.put(['/admin/:id/status', '/:id/status'], authenticateAdmin, authorize('subscriptions', 'edit'), updateSubscriptionStatusAdmin);

export default router;
