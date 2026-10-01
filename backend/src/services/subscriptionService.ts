import prisma from '../config/prisma.js';
import { SubscriptionPlan, ISubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Subscription, ISubscription } from '../models/Subscription.js';
import { SubscriptionVisit, ISubscriptionVisit } from '../models/SubscriptionVisit.js';
import { SubscriptionRenewal } from '../models/SubscriptionRenewal.js';
import { SubscriptionCashback } from '../models/SubscriptionCashback.js';
import { Service } from '../models/Service.js';
import { User } from '../models/User.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import {
  assertSlotAvailability,
  timeStringToMinutes,
  minutesToDisplayTime,
  getCurrentCairoDateString,
  getCurrentCairoTimeString,
  withBookingLock,
} from './availabilityService.js';
import { generateSubscriptionNumber, generateVisitNumber } from '../utils/orderNumber.js';

export interface SubscriptionSettingsConfig {
  subscriptionCancellationNoticeHours: number;
  subscriptionRescheduleNoticeHours: number;
  normalBookingCancellationNoticeHours: number;
  normalBookingRescheduleNoticeHours: number;
  reminderBeforeAppointmentHours: number;
  reminderBeforeExpirationDays: number;
}

export const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettingsConfig = {
  subscriptionCancellationNoticeHours: 12,
  subscriptionRescheduleNoticeHours: 12,
  normalBookingCancellationNoticeHours: 6,
  normalBookingRescheduleNoticeHours: 6,
  reminderBeforeAppointmentHours: 24,
  reminderBeforeExpirationDays: 3,
};

/**
 * Loads current subscription and booking notice settings from SystemSettings
 */
export async function getSubscriptionSettings(): Promise<SubscriptionSettingsConfig> {
  const doc = await SystemSettings.findOne({ key: 'global_settings' });
  const subSettings = doc?.subscriptions || {};

  return {
    subscriptionCancellationNoticeHours:
      typeof subSettings.subscriptionCancellationNoticeHours === 'number'
        ? subSettings.subscriptionCancellationNoticeHours
        : DEFAULT_SUBSCRIPTION_SETTINGS.subscriptionCancellationNoticeHours,
    subscriptionRescheduleNoticeHours:
      typeof subSettings.subscriptionRescheduleNoticeHours === 'number'
        ? subSettings.subscriptionRescheduleNoticeHours
        : DEFAULT_SUBSCRIPTION_SETTINGS.subscriptionRescheduleNoticeHours,
    normalBookingCancellationNoticeHours:
      typeof subSettings.normalBookingCancellationNoticeHours === 'number'
        ? subSettings.normalBookingCancellationNoticeHours
        : DEFAULT_SUBSCRIPTION_SETTINGS.normalBookingCancellationNoticeHours,
    normalBookingRescheduleNoticeHours:
      typeof subSettings.normalBookingRescheduleNoticeHours === 'number'
        ? subSettings.normalBookingRescheduleNoticeHours
        : DEFAULT_SUBSCRIPTION_SETTINGS.normalBookingRescheduleNoticeHours,
    reminderBeforeAppointmentHours:
      typeof subSettings.reminderBeforeAppointmentHours === 'number'
        ? subSettings.reminderBeforeAppointmentHours
        : DEFAULT_SUBSCRIPTION_SETTINGS.reminderBeforeAppointmentHours,
    reminderBeforeExpirationDays:
      typeof subSettings.reminderBeforeExpirationDays === 'number'
        ? subSettings.reminderBeforeExpirationDays
        : DEFAULT_SUBSCRIPTION_SETTINGS.reminderBeforeExpirationDays,
  };
}

/**
 * Checks whether the remaining time between now and the appointment is >= requiredNoticeHours.
 * Evaluates accurately in Africa/Cairo timezone.
 */
export function isNoticeSufficient(
  dateStr: string,
  timeStr: string,
  requiredNoticeHours: number
): { isAllowed: boolean; hoursRemaining: number } {
  try {
    const rawTime = String(timeStr || '').trim();
    const startPart = rawTime.split(/[-–—]/)[0].trim();
    const clean = startPart.replace(/(AM|PM|مساءً|صباحاً|مساء|صباح)/gi, '').trim();
    const [hStr, mStr] = clean.split(':');
    let hours = parseInt(hStr || '0', 10);
    const mins = parseInt(mStr || '0', 10);

    const isPM = rawTime.toUpperCase().includes('PM') || rawTime.includes('مساء');
    const isAM = rawTime.toUpperCase().includes('AM') || rawTime.includes('صباح');
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    // Build appointment ISO string in Africa/Cairo (UTC+2 standard)
    const [year, month, day] = dateStr.split('-').map(Number);
    // Construct local Date and determine current offset
    const aptDate = new Date(year, month - 1, day, hours, mins, 0);

    // Current Cairo date and time
    const nowCairoDate = getCurrentCairoDateString();
    const nowCairoTime = getCurrentCairoTimeString();
    const [nowY, nowM, nowD] = nowCairoDate.split('-').map(Number);
    const [nowH, nowMin] = nowCairoTime.split(':').map(Number);
    const nowDate = new Date(nowY, nowM - 1, nowD, nowH, nowMin, 0);

    const diffMs = aptDate.getTime() - nowDate.getTime();
    const hoursRemaining = diffMs / (1000 * 60 * 60);

    // Notice rule: exactly requiredNoticeHours (e.g. 12.0) is ALLOWED. Less than 12.0 (e.g. 11h 59m) is BLOCKED.
    const isAllowed = hoursRemaining >= requiredNoticeHours;
    return { isAllowed, hoursRemaining };
  } catch (err) {
    console.error('Error evaluating notice hours:', err);
    return { isAllowed: false, hoursRemaining: 0 };
  }
}

export interface RequestedVisitInput {
  date: string;
  time: string;
}

export interface CreateSubscriptionInput {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  serviceId: string;
  vehicleDetails?: {
    make?: string;
    model?: string;
    plateNumber?: string;
    color?: string;
    year?: string;
  };
  address: any;
  visits: RequestedVisitInput[];
  autoRenew?: boolean;
  notes?: string;
}

/**
 * Creates a subscription and reserves all visits atomically.
 * If ANY appointment interval is unavailable, rolls back completely and returns conflict.
 */
export async function createSubscriptionAtomic(input: CreateSubscriptionInput): Promise<any> {
  const { customerId, customerName, customerPhone, planId, serviceId, vehicleDetails, address, visits, autoRenew, notes } = input;

  // 1. Validate Service
  const service = await Service.findOne({ id: serviceId });
  if (!service) {
    const err: any = new Error('الخدمة المطلوبة غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  if (!service.available || (service as any).isArchived || (service as any).active === false) {
    const err: any = new Error('الخدمة المختارة غير متاحة للاشتراك حالياً');
    err.statusCode = 400;
    throw err;
  }

  // 2. Validate Plan
  const plan = await SubscriptionPlan.findOne({ id: planId });
  if (!plan) {
    const err: any = new Error('باقة الاشتراك المطلوبة غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  if (plan.status !== 'active') {
    const err: any = new Error('باقة الاشتراك المختارة غير متاحة حالياً');
    err.statusCode = 400;
    throw err;
  }
  if (plan.serviceId !== serviceId) {
    const err: any = new Error('باقة الاشتراك المحددة لا تنتمي للخدمة المختارة');
    err.statusCode = 400;
    throw err;
  }

  // 3. Validate Visits Count
  if (!Array.isArray(visits) || visits.length !== plan.visitCount) {
    const err: any = new Error(`يرجى تحديد مواعيد جميع الزيارات المطلوبة (${plan.visitCount} زيارات) بدقة`);
    err.statusCode = 400;
    throw err;
  }

  // Authoritative server-side calculations
  const price = plan.price;
  const durationDays = plan.durationDays || 30;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const lockKey = `sub_create_${serviceId}`;

  return await withBookingLock(lockKey, async () => {
    // 4. Pre-validate each requested visit slot against Dynamic Continuous Availability Engine
    const validatedVisitSlots: Array<{
      date: string;
      time: string;
      scheduledStart: string;
      scheduledEnd: string;
      serviceDurationMinutes: number;
      travelTimeMinutes: number;
      totalOccupiedMinutes: number;
    }> = [];

    for (let i = 0; i < visits.length; i++) {
      const v = visits[i];
      if (!v.date || !v.time) {
        const err: any = new Error(`بيانات الزيارة رقم (${i + 1}) غير مكتملة (التاريخ والوقت مطلوبان)`);
        err.statusCode = 400;
        throw err;
      }

      try {
        const slotTiming = await assertSlotAvailability({
          dateStr: v.date,
          timeStr: v.time,
          serviceId,
        });

        // Also ensure no duplicate intervals requested within this same submission
        const duplicateInRequest = validatedVisitSlots.some(
          (prev) => prev.date === v.date && prev.scheduledStart === slotTiming.scheduledStart
        );
        if (duplicateInRequest) {
          const err: any = new Error(`تم تكرار نفس الموعد (${v.date} - ${slotTiming.scheduledStart}) أكثر من مرة في نفس الاشتراك`);
          err.statusCode = 400;
          throw err;
        }

        validatedVisitSlots.push({
          date: v.date,
          time: `${slotTiming.scheduledStart} – ${slotTiming.scheduledEnd}`,
          scheduledStart: slotTiming.scheduledStart,
          scheduledEnd: slotTiming.scheduledEnd,
          serviceDurationMinutes: slotTiming.serviceDurationMinutes,
          travelTimeMinutes: slotTiming.travelTimeMinutes,
          totalOccupiedMinutes: slotTiming.totalOccupiedMinutes,
        });
      } catch (slotErr: any) {
        const conflictErr: any = new Error(`الموعد المحدد للزيارة رقم (${i + 1}) في يوم ${v.date} الساعة ${v.time} لم يعد متاحًا، يرجى اختيار موعد آخر.`);
        conflictErr.statusCode = slotErr.statusCode || 409;
        conflictErr.code = 'SLOT_UNAVAILABLE';
        throw conflictErr;
      }
    }

    // 5. Atomic Creation in PostgreSQL Transaction
    const subId = generateSubscriptionNumber();

    const createdSubscription = await prisma.$transaction(async (tx) => {
      // Create Subscription
      const sub = await tx.subscription.create({
        data: {
          id: subId,
          customerId: customerId || null,
          customerName,
          customerPhone,
          planId: plan.id,
          serviceId: service.id,
          serviceSnapshot: {
            id: service.id,
            title: service.title,
            titleEn: service.titleEn,
            category: service.category,
            image: service.image,
            duration: service.duration,
            travelTime: service.travelTimeMinutes || 15,
          },
          planSnapshot: {
            id: plan.id,
            name: plan.name,
            image: (plan as any).image || '',
            visitCount: plan.visitCount,
            price: plan.price,
            durationDays: plan.durationDays,
            allowCancellation: plan.allowCancellation,
            allowRescheduling: plan.allowRescheduling,
            allowRenewal: plan.allowRenewal,
            cancellationNoticeHours: plan.cancellationNoticeHours || 12,
            rescheduleNoticeHours: plan.rescheduleNoticeHours || 12,
          },
          vehicleDetails: vehicleDetails || undefined,
          address: address || {},
          category: service.category || 'car',
          status: 'active',
          totalVisits: plan.visitCount,
          usedVisits: 0,
          remainingVisits: plan.visitCount,
          price,
          startDate,
          endDate,
          autoRenew: autoRenew ?? (plan.allowRenewal ?? false),
          notes: notes || null,
        },
      });

      // Create each SubscriptionVisit
      for (let i = 0; i < validatedVisitSlots.length; i++) {
        const slot = validatedVisitSlots[i];
        const visitId = generateVisitNumber();

        await tx.subscriptionVisit.create({
          data: {
            id: visitId,
            subscriptionId: sub.id,
            customerId: customerId || null,
            customerName,
            customerPhone,
            serviceId: service.id,
            visitIndex: i + 1,
            date: slot.date,
            time: slot.time,
            timeSlotStart: slot.scheduledStart,
            scheduledStart: slot.scheduledStart,
            scheduledEnd: slot.scheduledEnd,
            duration: slot.serviceDurationMinutes,
            serviceDurationMinutes: slot.serviceDurationMinutes,
            travelTimeMinutes: slot.travelTimeMinutes,
            totalOccupiedMinutes: slot.totalOccupiedMinutes,
            serviceSnapshot: {
              id: service.id,
              title: service.title,
              titleEn: service.titleEn,
              category: service.category,
              image: service.image,
            },
            vehicleDetails: vehicleDetails || undefined,
            address: address || {},
            status: 'confirmed',
            timeline: [
              {
                status: 'confirmed',
                label: 'تم تأكيد موعد الزيارة',
                labelEn: 'Visit Scheduled & Confirmed',
                timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
                completed: true,
                description: `موعد الزيارة رقم (${i + 1}) في باقة (${plan.name})`,
                descriptionEn: `Visit #${i + 1} confirmed for plan (${plan.name})`,
                changedBy: 'system',
              },
            ],
          },
        });
      }

      return sub;
    });

    // 6. Notifications & Audit Logs (Non-blocking)
    try {
      if (customerId) {
        await Notification.create({
          target: 'customer',
          userId: customerId,
          title: `تم تفعيل اشتراكك بنجاح (${plan.name})`,
          titleEn: `Subscription Activated (${plan.name})`,
          message: `تم تأكيد اشتراكك في باقة ${plan.name} برصيد ${plan.visitCount} زيارات. نسعد بخدمتك دائماً!`,
          messageEn: `Your subscription to ${plan.name} with ${plan.visitCount} visits has been activated successfully!`,
          type: 'order',
          read: false,
          link: `/account/subscriptions`,
        });
      }

      await Notification.create({
        target: 'admin',
        title: `اشتراك جديد #${createdSubscription.id}`,
        titleEn: `New Subscription #${createdSubscription.id}`,
        message: `قام العميل ${customerName} بالاشتراك في باقة (${plan.name}) برصيد ${plan.visitCount} زيارات بقيمة ${price} ج.م`,
        messageEn: `Customer ${customerName} subscribed to ${plan.name} (${plan.visitCount} visits) for ${price} EGP`,
        type: 'order',
        read: false,
        link: `/admin/subscriptions`,
      });

      await AuditLog.create({
        adminId: customerId || 'customer',
        adminName: customerName,
        adminRole: 'customer',
        action: 'إنشاء اشتراك جديد',
        module: 'subscriptions',
        entityType: 'subscription',
        entityId: createdSubscription.id,
        description: `تم إنشاء الاشتراك #${createdSubscription.id} بنجاح لباقة ${plan.name} برصيد ${plan.visitCount} زيارات`,
        target: createdSubscription.id,
        details: `العميل: ${customerName} (${customerPhone}) - القيمة: ${price} ج.م`,
      });
    } catch (notifErr) {
      console.warn('Non-critical: Notification/audit error:', notifErr);
    }

    // Return complete subscription with visits
    return await prisma.subscription.findUnique({
      where: { id: createdSubscription.id },
      include: {
        plan: true,
        visits: {
          orderBy: { visitIndex: 'asc' },
        },
      },
    });
  });
}

/**
 * Cancels an individual subscription visit with strict 12-hour notice validation for customers
 */
export async function cancelSubscriptionVisit(params: {
  visitId: string;
  actor: 'customer' | 'admin';
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  customerPhone?: string;
  reason?: string;
  overrideRestrictions?: boolean;
}): Promise<any> {
  const { visitId, actor, actorId, actorName, actorRole, customerPhone, reason, overrideRestrictions } = params;

  const visit = await prisma.subscriptionVisit.findUnique({
    where: { id: visitId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!visit) {
    const err: any = new Error('زيارة الاشتراك غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // IDOR Protection: If customer, must match phone or customerId
  if (actor === 'customer') {
    if (actorId && visit.customerId && visit.customerId !== actorId) {
      const err: any = new Error('غير مصرح لك بإلغاء موعد هذه الزيارة');
      err.statusCode = 403;
      throw err;
    }
    if (customerPhone && visit.customerPhone !== customerPhone) {
      const err: any = new Error('رقم الهاتف لا يتطابق مع صاحب الاشتراك');
      err.statusCode = 403;
      throw err;
    }
  }

  if (visit.status === 'completed') {
    const err: any = new Error('لا يمكن إلغاء زيارة مكتملة بالفعل');
    err.statusCode = 400;
    throw err;
  }
  if (visit.status === 'cancelled') {
    const err: any = new Error('الزيارة ملغاة بالفعل');
    err.statusCode = 400;
    throw err;
  }
  if (visit.status === 'in_progress') {
    const err: any = new Error('لا يمكن إلغاء الزيارة أثناء تنفيذ الخدمة من قبل الفني');
    err.statusCode = 400;
    throw err;
  }

  // Cancellation rules for customer
  if (actor === 'customer' && !overrideRestrictions) {
    // 1. Plan setting: allowCancellation
    const plan = visit.subscription?.plan;
    const planSnapshot = (visit.subscription?.planSnapshot as any);
    const allowCancellation = plan ? plan.allowCancellation : (planSnapshot?.allowCancellation ?? true);

    if (allowCancellation === false) {
      const err: any = new Error('باقة هذا الاشتراك لا تتيح ميزة الإلغاء الذاتي للزيارات');
      err.statusCode = 400;
      err.code = 'CANCELLATION_NOT_ALLOWED_BY_PLAN';
      throw err;
    }

    // 2. 12-hour rule
    const settings = await getSubscriptionSettings();
    const noticeHours = plan?.cancellationNoticeHours || settings.subscriptionCancellationNoticeHours || 12;
    const { isAllowed } = isNoticeSufficient(visit.date, visit.scheduledStart || visit.time, noticeHours);

    if (!isAllowed) {
      const err: any = new Error(
        `لا يمكن إلغاء موعد الاشتراك قبل الموعد بأقل من ${noticeHours} ساعة. يُرجى التواصل مع الدعم للمساعدة.`
      );
      err.statusCode = 400;
      err.code = 'CANCELLATION_RESTRICTED_12H';
      throw err;
    }
  }

  const updatedTimeline = Array.isArray(visit.timeline) ? [...(visit.timeline as any[])] : [];
  updatedTimeline.push({
    status: 'cancelled',
    label: actor === 'admin' ? 'تم إلغاء الموعد بواسطة الإدارة' : 'تم إلغاء الموعد بواسطة العميل',
    labelEn: actor === 'admin' ? 'Cancelled by Admin' : 'Cancelled by Customer',
    timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
    completed: true,
    description: reason || (actor === 'admin' ? 'إلغاء إداري للموعد' : 'إلغاء من قبل المشترك'),
    changedBy: actorName || (actor === 'admin' ? 'admin' : 'customer'),
  });

  const updated = await prisma.subscriptionVisit.update({
    where: { id: visit.id },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationSource: actor,
      cancellationReason: reason || 'إلغاء الموعد',
      timeline: updatedTimeline,
    },
  });

  // Log activity
  await AuditLog.create({
    adminId: actorId || (actor === 'admin' ? 'admin' : 'customer'),
    adminName: actorName || 'User',
    adminRole: actorRole || actor,
    action: 'إلغاء موعد زيارة اشتراك',
    module: 'subscriptions',
    entityType: 'subscription_visit',
    entityId: visit.id,
    target: visit.id,
    details: `تم إلغاء زيارة الاشتراك #${visit.id} (اشتراك #${visit.subscriptionId}) بواسطة ${actorName || actor}`,
  });

  return updated;
}

/**
 * Reschedules a subscription visit atomically with strict 12-hour rule.
 * Crucial rule: Old appointment remains reserved until new appointment is successfully validated & reserved!
 */
export async function rescheduleSubscriptionVisit(params: {
  visitId: string;
  newDate: string;
  newTime: string;
  actor: 'customer' | 'admin';
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  customerPhone?: string;
  reason?: string;
  overrideRestrictions?: boolean;
}): Promise<any> {
  const { visitId, newDate, newTime, actor, actorId, actorName, actorRole, customerPhone, reason, overrideRestrictions } = params;

  if (!newDate || !newTime) {
    const err: any = new Error('التاريخ الجديد والوقت مطلوبان لإعادة الجدولة');
    err.statusCode = 400;
    throw err;
  }

  const visit = await prisma.subscriptionVisit.findUnique({
    where: { id: visitId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!visit) {
    const err: any = new Error('زيارة الاشتراك غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  // IDOR Protection: If customer, must match ownership
  if (actor === 'customer') {
    if (actorId && visit.customerId && visit.customerId !== actorId) {
      const err: any = new Error('غير مصرح لك بتغيير موعد هذه الزيارة');
      err.statusCode = 403;
      throw err;
    }
    if (customerPhone && visit.customerPhone !== customerPhone) {
      const err: any = new Error('رقم الهاتف لا يتطابق مع صاحب الاشتراك');
      err.statusCode = 403;
      throw err;
    }
  }

  if (visit.status === 'completed') {
    const err: any = new Error('لا يمكن تغيير موعد زيارة مكتملة بالفعل');
    err.statusCode = 400;
    throw err;
  }
  if (visit.status === 'cancelled') {
    const err: any = new Error('لا يمكن تغيير موعد زيارة ملغاة');
    err.statusCode = 400;
    throw err;
  }
  if (visit.status === 'in_progress') {
    const err: any = new Error('لا يمكن تغيير موعد الزيارة أثناء تقديم الخدمة فعلياً');
    err.statusCode = 400;
    throw err;
  }

  // Rescheduling rules for customer
  if (actor === 'customer' && !overrideRestrictions) {
    // 1. Plan setting: allowRescheduling
    const plan = visit.subscription?.plan;
    const planSnapshot = (visit.subscription?.planSnapshot as any);
    const allowRescheduling = plan ? plan.allowRescheduling : (planSnapshot?.allowRescheduling ?? true);

    if (allowRescheduling === false) {
      const err: any = new Error('باقة هذا الاشتراك لا تتيح ميزة إعادة الجدولة الذاتية للزيارات');
      err.statusCode = 400;
      err.code = 'RESCHEDULE_NOT_ALLOWED_BY_PLAN';
      throw err;
    }

    // 2. 12-hour rule
    const settings = await getSubscriptionSettings();
    const noticeHours = plan?.rescheduleNoticeHours || settings.subscriptionRescheduleNoticeHours || 12;
    const { isAllowed } = isNoticeSufficient(visit.date, visit.scheduledStart || visit.time, noticeHours);

    if (!isAllowed) {
      const err: any = new Error(
        `لا يمكن تعديل موعد الاشتراك قبل الموعد بأقل من ${noticeHours} ساعة. يُرجى التواصل مع الدعم للمساعدة.`
      );
      err.statusCode = 400;
      err.code = 'RESCHEDULE_RESTRICTED_12H';
      throw err;
    }
  }

  const lockKey = `sub_reschedule_${visit.serviceId}`;

  return await withBookingLock(lockKey, async () => {
    // 1. Validate new appointment slot BEFORE touching old reservation
    const slotTiming = await assertSlotAvailability({
      dateStr: newDate,
      timeStr: newTime,
      serviceId: visit.serviceId,
      excludeVisitId: visit.id,
    });

    // 2. Atomic update: modify visit to new slot
    const previousTimeDesc = `${visit.date} (${visit.time})`;
    const newTimeLabel = `${slotTiming.scheduledStart} – ${slotTiming.scheduledEnd}`;

    const updatedTimeline = Array.isArray(visit.timeline) ? [...(visit.timeline as any[])] : [];
    updatedTimeline.push({
      status: visit.status,
      label: 'إعادة جدولة الموعد',
      labelEn: 'Appointment Rescheduled',
      timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      completed: true,
      description: `تم تغيير الموعد من (${previousTimeDesc}) إلى (${newDate} ${newTimeLabel})`,
      descriptionEn: `Rescheduled from (${previousTimeDesc}) to (${newDate} ${newTimeLabel})`,
      changedBy: actorName || actor,
    });

    const updated = await prisma.subscriptionVisit.update({
      where: { id: visit.id },
      data: {
        date: newDate,
        time: newTimeLabel,
        timeSlotStart: slotTiming.scheduledStart,
        scheduledStart: slotTiming.scheduledStart,
        scheduledEnd: slotTiming.scheduledEnd,
        rescheduledFrom: previousTimeDesc,
        rescheduledAt: new Date(),
        timeline: updatedTimeline,
      },
    });

    // Log Activity
    await AuditLog.create({
      adminId: actorId || (actor === 'admin' ? 'admin' : 'customer'),
      adminName: actorName || 'User',
      adminRole: actorRole || actor,
      action: 'إعادة جدولة موعد زيارة اشتراك',
      module: 'subscriptions',
      entityType: 'subscription_visit',
      entityId: visit.id,
      target: visit.id,
      details: `تم تعديل موعد الزيارة #${visit.id} من ${previousTimeDesc} إلى ${newDate} ${newTimeLabel}`,
    });

    return updated;
  });
}

/**
 * Marks a subscription visit as completed.
 * Exactly once: increments usedVisits, decrements remainingVisits, computes & records cashback.
 */
export async function completeSubscriptionVisit(params: {
  visitId: string;
  adminActor: { id: string; name: string; role: string };
}): Promise<any> {
  const { visitId, adminActor } = params;

  return await prisma.$transaction(async (tx) => {
    const visit = await tx.subscriptionVisit.findUnique({
      where: { id: visitId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!visit) {
      const err: any = new Error('زيارة الاشتراك غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    if (visit.status === 'completed') {
      const err: any = new Error('الزيارة مكتملة بالفعل ولا يمكن إكمالها مرتين');
      err.statusCode = 400;
      throw err;
    }

    const sub = visit.subscription;
    const newUsed = sub.usedVisits + 1;
    const newRemaining = Math.max(0, sub.totalVisits - newUsed);
    const isExhausted = newUsed >= sub.totalVisits;

    // Calculate Cashback if configured on the plan and not yet awarded
    let cashbackAmount = 0;
    const plan = sub.plan;
    if (plan && !visit.cashbackAwardedAt) {
      if (plan.cashbackAmount && plan.cashbackAmount > 0) {
        cashbackAmount = plan.cashbackAmount;
      } else if (plan.cashbackPercentage && plan.cashbackPercentage > 0) {
        const visitPrice = sub.price / (sub.totalVisits || 1);
        cashbackAmount = Math.round((visitPrice * plan.cashbackPercentage) / 100);
      }
    }

    const updatedTimeline = Array.isArray(visit.timeline) ? [...(visit.timeline as any[])] : [];
    updatedTimeline.push({
      status: 'completed',
      label: 'تم إتمام الزيارة بنجاح',
      labelEn: 'Visit Completed Successfully',
      timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      completed: true,
      description: `تم إتمام الزيارة بنجاح (${newUsed}/${sub.totalVisits})`,
      changedBy: adminActor.name,
    });

    // 1. Update Visit
    const updatedVisit = await tx.subscriptionVisit.update({
      where: { id: visit.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completedBy: adminActor,
        cashbackAwarded: cashbackAmount,
        cashbackAwardedAt: cashbackAmount > 0 ? new Date() : null,
        timeline: updatedTimeline,
      },
    });

    // 2. Update Subscription Balance
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        usedVisits: newUsed,
        remainingVisits: newRemaining,
        status: isExhausted ? 'completed' : sub.status,
      },
    });

    // 3. Record Cashback if applicable
    if (cashbackAmount > 0) {
      await tx.subscriptionCashback.create({
        data: {
          subscriptionId: sub.id,
          visitId: visit.id,
          customerId: sub.customerId || null,
          customerPhone: sub.customerPhone,
          amount: cashbackAmount,
          type: 'credit',
          description: `كاش باك إتمام الزيارة رقم (${visit.visitIndex}) في اشتراك ${(sub.planSnapshot as any)?.name || ''}`,
        },
      });
    }

    return { updatedVisit, isExhausted, newUsed, newRemaining, cashbackAmount };
  });
}

/**
 * Renews an existing subscription into a new cycle, fully preserving previous subscription history!
 */
export async function renewSubscription(params: {
  subscriptionId: string;
  newPlanId?: string;
  visits: RequestedVisitInput[];
  customerActor?: { id?: string; phone: string; name: string };
  adminActor?: { id: string; name: string; role: string };
}): Promise<any> {
  const { subscriptionId, newPlanId, visits, customerActor, adminActor } = params;

  const previousSub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!previousSub) {
    const err: any = new Error('الاشتراك المراد تجديده غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // IDOR Protection: If customerActor, verify ownership
  if (customerActor) {
    if (customerActor.id && previousSub.customerId && previousSub.customerId !== customerActor.id) {
      const err: any = new Error('غير مصرح لك بتجديد هذا الاشتراك');
      err.statusCode = 403;
      throw err;
    }
  }

  const targetPlanId = newPlanId || previousSub.planId;
  const targetPlan = await prisma.subscriptionPlan.findUnique({ where: { id: targetPlanId } });

  if (!targetPlan || targetPlan.status !== 'active') {
    const err: any = new Error('باقة التجديد المختارة غير متاحة حالياً');
    err.statusCode = 400;
    throw err;
  }

  // Create new subscription for the renewal cycle
  const newSubData = await createSubscriptionAtomic({
    customerId: previousSub.customerId || customerActor?.id,
    customerName: customerActor?.name || previousSub.customerName,
    customerPhone: customerActor?.phone || previousSub.customerPhone,
    planId: targetPlan.id,
    serviceId: targetPlan.serviceId,
    vehicleDetails: (previousSub.vehicleDetails as any) || undefined,
    address: previousSub.address,
    visits,
    notes: `تجديد للاشتراك السابق #${previousSub.id}`,
  });

  // Link previous and new subscription records & record renewal cycle
  const renewalCycle = (previousSub.renewalCycle || 1) + 1;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: previousSub.id },
      data: {
        renewedToId: newSubData.id,
      },
    });

    await tx.subscription.update({
      where: { id: newSubData.id },
      data: {
        renewedFromId: previousSub.id,
        renewalCycle,
      },
    });

    await tx.subscriptionRenewal.create({
      data: {
        subscriptionId: previousSub.id,
        customerId: previousSub.customerId || null,
        customerPhone: previousSub.customerPhone,
        oldPlanId: previousSub.planId,
        newPlanId: targetPlan.id,
        newSubscriptionId: newSubData.id,
        renewalCycle,
        renewalPrice: targetPlan.price,
        status: 'completed',
        notes: `تم التجديد بنجاح من الدورة (${previousSub.renewalCycle || 1}) إلى الدورة (${renewalCycle})`,
      },
    });
  });

  // Log activity
  await AuditLog.create({
    adminId: adminActor?.id || customerActor?.id || 'customer',
    adminName: adminActor?.name || customerActor?.name || 'Customer',
    adminRole: adminActor?.role || 'customer',
    action: 'تجديد اشتراك',
    module: 'subscriptions',
    entityType: 'subscription',
    entityId: newSubData.id,
    target: newSubData.id,
    details: `تم تجديد الاشتراك #${previousSub.id} بنجاح برقم جديد #${newSubData.id} (الدورة ${renewalCycle})`,
  });

  return await prisma.subscription.findUnique({
    where: { id: newSubData.id },
    include: {
      plan: true,
      visits: { orderBy: { visitIndex: 'asc' } },
    },
  });
}

/**
 * Calculates comprehensive Subscription KPIs and Analytics directly from PostgreSQL
 */
export async function getSubscriptionAnalytics(params?: {
  range?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> {
  const whereSub: any = {};
  const now = new Date();

  // Resolve Date Range
  let rangeStart: Date | undefined;
  let rangeEnd: Date | undefined;

  if (params?.range) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (params.range) {
      case 'today':
        rangeStart = todayStart;
        rangeEnd = todayEnd;
        break;
      case 'yesterday':
        rangeStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
        rangeEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        rangeEnd = now;
        break;
      case '30days':
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        rangeEnd = now;
        break;
      case 'this_month':
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        rangeEnd = now;
        break;
      case 'last_month':
        rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'year':
        rangeStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        rangeEnd = now;
        break;
      case 'custom':
        if (params.startDate) rangeStart = new Date(params.startDate);
        if (params.endDate) rangeEnd = new Date(`${params.endDate}T23:59:59.999Z`);
        break;
    }
  } else if (params?.startDate || params?.endDate) {
    if (params.startDate) rangeStart = new Date(params.startDate);
    if (params.endDate) rangeEnd = new Date(`${params.endDate}T23:59:59.999Z`);
  }

  if (rangeStart || rangeEnd) {
    whereSub.createdAt = {};
    if (rangeStart) whereSub.createdAt.gte = rangeStart;
    if (rangeEnd) whereSub.createdAt.lte = rangeEnd;
  }

  const [
    allSubs,
    allVisits,
    allRenewals,
    cashbackRecords,
    allPlans,
  ] = await Promise.all([
    prisma.subscription.findMany({ where: whereSub }),
    prisma.subscriptionVisit.findMany(),
    prisma.subscriptionRenewal.findMany(),
    prisma.subscriptionCashback.findMany(),
    prisma.subscriptionPlan.findMany({ include: { service: true } }),
  ]);

  const totalSubscriptions = allSubs.length;
  const activeSubscriptions = allSubs.filter((s) => s.status === 'active').length;
  const completedSubscriptions = allSubs.filter((s) => s.status === 'completed').length;
  const cancelledSubscriptions = allSubs.filter((s) => s.status === 'cancelled').length;

  // Expired Subscriptions
  const expiredSubscriptions = allSubs.filter((s) => {
    if (s.status === 'expired') return true;
    return s.status === 'active' && s.endDate < now;
  }).length;

  // Expiring Soon (Active and end date within next 7 days)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = allSubs.filter((s) => {
    return s.status === 'active' && s.endDate >= now && s.endDate <= in7Days;
  }).length;

  // Renewed vs Non-Renewed
  const renewedSubscriptions = allSubs.filter((s) => Boolean(s.renewedToId)).length;
  const nonRenewedSubscriptions = Math.max(0, (completedSubscriptions + expiredSubscriptions) - renewedSubscriptions);

  // Distinct subscribers
  const distinctPhones = new Set(allSubs.map((s) => s.customerPhone));
  const totalSubscribers = distinctPhones.size;

  // New Subscription Customers in range (phone seen only once or first time in this period)
  const allHistoricalSubs = await prisma.subscription.findMany({ select: { customerPhone: true, createdAt: true } });
  const firstSeenMap = new Map<string, Date>();
  for (const h of allHistoricalSubs) {
    const existing = firstSeenMap.get(h.customerPhone);
    if (!existing || h.createdAt < existing) {
      firstSeenMap.set(h.customerPhone, h.createdAt);
    }
  }
  let newSubscriptionCustomers = 0;
  for (const phone of distinctPhones) {
    const firstDate = firstSeenMap.get(phone);
    if (firstDate && (!rangeStart || firstDate >= rangeStart) && (!rangeEnd || firstDate <= rangeEnd)) {
      newSubscriptionCustomers++;
    }
  }

  // Financials
  const subscriptionRevenue = allSubs.reduce((acc, s) => acc + (s.price || 0), 0);
  const activeSubscriptionValue = allSubs
    .filter((s) => s.status === 'active')
    .reduce((acc, s) => acc + (s.price || 0), 0);

  // Visits Breakdown
  const totalVisitsCount = allVisits.length;
  const completedVisitsCount = allVisits.filter((v) => v.status === 'completed').length;
  const cancelledVisitsCount = allVisits.filter((v) => v.status === 'cancelled').length;
  const upcomingVisitsCount = allVisits.filter((v) => ['pending', 'confirmed', 'assigned'].includes(v.status)).length;
  const rescheduledVisitsCount = allVisits.filter((v) => Boolean(v.rescheduledFrom)).length;

  // Renewal Rate
  const eligibleForRenewal = completedSubscriptions + expiredSubscriptions;
  const renewalRate = eligibleForRenewal > 0 ? Math.round((renewedSubscriptions / eligibleForRenewal) * 100) : 0;
  const renewalRevenue = allRenewals.reduce((acc, r) => acc + (r.renewalPrice || 0), 0);

  // Cashback Metrics
  const cashbackGenerated = cashbackRecords
    .filter((c) => c.type === 'credit')
    .reduce((acc, c) => acc + (c.amount || 0), 0);
  const cashbackUsed = cashbackRecords
    .filter((c) => c.type === 'debit')
    .reduce((acc, c) => acc + (c.amount || 0), 0);
  const cashbackRemaining = Math.max(0, cashbackGenerated - cashbackUsed);

  // Plan-Level Performance Breakdown
  const planBreakdown = allPlans.map((p) => {
    const planSubs = allSubs.filter((s) => s.planId === p.id);
    const planRev = planSubs.reduce((acc, s) => acc + (s.price || 0), 0);
    const planRenewals = allRenewals.filter((r) => r.newPlanId === p.id).length;
    const planVisits = allVisits.filter((v) => {
      const sub = allSubs.find((s) => s.id === v.subscriptionId);
      return sub?.planId === p.id;
    }).length;

    return {
      id: p.id,
      name: p.name,
      planId: p.id,
      planName: p.name,
      serviceTitle: p.service?.title || '',
      subscriptionCount: planSubs.length,
      revenue: planRev,
      visitsCount: planVisits,
      visitsPerSubscription: p.visitCount,
      renewals: planRenewals,
      price: p.price,
      image: (p as any).image || '',
    };
  });

  // Most used plans (sorted by subscriptionCount desc)
  const mostUsedPlans = [...planBreakdown].sort((a, b) => b.subscriptionCount - a.subscriptionCount);

  return {
    kpis: {
      totalSubscriptions,
      activeSubscriptions,
      expiringSoon,
      expiredSubscriptions,
      cancelledSubscriptions,
      renewedSubscriptions,
      nonRenewedSubscriptions,
      totalSubscriptionCustomers: totalSubscribers,
      newSubscriptionCustomers,
      totalSubscriptionRevenue: subscriptionRevenue,
      activeSubscriptionValue,
      upcomingSubscriptionVisits: upcomingVisitsCount,
      completedSubscriptionVisits: completedVisitsCount,
      cancelledVisits: cancelledVisitsCount,
      rescheduledVisits: rescheduledVisitsCount,
      renewalRate,
      cashbackGenerated,
      cashbackUsed,
      cashbackRemaining,
      totalVisits: totalVisitsCount,
      renewalRevenue,
    },
    planBreakdown,
    mostUsedPlans,
  };
}
