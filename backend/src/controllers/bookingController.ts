import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Booking, BookingStatus, ITimelineEvent } from '../models/Booking.js';
import { CouponUsage } from '../models/CouponUsage.js';
import { Service } from '../models/Service.js';
import { User } from '../models/User.js';
import { CustomerAddress } from '../models/CustomerAddress.js';
import { LocationGovernorate } from '../models/Location.js';
import { Technician } from '../models/Technician.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { auditService } from '../services/auditService.js';
import { assertSlotAvailability, compressScheduleAfterCancellation, getCurrentCairoTimeString, withBookingLock } from '../services/availabilityService.js';
import { calculateBookingPrice, calculateMultiServiceBookingPrice } from '../services/bookingPriceService.js';
import { redeemCouponAtomically, rollbackCouponRedemption } from '../services/couponService.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';
import {
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
  CANONICAL_PHONE_ERROR_CODE,
} from '../utils/phoneValidator.js';
import { validateCustomerName } from '../utils/nameValidator.js';
import { isNoticeSufficient, getSubscriptionSettings } from '../services/subscriptionService.js';
import prisma from '../config/prisma.js';

function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const raw = String(timeStr).trim();
  const firstSegment = raw.split(/[-–—]/)[0].trim();
  const clean = firstSegment.toUpperCase();

  const isPM =
    clean.includes('PM') ||
    clean.includes('مساء') ||
    clean.includes('ظهراً') ||
    clean.includes('عصراً') ||
    /(?:^|\s|\d)م(?:$|\s)/.test(clean) ||
    clean.endsWith('م');

  const isAM =
    clean.includes('AM') ||
    clean.includes('صباح') ||
    /(?:^|\s|\d)ص(?:$|\s)/.test(clean) ||
    clean.endsWith('ص');

  const timePart = clean.replace(/(AM|PM|مساءً|مساء|صباحاً|صباح|ظهراً|عصراً|[صم])/gi, '').trim();
  const cleanNumbers = timePart.replace(/[^0-9:]/g, '');
  const [hourStr, minuteStr] = cleanNumbers.split(':');
  let hours = parseInt(hourStr || '0', 10);
  const minutes = parseInt(minuteStr || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
}

function getBookingTimeInterval(b: any): { startMin: number; endMin: number; display: string } {
  if (!b) return { startMin: 0, endMin: 60, display: '—' };

  const timeStr = String(b.time || '').trim();
  const fullDuration =
    b.serviceDurationMinutes ||
    b.duration ||
    b.service?.duration ||
    b.serviceSnapshot?.duration ||
    60;

  // 1. Explicit scheduledStart & scheduledEnd
  if (b.scheduledStart && b.scheduledEnd) {
    const sMin = timeStringToMinutes(b.scheduledStart);
    const eMin = timeStringToMinutes(b.scheduledEnd);
    if (sMin > 0 && eMin > sMin) {
      return {
        startMin: sMin,
        endMin: Math.max(eMin, sMin + fullDuration),
        display: timeStr || `${b.scheduledStart} – ${b.scheduledEnd}`,
      };
    }
  }

  // 2. Range strings with dash/hyphen
  if (timeStr.includes('–') || timeStr.includes('-') || timeStr.includes('—')) {
    const parts = timeStr.split(/[-–—]/).map((p: string) => p.trim());
    if (parts.length >= 2) {
      const min1 = timeStringToMinutes(parts[0]);
      const min2 = timeStringToMinutes(parts[1]);

      if (min1 > 0 && min2 > 0) {
        // Robust against both LTR and RTL string ordering:
        const startMin = Math.min(min1, min2);
        const endMin = Math.max(Math.max(min1, min2), startMin + fullDuration);
        return {
          startMin,
          endMin,
          display: timeStr,
        };
      } else if (min1 > 0) {
        return {
          startMin: min1,
          endMin: min1 + fullDuration,
          display: timeStr,
        };
      }
    }
  }

  // 3. Single start time
  const rawStart = b.scheduledStart || timeStr;
  const startMin = timeStringToMinutes(rawStart);
  const endMin = startMin + fullDuration;

  return {
    startMin,
    endMin,
    display: timeStr || `${Math.floor(startMin / 60).toString().padStart(2, '0')}:${(startMin % 60).toString().padStart(2, '0')}`,
  };
}

function isTimeIntervalOverlapping(
  intA: { startMin: number; endMin: number },
  intB: { startMin: number; endMin: number }
): boolean {
  return intA.startMin < intB.endMin && intB.startMin < intA.endMin;
}

interface StatusNotificationContent {
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
}

export function getCustomerNotificationContentForStatus(
  status: BookingStatus,
  booking: {
    id: string;
    customerName?: string;
    serviceSnapshot?: { title?: string; titleEn?: string };
    date?: string;
    time?: string;
    assignedTechnicianName?: string;
    technician?: { name?: string };
    address?: { area?: string; city?: string; governorate?: string };
  },
  note?: string
): StatusNotificationContent {
  const serviceTitle = booking.serviceSnapshot?.title || 'خدمة كلينزو';
  const serviceTitleEn = booking.serviceSnapshot?.titleEn || booking.serviceSnapshot?.title || 'Cleanzo Service';
  const customerName = booking.customerName || 'عميلنا العزيز';
  const date = booking.date || '';
  const time = booking.time || '';
  const techName = booking.technician?.name || booking.assignedTechnicianName || 'الفني المختص';
  const area = booking.address?.area || booking.address?.city || booking.address?.governorate || 'موقعك المحدد';

  switch (status) {
    case 'pending':
      return {
        title: '⏳ تم استلام طلبك وبانتظار المراجعة',
        titleEn: '⏳ Booking Received & Under Review',
        message: `مرحباً ${customerName}، تم استلام طلبك #${booking.id} لخدمة (${serviceTitle}) بنجاح. فريق العمليات يراجع التفاصيل لتأكيد الموعد (${date}${time ? ` - ${time}` : ''}). سنوافيك بالتأكيد قريباً.${note ? `\nملاحظة: ${note}` : ''}`,
        messageEn: `Hello ${customerName}, your booking #${booking.id} for (${serviceTitleEn}) was received. Our operations team is reviewing details for (${date}${time ? ` at ${time}` : ''}). We will confirm shortly.${note ? `\nNote: ${note}` : ''}`,
      };

    case 'confirmed':
      return {
        title: '✅ تم تأكيد موعد حجزك بنجاح',
        titleEn: '✅ Booking Confirmed Successfully',
        message: `يسعدنا إبلاغك بتأكيد حجزك للطلب #${booking.id} لخدمة (${serviceTitle}) ليوم ${date}${time ? ` في تمام ${time}` : ''}. أسطول كلينزو جاهز للزيارة في الموعد المحدد!${note ? `\nملاحظة: ${note}` : ''}`,
        messageEn: `Great news! Your booking #${booking.id} for (${serviceTitleEn}) is confirmed for ${date}${time ? ` at ${time}` : ''}. The Cleanzo fleet is scheduled for your visit!${note ? `\nNote: ${note}` : ''}`,
      };

    case 'assigned':
      return {
        title: '👷‍♂️ تم تعيين الفني المختص لخدمتك',
        titleEn: '👷‍♂️ Specialist Assigned to Your Booking',
        message: `تم إسناد طلبك #${booking.id} إلى الكابتن (${techName}). تم تجهيز سيارة الخدمة المتنقلة بأحدث معدات ومواد النظافة والتعقيم الفندقية لزيارتك.${note ? `\nملاحظة: ${note}` : ''}`,
        messageEn: `Captain (${techName}) has been assigned to your booking #${booking.id}. The mobile unit is equipped with top cleaning and sanitization gear for your visit.${note ? `\nNote: ${note}` : ''}`,
      };

    case 'on_the_way':
      return {
        title: '🚗 الفني في الطريق إلى موقعك الآن!',
        titleEn: '🚗 Technician is on the Way!',
        message: `انطلقت سيارة الخدمة المتنقلة بقيادة الكابتن (${techName}) وهي متجهة الآن إلى عنوانك (${area}) لتنفيذ طلبك #${booking.id}. يُرجى التواجد لاستقبال الفريق.${note ? `\nملاحظة: ${note}` : ''}`,
        messageEn: `Our mobile unit with Captain (${techName}) is en route to your address (${area}) for booking #${booking.id}. Please be ready to welcome the team.${note ? `\nNote: ${note}` : ''}`,
      };

    case 'in_progress':
      return {
        title: '✨ بدأ تنفيذ خدمة النظافة الآن',
        titleEn: '✨ Cleaning Service in Progress',
        message: `بدأ فريق كلينزو الآن تنفيذ أعمال (${serviceTitle}) لطلبك #${booking.id} في موقعك. نحرص على تقديم أعلى معايير العناية والتألق لمكانك!${note ? `\nملاحظة: ${note}` : ''}`,
        messageEn: `Our team has started performing (${serviceTitleEn}) for your booking #${booking.id}. We are dedicated to delivering pristine results and premium care!${note ? `\nNote: ${note}` : ''}`,
      };

    case 'completed':
      return {
        title: '🎉 تم اكتمال خدمتك بنجاح.. نعيماً!',
        titleEn: '🎉 Service Completed Successfully!',
        message: `تم الانتهاء من تنفيذ طلبك #${booking.id} وتسليم العمل بأعلى درجات النظافة والتعقيم. يسعدنا دائماً خدمتك ونتطلع لمعرفة تقييمك ورأيك في التجربة!${note ? `\nملاحظة: ${note}` : ''}`,
        messageEn: `Your booking #${booking.id} has been successfully completed with the highest cleanliness standards. Thank you for choosing Cleanzo — we'd love your feedback!${note ? `\nNote: ${note}` : ''}`,
      };

    case 'cancelled':
      return {
        title: `❌ تم إلغاء حجز الطلب #${booking.id}`,
        titleEn: `❌ Booking #${booking.id} Cancelled`,
        message: `نود إبلاغك بأنه تم إلغاء حجز الطلب #${booking.id}${note ? ` (السبب: ${note})` : ''}. يمكنك إعادة جدولة الحجز أو اختيار موعد جديد في أي وقت بخطوات بسيطة.`,
        messageEn: `Please be informed that booking #${booking.id} has been cancelled${note ? ` (Reason: ${note})` : ''}. You can easily reschedule or place a new booking anytime.`,
      };

    default:
      return {
        title: `حالة طلبك #${booking.id}`,
        titleEn: `Order #${booking.id} Update`,
        message: note || `تم تحديث حالة طلبك #${booking.id}`,
        messageEn: note || `Your order #${booking.id} has been updated.`,
      };
  }
}

export async function calculateBookingPriceHandler(req: Request, res: Response): Promise<void> {
  try {
    const { serviceId, services, packageId, addonIds, promoCode, customerPhone, category: bookingCategory } = req.body;

    const rawServices = Array.isArray(services) && services.length > 0
      ? services
      : (serviceId ? [{ serviceId, packageId, addonIds }] : []);

    if (rawServices.length === 0) {
      sendError(res, 'معرف الخدمة مطلوب', 400, 'MISSING_SERVICE_ID');
      return;
    }

    if (customerPhone) {
      const phoneVal = validateEgyptianPhone(String(customerPhone).trim());
      if (!phoneVal.isValid) {
        sendError(
          res,
          phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
          400,
          phoneVal.code || CANONICAL_PHONE_ERROR_CODE
        );
        return;
      }
    }

    const cleanPhone = customerPhone ? String(customerPhone).trim() : undefined;

    let pricing;
    if (rawServices.length > 1 || (Array.isArray(services) && services.length > 0)) {
      pricing = await calculateMultiServiceBookingPrice(rawServices, promoCode, cleanPhone);
    } else {
      const sId = rawServices[0].serviceId;
      if (bookingCategory) {
        const service = await Service.findOne({ id: sId });
        if (!service) {
          sendError(res, 'الخدمة المطلوبة غير موجودة', 404, 'SERVICE_NOT_FOUND');
          return;
        }
        if (service.category !== bookingCategory) {
          sendError(res, 'تصنيف الخدمة لا يتطابق مع قسم الحجز المحدد', 400, 'SERVICE_CATEGORY_MISMATCH');
          return;
        }
      }

      pricing = await calculateBookingPrice({
        serviceId: sId,
        packageId: rawServices[0].packageId,
        addonIds: rawServices[0].addonIds,
        promoCode,
        customerPhone: cleanPhone,
      });
    }

    sendSuccess(res, pricing, 'تم احتساب تفاصيل السعر بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 400, 'PRICING_VALIDATION_ERROR');
  }
}

export async function createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      serviceId,
      services,
      packageId,
      addonIds,
      category: bookingCategory,
      date,
      time,
      address,
      notes,
      promoCode,
      guestName,
      guestPhone,
    } = req.body;

    const rawServices = Array.isArray(services) && services.length > 0
      ? services
      : (serviceId ? [{ serviceId, packageId, addonIds }] : []);

    // Strict Required Validation: Category & Service are mandatory
    if (rawServices.length === 0) {
      sendError(res, 'يرجى اختيار خدمة للمتابعة وإتمام الحجز', 400, 'MISSING_SERVICE');
      return;
    }

    if (!bookingCategory) {
      sendError(res, 'يرجى تحديد قسم الخدمة (سيارات أو منازل)', 400, 'MISSING_CATEGORY');
      return;
    }

    if (typeof bookingCategory !== 'string' || !bookingCategory.trim()) {
      sendError(res, 'قسم الخدمة المحدد غير صالح', 400, 'INVALID_CATEGORY');
      return;
    }

    if (!date || !time || !address) {
      sendError(res, 'يرجى استكمال جميع بيانات الحجز المطلوبة (الموعد والعنوان)', 400, 'MISSING_BOOKING_FIELDS');
      return;
    }

    // 1. Fetch and validate primary service (Reject non-existent, deleted, archived, unavailable, or inactive services)
    const primaryServiceId = rawServices[0].serviceId;
    const service = await Service.findOne({ id: primaryServiceId });
    if (!service) {
      sendError(res, 'الخدمة المطلوبة غير موجودة في النظام', 404, 'SERVICE_NOT_FOUND');
      return;
    }

    if (!service.available || (service as any).isArchived || (service as any).active === false) {
      sendError(res, 'الخدمة المختارة غير متاحة للحجز حالياً أو تم إيقافها', 400, 'SERVICE_UNAVAILABLE');
      return;
    }

    // Category Verification for single service
    if (rawServices.length === 1 && service.category !== bookingCategory && bookingCategory !== 'all') {
      sendError(
        res,
        `تصنيف الخدمة المختارة (${service.category}) لا يتوافق مع قسم الحجز المحدد (${bookingCategory})`,
        400,
        'SERVICE_CATEGORY_MISMATCH'
      );
      return;
    }

    // 2. Resolve customer first
    let customerId: any = req.user?._id;
    const rawCustomerName = req.user?.name || guestName || req.body.customerName;
    const nameVal = validateCustomerName(rawCustomerName, true);
    if (!nameVal.isValid) {
      sendError(res, nameVal.message || 'يرجى إدخال اسم العميل', 422, nameVal.code || 'NAME_REQUIRED');
      return;
    }
    const customerName = String(rawCustomerName).trim();
    let customerPhone = req.user?.phone || guestPhone || req.body.customerPhone;

    if (!customerPhone) {
      sendError(res, 'يرجى إدخال رقم الهاتف لإتمام الحجز', 422, 'PHONE_REQUIRED');
      return;
    }

    const cleanCustomerPhone = String(customerPhone).trim();
    const phoneVal = validateEgyptianPhone(cleanCustomerPhone);
    if (!phoneVal.isValid) {
      sendError(
        res,
        phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
        400,
        phoneVal.code || CANONICAL_PHONE_ERROR_CODE
      );
      return;
    }

    customerPhone = cleanCustomerPhone;

    // If customer was guest, find or auto-link user record by phone
    if (!customerId) {
      let existingUser = await User.findOne({ phone: customerPhone });
      if (existingUser) {
        customerId = existingUser._id;
      }
    }

    // 3. Authoritative Server-Side Price & Duration Calculation (multi-service, packages, add-ons, coupons)
    let pricing: any;
    try {
      if (rawServices.length > 1 || (Array.isArray(services) && services.length > 0)) {
        pricing = await calculateMultiServiceBookingPrice(rawServices, promoCode, cleanCustomerPhone);
      } else {
        pricing = await calculateBookingPrice({
          serviceId: service.id,
          packageId,
          addonIds,
          promoCode,
          customerPhone: cleanCustomerPhone,
        });
      }
    } catch (priceErr: any) {
      sendError(res, priceErr.message, 422, 'PRICING_VALIDATION_ERROR');
      return;
    }

    // 3.5 Authoritative Address & Location Validation (with IDOR protection)
    let finalGovId = address.governorateId || address.governorate;
    let finalCityId = address.cityId || address.city;
    let finalArea = address.area;
    let finalBuilding = address.building;
    let finalFloor = address.floor;
    let finalApartment = address.apartment;
    let finalLandmark = address.landmark;
    let finalAddressNotes = address.notes || address.details;
    let finalAddressLabel = address.label || 'المنزل';

    // Anti-IDOR: If user selected an existing addressId, verify ownership
    if (address.addressId) {
      const savedAddr = await CustomerAddress.findById(address.addressId);
      if (!savedAddr) {
        sendError(res, 'العنوان المحدد غير موجود', 404, 'ADDRESS_NOT_FOUND');
        return;
      }

      const isOwner =
        (customerId && savedAddr.customerId && savedAddr.customerId.toString() === customerId.toString()) ||
        (customerPhone && savedAddr.customerPhone === customerPhone.trim());

      if (!isOwner) {
        sendError(res, 'غير مصرح لك باستخدام هذا العنوان', 403, 'FORBIDDEN_IDOR');
        return;
      }

      finalGovId = savedAddr.governorateId;
      finalCityId = savedAddr.cityId;
      finalArea = savedAddr.area;
      finalBuilding = savedAddr.building;
      finalFloor = savedAddr.floor;
      finalApartment = savedAddr.apartment;
      finalLandmark = savedAddr.landmark;
      finalAddressNotes = savedAddr.notes;
      finalAddressLabel = savedAddr.label;
    }

    if (!finalGovId || !finalCityId || !finalArea) {
      sendError(res, 'يرجى تحديد المحافظة، المدينة، وتفاصيل العنوان', 422, 'ADDRESS_INCOMPLETE');
      return;
    }

    // Validate governorate in DB (active check)
    const governorateDoc = await LocationGovernorate.findOne({
      $or: [{ id: finalGovId }, { name: finalGovId }],
      active: true,
    });

    if (!governorateDoc) {
      sendError(res, 'المحافظة المختارة غير مفعلة أو غير متوفرة لتقديم الخدمة حالياً', 422, 'LOCATION_GOVERNORATE_INVALID');
      return;
    }

    // Validate city in DB under this governorate (active check)
    const cityDoc = (governorateDoc.cities || []).find(
      (c) => (c.id === finalCityId || c.name === finalCityId) && c.active
    );

    if (!cityDoc) {
      sendError(res, 'المنطقة أو المدينة المختارة غير متوفرة ضمن المحافظة المحددة أو تم تعطيلها مؤقتاً', 422, 'LOCATION_CITY_INVALID');
      return;
    }

    // Build immutable address snapshot
    const validatedAddressSnapshot = {
      addressId: address.addressId || undefined,
      label: finalAddressLabel,
      governorateId: governorateDoc.id,
      governorateNameSnapshot: governorateDoc.name,
      cityId: cityDoc.id,
      cityNameSnapshot: cityDoc.name,
      governorate: governorateDoc.name,
      city: cityDoc.name,
      area: finalArea,
      building: finalBuilding || '',
      floor: finalFloor || '',
      apartment: finalApartment || '',
      landmark: finalLandmark || '',
      notes: finalAddressNotes || '',
      details: finalAddressNotes || '',
    };

    const isMulti = pricing.items && pricing.items.length > 1;
    const targetServiceIds = isMulti && Array.isArray(pricing.items)
      ? pricing.items.map((i: any) => i.serviceId).filter(Boolean)
      : [service.id];

    // 4. Concurrency-Safe Authoritative Category-Based Slot Assertion & Booking Creation
    const targetCategory = bookingCategory || service.category || 'general';
    const lockKey = `${date}_${targetCategory}`;
    let bookingResult: { isDuplicate: boolean; booking: any };
    try {
      bookingResult = await withBookingLock(lockKey, async () => {
        // 4.1 Authoritative Server-Side Availability Check under serialized resource lock
        const slotTiming = await assertSlotAvailability({
          dateStr: date,
          timeStr: time,
          serviceId: service.id,
          serviceIds: targetServiceIds,
          category: targetCategory,
          customDuration: pricing.totalServiceDuration,
        });

        // 4.2 Idempotency / Duplicate Booking Protection:
        const recentDuplicate = await Booking.findOne({
          customerPhone: customerPhone.trim(),
          serviceId: service.id,
          date,
          scheduledStart: slotTiming.scheduledStart,
          status: { $nin: ['cancelled'] },
          createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
        });

        if (recentDuplicate) {
          return { isDuplicate: true, booking: recentDuplicate };
        }

        // 4.3 Generate unique human-readable Order Number (collision-free)
        let nextNum = 100 + (await Booking.countDocuments()) + 1;
        let orderNumber = generateOrderNumber(nextNum);
        while ((await Booking.exists({ id: orderNumber })) || (await CouponUsage.exists({ orderId: orderNumber }))) {
          nextNum++;
          orderNumber = generateOrderNumber(nextNum);
        }

        // 4.4 Race-condition safe atomic coupon redemption if a coupon is applied
        let couponIdToRollback: any = null;
        if (pricing.couponSnapshot) {
          const redemption = await redeemCouponAtomically({
            code: pricing.couponSnapshot.couponCode,
            orderTotal: pricing.subtotal,
            customerPhone: customerPhone.trim(),
            orderId: orderNumber,
            customerName,
            customerId,
          });
          couponIdToRollback = redemption.coupon._id;
        }

        const initialTimeline: ITimelineEvent[] = [
          {
            status: 'pending',
            label: 'تم استلام طلب الحجز',
            labelEn: 'Booking Request Received',
            timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
            completed: true,
            description: 'طلبك قيد المراجعة والتأكيد من فريق العمليات',
            descriptionEn: 'Your booking is being reviewed by operations',
            changedBy: 'system',
          },
        ];

        // 4.5 Create Booking Record with immutable snapshot
        const isMulti = pricing.items && pricing.items.length > 1;
        try {
          const created = await Booking.create({
            id: orderNumber,
            customerId,
            customerName,
            customerPhone: cleanCustomerPhone,
            serviceId: service.id,
            serviceSnapshot: {
              id: service.id,
              title: isMulti ? pricing.items.map((i: any) => i.title).join(' + ') : service.title,
              titleEn: isMulti ? pricing.items.map((i: any) => i.titleEn).join(' + ') : service.titleEn,
              category: service.category,
              image: service.image,
              price: pricing.finalPrice,
              duration: pricing.totalServiceDuration,
              services: pricing.items || undefined,
            },
            packageId: pricing.packageId || null,
            packageSnapshot: pricing.packageSnapshot || null,
            addons: pricing.addons || [],
            category: service.category,
            date,
            time,
            timeSlotStart: time,
            scheduledStart: slotTiming.scheduledStart,
            scheduledEnd: slotTiming.scheduledEnd,
            serviceDurationMinutes: slotTiming.serviceDurationMinutes,
            travelTimeMinutes: slotTiming.travelTimeMinutes,
            totalOccupiedMinutes: slotTiming.totalOccupiedMinutes,
            duration: slotTiming.serviceDurationMinutes,
            address: validatedAddressSnapshot,
            basePrice: pricing.basePrice,
            totalPrice: pricing.finalPrice,
            discount: pricing.discount,
            serviceFee: pricing.serviceFee,
            finalPrice: pricing.finalPrice,
            currency: 'ج.م',
            promoCode: pricing.promoCode,
            couponSnapshot: pricing.couponSnapshot,
            status: 'pending',
            timeline: initialTimeline,
            notes,
            metadata: {
              isMultiService: isMulti,
              serviceIds: targetServiceIds,
              services: pricing.items || undefined,
            },
          });
          return { isDuplicate: false, booking: created };
        } catch (bookingCreateErr: any) {
          if (couponIdToRollback) {
            await rollbackCouponRedemption(couponIdToRollback, orderNumber);
          }
          throw bookingCreateErr;
        }
      });
    } catch (availOrLockErr: any) {
      if (
        availOrLockErr.code === 'OFFICIAL_HOLIDAY' ||
        availOrLockErr.message?.includes('عطلة') ||
        availOrLockErr.message?.includes('مغلق بالكامل')
      ) {
        sendError(
          res,
          availOrLockErr.message || 'التاريخ المحدد عطلة رسمية وغير متاح للحجز',
          400,
          'OFFICIAL_HOLIDAY'
        );
        return;
      }

      const isSlotConflict =
        availOrLockErr.code === 'SLOT_UNAVAILABLE' ||
        availOrLockErr.statusCode === 409 ||
        availOrLockErr.message?.includes('غير متاح') ||
        availOrLockErr.message?.includes('يتعارض') ||
        availOrLockErr.message?.includes('محجوز') ||
        availOrLockErr.message?.includes('خارج ساعات العمل');

      if (isSlotConflict) {
        sendError(
          res,
          'الموعد لم يعد متاحًا، يرجى اختيار موعد آخر.',
          409,
          'TIME_SLOT_UNAVAILABLE'
        );
        return;
      }
      throw availOrLockErr;
    }

    if (bookingResult.isDuplicate) {
      sendSuccess(res, bookingResult.booking, 'تم استرجاع الحجز المؤكد مسبقاً لمنع التكرار', 200);
      return;
    }

    const newBooking = bookingResult.booking;

    // Update customer stats
    if (customerId) {
      await User.findByIdAndUpdate(customerId, {
        $inc: { ordersCount: 1 },
      });
    }

    // Automatically save customer address so it is permanently remembered for all subsequent orders
    if (req.body.saveAddress !== false) {
      try {
        const existingAddr = await CustomerAddress.findOne({
          $or: [
            ...(customerId ? [{ customerId }] : []),
            { customerPhone: customerPhone.trim() },
          ],
          governorateId: governorateDoc.id,
          cityId: cityDoc.id,
          area: finalArea,
        });

        if (!existingAddr) {
          const addrCount = await CustomerAddress.countDocuments(
            customerId ? { customerId } : { customerPhone: customerPhone.trim() }
          );
          await CustomerAddress.create({
            customerId: customerId || undefined,
            customerPhone: customerPhone.trim(),
            label: finalAddressLabel,
            governorateId: governorateDoc.id,
            governorateNameSnapshot: governorateDoc.name,
            cityId: cityDoc.id,
            cityNameSnapshot: cityDoc.name,
            area: finalArea,
            building: finalBuilding || '',
            floor: finalFloor || '',
            apartment: finalApartment || '',
            landmark: finalLandmark || '',
            notes: finalAddressNotes || '',
            isDefault: addrCount === 0,
          });
        }
      } catch (saveAddrErr) {
        // Non-fatal if address auto-save fails
        console.error('Non-critical: Address auto-save encountered an error:', saveAddrErr);
      }
    }

    // Automatic Notification Dispatches
    try {
      await Notification.create({
        target: 'admin',
        title: 'طلب حجز جديد',
        titleEn: 'New Booking Created',
        message: `طلب جديد برقم #${newBooking.id} لخدمة ${newBooking.serviceSnapshot?.title || 'كلينزو'} للعميل ${newBooking.customerName} بقيمة ${newBooking.finalPrice} ج.م`,
        messageEn: `New booking #${newBooking.id} received from ${newBooking.customerName}`,
        type: 'order',
        read: false,
        link: `/admin/orders/${newBooking.id}`,
      });

      if (customerId) {
        const notifContent = getCustomerNotificationContentForStatus('pending', newBooking);
        await Notification.create({
          target: 'customer',
          userId: customerId.toString(),
          title: notifContent.title,
          titleEn: notifContent.titleEn,
          message: notifContent.message,
          messageEn: notifContent.messageEn,
          type: 'order',
          read: false,
          link: `/account/orders/${newBooking.id}`,
        });
      }
    } catch (notifErr) {
      console.warn('Non-critical: Booking notification dispatch error:', notifErr);
    }

    sendSuccess(
      res,
      newBooking,
      `تم تأكيد حجزك بنجاح برقم (${newBooking.id})، سنتواصل معك قريباً!`,
      201
    );
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    const errorCode = err.code || 'BOOKING_FAILED';
    sendError(res, err.message || 'فشل إتمام الحجز', statusCode, errorCode);
  }
}

export async function getCustomerBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'يرجى تسجيل الدخول لعرض حجوزاتك', 401);
      return;
    }

    // IDOR Protection: Strictly query only user's own bookings
    const bookings = await Booking.find({
      $or: [{ customerId: req.user._id }, { customerPhone: req.user.phone }],
    }).sort({ createdAt: -1 });

    sendSuccess(res, bookings);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getBookingById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    let booking = await Booking.findById(id);
    if (!booking) {
      booking = await Booking.findOne({ $or: [{ id }, { bookingNumber: id }] });
    }

    if (!booking) {
      sendError(res, 'الطلب غير موجود', 404);
      return;
    }

    // IDOR Protection: If requested by customer, ensure it belongs to them
    if (req.user) {
      const isOwner =
        booking.customerId?.toString() === req.user._id.toString() ||
        booking.customerPhone === req.user.phone;

      if (!isOwner) {
        sendError(res, 'غير مصرح لك بعرض بيانات هذا الحجز', 403, 'FORBIDDEN_ORDER_ACCESS');
        return;
      }
    }

    // Direct API Protection / BOLA / RBAC for Admin & Technician users (Section 9 & 25)
    const adminUser = (req as any).admin;
    if (adminUser) {
      if (adminUser.userType === 'technician' || adminUser.role === 'technician') {
        const perms = adminUser.granularPermissions || [];
        const canView =
          perms.includes('orders.view_details') ||
          perms.includes('orders.view_assigned') ||
          perms.includes('orders.view') ||
          perms.includes('orders.*') ||
          perms.includes('*');

        if (!canView) {
          sendError(res, 'تم رفض الوصول: ليس لديك صلاحية عرض تفاصيل الطلب (orders.view_details)', 403, 'FORBIDDEN_PERMISSION');
          return;
        }

        const techId = adminUser.technicianId || adminUser._id.toString();
        const techPhone = adminUser.phone;
        const isAssigned =
          booking.assignedTechnicianId === techId ||
          (booking.technician && (booking.technician.id === techId || (techPhone && booking.technician.phone === techPhone)));

        if (!isAssigned) {
          auditService.log({
            actorId: adminUser._id.toString(),
            actorName: adminUser.name || adminUser.username,
            actorRole: 'technician',
            action: 'unauthorized_order_access_attempt',
            module: 'orders',
            entityType: 'Booking',
            entityId: booking.id,
            target: booking.id,
            status: 'critical',
            details: `محاولة وصول غير مصرح بها للطلب (${booking.id}) غير المسند للفني (${adminUser.name} - ${techId})`,
            ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
            userAgent: (req.headers['user-agent'] as string) || 'Unknown Device',
          });

          sendError(res, 'غير مصرح لك بالوصول لهذا الطلب: الطلب غير مسند إليك', 403, 'FORBIDDEN_UNASSIGNED_ORDER');
          return;
        }

        // Granular field redaction based on permissions
        const bookingObj = typeof (booking as any).toObject === 'function' ? (booking as any).toObject() : { ...booking };
        if (!perms.includes('orders.view_customer')) bookingObj.customerName = 'عميل كلينزو';
        if (!perms.includes('orders.view_customer_phone')) bookingObj.customerPhone = '01*********';
        if (!perms.includes('orders.view_address')) {
          bookingObj.address = {
            label: bookingObj.address?.label || 'العنوان',
            governorate: bookingObj.address?.governorate || '',
            city: bookingObj.address?.city || '',
            area: '***',
          };
        }
        if (!perms.includes('orders.view_price')) {
          bookingObj.finalPrice = 0;
          bookingObj.basePrice = 0;
          bookingObj.totalPrice = 0;
        }
        if (!perms.includes('orders.view_notes')) delete bookingObj.notes;

        // Log successful view
        auditService.log({
          actorId: adminUser._id.toString(),
          actorName: adminUser.name || adminUser.username,
          actorRole: 'technician',
          action: 'view_assigned_order',
          module: 'orders',
          entityType: 'Booking',
          entityId: booking.id,
          target: booking.id,
          status: 'success',
          details: `استعراض تفاصيل الطلب المسند (${booking.id}) بواسطة الفني (${adminUser.name})`,
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'Unknown Device',
        });

        sendSuccess(res, bookingObj);
        return;
      }
    }

    sendSuccess(res, booking);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function trackOrderPublic(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      sendError(res, 'يرجى إدخال رقم الهاتف المسجل بالحجز للمتابعة', 400, 'PHONE_REQUIRED');
      return;
    }

    const cleanPhone = phone.trim();
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

    const booking = await Booking.findOne({ id });
    if (!booking) {
      sendError(res, 'رقم الطلب غير موجود', 404, 'ORDER_NOT_FOUND');
      return;
    }

    // Security check: phone must match to view details if tracked publicly
    if ((booking.customerPhone || '').trim() !== cleanPhone) {
      sendError(res, 'رقم الهاتف غير مطابق لبيانات الحجز', 403, 'FORBIDDEN_PHONE_MISMATCH');
      return;
    }

    // Project safe tracking data with technician and address details
    sendSuccess(res, {
      id: booking.id,
      status: booking.status,
      customerPhone: booking.customerPhone || cleanPhone,
      customerName: booking.customerName,
      serviceId: booking.serviceId || booking.serviceSnapshot?.id,
      serviceTitle: booking.serviceSnapshot?.title || '',
      serviceSnapshot: booking.serviceSnapshot,
      category: booking.category,
      date: booking.date,
      time: booking.time,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      rescheduledFrom: booking.rescheduledFrom,
      rescheduledAt: booking.rescheduledAt,
      serviceDurationMinutes: booking.serviceDurationMinutes,
      travelTimeMinutes: booking.travelTimeMinutes,
      totalOccupiedMinutes: booking.totalOccupiedMinutes,
      timeline: booking.timeline,
      finalPrice: booking.finalPrice,
      basePrice: booking.basePrice,
      address: booking.address,
      technician: booking.technician,
      packageSnapshot: booking.packageSnapshot,
      addons: booking.addons,
      createdAt: booking.createdAt,
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// -------------------------------------------------------------
// ADMIN BOOKING & ORDER ENDPOINTS
// -------------------------------------------------------------

export async function getAllBookingsAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const isTechUser = req.admin?.userType === 'technician' || req.admin?.role === 'technician';
    const perms = req.admin?.granularPermissions || [];

    if (isTechUser) {
      const canView =
        perms.includes('orders.view_assigned') ||
        perms.includes('orders.view') ||
        perms.includes('orders.*') ||
        perms.includes('*');

      if (!canView) {
        sendError(res, 'تم رفض الوصول: ليس لديك صلاحية عرض الطلبات المسندة (orders.view_assigned)', 403, 'ACCESS_DENIED_PERMISSION');
        return;
      }
    }

    const {
      status,
      category,
      date,
      dateFrom,
      dateTo,
      startDate,
      endDate,
      minPrice,
      maxPrice,
      serviceId,
      technicianId,
      search,
      bookingDateFrom,
      bookingDateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query;

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;

    // Appointment / Booking Date filter
    const bFrom = (bookingDateFrom || req.query.bookingDateFrom) as string;
    const bTo = (bookingDateTo || req.query.bookingDateTo) as string;
    if (bFrom || bTo) {
      filter.date = {};
      if (bFrom) filter.date.$gte = String(bFrom);
      if (bTo) filter.date.$lte = String(bTo);
    } else if (date) {
      filter.date = date;
    }

    if (serviceId && serviceId !== 'all') filter.serviceId = serviceId;

    if (!isTechUser && technicianId && technicianId !== 'all') {
      filter.assignedTechnicianId = technicianId;
    }

    // STRICT ASSIGNED-ORDERS ISOLATION FOR TECHNICIANS AT DATABASE QUERY LEVEL (Section 8 & 24)
    if (isTechUser) {
      const techId = req.admin?.technicianId;
      if (!techId) {
        // If technician user has no linked technicianId, strictly return zero records
        filter.assignedTechnicianId = '__NO_LINKED_TECH__';
      } else {
        filter.assignedTechnicianId = techId;
      }
    }

    // Date range filter
    const from = (dateFrom || startDate) as string;
    const to = (dateTo || endDate) as string;
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = new Date(from);
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.finalPrice = {};
      if (minPrice !== undefined && minPrice !== '') {
        filter.finalPrice.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && maxPrice !== '') {
        filter.finalPrice.$lte = Number(maxPrice);
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      const searchConditions = [
        { id: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } },
        { 'serviceSnapshot.title': { $regex: q, $options: 'i' } },
      ];

      if (isTechUser) {
        filter.$and = [
          { $or: searchConditions },
          { assignedTechnicianId: req.admin?.technicianId || '__NO_LINKED_TECH__' },
        ];
      } else {
        filter.$or = searchConditions;
      }
    }

    // Sorting
    const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortDir };

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter).sort(sort).skip(skip).limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    let finalBookings = bookings;
    if (isTechUser) {
      finalBookings = bookings.map((b: any) => {
        const item = typeof b.toObject === 'function' ? b.toObject() : { ...b };
        if (!perms.includes('orders.view_customer')) item.customerName = 'عميل كلينزو';
        if (!perms.includes('orders.view_customer_phone')) item.customerPhone = '01*********';
        if (!perms.includes('orders.view_address')) {
          item.address = {
            label: item.address?.label || 'العنوان',
            governorate: item.address?.governorate || '',
            city: item.address?.city || '',
            area: '***',
          };
        }
        if (!perms.includes('orders.view_price')) {
          item.finalPrice = 0;
          item.basePrice = 0;
          item.totalPrice = 0;
        }
        if (!perms.includes('orders.view_notes')) delete item.notes;
        return item;
      });
    }

    sendSuccess(res, {
      bookings: finalBookings,
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

export async function updateBookingStatus(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses: BookingStatus[] = ['pending', 'confirmed', 'assigned', 'on_the_way', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      sendError(res, 'حالة الحجز غير صالحة', 422);
      return;
    }

    const booking = await Booking.findOne({ id });
    if (!booking) {
      sendError(res, 'الحجز غير موجود', 404);
      return;
    }

    // Technician role restrictions: enforce assignment ownership and granular status permissions
    const isTechUser = req.admin?.userType === 'technician' || req.admin?.role === 'technician';
    const perms = req.admin?.granularPermissions || [];

    if (isTechUser) {
      const techId = req.admin?.technicianId || req.admin?._id.toString();
      const techPhone = (req.admin as any)?.phone;
      const isAssigned =
        booking.assignedTechnicianId === techId ||
        booking.assignedTechnicianId === req.admin?._id.toString() ||
        (booking.technician && (booking.technician.id === techId || (techPhone && booking.technician.phone === techPhone)));

      if (!isAssigned) {
        auditService.log({
          actorId: req.admin?._id?.toString() || 'anonymous',
          actorName: req.admin?.name || req.admin?.username || 'Technician',
          actorRole: 'technician',
          action: 'unauthorized_order_mutation_attempt',
          module: 'orders',
          entityType: 'Booking',
          entityId: booking.id,
          target: booking.id,
          status: 'critical',
          details: `محاولة تعديل حالة طلب غير مسند للفني (${booking.id})`,
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'Unknown Device',
        });
        sendError(res, 'ليس لديك صلاحية لتعديل طلب غير مسند إليك', 403, 'FORBIDDEN_NOT_YOUR_ORDER');
        return;
      }

      const hasGranular = Array.isArray(perms) && perms.length > 0;
      const roleOrLegacyCanEdit = (req.admin?.permissions as any)?.orders === 'edit' || req.admin?.role === 'owner' || (!hasGranular && req.admin?.role === 'technician');

      // Check granular status permissions (Section 11, 12, 13)
      if (status === 'confirmed') {
        const canReceive = perms.includes('orders.receive') || perms.includes('orders.edit') || perms.includes('orders.manage') || perms.includes('*') || (!hasGranular && roleOrLegacyCanEdit);
        if (!canReceive) {
          auditService.log({
            actorId: req.admin?._id?.toString() || 'anonymous',
            actorName: req.admin?.name || req.admin?.username || 'Technician',
            actorRole: 'technician',
            action: 'unauthorized_status_change_attempt',
            module: 'orders',
            entityType: 'Booking',
            entityId: booking.id,
            target: booking.id,
            status: 'warning',
            details: 'محاولة استلام طلب دون امتلاك صلاحية orders.receive',
          });
          sendError(res, 'تم رفض العملية: ليس لديك صلاحية استلام الطلب (orders.receive)', 403, 'FORBIDDEN_RECEIVE_PERMISSION');
          return;
        }
      } else if (status === 'in_progress') {
        const canStart = perms.includes('orders.start_execution') || perms.includes('orders.edit') || perms.includes('orders.manage') || perms.includes('*') || (!hasGranular && roleOrLegacyCanEdit);
        if (!canStart) {
          auditService.log({
            actorId: req.admin?._id?.toString() || 'anonymous',
            actorName: req.admin?.name || req.admin?.username || 'Technician',
            actorRole: 'technician',
            action: 'unauthorized_status_change_attempt',
            module: 'orders',
            entityType: 'Booking',
            entityId: booking.id,
            target: booking.id,
            status: 'warning',
            details: 'محاولة بدء تنفيذ طلب دون امتلاك صلاحية orders.start_execution',
          });
          sendError(res, 'تم رفض العملية: ليس لديك صلاحية بدء تنفيذ الطلب (orders.start_execution)', 403, 'FORBIDDEN_START_PERMISSION');
          return;
        }
      } else if (status === 'completed') {
        const canFinish = perms.includes('orders.mark_finished') || perms.includes('orders.complete') || perms.includes('orders.edit') || perms.includes('orders.manage') || perms.includes('*') || (!hasGranular && roleOrLegacyCanEdit);
        if (!canFinish) {
          auditService.log({
            actorId: req.admin?._id?.toString() || 'anonymous',
            actorName: req.admin?.name || req.admin?.username || 'Technician',
            actorRole: 'technician',
            action: 'unauthorized_status_change_attempt',
            module: 'orders',
            entityType: 'Booking',
            entityId: booking.id,
            target: booking.id,
            status: 'warning',
            details: 'محاولة إنهاء/إكمال طلب دون امتلاك صلاحية orders.mark_finished',
          });
          sendError(res, 'تم رفض العملية: ليس لديك صلاحية إنهاء أو إكمال الطلب (orders.mark_finished)', 403, 'FORBIDDEN_FINISH_PERMISSION');
          return;
        }
      } else if (status === 'cancelled') {
        const canCancel = perms.includes('orders.cancel') || perms.includes('orders.edit') || perms.includes('orders.manage') || perms.includes('*') || (!hasGranular && roleOrLegacyCanEdit);
        if (!canCancel) {
          auditService.log({
            actorId: req.admin?._id?.toString() || 'anonymous',
            actorName: req.admin?.name || req.admin?.username || 'Technician',
            actorRole: 'technician',
            action: 'unauthorized_status_change_attempt',
            module: 'orders',
            entityType: 'Booking',
            entityId: booking.id,
            target: booking.id,
            status: 'warning',
            details: 'محاولة إلغاء طلب دون امتلاك صلاحية orders.cancel',
          });
          sendError(res, 'تم رفض العملية: ليس لديك صلاحية إلغاء الطلب (orders.cancel)', 403, 'FORBIDDEN_CANCEL_PERMISSION');
          return;
        }
      }

      if (note && note.trim()) {
        const canAddNote = perms.includes('orders.add_note') || perms.includes('orders.edit_note') || perms.includes('orders.edit') || perms.includes('*') || (!hasGranular && roleOrLegacyCanEdit);
        if (!canAddNote) {
          sendError(res, 'تم رفض العملية: ليس لديك صلاحية إضافة ملاحظات على الطلب (orders.add_note)', 403, 'FORBIDDEN_NOTE_PERMISSION');
          return;
        }
      }
    }

    const prevStatus = booking.status;

    // Terminal states cannot be altered
    if (prevStatus === 'completed') {
      sendError(res, 'الطلب مكتمل بالفعل ولا يمكن تعديل حالته', 422);
      return;
    }
    if (prevStatus === 'cancelled') {
      sendError(res, 'الطلب ملغي ولا يمكن تعديل حالته', 422);
      return;
    }

    // Strict workflow transition engine
    if (status !== prevStatus) {
      if (status === 'cancelled') {
        // Business cancellation permitted from active non-terminal statuses
      } else if (prevStatus === 'pending') {
        if (status !== 'confirmed') {
          if (status === 'completed') {
            sendError(res, 'لا يمكن إكمال الطلب مباشرة من حالة الانتظار. يجب استلام الطلب وتعيين الفني وبدء التنفيذ أولاً', 422);
          } else if (status === 'in_progress') {
            sendError(res, 'لا يمكن بدء تنفيذ الطلب مباشرة. يجب استلام الطلب وتعيين الفني أولاً', 422);
          } else if (status === 'assigned') {
            sendError(res, 'يجب استلام الطلب أولاً قبل تعيين الفني', 422);
          } else {
            sendError(res, 'انتقال غير صالح لحالة الطلب', 422);
          }
          return;
        }
      } else if (prevStatus === 'confirmed') {
        const hasAssignedTech = Boolean(booking.assignedTechnicianId || booking.technician?.id);
        if (status === 'in_progress' && hasAssignedTech) {
          // Permitted: technician is already assigned to this order, so starting execution is valid
        } else if (status !== 'assigned') {
          if (status === 'completed') {
            sendError(res, 'لا يمكن إكمال الطلب في مرحلة الاستلام. يجب تعيين الفني وبدء التنفيذ أولاً', 422);
          } else if (status === 'in_progress') {
            sendError(res, 'يجب تعيين فني للطلب أولاً قبل بدء التنفيذ', 422);
          } else {
            sendError(res, 'انتقال غير صالح لحالة الطلب', 422);
          }
          return;
        }
        if (!hasAssignedTech) {
          sendError(res, 'يرجى اختيار وتعيين الفني المختص لإسناد الطلب إليه', 422);
          return;
        }
      } else if (prevStatus === 'assigned') {
        if (status !== 'on_the_way' && status !== 'in_progress') {
          if (status === 'completed') {
            sendError(res, 'لا يمكن إكمال الطلب مباشرة من مرحلة التعيين. يجب تحرك الفني أو بدء التنفيذ أولاً', 422);
          } else {
            sendError(res, 'انتقال غير صالح لحالة الطلب', 422);
          }
          return;
        }
        if (!booking.assignedTechnicianId && !booking.technician?.id) {
          sendError(res, 'لا يمكن تحرك الفني أو بدء التنفيذ دون وجود فني معين للطلب', 422);
          return;
        }
      } else if (prevStatus === 'on_the_way') {
        if (status !== 'in_progress') {
          if (status === 'completed') {
            sendError(res, 'لا يمكن إكمال الطلب مباشرة من مرحلة الطريق. يجب بدء التنفيذ (قيد التنفيذ) أولاً', 422);
          } else {
            sendError(res, 'انتقال غير صالح لحالة الطلب', 422);
          }
          return;
        }
        if (!booking.assignedTechnicianId && !booking.technician?.id) {
          sendError(res, 'لا يمكن بدء التنفيذ دون وجود فني معين للطلب', 422);
          return;
        }
      } else if (prevStatus === 'in_progress') {
        if (status !== 'completed') {
          sendError(res, 'انتقال غير صالح لحالة الطلب', 422);
          return;
        }
        // Section 8: Mandatory technician requirement before completion
        if (!booking.assignedTechnicianId && !booking.technician?.id) {
          sendError(res, 'لا يمكن إكمال الطلب دون تعيين فني مسؤول عن التنفيذ', 422);
          return;
        }
      }
    }

    (req as any).auditBefore = { status: prevStatus, assignedTechnicianId: booking.assignedTechnicianId };
    (req as any).auditAfter = { status, assignedTechnicianId: booking.assignedTechnicianId };

    let actionAudit = 'update_order_status';
    if (status === 'confirmed') actionAudit = 'order_received';
    else if (status === 'in_progress') actionAudit = 'order_started';
    else if (status === 'completed') actionAudit = 'order_completed';
    else if (status === 'cancelled') actionAudit = 'order_cancelled';
    (req as any).auditAction = actionAudit;

    booking.status = status;

    const statusLabelsAr: Record<BookingStatus, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'تم استلام الطلب',
      assigned: 'تم تعيين الفني المختص',
      on_the_way: 'الفني في الطريق إلى الموقع',
      in_progress: 'بدء تنفيذ الخدمة',
      completed: 'تم الانتهاء واكتمال الطلب بنجاح',
      cancelled: 'تم إلغاء الطلب',
    };

    const statusLabelsEn: Record<BookingStatus, string> = {
      pending: 'Pending',
      confirmed: 'Order Received',
      assigned: 'Technician Assigned',
      on_the_way: 'Technician on the way',
      in_progress: 'In Progress',
      completed: 'Completed Successfully',
      cancelled: 'Cancelled',
    };

    const statusKey = status as BookingStatus;

    const timelineDescAr: Record<BookingStatus, string> = {
      pending: 'تم استلام طلب الحجز وبانتظار المراجعة والتأكيد.',
      confirmed: 'تم تأكيد موعد الحجز وتثبيت الموعد في جدول الزيارات.',
      assigned: 'تم إسناد الطلب للفني المختص وتجهيز المعدات اللازمة.',
      on_the_way: 'انطلقت وحدة الخدمة المتنقلة وهي متجهة إلى الموقع الآن.',
      in_progress: 'بدأ فريق العمل تنفيذ أعمال النظافة والتعقيم بالموقع.',
      completed: 'تم تسليم العمل بالكامل بأعلى معايير الجودة والنظافة.',
      cancelled: 'تم إلغاء طلب الحجز.',
    };

    const timelineDescEn: Record<BookingStatus, string> = {
      pending: 'Booking received and pending review.',
      confirmed: 'Booking confirmed and scheduled.',
      assigned: 'Specialist technician assigned and preparing.',
      on_the_way: 'Mobile service unit en route to your location.',
      in_progress: 'Service execution in progress at location.',
      completed: 'Service completed to the highest standards.',
      cancelled: 'Booking cancelled.',
    };

    booking.timeline.push({
      status: statusKey,
      label: statusLabelsAr[statusKey],
      labelEn: statusLabelsEn[statusKey],
      timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      completed: true,
      description: note || timelineDescAr[statusKey] || `تم تحديث حالة الطلب إلى (${statusLabelsAr[statusKey]})`,
      descriptionEn: note || timelineDescEn[statusKey] || `Order status updated to ${statusLabelsEn[statusKey]}`,
      changedBy: req.admin?.name || req.admin?.username || 'admin',
    });

    // If completed, record completion metadata and update customer totalSpent
    if (statusKey === 'completed') {
      booking.completedAt = new Date();
      booking.completedBy = {
        id: req.admin?._id?.toString() || (req.admin as any)?.id || 'admin',
        name: req.admin?.name || req.admin?.username || 'المسؤول',
        role: req.admin?.role || 'admin',
      };
      (req as any).auditAction = 'complete_order';

      if (booking.customerId) {
        await User.findByIdAndUpdate(booking.customerId, {
          $inc: { totalSpent: booking.finalPrice },
        });
      }

      if (booking.assignedTechnicianId) {
        await Technician.findOneAndUpdate(
          {
            $or: [
              { id: booking.assignedTechnicianId },
              { _id: booking.assignedTechnicianId.match(/^[0-9a-fA-F]{24}$/) ? booking.assignedTechnicianId : null },
            ].filter(Boolean) as any,
          },
          {
            $inc: { completedOrders: 1 },
          }
        );
      }
    } else if (statusKey === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancellationSource = 'admin';
      booking.cancellationReason = note || 'إلغاء بواسطة الإدارة';
    }

    await booking.save();

    // If cancelled, trigger dynamic schedule compression for subsequent active slots of the day
    if (statusKey === 'cancelled') {
      const nowCairo = getCurrentCairoTimeString();
      const operator = req.admin?.name || req.admin?.username || 'admin';
      await compressScheduleAfterCancellation(booking, nowCairo, operator);
    }

    // Automatic Notification Dispatches for Order Status Change
    try {
      await Notification.create({
        target: 'admin',
        title: `تحديث حالة الطلب #${booking.id}`,
        titleEn: `Order Status #${booking.id}`,
        message: `تم تغيير حالة طلب العميل ${booking.customerName} إلى (${statusLabelsAr[statusKey]})`,
        messageEn: `Order #${booking.id} status changed to ${statusLabelsEn[statusKey]}`,
        type: 'order',
        read: false,
        link: `/admin/orders/${booking.id}`,
      });

      if (booking.customerId) {
        const notifContent = getCustomerNotificationContentForStatus(statusKey, booking, note);
        await Notification.create({
          target: 'customer',
          userId: booking.customerId.toString(),
          title: notifContent.title,
          titleEn: notifContent.titleEn,
          message: notifContent.message,
          messageEn: notifContent.messageEn,
          type: 'order',
          read: false,
          link: `/account/orders/${booking.id}`,
        });
      }
    } catch (notifErr) {
      console.warn('Non-critical: Order status notification dispatch error:', notifErr);
    }

    sendSuccess(res, booking, `تم تحديث حالة الحجز إلى (${statusLabelsAr[statusKey]}) بنجاح`);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function assignTechnicianToBooking(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { technicianId } = req.body;

    const isTechUser = req.admin?.userType === 'technician' || req.admin?.role === 'technician';
    if (isTechUser) {
      const perms = req.admin?.granularPermissions || [];
      const canAssign = perms.includes('orders.assign_technician') || perms.includes('orders.change_technician') || perms.includes('orders.edit') || perms.includes('orders.manage') || perms.includes('*');
      if (!canAssign) {
        auditService.log({
          actorId: req.admin?._id?.toString() || 'anonymous',
          actorName: req.admin?.name || req.admin?.username || 'Technician',
          actorRole: 'technician',
          action: 'unauthorized_action_attempt',
          module: 'orders',
          entityType: 'Booking',
          entityId: String(id),
          target: String(id),
          status: 'warning',
          details: 'محاولة غير مصرح بها لتعيين أو تغيير الفني',
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'Unknown Device',
        });
        sendError(res, 'تم رفض العملية: ليس لديك صلاحية تعيين أو تغيير الفني للطلب (orders.assign_technician)', 403, 'FORBIDDEN_ASSIGN_PERMISSION');
        return;
      }
    }

    const booking = await Booking.findOne({ id });
    if (!booking) {
      sendError(res, 'الحجز غير موجود', 404);
      return;
    }

    if (booking.status === 'completed') {
      sendError(res, 'لا يمكن تعيين فني لطلب مكتمل بالفعل', 422);
      return;
    }
    if (booking.status === 'cancelled') {
      sendError(res, 'لا يمكن تعيين فني لطلب ملغي', 422);
      return;
    }
    if (booking.status === 'pending') {
      sendError(res, 'يجب استلام الطلب أولاً قبل تعيين الفني', 422);
      return;
    }

    if (!technicianId) {
      booking.assignedTechnicianId = null;
      booking.technician = null;
      await booking.save();
      sendSuccess(res, booking, 'تم إلغاء تعيين الفني بنجاح');
      return;
    }

    const tech = await Technician.findOne({ id: technicianId });
    if (!tech) {
      sendError(res, 'الفني غير موجود', 404);
      return;
    }

    // Concurrency Lock per (technicianId, booking.date) to prevent race conditions
    const lockKey = `tech_assign_${tech.id}_${booking.date}`;
    await withBookingLock(lockKey, async () => {
      // Re-fetch latest booking state inside lock
      const freshBooking = await Booking.findOne({ id });
      if (!freshBooking) {
        sendError(res, 'الحجز غير موجود', 404);
        return;
      }
      if (freshBooking.status === 'completed' || freshBooking.status === 'cancelled') {
        sendError(res, 'لا يمكن تعيين فني لطلب مكتمل أو ملغي', 422);
        return;
      }

      // Authoritative Schedule overlap prevention check:
      const currentInterval = getBookingTimeInterval(freshBooking);
      const cleanDate = String(freshBooking.date || '').split('T')[0].trim();

      // 1. Check other active regular bookings assigned to this technician on the same date (any category) - Authoritative MongoDB
      const conflictingBookings = await Booking.find({
        id: { $ne: freshBooking.id },
        date: cleanDate,
        status: { $nin: ['cancelled', 'CANCELLED'] },
        $or: [
          { assignedTechnicianId: tech.id },
          { 'technician.id': tech.id },
        ],
      });

      for (const conflict of conflictingBookings) {
        const conflictInterval = getBookingTimeInterval(conflict);
        if (isTimeIntervalOverlapping(currentInterval, conflictInterval)) {
          const conflictTime = conflict.time || `${conflict.scheduledStart} – ${conflict.scheduledEnd}`;
          sendError(
            res,
            `تعذر إسناد الطلب: الفني (${tech.name}) مرتبط بالفعل بالطلب #${conflict.id} في نفس التوقيت (${conflictTime}). لا يمكن إسناد طلبين لنفس الفني في وقت متداخل.`,
            409,
            'TECHNICIAN_SCHEDULE_OVERLAP'
          );
          return;
        }
      }

      // 2. Check other active subscription visits assigned to this technician on the same date
      try {
        const { SubscriptionVisit } = await import('../models/SubscriptionVisit.js');
        const conflictingVisits = await SubscriptionVisit.find({
          date: cleanDate,
          status: { $nin: ['cancelled', 'CANCELLED'] },
          $or: [
            { assignedTechnicianId: tech.id },
            { 'technician.id': tech.id },
          ],
        });

        for (const visit of conflictingVisits) {
          const visitInterval = getBookingTimeInterval(visit);
          if (isTimeIntervalOverlapping(currentInterval, visitInterval)) {
            const visitTime = visit.time || `${visit.scheduledStart} – ${visit.scheduledEnd}`;
            sendError(
              res,
              `تعذر إسناد الطلب: الفني (${tech.name}) مرتبط بالفعل بزيارة اشتراك #${visit.id} في نفس التوقيت (${visitTime}). لا يمكن إسناد مهمتين لنفس الفني في وقت متداخل.`,
              409,
              'TECHNICIAN_SCHEDULE_OVERLAP'
            );
            return;
          }
        }
      } catch (visitErr) {
        // Fallback or ignore if SubscriptionVisit model is unavailable
      }

      const prevStatus = freshBooking.status;
      const prevTechId = freshBooking.assignedTechnicianId;
      (req as any).auditBefore = { status: prevStatus, assignedTechnicianId: prevTechId };

      freshBooking.assignedTechnicianId = tech.id;
      freshBooking.technician = {
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
        avatar: tech.avatar,
        rating: tech.rating,
        specialty: tech.specialty,
      };

      // Transition from confirmed to assigned; if already in_progress, remain in_progress
      if (freshBooking.status === 'confirmed') {
        freshBooking.status = 'assigned';
      }

      (req as any).auditAfter = { status: freshBooking.status, assignedTechnicianId: tech.id, technicianName: tech.name };
      (req as any).auditAction = 'assign_technician';

      freshBooking.timeline.push({
        status: 'assigned',
        label: `تم تعيين الفني: ${tech.name}`,
        labelEn: `Technician assigned: ${tech.name}`,
        timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
        completed: true,
        description: `تم إسناد تنفيذ الطلب إلى الفني المختص (${tech.name})`,
        descriptionEn: `Order assigned to technician (${tech.name})`,
        changedBy: req.admin?.name || 'admin',
      });

      await freshBooking.save();

      // Explicitly persist assignedTechnicianId and technician in PostgreSQL
      try {
        await prisma.booking.update({
          where: { id: freshBooking.id },
          data: {
            assignedTechnicianId: tech.id,
            technician: freshBooking.technician,
            status: freshBooking.status,
          },
        });
      } catch (dbErr) {
        console.warn('Prisma explicit booking technician sync note:', dbErr);
      }

      // Increment technician assigned counter
      tech.assignedOrders = (tech.assignedOrders || 0) + 1;
      await tech.save();

      // Automatic Notification Dispatches for Technician Assignment
      try {
        await Notification.create({
          target: 'admin',
          title: 'إسناد فني لميدان العمل',
          titleEn: 'Technician Assigned',
          message: `تم إسناد الطلب #${freshBooking.id} إلى الفني الكابتن ${tech.name} (${tech.specialty || 'فني ميداني'}).`,
          messageEn: `Order #${freshBooking.id} assigned to technician ${tech.name}.`,
          type: 'technician',
          read: false,
          link: `/admin/orders/${freshBooking.id}`,
        });

        if (freshBooking.customerId) {
          const notifContent = getCustomerNotificationContentForStatus('assigned', {
            id: freshBooking.id,
            customerName: freshBooking.customerName,
            serviceSnapshot: freshBooking.serviceSnapshot,
            date: freshBooking.date,
            time: freshBooking.time,
            assignedTechnicianName: tech.name,
            technician: { name: tech.name },
            address: freshBooking.address,
          });
          await Notification.create({
            target: 'customer',
            userId: freshBooking.customerId.toString(),
            title: notifContent.title,
            titleEn: notifContent.titleEn,
            message: notifContent.message,
            messageEn: notifContent.messageEn,
            type: 'order',
            read: false,
            link: `/account/orders/${freshBooking.id}`,
          });
        }
      } catch (notifErr) {
        console.warn('Non-critical: Technician assign notification dispatch error:', notifErr);
      }

      sendSuccess(res, freshBooking, `تم تعيين الفني (${tech.name}) للحجز بنجاح`);
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function deleteBookingAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const isTechUser = req.admin?.userType === 'technician' || req.admin?.role === 'technician';
    if (isTechUser) {
      const perms = req.admin?.granularPermissions || [];
      const canDelete = perms.includes('orders.delete') || perms.includes('orders.manage') || perms.includes('*');
      if (!canDelete) {
        auditService.log({
          actorId: req.admin?._id?.toString() || 'anonymous',
          actorName: req.admin?.name || req.admin?.username || 'Technician',
          actorRole: 'technician',
          action: 'unauthorized_action_attempt',
          module: 'orders',
          entityType: 'Booking',
          entityId: String(id),
          target: String(id),
          status: 'critical',
          details: 'محاولة غير مصرح بها لحذف طلب من قِبل فني دون امتلاك orders.delete',
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'Unknown Device',
        });
        sendError(res, 'تم رفض العملية: ليس لديك صلاحية حذف الطلب (orders.delete)', 403, 'FORBIDDEN_DELETE_PERMISSION');
        return;
      }
    }

    const booking = await Booking.findOne({ $or: [{ id }, { _id: id }] });

    if (!booking) {
      sendError(res, 'الطلب غير موجود', 404);
      return;
    }

    const orderId = booking.id;
    await Booking.deleteOne({ _id: booking._id });

    // Decrement customer orders count if applicable
    if (booking.customerId) {
      await User.findByIdAndUpdate(booking.customerId, {
        $inc: { ordersCount: -1 },
      });
    }

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'owner',
      action: 'delete_order',
      module: 'orders',
      target: orderId,
      details: `تم حذف الطلب رقم (${orderId}) نهائياً من سجلات النظام`,
      status: 'critical',
    });

    sendSuccess(res, { id: orderId, deleted: true }, 'تم حذف الطلب بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function cancelBookingCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason, customerPhone } = req.body || {};

    let booking = await Booking.findById(id);
    if (!booking) {
      booking = await Booking.findOne({ $or: [{ id }, { bookingNumber: id }] });
    }

    if (!booking) {
      sendError(res, 'الطلب غير موجود', 404, 'BOOKING_NOT_FOUND');
      return;
    }

    // IDOR Protection: Must be authenticated owner or provide verified matching phone
    if (req.user) {
      const isOwner =
        booking.customerId?.toString() === req.user._id.toString() ||
        booking.customerPhone === req.user.phone;
      if (!isOwner) {
        sendError(res, 'غير مصرح لك بإلغاء هذا الحجز', 403, 'FORBIDDEN_CANCEL');
        return;
      }
    } else {
      if (!customerPhone || String(customerPhone).trim() !== booking.customerPhone) {
        sendError(res, 'يرجى تأكيد رقم الهاتف المرتبط بالحجز للمتابعة', 403, 'FORBIDDEN_CANCEL_PHONE_MISMATCH');
        return;
      }
    }

    // Safety checks according to Cleanzo business workflow:
    // 1. Completed bookings cannot be cancelled
    if (booking.status === 'completed') {
      sendError(res, 'لا يمكن إلغاء حجز مكتمل بالفعل', 400, 'CANNOT_CANCEL_COMPLETED');
      return;
    }
    // 2. Already cancelled bookings
    if (booking.status === 'cancelled') {
      sendError(res, 'الحجز ملغي بالفعل', 400, 'ALREADY_CANCELLED');
      return;
    }
    // 3. In-progress bookings cannot release or be cancelled blindly while technician is working
    if (booking.status === 'in_progress') {
      sendError(res, 'لا يمكن إلغاء الحجز بعد بدء تقديم الخدمة فعلياً', 400, 'CANNOT_CANCEL_IN_PROGRESS');
      return;
    }

    // 4. Enforce 6-hour cancellation rule for customer bookings
    const subSettings = await getSubscriptionSettings();
    const noticeHours = subSettings.normalBookingCancellationNoticeHours ?? 6;
    const { isAllowed } = isNoticeSufficient(
      booking.date,
      booking.scheduledStart || booking.timeSlotStart || booking.time,
      noticeHours
    );

    if (!isAllowed) {
      sendError(
        res,
        'لا يمكن إلغاء أو تغيير الحجز قبل الموعد بأقل من 6 ساعات. يُرجى التواصل مع الدعم للمساعدة.',
        400,
        'CANCELLATION_RESTRICTED_6H'
      );
      return;
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationSource = 'customer';
    booking.cancellationReason = reason || 'إلغاء من قبل العميل';

    booking.timeline.push({
      status: 'cancelled',
      label: 'تم إلغاء الطلب من قبل العميل',
      labelEn: 'Cancelled by Customer',
      timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      completed: true,
      description: reason || 'تم إلغاء الطلب بناءً على رغبة العميل',
      descriptionEn: 'Order cancelled upon customer request',
      changedBy: req.user?.name || booking.customerName || 'customer',
    });

    await booking.save();

    // Trigger dynamic schedule recalculation / compression
    const nowCairo = getCurrentCairoTimeString();
    await compressScheduleAfterCancellation(booking, nowCairo, req.user?.name || booking.customerName || 'Customer');

    // Automatic Notification Dispatches
    try {
      await Notification.create({
        target: 'admin',
        title: `إلغاء حجز #${booking.id}`,
        titleEn: `Booking Cancelled #${booking.id}`,
        message: `قام العميل ${booking.customerName} بإلغاء الطلب #${booking.id}. السبب: ${booking.cancellationReason}`,
        messageEn: `Customer ${booking.customerName} cancelled order #${booking.id}`,
        type: 'order',
        read: false,
        link: `/admin/orders/${booking.id}`,
      });

      if (booking.customerId) {
        await Notification.create({
          target: 'customer',
          userId: booking.customerId.toString(),
          title: `❌ تم تأكيد إلغاء حجز الطلب #${booking.id}`,
          titleEn: `❌ Booking #${booking.id} Cancelled`,
          message: `تم إلغاء طلبك #${booking.id} بنجاح بناءً على طلبك. نأمل أن نراك مجدداً قريباً ويمكنك حجز موعد جديد في أي وقت بخطوات بسيطة.`,
          messageEn: `Your booking #${booking.id} has been cancelled upon your request. We look forward to serving you again anytime!`,
          type: 'order',
          read: false,
          link: `/account/orders/${booking.id}`,
        });
      }
    } catch (notifErr) {
      console.warn('Non-critical: Cancellation notification error:', notifErr);
    }

    sendSuccess(res, booking, 'تم إلغاء الحجز بنجاح وإتاحة الموعد');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function rescheduleBookingCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { newDate, newTime, reason, customerPhone } = req.body || {};

    if (!newDate || !newTime) {
      sendError(res, 'التاريخ الجديد والوقت مطلوبان لإعادة الجدولة', 400, 'MISSING_NEW_TIME');
      return;
    }

    let booking: any = null;
    if (mongoose.isValidObjectId(id)) {
      booking = await Booking.findById(id);
    }
    if (!booking) {
      booking = await Booking.findOne({ $or: [{ id }, { bookingNumber: id }] });
    }

    if (!booking) {
      sendError(res, 'الطلب غير موجود', 404, 'BOOKING_NOT_FOUND');
      return;
    }

    const isAdmin = Boolean((req as any).admin);
    const normPhone = (p?: string) => String(p || '').replace(/\D/g, '').replace(/^20/, '').replace(/^0/, '');

    // IDOR Protection: Admins bypass; customers must be authenticated owner or verified phone
    if (!isAdmin) {
      if (req.user) {
        const isOwner =
          booking.customerId?.toString() === req.user._id?.toString() ||
          normPhone(booking.customerPhone) === normPhone(req.user.phone);
        if (!isOwner) {
          sendError(res, 'غير مصرح لك بإعادة جدولة هذا الحجز', 403, 'FORBIDDEN_RESCHEDULE');
          return;
        }
      } else {
        if (!customerPhone || normPhone(customerPhone) !== normPhone(booking.customerPhone)) {
          sendError(res, 'يرجى تأكيد رقم الهاتف المرتبط بالحجز للمتابعة', 403, 'FORBIDDEN_RESCHEDULE_PHONE_MISMATCH');
          return;
        }
      }
    }

    if (booking.status === 'completed') {
      sendError(res, 'لا يمكن إعادة جدولة حجز مكتمل بالفعل', 400, 'CANNOT_RESCHEDULE_COMPLETED');
      return;
    }
    if (booking.status === 'cancelled') {
      sendError(res, 'لا يمكن إعادة جدولة حجز ملغي', 400, 'CANNOT_RESCHEDULE_CANCELLED');
      return;
    }
    if (booking.status === 'in_progress') {
      sendError(res, 'لا يمكن تغيير الموعد بعد بدء تقديم الخدمة فعلياً', 400, 'CANNOT_RESCHEDULE_IN_PROGRESS');
      return;
    }

    // 6-hour policy check (Admins can override)
    if (!isAdmin) {
      const subSettings = await getSubscriptionSettings();
      const noticeHours = subSettings.normalBookingRescheduleNoticeHours ?? 6;
      const { isAllowed } = isNoticeSufficient(
        booking.date,
        booking.scheduledStart || booking.timeSlotStart || booking.time,
        noticeHours
      );

      if (!isAllowed) {
        sendError(
          res,
          'لا يمكن إلغاء أو تغيير الحجز قبل الموعد بأقل من 6 ساعات. يُرجى التواصل مع الدعم للمساعدة.',
          400,
          'RESCHEDULE_RESTRICTED_6H'
        );
        return;
      }
    }

    const targetServiceIds: string[] = Array.from(
      new Set([
        booking.serviceId,
        ...((booking.metadata as any)?.serviceIds || []),
        ...((booking.serviceSnapshot as any)?.services?.map((s: any) => s.id) || []),
      ])
    ).filter(Boolean);

    const targetCategory = booking.category || 'general';
    const lockKey = `booking_reschedule_${booking.id}_${targetCategory}`;

    await withBookingLock(lockKey, async () => {
      // 1. Validate new appointment slot BEFORE releasing old reservation (category-based aware)
      const slotTiming = await assertSlotAvailability({
        dateStr: newDate,
        timeStr: newTime,
        serviceId: booking.serviceId,
        serviceIds: targetServiceIds.length > 0 ? targetServiceIds : [booking.serviceId],
        category: targetCategory,
        customDuration: booking.totalOccupiedMinutes || booking.duration,
        excludeBookingId: booking.id,
      });

      const previousTime = `${booking.date} (${booking.time})`;
      const newTimeLabel = `${slotTiming.scheduledStart} – ${slotTiming.scheduledEnd}`;

      booking.date = newDate;
      booking.time = newTimeLabel;
      booking.timeSlotStart = slotTiming.scheduledStart;
      booking.scheduledStart = slotTiming.scheduledStart;
      booking.scheduledEnd = slotTiming.scheduledEnd;
      booking.rescheduledFrom = previousTime;
      booking.rescheduledAt = new Date();
      booking.metadata = {
        ...(booking.metadata || {}),
        rescheduledAt: new Date(),
      };

      // If a technician was assigned, check if they have a schedule conflict at the new date/time
      if (booking.assignedTechnicianId) {
        const currentInterval = getBookingTimeInterval({
          scheduledStart: slotTiming.scheduledStart,
          scheduledEnd: slotTiming.scheduledEnd,
          totalOccupiedMinutes: booking.totalOccupiedMinutes || booking.duration,
        });

        const techConflict = await Booking.findOne({
          id: { $ne: booking.id },
          date: newDate,
          status: { $nin: ['cancelled', 'CANCELLED'] },
          $or: [
            { assignedTechnicianId: booking.assignedTechnicianId },
            { 'technician.id': booking.assignedTechnicianId },
          ],
        });

        if (techConflict) {
          const conflictInterval = getBookingTimeInterval(techConflict);
          if (isTimeIntervalOverlapping(currentInterval, conflictInterval)) {
            // Unassign technician so operations can assign an available technician
            booking.assignedTechnicianId = null;
            booking.technician = null;
            if (booking.status === 'assigned') {
              booking.status = 'confirmed';
            }
          }
        }
      }

      const actorName = (req as any).admin?.name || req.user?.name || booking.customerName || (isAdmin ? 'Admin' : 'Customer');
      booking.timeline.push({
        status: booking.status,
        label: isAdmin ? 'تم تعديل الموعد بواسطة الإدارة' : 'تم تعديل الموعد بواسطة العميل',
        labelEn: isAdmin ? 'Rescheduled by Operations' : 'Rescheduled by Customer',
        timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
        completed: true,
        description: reason || `تم تعديل الموعد من (${previousTime}) إلى (${newDate} ${newTimeLabel})`,
        descriptionEn: `Rescheduled from (${previousTime}) to (${newDate} ${newTimeLabel})`,
        changedBy: actorName,
      });

      await booking.save();

      // Authoritative direct persist in PostgreSQL via Prisma
      try {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            date: newDate,
            time: newTimeLabel,
            timeSlotStart: slotTiming.scheduledStart,
            scheduledStart: slotTiming.scheduledStart,
            scheduledEnd: slotTiming.scheduledEnd,
            rescheduledFrom: previousTime,
            assignedTechnicianId: booking.assignedTechnicianId,
            technician: booking.technician,
            status: booking.status,
            timeline: booking.timeline,
            metadata: booking.metadata,
          },
        });
      } catch (prismaUpdateErr) {
        console.warn('Non-critical Prisma direct update note:', prismaUpdateErr);
      }

      try {
        await Notification.create({
          target: 'admin',
          title: `تعديل موعد حجز #${booking.id}`,
          titleEn: `Booking Rescheduled #${booking.id}`,
          message: `تم تغيير موعد الطلب #${booking.id} إلى يوم ${newDate} (${newTimeLabel}) بواسطة (${actorName})`,
          messageEn: `Order #${booking.id} was rescheduled to ${newDate} (${newTimeLabel}) by ${actorName}`,
          type: 'order',
          read: false,
          link: `/admin/orders/${booking.id}`,
        });

        if (booking.customerId) {
          await Notification.create({
            target: 'customer',
            userId: booking.customerId.toString(),
            title: `🗓️ تم تحديث موعد حجزك #${booking.id}`,
            titleEn: `🗓️ Booking #${booking.id} Rescheduled`,
            message: `تم تعديل موعد حجزك للطلب #${booking.id} إلى يوم ${newDate} في تمام ${newTimeLabel}. نتطلع لخدمتك بأفضل جودة!`,
            messageEn: `Your booking #${booking.id} has been rescheduled to ${newDate} at ${newTimeLabel}. Looking forward to serving you!`,
            type: 'order',
            read: false,
            link: `/account/orders/${booking.id}`,
          });
        }
      } catch (e) {}

      sendSuccess(res, booking, 'تم إعادة جدولة الحجز بنجاح وتحديث بيانات الطلب');
    });
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || 500, err.code);
  }
}


