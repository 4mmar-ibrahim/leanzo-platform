import { Request, Response } from 'express';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function getPublicPortfolio(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;
    const filter: any = { visible: true };
    if (category && (category === 'car' || category === 'home')) {
      filter.category = category;
    }

    const items = await PortfolioItem.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    sendSuccess(res, items);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAllPortfolioAdmin(req: Request, res: Response): Promise<void> {
  try {
    const items = await PortfolioItem.find().sort({ sortOrder: 1, createdAt: -1 });
    sendSuccess(res, items);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function createPortfolioItem(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body;
    if (!data.title || !data.category || !data.image) {
      sendError(res, 'يرجى إدخال العنوان والتصنيف والصورة', 422);
      return;
    }

    const itemId = data.id || `gal-${Date.now()}`;
    const newItem = await PortfolioItem.create({
      ...data,
      id: itemId,
    });

    sendSuccess(res, newItem, 'تمت إضافة العمل بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updatePortfolioItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await PortfolioItem.findOneAndUpdate({ id }, req.body, { new: true });
    if (!updated) {
      sendError(res, 'العمل غير موجود', 404);
      return;
    }
    sendSuccess(res, updated, 'تم تحديث العمل بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function deletePortfolioItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await PortfolioItem.findOneAndDelete({ id });
    if (!deleted) {
      sendError(res, 'العمل غير موجود', 404);
      return;
    }
    sendSuccess(res, null, 'تم حذف العمل بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
