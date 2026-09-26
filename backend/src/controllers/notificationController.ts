import { Request, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export async function getCustomerNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id?.toString();
    const notifications = await Notification.find({
      target: 'customer',
      $or: [{ userId }, { userId: { $exists: false } }],
    }).sort({ createdAt: -1 }).limit(30);

    sendSuccess(res, notifications);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function markCustomerNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    const notif = await Notification.findOne({
      _id: id,
      target: 'customer',
      $or: [{ userId }, { userId: { $exists: false } }],
    });

    if (!notif) {
      sendError(res, 'الإشعار غير موجود أو لا تملك صلاحية تعديله', 404);
      return;
    }

    notif.read = true;
    await notif.save();
    sendSuccess(res, null, 'تم تحديث حالة الإشعار');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAdminNotifications(req: Request, res: Response): Promise<void> {
  try {
    const notifications = await Notification.find({ target: { $in: ['admin', 'all'] } }).sort({ createdAt: -1 }).limit(50);
    sendSuccess(res, notifications || []);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function markAdminNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    sendSuccess(res, null, 'تم تحديد الإشعار كمقروء');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function markAllAdminNotificationsRead(req: Request, res: Response): Promise<void> {
  try {
    await Notification.updateMany({ target: { $in: ['admin', 'all'] }, read: false }, { read: true });
    sendSuccess(res, null, 'تم تحديد جميع الإشعارات كمقروءة');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function clearAllAdminNotifications(req: Request, res: Response): Promise<void> {
  try {
    await Notification.deleteMany({ target: { $in: ['admin', 'all'] } });
    sendSuccess(res, null, 'تم مسح كافة إشعارات الإدارة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function deleteAdminNotification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    sendSuccess(res, null, 'تم حذف الإشعار');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function createAdminNotification(req: Request, res: Response): Promise<void> {
  try {
    const { title, titleEn, message, messageEn, type, link, target, userId } = req.body;
    if (!title || !message) {
      sendError(res, 'العنوان والرسالة مطلوبان', 422);
      return;
    }

    const created = await Notification.create({
      target: target || 'admin',
      userId: userId || undefined,
      title,
      titleEn: titleEn || title,
      message,
      messageEn: messageEn || message,
      type: type || 'system',
      read: false,
      link: link || undefined,
    });

    sendSuccess(res, created, 'تم إنشاء الإشعار بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
