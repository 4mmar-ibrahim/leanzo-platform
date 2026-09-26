import { Router } from 'express';
import {
  getOverviewController,
  getCustomersReportController,
  getOrdersReportController,
  getRevenueReportController,
  getServicesReportController,
  getAreasReportController,
  getCouponsReportController,
  getBookingsReportController,
  getDashboardKPIsController,
} from '../controllers/reportsController.js';
import { authenticateAdmin, authorize } from '../middleware/adminAuthMiddleware.js';

const router = Router();

// Reports endpoints (secured with reports.view permission)
router.get('/overview', authenticateAdmin, authorize('reports', 'view'), getOverviewController);
router.get('/customers', authenticateAdmin, authorize('reports', 'view'), getCustomersReportController);
router.get('/orders', authenticateAdmin, authorize('reports', 'view'), getOrdersReportController);
router.get('/revenue', authenticateAdmin, authorize('reports', 'view'), getRevenueReportController);
router.get('/services', authenticateAdmin, authorize('reports', 'view'), getServicesReportController);
router.get('/areas', authenticateAdmin, authorize('reports', 'view'), getAreasReportController);
router.get('/coupons', authenticateAdmin, authorize('reports', 'view'), getCouponsReportController);
router.get('/bookings', authenticateAdmin, authorize('reports', 'view'), getBookingsReportController);

// Dashboard / KPI summary (accessible by any authenticated admin)
router.get('/dashboard-kpis', authenticateAdmin, getDashboardKPIsController);
router.get('/kpis', authenticateAdmin, getDashboardKPIsController);

export default router;
