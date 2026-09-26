import { Request, Response } from 'express';
import { FAQ } from '../models/FAQ.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function getPublicFAQs(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;
    const filter: any = { visible: true };
    if (category) filter.category = category;

    const faqs = await FAQ.find(filter).sort({ order: 1 });
    sendSuccess(res, faqs);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAllFAQsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const faqs = await FAQ.find().sort({ order: 1 });
    sendSuccess(res, faqs);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function createFAQ(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body;
    if (!data.question || !data.answer) {
      sendError(res, 'يرجى إدخال السؤال والإجابة', 422);
      return;
    }

    const faqId = data.id || `faq-${Date.now()}`;
    const newFaq = await FAQ.create({
      ...data,
      id: faqId,
    });

    sendSuccess(res, newFaq, 'تمت إضافة السؤال بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateFAQ(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await FAQ.findOneAndUpdate({ id }, req.body, { new: true });
    if (!updated) {
      sendError(res, 'السؤال غير موجود', 404);
      return;
    }
    sendSuccess(res, updated, 'تم تحديث السؤال بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function deleteFAQ(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await FAQ.findOneAndDelete({ id });
    if (!deleted) {
      sendError(res, 'السؤال غير موجود', 404);
      return;
    }
    sendSuccess(res, null, 'تم حذف السؤال بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
