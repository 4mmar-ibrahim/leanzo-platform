import { Request, Response } from 'express';
import { Coupon, ICoupon } from '../models/Coupon.js';
import { CouponUsage } from '../models/CouponUsage.js';
import { Service } from '../models/Service.js';
import { Offer } from '../models/Offer.js';
import { AuditLog } from '../models/AuditLog.js';
import { validateCoupon, CouponValidationError } from '../services/couponService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';
import {
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
  CANONICAL_PHONE_ERROR_CODE,
} from '../utils/phoneValidator.js';

/**
 * Helper to validate coupon payload parameters strictly on the backend.
 */
function validateCouponPayload(data: any, isUpdate = false): { error?: string } {
  if (!isUpdate || data.code !== undefined) {
    if (!data.code || typeof data.code !== 'string' || !data.code.trim()) {
      return { error: 'كود الكوبون مطلوب' };
    }
    const cleanCode = data.code.trim().toUpperCase();
    if (cleanCode.length < 2 || cleanCode.length > 30) {
      return { error: 'طول كود الكوبون يجب أن يكون بين حرفين و 30 حرفاً' };
    }
    if (!/^[A-Z0-9_\-]+$/.test(cleanCode)) {
      return { error: 'كود الكوبون يجب أن يحتوي على أحرف إنجليزية وأرقام وعلامات ربط (-) فقط' };
    }
  }

  if (!isUpdate || data.discountType !== undefined) {
    if (!['percentage', 'fixed'].includes(data.discountType)) {
      return { error: 'نوع الخصم يجب أن يكون إما نسبة مئوية (percentage) أو مبلغ ثابت (fixed)' };
    }
  }

  if (!isUpdate || data.discountValue !== undefined) {
    const val = Number(data.discountValue);
    if (isNaN(val) || val <= 0) {
      return { error: 'قيمة الخصم يجب أن تكون رقماً أكبر من صفر' };
    }
    const type = data.discountType;
    if (type === 'percentage' && val > 100) {
      return { error: 'نسبة الخصم لا يمكن أن تتجاوز 100%' };
    }
  }

  if (!isUpdate || data.startDate !== undefined || data.endDate !== undefined) {
    const start = data.startDate;
    const end = data.endDate;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (start && !dateRegex.test(start)) {
      return { error: 'تنسيق تاريخ البداية غير صالح، يجب أن يكون YYYY-MM-DD' };
    }
    if (end && !dateRegex.test(end)) {
      return { error: 'تنسيق تاريخ الانتهاء غير صالح، يجب أن يكون YYYY-MM-DD' };
    }
    if (start && end && start > end) {
      return { error: 'تاريخ بداية الكوبون يجب ألا يكون بعد تاريخ الانتهاء' };
    }
  }

  if (data.totalUsageLimit !== undefined) {
    const total = Number(data.totalUsageLimit);
    if (isNaN(total) || total < 1) {
      return { error: 'إجمالي عدد مرات الاستخدام يجب أن يكون 1 على الأقل' };
    }
  }

  if (data.perCustomerLimit !== undefined) {
    const perCust = Number(data.perCustomerLimit);
    if (isNaN(perCust) || perCust < 1) {
      return { error: 'الحد الأقصى لكل عميل يجب أن يكون 1 على الأقل' };
    }
    if (data.totalUsageLimit !== undefined && perCust > Number(data.totalUsageLimit)) {
      return { error: 'الحد الأقصى لكل عميل لا يمكن أن يتجاوز الحد الإجمالي للكوبون' };
    }
  }

  if (data.minOrderAmount !== undefined && data.minOrderAmount !== null) {
    const minAmt = Number(data.minOrderAmount);
    if (isNaN(minAmt) || minAmt < 0) {
      return { error: 'الحد الأدنى لقيمة الطلب يجب أن يكون رقماً موجباً أو صفراً' };
    }
  }

  if (data.maxDiscount !== undefined && data.maxDiscount !== null && data.maxDiscount !== '') {
    const maxDisc = Number(data.maxDiscount);
    if (isNaN(maxDisc) || maxDisc < 0) {
      return { error: 'الحد الأقصى للخصم يجب أن يكون رقماً موجباً أو صفراً' };
    }
  }

  return {};
}

/**
 * Public Customer Endpoint: POST /api/coupons/validate
 * Validates coupon code against service/order and returns authoritative calculation.
 */
export async function validateCouponHandler(req: Request, res: Response): Promise<void> {
  const { code, serviceId, basePrice: reqBasePrice, customerPhone } = req.body;

  try {
    if (!code || typeof code !== 'string') {
      sendError(res, 'يرجى إدخال كود الكوبون', 422, 'COUPON_CODE_REQUIRED');
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

    let calculatedBasePrice = Number(reqBasePrice) || 0;
    if (calculatedBasePrice <= 0 && serviceId) {
      const service = await Service.findOne({ id: serviceId });
      if (service) {
        calculatedBasePrice = service.price;
      }
    }

    if (calculatedBasePrice <= 0) {
      calculatedBasePrice = 300; // Fallback sensible default if checked without service selected
    }

    const result = await validateCoupon(code, calculatedBasePrice, customerPhone, serviceId);

    // Audit log: Coupon applied successfully (Non-sensitive)
    try {
      await AuditLog.create({
        adminId: 'system-customer',
        adminName: customerPhone || 'Customer Guest',
        adminRole: 'customer',
        action: 'Coupon applied',
        module: 'coupons',
        target: result.code,
        details: `كوبون (${result.code}) تم تطبيقه بنجاح بقيمة خصم (${result.actualDiscountAmount} ج.م)`,
        metadata: {
          code: result.code,
          discountType: result.discountType,
          discountValue: result.discountValue,
          actualDiscountAmount: result.actualDiscountAmount,
        },
      });
    } catch {
      // Don't fail customer response if audit logging encounters a glitch
    }

    sendSuccess(
      res,
      {
        code: result.code,
        discountType: result.discountType,
        discountValue: result.discountValue,
        actualDiscountAmount: result.actualDiscountAmount,
        originalPrice: result.originalPrice,
        finalPrice: result.finalPrice,
        remainingTotalUsages: result.remainingTotalUsages,
        customerRemainingUsages: result.customerRemainingUsages,
      },
      `تم تطبيق الكوبون بنجاح! وفرت ${result.actualDiscountAmount} ج.م`
    );
  } catch (err: any) {
    const statusCode = err instanceof CouponValidationError ? err.statusCode : 500;
    const errorCode = err instanceof CouponValidationError ? err.code : 'VALIDATION_FAILED';

    // Audit log: Coupon rejected (Non-sensitive)
    try {
      await AuditLog.create({
        adminId: 'system-customer',
        adminName: customerPhone || 'Customer Guest',
        adminRole: 'customer',
        action: 'Coupon rejected',
        module: 'coupons',
        target: String(code || '').toUpperCase(),
        details: `محاولة استخدام كوبون فاشلة: ${err.message}`,
        metadata: {
          code: String(code || '').toUpperCase(),
          reason: err.message,
          errorCode,
        },
      });
    } catch {
      // ignore
    }

    sendError(res, err.message || 'فشل التحقق من الكوبون', statusCode, errorCode);
  }
}

/**
 * Admin: GET /api/admin/coupons
 * Returns paginated coupons with KPI stats and computed status.
 */
export async function getCouponsAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { search, status, discountType, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));

    const todayStr = new Date().toISOString().split('T')[0];

    // Filter query: only unarchived unless specifically requested
    const filter: any = { isArchived: false };

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { code: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }

    if (discountType === 'percentage' || discountType === 'fixed') {
      filter.discountType = discountType;
    }

    // Status filter handling
    if (status === 'active') {
      filter.status = 'active';
      filter.startDate = { $lte: todayStr };
      filter.endDate = { $gte: todayStr };
      filter.$expr = { $lt: ['$currentUsageCount', '$totalUsageLimit'] };
    } else if (status === 'expired') {
      filter.endDate = { $lt: todayStr };
    } else if (status === 'disabled' || status === 'inactive') {
      filter.status = 'inactive';
    } else if (status === 'exhausted') {
      filter.$expr = { $gte: ['$currentUsageCount', '$totalUsageLimit'] };
    }

    const totalMatching = await Coupon.countDocuments(filter);
    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Compute high-level KPIs across all non-archived coupons
    const allCoupons = await Coupon.find({ isArchived: false });
    let totalUsages = 0;
    let activeCount = 0;
    let expiredCount = 0;
    let exhaustedCount = 0;
    let disabledCount = 0;

    for (const c of allCoupons) {
      totalUsages += c.currentUsageCount || 0;
      const compStatus = c.getComputedStatus();
      if (compStatus === 'active') activeCount++;
      else if (compStatus === 'expired') expiredCount++;
      else if (compStatus === 'exhausted') exhaustedCount++;
      else if (compStatus === 'inactive') disabledCount++;
    }

    // Enrich coupons with remaining usages and computed status
    const enrichedCoupons = coupons.map((c) => {
      const doc = c.toObject();
      const compStatus = c.getComputedStatus();
      return {
        ...doc,
        computedStatus: compStatus,
        remainingUsages: Math.max(0, c.totalUsageLimit - c.currentUsageCount),
      };
    });

    sendSuccess(res, {
      coupons: enrichedCoupons,
      stats: {
        totalCoupons: allCoupons.length,
        activeCount,
        expiredCount,
        exhaustedCount,
        disabledCount,
        totalUsages,
      },
      pagination: {
        total: totalMatching,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalMatching / limitNum) || 1,
      },
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: GET /api/admin/coupons/:id
 */
export async function getCouponByIdAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon || coupon.isArchived) {
      sendError(res, 'الكوبون غير موجود', 404);
      return;
    }

    const doc = coupon.toObject();
    sendSuccess(res, {
      ...doc,
      computedStatus: coupon.getComputedStatus(),
      remainingUsages: Math.max(0, coupon.totalUsageLimit - coupon.currentUsageCount),
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: POST /api/admin/coupons
 * Creates a new coupon with full server-side validation.
 */
export async function createCouponAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const {
      code,
      name,
      discountType,
      discountValue,
      totalUsageLimit,
      perCustomerLimit,
      startDate,
      endDate,
      minOrderAmount,
      maxDiscount,
      applicableServiceIds,
      status = 'active',
    } = req.body;

    // 1. Validate mandatory fields
    if (!code || !discountType || discountValue === undefined || !startDate || !endDate) {
      sendError(res, 'يرجى استكمال جميع الحقول الإلزامية لإنشاء الكوبون', 422);
      return;
    }

    // 2. Comprehensive validation checks
    const valResult = validateCouponPayload(req.body, false);
    if (valResult.error) {
      sendError(res, valResult.error, 422, 'VALIDATION_ERROR');
      return;
    }

    const cleanCode = code.trim().toUpperCase();

    // 3. Uniqueness check against existing non-archived coupons
    const existing = await Coupon.findOne({ code: cleanCode, isArchived: false });
    if (existing) {
      sendError(res, `كود الكوبون (${cleanCode}) مستخدم بالفعل، يرجى اختيار كود آخر`, 409, 'DUPLICATE_CODE');
      return;
    }

    // 4. Also check against promotional offers to avoid ambiguity
    const existingOffer = await Offer.findOne({ code: cleanCode, isArchived: false });
    if (existingOffer) {
      sendError(res, `كود الكوبون (${cleanCode}) مستخدم بالفعل في عروض الخصم الترويجية`, 409, 'DUPLICATE_CODE_OFFER');
      return;
    }

    const newCoupon = await Coupon.create({
      code: cleanCode,
      name: name?.trim() || '',
      discountType,
      discountValue: Number(discountValue),
      totalUsageLimit: Number(totalUsageLimit) || 100,
      perCustomerLimit: Number(perCustomerLimit) || 1,
      minOrderAmount: minOrderAmount !== undefined && minOrderAmount !== null ? Number(minOrderAmount) : 0,
      maxDiscount: maxDiscount !== undefined && maxDiscount !== null && maxDiscount !== '' ? Number(maxDiscount) : null,
      applicableServiceIds: Array.isArray(applicableServiceIds) ? applicableServiceIds.filter(Boolean) : [],
      startDate,
      endDate,
      status: status === 'inactive' ? 'inactive' : 'active',
      currentUsageCount: 0,
      isArchived: false,
    });

    // Record audit log
    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin-owner',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'owner',
      action: 'Coupon created',
      module: 'coupons',
      target: newCoupon.code,
      targetId: newCoupon._id.toString(),
      details: `تم إنشاء كوبون جديد (${newCoupon.code}) بنوع (${newCoupon.discountType}) وقيمة (${newCoupon.discountValue})`,
      metadata: {
        code: newCoupon.code,
        discountType: newCoupon.discountType,
        discountValue: newCoupon.discountValue,
        totalUsageLimit: newCoupon.totalUsageLimit,
        perCustomerLimit: newCoupon.perCustomerLimit,
        minOrderAmount: newCoupon.minOrderAmount,
        maxDiscount: newCoupon.maxDiscount,
        applicableServiceIds: newCoupon.applicableServiceIds,
      },
    });

    sendSuccess(res, newCoupon, 'تم إنشاء الكوبون بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: PATCH /api/admin/coupons/:id
 * Updates an existing coupon with full server-side validation.
 */
export async function updateCouponAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const prevCoupon = await Coupon.findById(id);
    if (!prevCoupon || prevCoupon.isArchived) {
      sendError(res, 'الكوبون غير موجود', 404);
      return;
    }

    // 1. Comprehensive validation on updates
    const valResult = validateCouponPayload(updates, true);
    if (valResult.error) {
      sendError(res, valResult.error, 422, 'VALIDATION_ERROR');
      return;
    }

    // 2. Code uniqueness check if code is being modified
    if (updates.code) {
      updates.code = updates.code.trim().toUpperCase();
      const existing = await Coupon.findOne({
        code: updates.code,
        _id: { $ne: id },
        isArchived: false,
      });
      if (existing) {
        sendError(res, `الكود (${updates.code}) مستخدم بالفعل في كوبون آخر`, 409, 'DUPLICATE_CODE');
        return;
      }
      const existingOffer = await Offer.findOne({ code: updates.code, isArchived: false });
      if (existingOffer) {
        sendError(res, `الكود (${updates.code}) مستخدم بالفعل في العروض الترويجية`, 409, 'DUPLICATE_CODE_OFFER');
        return;
      }
    }

    // 3. Normalize numeric & array fields
    if (updates.discountValue !== undefined) updates.discountValue = Number(updates.discountValue);
    if (updates.totalUsageLimit !== undefined) updates.totalUsageLimit = Number(updates.totalUsageLimit);
    if (updates.perCustomerLimit !== undefined) updates.perCustomerLimit = Number(updates.perCustomerLimit);
    if (updates.minOrderAmount !== undefined) updates.minOrderAmount = Number(updates.minOrderAmount) || 0;
    if (updates.maxDiscount !== undefined) {
      updates.maxDiscount = updates.maxDiscount !== null && updates.maxDiscount !== '' ? Number(updates.maxDiscount) : null;
    }
    if (updates.applicableServiceIds !== undefined) {
      updates.applicableServiceIds = Array.isArray(updates.applicableServiceIds) ? updates.applicableServiceIds.filter(Boolean) : [];
    }

    const updated = await Coupon.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      sendError(res, 'فشل تحديث الكوبون', 404);
      return;
    }

    // Determine audit action
    let auditAction = 'Coupon edited';
    if (updates.status && updates.status !== prevCoupon.status) {
      auditAction = updates.status === 'active' ? 'Coupon enabled' : 'Coupon disabled';
    }

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin-owner',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'owner',
      action: auditAction,
      module: 'coupons',
      target: updated.code,
      targetId: updated._id.toString(),
      details: `تم تحديث الكوبون (${updated.code}): ${auditAction}`,
      metadata: { updates },
    });

    sendSuccess(res, updated, 'تم تحديث الكوبون بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: DELETE /api/admin/coupons/:id
 * Safely soft-deletes/archives the coupon to protect historical orders.
 */
export async function deleteCouponAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      sendError(res, 'الكوبون غير موجود', 404);
      return;
    }

    // Soft-delete/archive the coupon to protect historical orders and audit trail
    coupon.isArchived = true;
    coupon.status = 'inactive';
    await coupon.save();

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin-owner',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'owner',
      action: 'Coupon deleted/archived',
      module: 'coupons',
      target: coupon.code,
      targetId: (coupon._id || coupon.id).toString(),
      details: `تم أرشفة وحذف الكوبون (${coupon.code}) للحفاظ على تاريخ الطلبات السابقة`,
    });

    sendSuccess(res, { id, code: coupon.code, isArchived: true }, 'تم حذف وأرشفة الكوبون بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin: GET /api/admin/coupons/:id/usage
 * Returns detailed history of customers and orders that used this coupon.
 */
export async function getCouponUsageAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      sendError(res, 'الكوبون غير موجود', 404);
      return;
    }

    const [usages, distinctCustomers, ordersCount, firstUsage, lastUsage] = await Promise.all([
      CouponUsage.find({ couponId: coupon._id })
        .sort({ usedAt: -1 })
        .limit(200)
        .lean(),
      CouponUsage.distinct('customerPhone', { couponId: coupon._id }),
      CouponUsage.countDocuments({ couponId: coupon._id }),
      CouponUsage.findOne({ couponId: coupon._id }).sort({ usedAt: 1 }).select('usedAt').lean(),
      CouponUsage.findOne({ couponId: coupon._id }).sort({ usedAt: -1 }).select('usedAt').lean(),
    ]);

    const customersCount = distinctCustomers.length;
    const remaining = Math.max(0, coupon.totalUsageLimit - coupon.currentUsageCount);

    sendSuccess(res, {
      coupon: {
        id: coupon._id,
        _id: coupon._id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        totalUsageLimit: coupon.totalUsageLimit,
        used: coupon.currentUsageCount,
        currentUsageCount: coupon.currentUsageCount,
        remaining,
        remainingUsages: remaining,
        perCustomerLimit: coupon.perCustomerLimit,
        customersCount,
        ordersCount,
        firstUsedAt: firstUsage?.usedAt || null,
        lastUsedAt: lastUsage?.usedAt || coupon.lastUsedAt || null,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        status: coupon.status,
        computedStatus: coupon.getComputedStatus(),
      },
      stats: {
        totalUsageLimit: coupon.totalUsageLimit,
        used: coupon.currentUsageCount,
        remaining,
        perCustomerLimit: coupon.perCustomerLimit,
        customersCount,
        ordersCount,
        firstUsedAt: firstUsage?.usedAt || null,
        lastUsedAt: lastUsage?.usedAt || coupon.lastUsedAt || null,
      },
      usages: usages.map((u) => ({
        id: u._id,
        orderId: u.orderId,
        customerPhone: u.customerPhone,
        customerName: u.customerName || 'عميل كلينزو',
        discountType: u.discountType,
        discountValue: u.discountValue,
        discountAmount: u.actualDiscountAmount,
        actualDiscountAmount: u.actualDiscountAmount,
        originalPrice: u.originalPrice,
        finalPrice: u.finalPrice,
        usedAt: u.usedAt,
      })),
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
