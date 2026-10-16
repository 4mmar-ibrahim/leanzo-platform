import { Request, Response } from 'express';
import { SystemSettings, ISystemSettings } from '../models/SystemSettings.js';
import { Notification } from '../models/Notification.js';
import { CMSContent } from '../models/CMSContent.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const DEFAULT_SOCIAL = {
  facebook: 'https://facebook.com/cleanzo.app',
  instagram: 'https://instagram.com/cleanzo.app',
  tiktok: 'https://tiktok.com/@cleanzo.app',
  youtube: 'https://youtube.com/@cleanzo',
  whatsapp: 'https://wa.me/201012345678',
  twitter: 'https://twitter.com/cleanzo_app',
  linkedin: 'https://linkedin.com/company/cleanzo',
  items: [
    { id: 'soc-whatsapp', platform: 'whatsapp', name: 'واتساب كلينزو الرسمي', nameEn: 'Cleanzo Official WhatsApp', url: 'https://wa.me/201012345678', visible: true, order: 1 },
    { id: 'soc-facebook', platform: 'facebook', name: 'صفحة فيسبوك', nameEn: 'Facebook Page', url: 'https://facebook.com/cleanzo.app', visible: true, order: 2 },
    { id: 'soc-instagram', platform: 'instagram', name: 'إنستجرام', nameEn: 'Instagram', url: 'https://instagram.com/cleanzo.app', visible: true, order: 3 },
    { id: 'soc-tiktok', platform: 'tiktok', name: 'تيك توك', nameEn: 'TikTok', url: 'https://tiktok.com/@cleanzo.app', visible: true, order: 4 },
    { id: 'soc-youtube', platform: 'youtube', name: 'قناة يوتيوب', nameEn: 'YouTube Channel', url: 'https://youtube.com/@cleanzo', visible: true, order: 5 },
    { id: 'soc-twitter', platform: 'twitter', name: 'منصة X (تويتر)', nameEn: 'X (formerly Twitter)', url: 'https://twitter.com/cleanzo_app', visible: true, order: 6 },
    { id: 'soc-linkedin', platform: 'linkedin', name: 'لينكد إن', nameEn: 'LinkedIn', url: 'https://linkedin.com/company/cleanzo', visible: true, order: 7 },
  ],
};

const DEFAULT_CONTACT = {
  phone: '01012345678',
  whatsapp: '+201012345678',
  email: 'care@cleanzo.app',
  address: 'المنيا الجديدة، الحي الرابع، المحور المركزي، مصر',
  addressEn: 'New Minya, Fourth District, Central Axis, Egypt',
  workingHours: 'يومياً من 9:00 صباحاً حتى 10:00 مساءً',
  workingHoursEn: 'Daily 9:00 AM – 10:00 PM',
  mapsUrl: 'https://maps.google.com/?q=New+Minya+Egypt',
  supportNote: 'فريق دعم العملاء جاهز لخدمتك عبر واتساب خلال 10 دقائق.',
  supportNoteEn: 'Customer support replies on WhatsApp within 10 minutes.',
};

async function getAuthoritativeContact(settingsContact?: any): Promise<any> {
  let cmsContact: any = null;
  try {
    const published = await CMSContent.findOne({ status: 'published' });
    cmsContact = published?.contact;
  } catch (err) {
    console.warn('CMS published contact fetch warning:', err);
  }

  const base: any = { ...DEFAULT_CONTACT };
  if (cmsContact && typeof cmsContact === 'object') {
    for (const [k, v] of Object.entries(cmsContact)) {
      if (v !== undefined && v !== null && (typeof v !== 'string' || v.trim() !== '')) {
        base[k] = v;
      }
    }
  }
  if (settingsContact && typeof settingsContact === 'object') {
    for (const [k, v] of Object.entries(settingsContact)) {
      if (v !== undefined && v !== null && (typeof v !== 'string' || v.trim() !== '')) {
        base[k] = v;
      }
    }
  }
  return base;
}

async function getAuthoritativeSocial(settingsSocial: any): Promise<any> {
  let cmsSocial: any = null;
  try {
    const published = await CMSContent.findOne({ status: 'published' });
    cmsSocial = published?.social;
  } catch (err) {
    console.warn('CMS published social fetch warning:', err);
  }

  const base: any = { ...DEFAULT_SOCIAL };
  if (cmsSocial && typeof cmsSocial === 'object') {
    for (const [k, v] of Object.entries(cmsSocial)) {
      if (v && typeof v === 'string' && v.trim() !== '') {
        base[k] = v;
      }
    }
    if (Array.isArray(cmsSocial.items) && cmsSocial.items.length > 0) {
      base.items = cmsSocial.items;
    }
  }
  if (settingsSocial && typeof settingsSocial === 'object') {
    for (const [k, v] of Object.entries(settingsSocial)) {
      if (v && typeof v === 'string' && (v as string).trim() !== '') {
        base[k] = v;
      }
    }
    if (Array.isArray(settingsSocial.items) && settingsSocial.items.length > 0) {
      base.items = settingsSocial.items;
    }
  }
  return base;
}

export async function getPublicSettings(req: Request, res: Response): Promise<void> {
  try {
    let settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = await SystemSettings.create({ key: 'global_settings' });
    }

    const version = (settings as any).updatedAt ? new Date((settings as any).updatedAt).getTime() : Date.now();
    // Return public-safe settings (appearance, branding, working hours info, contact, social, mobileExperience)
    const safeBooking = settings.booking ? { ...settings.booking } : {};
    if (safeBooking.breakStart === '14:00' && safeBooking.breakEnd === '15:00') {
      delete safeBooking.breakStart;
      delete safeBooking.breakEnd;
      SystemSettings.updateOne(
        { key: 'global_settings' },
        { $unset: { 'booking.breakStart': '', 'booking.breakEnd': '' }, $set: { 'booking.enableBreak': false } }
      ).catch(() => {});
    }

    const authoritativeSocial = await getAuthoritativeSocial(settings.social);
    const authoritativeContact = await getAuthoritativeContact((settings as any).contact);

    sendSuccess(res, {
      general: settings.general,
      appearance: settings.appearance,
      branding: settings.branding,
      mobileExperience: (settings as any).mobileExperience,
      contact: authoritativeContact,
      social: authoritativeSocial,
      booking: safeBooking,
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
          minNoticeHours: 0,
          sameDayBooking: true,
          blockedDates: [],
          holidays: [],
        },
      });
    }

    const safeBookingAdmin = settings.booking ? { ...settings.booking } : {};
    if (safeBookingAdmin.breakStart === '14:00' && safeBookingAdmin.breakEnd === '15:00') {
      delete safeBookingAdmin.breakStart;
      delete safeBookingAdmin.breakEnd;
      // Proactively clear from MongoDB if still persisted
      SystemSettings.updateOne(
        { key: 'global_settings' },
        { $unset: { 'booking.breakStart': '', 'booking.breakEnd': '' }, $set: { 'booking.enableBreak': false } }
      ).catch(() => {});
    }
    const adminSettingsObj = typeof (settings as any).toObject === 'function' ? (settings as any).toObject() : { ...settings };
    adminSettingsObj.booking = safeBookingAdmin;
    adminSettingsObj.social = await getAuthoritativeSocial(settings.social);
    adminSettingsObj.contact = await getAuthoritativeContact((settings as any).contact);
    sendSuccess(res, adminSettingsObj);
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
        if (updates.booking.breakStart === undefined || updates.booking.breakStart === null) {
          delete (settings.booking as any).breakStart;
        }
        if (updates.booking.breakEnd === undefined || updates.booking.breakEnd === null) {
          delete (settings.booking as any).breakEnd;
        }
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
      if (updates.contact) {
        (settings as any).contact = { ...((settings as any).contact || {}), ...updates.contact };
        settings.markModified('contact');
        try {
          await CMSContent.updateMany({}, { $set: { contact: (settings as any).contact } });
        } catch (cmsErr) {
          console.warn('Non-critical: CMS contact sync error:', cmsErr);
        }
      }
      if (updates.social) {
        settings.social = { ...settings.social, ...updates.social };
        settings.markModified('social');
        try {
          await CMSContent.updateMany({}, { $set: { social: settings.social } });
        } catch (cmsErr) {
          console.warn('Non-critical: CMS social sync error:', cmsErr);
        }
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

    const updatedSettingsObj = typeof (settings as any).toObject === 'function' ? (settings as any).toObject() : { ...settings };
    updatedSettingsObj.social = await getAuthoritativeSocial(settings.social);
    updatedSettingsObj.contact = await getAuthoritativeContact((settings as any).contact);
    sendSuccess(res, updatedSettingsObj, 'تم حفظ وتحديث إعدادات النظام بنجاح');
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

