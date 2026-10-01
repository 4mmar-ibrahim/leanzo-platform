import { Request, Response } from 'express';
import {
  getReportsOverview,
  getCustomersReport,
  getOrdersReport,
  getRevenueReport,
  getServicesReport,
  getAreasReport,
  getCouponsReport,
  getBookingsReport,
  getDashboardKPIs,
  getSubscriptionsReport,
} from '../services/reportsService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function getSubscriptionsReportController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getSubscriptionsReport({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getOverviewController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getReportsOverview({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getCustomersReportController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getCustomersReport({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getOrdersReportController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getOrdersReport({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getRevenueReportController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getRevenueReport({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getServicesReportController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getServicesReport({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAreasReportController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getAreasReport({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getCouponsReportController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getCouponsReport({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getBookingsReportController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getBookingsReport({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getDashboardKPIsController(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getDashboardKPIs({
      period: period as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
