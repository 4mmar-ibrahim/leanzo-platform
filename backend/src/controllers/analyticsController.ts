import { Request, Response } from 'express';
import { getAnalyticsOverview, getDashboardKPIs } from '../services/reportsService.js';
import { generateAIAnalyticsInsights } from '../services/aiInsightsService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getAnalyticsOverview({
      period: period as any,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getDashboardKPIsFromAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await getDashboardKPIs({
      period: period as any,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAIInsights(req: Request, res: Response): Promise<void> {
  try {
    const insights = await generateAIAnalyticsInsights();
    sendSuccess(res, insights);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

