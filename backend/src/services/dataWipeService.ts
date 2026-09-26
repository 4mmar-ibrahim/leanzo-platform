import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { AdminUser } from '../models/AdminUser.js';
import { CustomerAddress } from '../models/CustomerAddress.js';
import { Notification } from '../models/Notification.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { AuditLog } from '../models/AuditLog.js';
import { CouponUsage } from '../models/CouponUsage.js';
import { Coupon } from '../models/Coupon.js';
import { Offer } from '../models/Offer.js';
import { PortfolioItem } from '../models/PortfolioItem.js';
import { Service } from '../models/Service.js';
import { ServiceCategory } from '../models/ServiceCategory.js';
import { LocationGovernorate } from '../models/Location.js';
import { Technician } from '../models/Technician.js';
import { FAQ } from '../models/FAQ.js';
import { AboutContent } from '../models/AboutContent.js';
import { Media } from '../models/Media.js';
import { ReviewModel } from '../models/Review.js';
import { markReviewsWiped } from '../controllers/reviewController.js';
import { CMSContent } from '../models/CMSContent.js';
import { SystemSettings } from '../models/SystemSettings.js';

export interface WipeSummary {
  wipedAt: Date;
  deletedOrders: number;
  deletedCustomers: number;
  deletedAddresses: number;
  deletedNotifications: number;
  deletedMessages: number;
  deletedCoupons: number;
  deletedOffers: number;
  deletedServices: number;
  deletedCategories: number;
  deletedPortfolio: number;
  deletedLocations: number;
  deletedTechnicians: number;
  deletedFAQs: number;
  deletedMedia: number;
  deletedReviews: number;
  deletedAuditLogs: number;
  preservedAdmin: string;
  failedSections: Array<{ section: string; error: string }>;
  success: boolean;
}

/**
 * Wipes ALL platform data across all sections and collections,
 * while strictly preserving the Super Admin / Owner account to ensure continuous dashboard access.
 */
export async function wipeAllPlatformData(adminExecutingId?: string): Promise<WipeSummary> {
  const failedSections: Array<{ section: string; error: string }> = [];

  let deletedOrders = 0;
  let deletedCustomers = 0;
  let deletedAddresses = 0;
  let deletedNotifications = 0;
  let deletedMessages = 0;
  let deletedCoupons = 0;
  let deletedOffers = 0;
  let deletedServices = 0;
  let deletedCategories = 0;
  let deletedPortfolio = 0;
  let deletedLocations = 0;
  let deletedTechnicians = 0;
  let deletedFAQs = 0;
  let deletedMedia = 0;
  let deletedReviews = 0;
  let deletedAuditLogs = 0;

  // 1. Orders / Bookings & Coupon Usages
  try {
    const res = await Booking.deleteMany({});
    deletedOrders = res.deletedCount || 0;
    await CouponUsage.deleteMany({});
  } catch (err: any) {
    failedSections.push({ section: 'الطلبات والحجوزات (Orders)', error: err.message });
  }

  // 2. Customer Addresses (Clear dependent foreign key records before users)
  try {
    const res = await CustomerAddress.deleteMany({});
    deletedAddresses = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'عناوين العملاء (Addresses)', error: err.message });
  }

  // 3. Customers (User model represents clients/customers with no role field)
  try {
    const res = await User.deleteMany({});
    deletedCustomers = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'العملاء (Customers)', error: err.message });
  }

  // 4. Contact Messages
  try {
    const res = await ContactMessage.deleteMany({});
    deletedMessages = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'رسائل واستفسارات العملاء (Messages)', error: err.message });
  }

  // 5. Notifications
  try {
    const res = await Notification.deleteMany({});
    deletedNotifications = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'التنبيهات والإشعارات (Notifications)', error: err.message });
  }

  // 6. Coupons
  try {
    const res = await Coupon.deleteMany({});
    deletedCoupons = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'الكوبونات وقسائم الخصم (Coupons)', error: err.message });
  }

  // 7. Offers
  try {
    const res = await Offer.deleteMany({});
    deletedOffers = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'العروض الترويجية (Offers)', error: err.message });
  }

  // 8. Services & Categories
  try {
    const resServ = await Service.deleteMany({});
    deletedServices = resServ.deletedCount || 0;
    const resCat = await ServiceCategory.deleteMany({});
    deletedCategories = resCat.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'الخدمات والتصنيفات (Services & Categories)', error: err.message });
  }

  // 9. Portfolio Items (Gallery)
  try {
    const res = await PortfolioItem.deleteMany({});
    deletedPortfolio = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'معرض الأعمال والصور (Gallery)', error: err.message });
  }

  // 10. Locations (Governorates & Cities)
  try {
    const res = await LocationGovernorate.deleteMany({});
    deletedLocations = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'المناطق والمحافظات (Locations)', error: err.message });
  }

  // 11. Technicians
  try {
    const res = await Technician.deleteMany({});
    deletedTechnicians = res.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'الفنيين (Technicians)', error: err.message });
  }

  // 12. Reviews (آراء وتقييمات العملاء)
  try {
    markReviewsWiped(true);
    const resRev = await ReviewModel.deleteMany({});
    deletedReviews = resRev.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'آراء وتقييمات العملاء (Reviews)', error: err.message });
  }

  // 13. FAQs, About Content, and CMS Content (About, Contact Info, Social Media)
  try {
    const resFAQ = await FAQ.deleteMany({});
    deletedFAQs = resFAQ.deletedCount || 0;
    await AboutContent.deleteMany({});

    // Wipe CMS content details so website is completely empty
    await CMSContent.updateMany(
      {},
      {
        $set: {
          about: {
            title: '',
            titleEn: '',
            description: '',
            descriptionEn: '',
            mission: '',
            missionEn: '',
            vision: '',
            visionEn: '',
            story: '',
            storyEn: '',
            stats: [],
          },
          contact: {
            phone: '',
            whatsapp: '',
            email: '',
            address: '',
            addressEn: '',
            workingHours: '',
            workingHoursEn: '',
            mapsUrl: '',
            supportNote: '',
            supportNoteEn: '',
          },
          social: {
            facebook: '',
            instagram: '',
            tiktok: '',
            youtube: '',
            whatsapp: '',
            twitter: '',
            linkedin: '',
            items: [],
          },
          lastPublishedAt: new Date(),
        },
      }
    );

    // Also clear social links in global SystemSettings
    await SystemSettings.updateMany(
      {},
      {
        $set: {
          'social.facebook': '',
          'social.instagram': '',
          'social.tiktok': '',
          'social.youtube': '',
          'social.whatsapp': '',
          'social.twitter': '',
          'social.linkedin': '',
        },
      }
    );
  } catch (err: any) {
    failedSections.push({ section: 'المحتوى وبيانات التواصل ومنصات التواصل (Content, Contact & Social)', error: err.message });
  }

  // 14. Media records
  try {
    const resMedia = await Media.deleteMany({});
    deletedMedia = resMedia.deletedCount || 0;
  } catch (err: any) {
    failedSections.push({ section: 'مكتبة الميديا (Media Library)', error: err.message });
  }

  // 15. Preserve Super Admin / Owner, delete other subordinate staff if any
  let adminName = 'System Super Admin';
  try {
    await AdminUser.deleteMany({
      role: { $nin: ['owner', 'super_admin'] },
    });
    const superAdmin = await AdminUser.findOne({ role: { $in: ['owner', 'super_admin'] } });
    if (superAdmin?.name) {
      adminName = superAdmin.name;
    }
  } catch (err: any) {
    failedSections.push({ section: 'إدارة المشرفين (Admin Users)', error: err.message });
  }

  // 16. Audit Logs - Clear past records and log this wipe event
  try {
    const resAudit = await AuditLog.deleteMany({});
    deletedAuditLogs = resAudit.deletedCount || 0;

    await AuditLog.create({
      adminId: adminExecutingId || 'system',
      adminName: adminName,
      adminRole: 'owner',
      action: 'مسح وإعادة ضبط شامل لجميع بيانات الموقع',
      module: 'settings',
      target: 'All Platform Data',
      details: `تم مسح ${deletedOrders} طلب، ${deletedCustomers} عميل، ${deletedServices} خدمة، ${deletedCoupons} كوبون، ${deletedOffers} عرض، ${deletedReviews} تقييم، وتصفير بيانات التواصل ومنصات التواصل ونبذة عنا، مع الحفاظ على حساب المشرف الأعلى (${adminName})`,
      status: 'critical',
    });
  } catch (err: any) {
    failedSections.push({ section: 'سجل النشاطات (Audit Logs)', error: err.message });
  }

  const isCompleteSuccess = failedSections.length === 0;

  if (!isCompleteSuccess) {
    const errorDetails = failedSections.map((f) => `${f.section}: ${f.error}`).join(' | ');
    throw new Error(`تعذر حذف بعض الأقسام بنجاح: ${errorDetails}`);
  }

  return {
    wipedAt: new Date(),
    deletedOrders,
    deletedCustomers,
    deletedAddresses,
    deletedNotifications,
    deletedMessages,
    deletedCoupons,
    deletedOffers,
    deletedServices,
    deletedCategories,
    deletedPortfolio,
    deletedLocations,
    deletedTechnicians,
    deletedFAQs,
    deletedMedia,
    deletedReviews,
    deletedAuditLogs,
    preservedAdmin: adminName,
    failedSections,
    success: true,
  };
}
