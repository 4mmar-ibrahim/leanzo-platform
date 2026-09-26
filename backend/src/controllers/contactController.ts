import { Request, Response } from 'express';
import { ContactMessage } from '../models/ContactMessage.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import {
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
  CANONICAL_PHONE_ERROR_CODE,
} from '../utils/phoneValidator.js';

export async function submitContactMessage(req: Request, res: Response): Promise<void> {
  try {
    const { name, phone, email, message, source } = req.body;

    if (!name || !phone || !message) {
      sendError(res, 'يرجى إدخال الاسم ورقم الهاتف والرسالة', 422);
      return;
    }

    const cleanPhone = String(phone).trim();
    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      sendError(
        res,
        phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
        400,
        phoneVal.code || CANONICAL_PHONE_ERROR_CODE
      );
      return;
    }

    const newMessage = await ContactMessage.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      message: message.trim(),
      source: source || 'website_contact',
      status: 'new',
      ip: req.ip || req.socket.remoteAddress,
    });

    sendSuccess(res, { id: newMessage._id }, 'شكراً لتواصلك معنا! تم استلام رسالتك وسيتواصل معك فريق خدمة العملاء قريباً.', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAllContactMessagesAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      ContactMessage.countDocuments(filter),
    ]);

    sendSuccess(res, {
      messages,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateContactMessageStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, replyNote } = req.body;

    const validStatuses = ['new', 'read', 'replied', 'closed'];
    if (!validStatuses.includes(status)) {
      sendError(res, 'حالة الرسالة غير صالحة', 422);
      return;
    }

    const msg = await ContactMessage.findByIdAndUpdate(
      id,
      { status, replyNote },
      { new: true }
    );

    if (!msg) {
      sendError(res, 'الرسالة غير موجودة', 404);
      return;
    }

    sendSuccess(res, msg, 'تم تحديث حالة الرسالة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
