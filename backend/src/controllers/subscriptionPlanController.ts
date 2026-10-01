import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Service } from '../models/Service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';
import { AuditLog } from '../models/AuditLog.js';

/**
 * Public: List active subscription plans for customer selection
 */
export async function listPlansPublic(req: Request, res: Response): Promise<void> {
  try {
    const { serviceId, category } = req.query;

    const where: any = { status: 'active' };
    if (serviceId) {
      where.serviceId = String(serviceId);
    }
    if (category) {
      where.service = { category: String(category) };
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: {
        service: {
          select: {
            id: true,
            title: true,
            titleEn: true,
            category: true,
            image: true,
            duration: true,
            price: true,
          },
        },
      },
    });

    sendSuccess(res, plans, 'تم جلب باقات الاشتراكات بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: List all subscription plans with filters, search, and pagination
 */
export async function listPlansAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { search, status, serviceId, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (serviceId) {
      where.serviceId = String(serviceId);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [plans, total] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
        include: {
          service: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              category: true,
              image: true,
            },
          },
          _count: {
            select: { subscriptions: true },
          },
        },
      }),
      prisma.subscriptionPlan.count({ where }),
    ]);

    sendSuccess(
      res,
      {
        plans,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'تم جلب قائمة باقات الاشتراكات بنجاح'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Get plan by ID
 */
export async function getPlanById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        service: true,
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      sendError(res, 'باقة الاشتراك غير موجودة', 404, 'PLAN_NOT_FOUND');
      return;
    }

    sendSuccess(res, plan, 'تم جلب تفاصيل الباقة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

function sanitizeImageUrl(url: any): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/**
 * Admin: Create a new Subscription Plan
 */
export async function createPlan(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      nameEn,
      description,
      descriptionEn,
      image,
      imageUrl,
      serviceId,
      visitCount,
      price,
      durationDays = 30,
      status = 'active',
      allowRenewal = true,
      allowAutoRenewal,
      allowCancellation = true,
      allowRescheduling = true,
      cancellationNoticeHours = 12,
      rescheduleNoticeHours = 12,
      cashbackPercentage = 0,
      cashbackAmount = 0,
      terms = '',
      termsEn = '',
      features = [],
      featuresEn = [],
      order = 0,
    } = req.body;

    // Strict Validations
    if (!name || !String(name).trim()) {
      sendError(res, 'اسم باقة الاشتراك مطلوب', 400, 'MISSING_PLAN_NAME');
      return;
    }

    if (!serviceId) {
      sendError(res, 'يرجى اختيار الخدمة المرتبطة بالباقة', 400, 'MISSING_SERVICE_ID');
      return;
    }

    const service = await Service.findOne({ id: serviceId });
    if (!service) {
      sendError(res, 'الخدمة المحددة غير موجودة', 404, 'SERVICE_NOT_FOUND');
      return;
    }

    if (!service.available || (service as any).isArchived || (service as any).active === false) {
      sendError(res, 'الخدمة المختارة غير مفعلة ولا يمكن إنشاء باقات جديدة لها', 400, 'SERVICE_INACTIVE');
      return;
    }

    const count = parseInt(String(visitCount), 10);
    if (isNaN(count) || count <= 0) {
      sendError(res, 'عدد الزيارات الشهرية يجب أن يكون رقمًا أكبر من الصفر', 400, 'INVALID_VISIT_COUNT');
      return;
    }

    const planPrice = parseFloat(String(price));
    if (isNaN(planPrice) || planPrice < 0) {
      sendError(res, 'سعر الباقة يجب أن يكون رقمًا أكبر من أو يساوي الصفر', 400, 'INVALID_PRICE');
      return;
    }

    const effectiveImage = sanitizeImageUrl(image || imageUrl);
    const effectiveAllowRenewal = allowAutoRenewal !== undefined ? Boolean(allowAutoRenewal) : Boolean(allowRenewal);

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: String(name).trim(),
        nameEn: nameEn ? String(nameEn).trim() : '',
        description: description ? String(description).trim() : '',
        descriptionEn: descriptionEn ? String(descriptionEn).trim() : '',
        image: effectiveImage,
        serviceId,
        visitCount: count,
        price: planPrice,
        durationDays: parseInt(String(durationDays), 10) || 30,
        status: status === 'inactive' ? 'inactive' : 'active',
        allowRenewal: effectiveAllowRenewal,
        allowCancellation: Boolean(allowCancellation),
        allowRescheduling: Boolean(allowRescheduling),
        cancellationNoticeHours: parseInt(String(cancellationNoticeHours), 10) || 12,
        rescheduleNoticeHours: parseInt(String(rescheduleNoticeHours), 10) || 12,
        cashbackPercentage: parseFloat(String(cashbackPercentage)) || 0,
        cashbackAmount: parseFloat(String(cashbackAmount)) || 0,
        terms: terms ? String(terms).trim() : '',
        termsEn: termsEn ? String(termsEn).trim() : '',
        features: Array.isArray(features) ? features : [],
        featuresEn: Array.isArray(featuresEn) ? featuresEn : [],
        order: parseInt(String(order), 10) || 0,
      },
      include: { service: true },
    });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'manager',
      action: 'إنشاء باقة اشتراك جديدة',
      module: 'subscriptions',
      entityType: 'subscription_plan',
      entityId: plan.id,
      target: plan.id,
      details: `تم إنشاء باقة (${plan.name}) لخدمة (${service.title}) بسعر ${plan.price} ج.م لـ ${plan.visitCount} زيارات`,
    });

    sendSuccess(res, plan, 'تم إنشاء باقة الاشتراك بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Update an existing Subscription Plan
 */
export async function updatePlan(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'باقة الاشتراك غير موجودة', 404, 'PLAN_NOT_FOUND');
      return;
    }

    const {
      name,
      nameEn,
      description,
      descriptionEn,
      image,
      imageUrl,
      serviceId,
      visitCount,
      price,
      durationDays,
      status,
      allowRenewal,
      allowAutoRenewal,
      allowCancellation,
      allowRescheduling,
      cancellationNoticeHours,
      rescheduleNoticeHours,
      cashbackPercentage,
      cashbackAmount,
      terms,
      termsEn,
      features,
      featuresEn,
      order,
    } = req.body;

    const data: any = {};

    if (image !== undefined || imageUrl !== undefined) {
      data.image = sanitizeImageUrl(image !== undefined ? image : imageUrl);
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        sendError(res, 'اسم باقة الاشتراك لا يمكن أن يكون فارغاً', 400, 'INVALID_NAME');
        return;
      }
      data.name = String(name).trim();
    }
    if (nameEn !== undefined) data.nameEn = String(nameEn).trim();
    if (description !== undefined) data.description = String(description).trim();
    if (descriptionEn !== undefined) data.descriptionEn = String(descriptionEn).trim();

    if (serviceId !== undefined) {
      const srv = await Service.findOne({ id: serviceId });
      if (!srv) {
        sendError(res, 'الخدمة المختارة غير موجودة', 404, 'SERVICE_NOT_FOUND');
        return;
      }
      if (!srv.available || (srv as any).isArchived || (srv as any).active === false) {
        sendError(res, 'الخدمة المختارة غير مفعلة', 400, 'SERVICE_INACTIVE');
        return;
      }
      data.serviceId = serviceId;
    }

    if (visitCount !== undefined) {
      const c = parseInt(String(visitCount), 10);
      if (isNaN(c) || c <= 0) {
        sendError(res, 'عدد الزيارات يجب أن يكون أكبر من الصفر', 400, 'INVALID_COUNT');
        return;
      }
      data.visitCount = c;
    }

    if (price !== undefined) {
      const p = parseFloat(String(price));
      if (isNaN(p) || p < 0) {
        sendError(res, 'سعر الباقة يجب أن يكون أكبر من أو يساوي الصفر', 400, 'INVALID_PRICE');
        return;
      }
      data.price = p;
    }

    if (durationDays !== undefined) data.durationDays = parseInt(String(durationDays), 10) || 30;
    if (status !== undefined) data.status = ['active', 'inactive', 'archived'].includes(status) ? status : existing.status;
    if (allowAutoRenewal !== undefined || allowRenewal !== undefined) {
      data.allowRenewal = allowAutoRenewal !== undefined ? Boolean(allowAutoRenewal) : Boolean(allowRenewal);
    }
    if (allowCancellation !== undefined) data.allowCancellation = Boolean(allowCancellation);
    if (allowRescheduling !== undefined) data.allowRescheduling = Boolean(allowRescheduling);
    if (cancellationNoticeHours !== undefined) data.cancellationNoticeHours = parseInt(String(cancellationNoticeHours), 10) || 12;
    if (rescheduleNoticeHours !== undefined) data.rescheduleNoticeHours = parseInt(String(rescheduleNoticeHours), 10) || 12;
    if (cashbackPercentage !== undefined) data.cashbackPercentage = parseFloat(String(cashbackPercentage)) || 0;
    if (cashbackAmount !== undefined) data.cashbackAmount = parseFloat(String(cashbackAmount)) || 0;
    if (terms !== undefined) data.terms = String(terms).trim();
    if (termsEn !== undefined) data.termsEn = String(termsEn).trim();
    if (features !== undefined) data.features = Array.isArray(features) ? features : [];
    if (featuresEn !== undefined) data.featuresEn = Array.isArray(featuresEn) ? featuresEn : [];
    if (order !== undefined) data.order = parseInt(String(order), 10) || 0;

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data,
      include: { service: true },
    });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'manager',
      action: 'تعديل باقة اشتراك',
      module: 'subscriptions',
      entityType: 'subscription_plan',
      entityId: updated.id,
      target: updated.id,
      details: `تم تحديث بيانات باقة (${updated.name})`,
    });

    sendSuccess(res, updated, 'تم تحديث باقة الاشتراك بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Toggle Plan status (active / inactive)
 */
export async function togglePlanStatus(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });

    if (!plan) {
      sendError(res, 'باقة الاشتراك غير موجودة', 404, 'PLAN_NOT_FOUND');
      return;
    }

    const newStatus = plan.status === 'active' ? 'inactive' : 'active';

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: { status: newStatus },
    });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'manager',
      action: newStatus === 'active' ? 'تفعيل باقة اشتراك' : 'إيقاف باقة اشتراك',
      module: 'subscriptions',
      entityType: 'subscription_plan',
      entityId: id,
      target: id,
      details: `تم تغيير حالة باقة (${plan.name}) إلى ${newStatus}`,
    });

    sendSuccess(res, updated, `تم ${newStatus === 'active' ? 'تفعيل' : 'إلغاء تفعيل'} باقة الاشتراك بنجاح`);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: Safe delete plan (only if no existing subscriptions linked)
 */
export async function deletePlan(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      sendError(res, 'باقة الاشتراك غير موجودة', 404, 'PLAN_NOT_FOUND');
      return;
    }

    const linkedSubscriptionsCount = await prisma.subscription.count({
      where: { planId: id },
    });

    if (linkedSubscriptionsCount > 0) {
      // Safe business rule: Archive instead of hard-deleting when records exist
      await prisma.subscriptionPlan.update({
        where: { id },
        data: { status: 'archived' },
      });

      sendSuccess(res, { archived: true }, 'تم أرشفة باقة الاشتراك لوجود اشتراكات مرتبطة بها سابقاً');
      return;
    }

    await prisma.subscriptionPlan.delete({ where: { id } });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'manager',
      action: 'حذف باقة اشتراك',
      module: 'subscriptions',
      entityType: 'subscription_plan',
      entityId: id,
      target: id,
      details: `تم حذف باقة (${plan.name}) نهائياً`,
    });

    sendSuccess(res, { id, deleted: true }, 'تم حذف باقة الاشتراك بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
