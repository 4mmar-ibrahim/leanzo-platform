import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';
import {
  createSubscriptionAtomic,
  cancelSubscriptionVisit,
  rescheduleSubscriptionVisit,
  completeSubscriptionVisit,
  renewSubscription,
  getSubscriptionSettings,
  getSubscriptionAnalytics,
} from '../services/subscriptionService.js';
import { Technician } from '../models/Technician.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { Booking } from '../models/Booking.js';
import { validateEgyptianPhone, CANONICAL_PHONE_ERROR_MESSAGE, CANONICAL_PHONE_ERROR_CODE } from '../utils/phoneValidator.js';
import { withBookingLock } from '../services/availabilityService.js';

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
    const s = timeStringToMinutes(b.scheduledStart);
    let e = timeStringToMinutes(b.scheduledEnd);
    if (e <= s) e = s + fullDuration;
    return {
      startMin: s,
      endMin: e,
      display: timeStr || `${b.scheduledStart} - ${b.scheduledEnd}`,
    };
  }

  // 2. Range inside timeStr
  if (timeStr.includes('–') || timeStr.includes('-') || timeStr.includes('—')) {
    const parts = timeStr.split(/[-–—]/).map((p: string) => p.trim());
    const min1 = timeStringToMinutes(parts[0]);
    const min2 = timeStringToMinutes(parts[1]);
    const startMin = Math.min(min1, min2);
    let endMin = Math.max(min1, min2);

    if (endMin <= startMin) {
      endMin = startMin + fullDuration;
    } else {
      endMin = Math.max(endMin, startMin + fullDuration);
    }

    return {
      startMin,
      endMin,
      display: timeStr,
    };
  }

  // 3. Single start time
  const startMin = b.scheduledStart ? timeStringToMinutes(b.scheduledStart) : timeStringToMinutes(timeStr);
  let endMin = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : startMin + fullDuration;
  if (endMin <= startMin) {
    endMin = startMin + fullDuration;
  } else {
    endMin = Math.max(endMin, startMin + fullDuration);
  }

  const display = timeStr || `${Math.floor(startMin / 60).toString().padStart(2, '0')}:${(startMin % 60).toString().padStart(2, '0')}`;

  return {
    startMin,
    endMin,
    display,
  };
}

function isTimeIntervalOverlapping(
  intA: { startMin: number; endMin: number },
  intB: { startMin: number; endMin: number }
): boolean {
  return intA.startMin < intB.endMin && intB.startMin < intA.endMin;
}

/**
 * Customer: Create a new Subscription atomically
 */
export async function createCustomerSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { planId, serviceId, vehicleDetails, address, visits, notes, guestName, guestPhone } = req.body;

    // Resolve Customer Identity:
    let customerId = req.user?._id?.toString() || req.user?.id;
    let customerName = req.user?.name || guestName;
    let customerPhone = req.user?.phone || guestPhone;

    if (!customerPhone) {
      sendError(res, 'رقم الهاتف مطلوب لإتمام الاشتراك', 400, 'MISSING_PHONE');
      return;
    }

    const phoneVal = validateEgyptianPhone(String(customerPhone).trim());
    if (!phoneVal.isValid) {
      sendError(res, phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE, 400, phoneVal.code || CANONICAL_PHONE_ERROR_CODE);
      return;
    }
    customerPhone = String(customerPhone).trim();

    if (!customerName) {
      customerName = 'عميل كلينزو المشترك';
    }

    if (!planId) {
      sendError(res, 'يرجى اختيار باقة اشتراك', 400, 'MISSING_PLAN');
      return;
    }

    if (!serviceId) {
      sendError(res, 'يرجى اختيار الخدمة المراد الاشتراك بها', 400, 'MISSING_SERVICE');
      return;
    }

    if (!address || !address.area) {
      sendError(res, 'يرجى تحديد عنوان تقديم الخدمة بالتفصيل', 400, 'MISSING_ADDRESS');
      return;
    }

    const subscription = await createSubscriptionAtomic({
      customerId,
      customerName,
      customerPhone,
      planId,
      serviceId,
      vehicleDetails,
      address,
      visits,
      notes,
    });

    sendSuccess(res, subscription, 'تم تأكيد اشتراكك بنجاح وحجز جميع المواعيد المطلوبة', 201);
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || 500, err.code || 'SUBSCRIPTION_CREATION_FAILED');
  }
}

/**
 * Customer: Get all my subscriptions
 */
export async function getMySubscriptions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const customerId = req.user?._id?.toString() || req.user?.id;
    const customerPhone = req.user?.phone;

    if (!customerId && !customerPhone) {
      sendError(res, 'غير مصرح بالدخول', 401, 'UNAUTHORIZED');
      return;
    }

    const where: any = {
      OR: [
        ...(customerId ? [{ customerId }] : []),
        ...(customerPhone ? [{ customerPhone }] : []),
      ],
    };

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        service: {
          select: {
            id: true,
            title: true,
            titleEn: true,
            image: true,
            category: true,
          },
        },
        visits: {
          orderBy: { visitIndex: 'asc' },
        },
        renewals: {
          orderBy: { renewedAt: 'desc' },
        },
        cashbacks: true,
      },
    });

    sendSuccess(res, subscriptions, 'تم جلب اشتراكاتك بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Customer: Get a single subscription with strict IDOR ownership protection
 */
export async function getMySubscriptionById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const customerId = req.user?._id?.toString() || req.user?.id;
    const customerPhone = req.user?.phone;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        service: true,
        visits: {
          orderBy: { visitIndex: 'asc' },
        },
        renewals: {
          orderBy: { renewedAt: 'desc' },
        },
        cashbacks: true,
      },
    });

    if (!subscription) {
      sendError(res, 'الاشتراك غير موجود', 404, 'SUBSCRIPTION_NOT_FOUND');
      return;
    }

    // IDOR Check
    const isOwner =
      (customerId && subscription.customerId === customerId) ||
      (customerPhone && subscription.customerPhone === customerPhone);

    if (!isOwner) {
      sendError(res, 'غير مصرح لك باستعراض بيانات هذا الاشتراك', 403, 'FORBIDDEN_SUBSCRIPTION');
      return;
    }

    sendSuccess(res, subscription, 'تم جلب تفاصيل الاشتراك بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Customer: Cancel an individual visit (Enforces 12-hour notice)
 */
export async function cancelVisitCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const visitId = req.params.visitId as string;
    const { reason, customerPhone } = req.body || {};

    const actorId = req.user?._id?.toString() || req.user?.id;
    const phone = req.user?.phone || customerPhone;

    const updatedVisit = await cancelSubscriptionVisit({
      visitId,
      actor: 'customer',
      actorId,
      actorName: req.user?.name,
      customerPhone: phone,
      reason,
      overrideRestrictions: false,
    });

    sendSuccess(res, updatedVisit, 'تم إلغاء موعد الزيارة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || 400, err.code || 'VISIT_CANCEL_FAILED');
  }
}

/**
 * Customer: Reschedule an individual visit (Enforces 12-hour notice)
 */
export async function rescheduleVisitCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const visitId = req.params.visitId as string;
    const { newDate, newTime, reason, customerPhone } = req.body || {};

    const actorId = req.user?._id?.toString() || req.user?.id;
    const phone = req.user?.phone || customerPhone;

    const updatedVisit = await rescheduleSubscriptionVisit({
      visitId,
      newDate,
      newTime,
      actor: 'customer',
      actorId,
      actorName: req.user?.name,
      customerPhone: phone,
      reason,
      overrideRestrictions: false,
    });

    sendSuccess(res, updatedVisit, 'تم إعادة جدولة موعد الزيارة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || 400, err.code || 'VISIT_RESCHEDULE_FAILED');
  }
}

/**
 * Customer: Renew subscription with new appointments
 */
export async function renewSubscriptionCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { newPlanId, visits } = req.body;

    const customerActor = {
      id: req.user?._id?.toString() || req.user?.id,
      phone: req.user?.phone || '',
      name: req.user?.name || '',
    };

    const newSub = await renewSubscription({
      subscriptionId: id,
      newPlanId,
      visits,
      customerActor,
    });

    sendSuccess(res, newSub, 'تم تجديد الاشتراك بنجاح لدورة جديدة', 201);
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || 400, err.code || 'RENEWAL_FAILED');
  }
}

/**
 * Admin: Get all subscriptions with filters, search, and pagination
 */
export async function getAllSubscriptionsAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { search, status, serviceId, planId, page = '1', limit = '50', startDate, endDate } = req.query;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (serviceId) {
      where.serviceId = String(serviceId);
    }
    if (planId) {
      where.planId = String(planId);
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(`${String(endDate)}T23:59:59.999Z`);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          plan: true,
          service: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              category: true,
            },
          },
          visits: {
            where: { status: { in: ['pending', 'confirmed', 'assigned'] } },
            orderBy: [{ date: 'asc' }, { scheduledStart: 'asc' }],
            take: 1, // Next upcoming visit
          },
          _count: {
            select: { visits: true, renewals: true },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    sendSuccess(
      res,
      {
        subscriptions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'تم جلب قائمة الاشتراكات بنجاح'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Get subscription details by ID
 */
export async function getSubscriptionByIdAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const subscription: any = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: true,
        plan: true,
        service: true,
        visits: {
          orderBy: { visitIndex: 'asc' },
        },
        renewals: {
          orderBy: { renewedAt: 'desc' },
        },
        cashbacks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      sendError(res, 'الاشتراك غير موجود', 404, 'SUBSCRIPTION_NOT_FOUND');
      return;
    }

    const visitIds = Array.isArray(subscription.visits) ? subscription.visits.map((v: any) => v.id) : [];

    // Fetch related audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { target: id },
          { entityId: id },
          ...(visitIds.length > 0 ? [{ target: { in: visitIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    sendSuccess(res, { subscription, auditLogs }, 'تم جلب تفاصيل الاشتراك بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Update subscription status
 */
export async function updateSubscriptionStatusAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status, notes } = req.body;

    const allowed = ['active', 'completed', 'expired', 'cancelled', 'paused'];
    if (!allowed.includes(status)) {
      sendError(res, 'حالة الاشتراك المحددة غير صالحة', 400, 'INVALID_STATUS');
      return;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status,
        ...(notes ? { notes: String(notes) } : {}),
      },
    });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'manager',
      action: 'تحديث حالة اشتراك',
      module: 'subscriptions',
      entityType: 'subscription',
      entityId: id,
      target: id,
      details: `تم تغيير حالة الاشتراك #${id} إلى (${status})`,
    });

    sendSuccess(res, updated, 'تم تحديث حالة الاشتراك بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Get all visits across all subscriptions
 */
export async function getAllVisitsAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { date, status, serviceId, technicianId, search, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (date) where.date = String(date);
    if (status && status !== 'all') where.status = String(status);
    if (serviceId) where.serviceId = String(serviceId);
    if (technicianId) where.assignedTechnicianId = String(technicianId);

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { subscriptionId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const perms = req.admin?.granularPermissions || [];
    const isOwnerOrAdmin = req.admin?.role === 'owner' || req.admin?.role === 'admin';
    const canViewPhone = isOwnerOrAdmin || perms.includes('customers.phone') || perms.includes('customers.view_phone') || perms.includes('orders.view_phone') || perms.includes('*');

    const [visits, total] = await Promise.all([
      prisma.subscriptionVisit.findMany({
        where,
        orderBy: [{ date: 'asc' }, { scheduledStart: 'asc' }],
        skip,
        take: limitNum,
        include: {
          subscription: {
            select: {
              id: true,
              customerId: true,
              customerName: true,
              customerPhone: true,
              planSnapshot: true,
              serviceSnapshot: true,
              vehicleDetails: true,
              address: true,
              category: true,
              status: true,
              totalVisits: true,
              usedVisits: true,
              remainingVisits: true,
              price: true,
              startDate: true,
              endDate: true,
              autoRenew: true,
              renewalCycle: true,
              renewedToId: true,
              renewedFromId: true,
              createdAt: true,
              updatedAt: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  allowCancellation: true,
                  allowRescheduling: true,
                  allowRenewal: true,
                },
              },
              cashbacks: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              category: true,
              image: true,
            },
          },
        },
      }),
      prisma.subscriptionVisit.count({ where }),
    ]);

    const sanitizedVisits = visits.map((v) => {
      const phone = v.customerPhone;
      const maskedPhone = canViewPhone ? phone : (phone ? phone.slice(0, 4) + '****' + phone.slice(-3) : '');
      return {
        ...v,
        customerPhone: maskedPhone,
        subscription: v.subscription
          ? {
              ...v.subscription,
              customerPhone: canViewPhone
                ? v.subscription.customerPhone
                : (v.subscription.customerPhone ? v.subscription.customerPhone.slice(0, 4) + '****' + v.subscription.customerPhone.slice(-3) : ''),
            }
          : null,
      };
    });

    sendSuccess(
      res,
      {
        visits: sanitizedVisits,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'تم جلب زيارات الاشتراكات بنجاح'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Assign technician to a subscription visit
 */
export async function assignTechnicianToVisitAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const visitId = req.params.visitId as string;
    const { technicianId } = req.body;

    const visit = await prisma.subscriptionVisit.findUnique({ where: { id: visitId } });
    if (!visit) {
      sendError(res, 'زيارة الاشتراك غير موجودة', 404, 'VISIT_NOT_FOUND');
      return;
    }

    if (technicianId) {
      const tech = await Technician.findOne({ id: technicianId });
      if (!tech) {
        sendError(res, 'الفني المحدد غير موجود في النظام', 404, 'TECHNICIAN_NOT_FOUND');
        return;
      }

      const cleanDate = String(visit.date || '').split('T')[0].trim();

      await withBookingLock(`tech_assign_${tech.id}_${cleanDate}`, async () => {
        // Schedule overlap prevention check
        const currentInterval = getBookingTimeInterval(visit);

        // 1. Check overlapping regular bookings (any category)
        const conflictingBookings = await prisma.booking.findMany({
          where: {
            OR: [
              { date: cleanDate },
              { date: { startsWith: cleanDate } },
            ],
            status: { notIn: ['cancelled', 'CANCELLED'] },
            AND: [
              {
                OR: [
                  { assignedTechnicianId: tech.id },
                  { technician: { path: ['id'], equals: tech.id } },
                  { technician: { equals: tech.id } },
                ],
              },
            ],
          },
        });

        for (const b of conflictingBookings) {
          const bInterval = getBookingTimeInterval(b);
          if (isTimeIntervalOverlapping(currentInterval, bInterval)) {
            const bTime = b.time || `${b.scheduledStart} – ${b.scheduledEnd}`;
            sendError(
              res,
              `تعذر تعيين الفني: الفني (${tech.name}) مرتبط بالفعل بالطلب #${b.id} في نفس التوقيت (${bTime}). لا يمكن تعيين فني لزيارة متعارضة مع طلب آخر.`,
              409,
              'TECHNICIAN_SCHEDULE_OVERLAP'
            );
            return;
          }
        }

        // 2. Check other subscription visits
        const otherVisits = await prisma.subscriptionVisit.findMany({
          where: {
            id: { not: visitId },
            OR: [
              { date: cleanDate },
              { date: { startsWith: cleanDate } },
            ],
            status: { notIn: ['cancelled', 'CANCELLED'] },
            AND: [
              {
                OR: [
                  { assignedTechnicianId: tech.id },
                  { technician: { path: ['id'], equals: tech.id } },
                  { technician: { equals: tech.id } },
                ],
              },
            ],
          },
        });

        for (const v of otherVisits) {
          const vInterval = getBookingTimeInterval(v);
          if (isTimeIntervalOverlapping(currentInterval, vInterval)) {
            const vTime = v.time || `${v.scheduledStart} – ${v.scheduledEnd}`;
            sendError(
              res,
              `تعذر تعيين الفني: الفني (${tech.name}) مرتبط بالفعل بزيارة اشتراك #${v.id} في نفس التوقيت (${vTime}).`,
              409,
              'TECHNICIAN_SCHEDULE_OVERLAP'
            );
            return;
          }
        }

        const techSnapshot = {
          id: tech.id,
          name: tech.name,
          phone: tech.phone,
          avatar: tech.avatar,
          rating: tech.rating,
          specialty: tech.specialty,
        };
        let newStatus = visit.status;
        if (visit.status === 'pending' || visit.status === 'confirmed') {
          newStatus = 'assigned';
        }

        const updatedTimeline = Array.isArray(visit.timeline) ? [...(visit.timeline as any[])] : [];
        updatedTimeline.push({
          status: newStatus,
          label: `تم إسناد الفني (${techSnapshot.name})`,
          labelEn: `Assigned to technician ${techSnapshot.name}`,
          timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
          completed: true,
          description: `تم تعيين الفني ${techSnapshot.name} لتنفيذ الزيارة`,
          changedBy: req.admin?.name || 'Admin',
        });

        const updated = await prisma.subscriptionVisit.update({
          where: { id: visitId },
          data: {
            assignedTechnicianId: tech.id,
            technician: techSnapshot,
            status: newStatus,
            timeline: updatedTimeline,
          },
        });

        await AuditLog.create({
          adminId: req.admin?._id?.toString() || 'admin',
          adminName: req.admin?.name || 'Admin',
          adminRole: req.admin?.role || 'manager',
          action: 'تعيين فني لزيارة اشتراك',
          module: 'subscriptions',
          entityType: 'subscription_visit',
          entityId: visitId,
          target: visitId,
          details: `تم إسناد الفني ${techSnapshot.name} للزيارة #${visitId}`,
        });

        sendSuccess(res, updated, 'تم تعيين الفني للزيارة بنجاح');
      });
    } else {
      let newStatus = visit.status;
      if (visit.status === 'assigned') {
        newStatus = 'confirmed';
      }

      const updatedTimeline = Array.isArray(visit.timeline) ? [...(visit.timeline as any[])] : [];
      updatedTimeline.push({
        status: newStatus,
        label: 'تم إلغاء تعيين الفني',
        labelEn: 'Technician unassigned',
        timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
        completed: true,
        description: 'إلغاء التعيين بواسطة المشرف',
        changedBy: req.admin?.name || 'Admin',
      });

      const updated = await prisma.subscriptionVisit.update({
        where: { id: visitId },
        data: {
          assignedTechnicianId: null,
          technician: Prisma.DbNull,
          status: newStatus,
          timeline: updatedTimeline,
        },
      });

      await AuditLog.create({
        adminId: req.admin?._id?.toString() || 'admin',
        adminName: req.admin?.name || 'Admin',
        adminRole: req.admin?.role || 'manager',
        action: 'تعيين فني لزيارة اشتراك',
        module: 'subscriptions',
        entityType: 'subscription_visit',
        entityId: visitId,
        target: visitId,
        details: `تم إلغاء تعيين الفني للزيارة #${visitId}`,
      });

      sendSuccess(res, updated, 'تم إلغاء تعيين الفني بنجاح');
    }
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Update visit status (e.g. assigned, in_progress, completed, cancelled)
 */
export async function updateVisitStatusAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const visitId = req.params.visitId as string;
    const { status, notes } = req.body;

    const allowed = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      sendError(res, 'حالة الزيارة المحددة غير صالحة', 400, 'INVALID_STATUS');
      return;
    }

    if (status === 'completed') {
      // Exactly once: increments usedVisits, decrements remainingVisits, awards cashback
      const result = await completeSubscriptionVisit({
        visitId,
        adminActor: {
          id: req.admin?._id?.toString() || 'admin',
          name: req.admin?.name || 'Admin',
          role: req.admin?.role || 'manager',
        },
      });

      sendSuccess(res, result.updatedVisit, 'تم إكمال الزيارة وتحديث رصيد الاشتراك والكاش باك بنجاح');
      return;
    }

    const visit = await prisma.subscriptionVisit.findUnique({ where: { id: visitId } });
    if (!visit) {
      sendError(res, 'زيارة الاشتراك غير موجودة', 404, 'VISIT_NOT_FOUND');
      return;
    }

    const updatedTimeline = Array.isArray(visit.timeline) ? [...(visit.timeline as any[])] : [];
    updatedTimeline.push({
      status,
      label: `تحديث الحالة إلى (${status})`,
      labelEn: `Status updated to ${status}`,
      timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      completed: true,
      description: notes || `تم تحديث حالة الزيارة بواسطة المشرف ${req.admin?.name}`,
      changedBy: req.admin?.name || 'Admin',
    });

    const updated = await prisma.subscriptionVisit.update({
      where: { id: visitId },
      data: {
        status,
        ...(notes ? { notes: String(notes) } : {}),
        timeline: updatedTimeline,
      },
    });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'manager',
      action: 'تحديث حالة زيارة اشتراك',
      module: 'subscriptions',
      entityType: 'subscription_visit',
      entityId: visitId,
      target: visitId,
      details: `تم تحديث حالة الزيارة #${visitId} إلى (${status})`,
    });

    sendSuccess(res, updated, 'تم تحديث حالة الزيارة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Override reschedule visit
 */
export async function rescheduleVisitAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const visitId = req.params.visitId as string;
    const { newDate, newTime, reason } = req.body;

    const updated = await rescheduleSubscriptionVisit({
      visitId,
      newDate,
      newTime,
      actor: 'admin',
      actorId: req.admin?._id?.toString() || 'admin',
      actorName: req.admin?.name || 'Admin',
      actorRole: req.admin?.role || 'manager',
      reason,
      overrideRestrictions: true,
    });

    sendSuccess(res, updated, 'تم إعادة جدولة موعد الزيارة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || 400);
  }
}

/**
 * Admin: Override cancel visit
 */
export async function cancelVisitAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const visitId = req.params.visitId as string;
    const { reason } = req.body;

    const updated = await cancelSubscriptionVisit({
      visitId,
      actor: 'admin',
      actorId: req.admin?._id?.toString() || 'admin',
      actorName: req.admin?.name || 'Admin',
      actorRole: req.admin?.role || 'manager',
      reason,
      overrideRestrictions: true,
    });

    sendSuccess(res, updated, 'تم إلغاء موعد الزيارة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || 400);
  }
}

/**
 * Admin: Get all renewals
 */
export async function getAllRenewalsAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { search, status, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { subscriptionId: { contains: q, mode: 'insensitive' } },
        { newSubscriptionId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [renewals, total] = await Promise.all([
      prisma.subscriptionRenewal.findMany({
        where,
        orderBy: { renewedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          subscription: {
            select: {
              id: true,
              customerName: true,
              customerPhone: true,
              planSnapshot: true,
              price: true,
            },
          },
        },
      }),
      prisma.subscriptionRenewal.count({ where }),
    ]);

    sendSuccess(
      res,
      {
        renewals,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'تم جلب سجلات التجديد بنجاح'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Get Subscription Settings
 */
export async function getSubscriptionSettingsHandler(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const settings = await getSubscriptionSettings();
    sendSuccess(res, settings, 'تم جلب إعدادات الاشتراكات بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Update Subscription Settings
 */
export async function updateSubscriptionSettingsHandler(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const {
      subscriptionCancellationNoticeHours,
      subscriptionRescheduleNoticeHours,
      normalBookingCancellationNoticeHours,
      normalBookingRescheduleNoticeHours,
      reminderBeforeAppointmentHours,
      reminderBeforeExpirationDays,
    } = req.body;

    const currentDoc = (await SystemSettings.findOne({ key: 'global_settings' })) || {};
    const existingSub = currentDoc.subscriptions || {};

    const updatedSubConfig = {
      ...existingSub,
      ...(subscriptionCancellationNoticeHours !== undefined
        ? { subscriptionCancellationNoticeHours: Number(subscriptionCancellationNoticeHours) }
        : {}),
      ...(subscriptionRescheduleNoticeHours !== undefined
        ? { subscriptionRescheduleNoticeHours: Number(subscriptionRescheduleNoticeHours) }
        : {}),
      ...(normalBookingCancellationNoticeHours !== undefined
        ? { normalBookingCancellationNoticeHours: Number(normalBookingCancellationNoticeHours) }
        : {}),
      ...(normalBookingRescheduleNoticeHours !== undefined
        ? { normalBookingRescheduleNoticeHours: Number(normalBookingRescheduleNoticeHours) }
        : {}),
      ...(reminderBeforeAppointmentHours !== undefined
        ? { reminderBeforeAppointmentHours: Number(reminderBeforeAppointmentHours) }
        : {}),
      ...(reminderBeforeExpirationDays !== undefined
        ? { reminderBeforeExpirationDays: Number(reminderBeforeExpirationDays) }
        : {}),
    };

    await prisma.systemSettings.upsert({
      where: { key: 'global_settings' },
      update: { subscriptions: updatedSubConfig },
      create: { key: 'global_settings', subscriptions: updatedSubConfig },
    });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'manager',
      action: 'تعديل إعدادات الاشتراكات وقواعد الإلغاء',
      module: 'subscriptions',
      target: 'global_settings',
      details: 'تم تحديث سياسات الإلغاء والإشعارات للاشتراكات والحجوزات العادية',
    });

    const newSettings = await getSubscriptionSettings();
    sendSuccess(res, newSettings, 'تم حفظ إعدادات الاشتراكات بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

import { runSubscriptionSchedulerCycle } from '../services/subscriptionSchedulerService.js';

/**
 * Admin: Get Subscription Analytics & KPIs from PostgreSQL
 */
export async function getSubscriptionAnalyticsHandler(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { range, startDate, endDate } = req.query;

    const analytics = await getSubscriptionAnalytics({
      range: range ? String(range) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
    });
    sendSuccess(res, analytics, 'تم احتساب مؤشرات أداء الاشتراكات بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Trigger subscription scheduler manually for testing and ad-hoc runs
 */
export async function triggerSubscriptionScheduler(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const result = await runSubscriptionSchedulerCycle();
    sendSuccess(res, result, 'تم تشغيل دورة إشعارات وجدولة الاشتراكات بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
