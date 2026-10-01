import { Request, Response } from 'express';
import { SystemSettings, ISystemSettings } from '../models/SystemSettings.js';
import { Notification } from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function getPublicSettings(req: Request, res: Response): Promise<void> {
  try {
    let settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = await SystemSettings.create({ key: 'global_settings' });
    }

    const version = (settings as any).updatedAt ? new Date((settings as any).updatedAt).getTime() : Date.now();
    // Return public-safe settings (appearance, branding, working hours info, social, mobileExperience)
    sendSuccess(res, {
      general: settings.general,
      appearance: settings.appearance,
      branding: settings.branding,
      mobileExperience: (settings as any).mobileExperience,
      social: settings.social,
      booking: settings.booking,
      notifications: settings.notifications,
      updatedAt: (settings as any).updatedAt,
      version,
      bookingHours: {
        workingDays: settings.booking?.workingDays,
        workingHoursStart: settings.booking?.workingHoursStart,
        workingHoursEnd: settings.booking?.workingHoursEnd,
      },
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAllSettingsAdmin(req: Request, res: Response): Promise<void> {
  try {
    let settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = await SystemSettings.create({
        key: 'global_settings',
        general: {
          companyName: 'كلينزو لخدمات العناية المتنقلة',
          companyNameEn: 'Cleanzo Mobile Detailing',
          defaultLanguage: 'ar',
          currency: 'ج.م',
          currencyEn: 'EGP',
          timezone: 'Africa/Cairo',
        },
        booking: {
          workingDays: [0, 1, 2, 3, 4, 5, 6],
          workingHoursStart: '09:00',
          workingHoursEnd: '22:00',
          slotDuration: 60,
          slotInterval: 60,
          bufferTime: 15,
          maxBookingsPerSlot: 1,
          advanceBookingDays: 14,
          minNoticeHours: 1,
          sameDayBooking: true,
          blockedDates: [],
          holidays: [],
        },
      });
    }
    sendSuccess(res, settings);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateSettingsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const updates = req.body;
    let settings = await SystemSettings.findOne({ key: 'global_settings' });

    if (!settings) {
      settings = await SystemSettings.create({ key: 'global_settings', ...updates });
    } else {
      if (updates.general) {
        settings.general = { ...settings.general, ...updates.general };
        settings.markModified('general');
      }
      if (updates.booking) {
        settings.booking = { ...settings.booking, ...updates.booking };
        settings.markModified('booking');
      }
      if (updates.appearance) {
        settings.appearance = { ...settings.appearance, ...updates.appearance };
        settings.markModified('appearance');
      }
      if (updates.branding) {
        settings.branding = { ...settings.branding, ...updates.branding };
        settings.markModified('branding');
      }
      if (updates.mobileExperience) {
        (settings as any).mobileExperience = { ...(settings as any).mobileExperience, ...updates.mobileExperience };
        settings.markModified('mobileExperience');
      }
      if (updates.social) {
        settings.social = { ...settings.social, ...updates.social };
        settings.markModified('social');
      }
      if (updates.notifications) {
        settings.notifications = { ...settings.notifications, ...updates.notifications };
        settings.markModified('notifications');
      }
      await settings.save();
      
      try {
        await Notification.create({
          target: 'admin',
          title: 'تحديث إعدادات النظام',
          titleEn: 'System Settings Updated',
          message: 'تم تحديث وضبط إعدادات المنصة بنجاح بواسطة الإدارة.',
          messageEn: 'System settings were successfully updated.',
          type: 'system',
          read: false,
          link: '/admin/settings',
        });
      } catch (notifErr) {
        console.warn('Non-critical: Settings notification error:', notifErr);
      }
    }

    sendSuccess(res, settings, 'تم حفظ وتحديث إعدادات النظام بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function encryptAllDataAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { encryptAllDatabaseData } = await import('../services/encryptionService.js');
    const adminName = (req as any).admin?.name || 'Super Admin';
    const stats = await encryptAllDatabaseData(adminName);
    sendSuccess(res, stats, 'تم تشفير جميع بيانات الموقع والبرنامج بنجاح بتقنية AES-256-GCM');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getEncryptionStatusAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { getEncryptionStatus } = await import('../services/encryptionService.js');
    const status = await getEncryptionStatus();
    sendSuccess(res, status);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getEncryptionLogsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { getEncryptionLogs } = await import('../services/encryptionService.js');
    const logs = await getEncryptionLogs(20);
    sendSuccess(res, logs);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function wipeAllDataAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'مسح' && confirmation !== 'WIPE') {
      sendError(res, 'يجب تأكيد مسح البيانات بكتابة كلمة "مسح"', 400);
      return;
    }

    const { wipeAllPlatformData } = await import('../services/dataWipeService.js');
    const adminId = (req as any).admin?._id?.toString() || (req as any).admin?.id;
    const summary = await wipeAllPlatformData(adminId);
    sendSuccess(res, summary, 'تم مسح وإعادة ضبط بيانات الموقع بنجاح مع الحفاظ على حساب المشرف الأعلى');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

