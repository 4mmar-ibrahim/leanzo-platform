import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Booking, BookingStatus } from '../models/Booking.js';
import { CustomerAddress } from '../models/CustomerAddress.js';
import { CouponUsage } from '../models/CouponUsage.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';
import {
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
  CANONICAL_PHONE_ERROR_CODE,
} from '../utils/phoneValidator.js';

export async function getAllCustomersAdmin(req: Request, res: Response): Promise<void> {
  try {
    const {
      search,
      status,
      source,
      dateFrom,
      dateTo,
      minSpent,
      maxSpent,
      minOrders,
      maxOrders,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query;

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (source && source !== 'all') filter.source = source;

    // Search query
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Spending range filter
    if (minSpent !== undefined || maxSpent !== undefined) {
      filter.totalSpent = {};
      if (minSpent !== undefined && minSpent !== '') {
        filter.totalSpent.$gte = Number(minSpent);
      }
      if (maxSpent !== undefined && maxSpent !== '') {
        filter.totalSpent.$lte = Number(maxSpent);
      }
    }

    // Orders count range filter
    if (minOrders !== undefined || maxOrders !== undefined) {
      filter.ordersCount = {};
      if (minOrders !== undefined && minOrders !== '') {
        filter.ordersCount.$gte = Number(minOrders);
      }
      if (maxOrders !== undefined && maxOrders !== '') {
        filter.ordersCount.$lte = Number(maxOrders);
      }
    }

    // Sorting
    const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortDir };

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [customers, total] = await Promise.all([
      User.find(filter).select('-password').sort(sort).skip(skip).limit(limitNum),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, {
      customers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getCustomerDetailsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const id = (req.params.id as string) || '';

    let customer = await User.findById(id).select('-password');
    if (!customer) {
      customer = await User.findOne({ $or: [{ phone: id }, { email: id }, { id }] }).select('-password');
    }

    if (!customer) {
      sendError(res, 'العميل غير موجود', 404);
      return;
    }

    const bookings = await Booking.find({
      $or: [{ customerId: customer._id }, { customerPhone: customer.phone }],
    }).sort({ createdAt: -1 });

    // Calculate real stats directly from database records
    const totalOrders = bookings.length;
    const completedOrders = bookings.filter((b) => b.status === 'completed').length;
    const cancelledOrders = bookings.filter((b) => b.status === 'cancelled').length;
    const pendingOrders = bookings.filter((b) => b.status === 'pending').length;
    const inProgressOrders = bookings.filter((b) =>
      ['in_progress', 'assigned', 'confirmed'].includes(b.status)
    ).length;

    // Real total spent from completed bookings (or bookings with positive payment)
    const totalSpent = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);

    const averageOrderValue = completedOrders > 0 ? Math.round(totalSpent / completedOrders) : 0;

    // Services breakdown
    const serviceMap = new Map<
      string,
      { id: string; title: string; category: string; count: number; totalSpent: number; lastUsed: string }
    >();

    bookings.forEach((b) => {
      const sId = b.serviceId || b.serviceSnapshot?.id || 'service-general';
      const sTitle = b.serviceSnapshot?.title || 'خدمة كلينزو';
      const sCat = b.category || b.serviceSnapshot?.category || 'car';
      const current = serviceMap.get(sId) || {
        id: sId,
        title: sTitle,
        category: sCat,
        count: 0,
        totalSpent: 0,
        lastUsed: b.date || '',
      };

      current.count += 1;
      if (b.status === 'completed') {
        current.totalSpent += Number(b.finalPrice) || 0;
      }
      if (b.date && (!current.lastUsed || b.date > current.lastUsed)) {
        current.lastUsed = b.date;
      }
      serviceMap.set(sId, current);
    });

    const servicesBreakdown = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count);

    // Promotions & coupons used
    const promotionsUsed = bookings
      .filter(
        (b) =>
          (b.promoCode && b.promoCode.trim()) ||
          (b.couponSnapshot && b.couponSnapshot.couponCode) ||
          (typeof b.discount === 'number' && b.discount > 0)
      )
      .map((b) => ({
        orderId: b.id,
        date: b.date,
        promoCode: b.promoCode || b.couponSnapshot?.couponCode || 'خصم خاص',
        discountAmount:
          b.couponSnapshot?.actualDiscountAmount ||
          b.couponSnapshot?.discountAmount ||
          b.discount ||
          0,
        finalPrice: b.finalPrice,
        status: b.status,
      }));

    // Monthly Trend aggregated from DB bookings
    const monthlyMap = new Map<string, { month: string; label: string; ordersCount: number; spending: number }>();
    bookings.forEach((b) => {
      const dateStr = b.date || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '');
      if (dateStr) {
        const monthKey = dateStr.slice(0, 7); // YYYY-MM
        const current = monthlyMap.get(monthKey) || {
          month: monthKey,
          label: monthKey,
          ordersCount: 0,
          spending: 0,
        };
        current.ordersCount += 1;
        if (b.status === 'completed') {
          current.spending += Number(b.finalPrice) || 0;
        }
        monthlyMap.set(monthKey, current);
      }
    });
    const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Audit logs for customer activity
    let activityLogs: any[] = [];
    try {
      activityLogs = await AuditLog.find({
        $or: [
          { entityId: customer._id.toString() },
          { targetId: customer._id.toString() },
          { target: customer.name },
          { 'metadata.phone': customer.phone },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(40);
    } catch {
      activityLogs = [];
    }

    sendSuccess(res, {
      customer,
      bookings,
      summary: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        inProgressOrders,
        totalSpent,
        averageOrderValue,
        servicesCount: servicesBreakdown.length,
        servicesBreakdown,
        promotionsUsed,
        monthlyTrend,
      },
      activityLogs,
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function createCustomerAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { name, phone, password, email, status = 'active', tags = [], discount = 0, source } = req.body;

    if (!name || !phone || typeof name !== 'string' || typeof phone !== 'string') {
      sendError(res, 'يرجى إدخال اسم العميل ورقم الهاتف', 400, 'MISSING_FIELDS');
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

    // Check duplicate phone
    const existing = await User.findOne({ phone: cleanPhone });
    if (existing) {
      sendError(res, 'رقم الهاتف مسجل بالفعل لحساب عميل آخر', 409, 'PHONE_ALREADY_EXISTS');
      return;
    }

    // Check duplicate email if provided
    if (email && typeof email === 'string' && email.trim()) {
      const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        sendError(res, 'البريد الإلكتروني مسجل بالفعل لحساب آخر', 409, 'EMAIL_ALREADY_EXISTS');
        return;
      }
    }

    // Customer source normalization:
    // Allowed values: whatsapp, facebook, instagram, telegram, tiktok, other
    const allowedSources = ['whatsapp', 'facebook', 'instagram', 'telegram', 'tiktok', 'other'];
    let cleanSource = 'other';
    if (source && typeof source === 'string') {
      const s = source.trim().toLowerCase();
      cleanSource = allowedSources.includes(s) ? s : 'other';
    }

    // Password handling:
    let hashedPassword = '';
    if (password && typeof password === 'string' && password.trim().length > 0) {
      const trimmed = password.trim();
      if (trimmed.length < 6) {
        sendError(res, 'كلمة المرور يجب أن تتكون من 6 خانات على الأقل', 400, 'PASSWORD_TOO_SHORT');
        return;
      }
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(trimmed, salt);
    } else {
      // Safe uninitialized password sentinel: prevents login with empty password, but satisfies DB constraint
      const uninitializedSentinel = `$UNINITIALIZED$${crypto.randomUUID()}_${Date.now()}`;
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(uninitializedSentinel, salt);
    }

    const newCustomer = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      password: hashedPassword,
      email: email && typeof email === 'string' && email.trim() ? email.trim() : undefined,
      status,
      tags: Array.isArray(tags) ? tags : [],
      discount: Number(discount) || 0,
      source: cleanSource,
      addresses: [],
    });

    const adminName = req.admin?.name || req.admin?.username || 'المشرف';
    const adminId = req.admin?._id ? req.admin._id.toString() : req.admin?.id || 'admin';
    const adminRole = req.admin?.role || 'manager';

    // Activity Log context for audit middleware
    (req as any).auditAction = 'create_customer';
    (req as any).auditTarget = newCustomer.name;
    (req as any).auditDetails = cleanSource;
    (req as any).auditStatus = 'success';
    (req as any).auditAfter = {
      id: newCustomer._id.toString(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      source: newCustomer.source,
      status: newCustomer.status,
    };

    // Explicitly create an Activity Log / Audit Log entry as required by Prompt Section 8
    try {
      await AuditLog.create({
        actorId: adminId,
        actorName: adminName,
        actorRole: adminRole,
        adminId,
        adminName,
        adminRole,
        action: 'create_customer',
        module: 'customers',
        entityType: 'customer',
        entityId: newCustomer._id.toString(),
        target: newCustomer.name,
        targetId: newCustomer._id.toString(),
        description: `قام المشرف (${adminName}) بإنشاء حساب عميل جديد: ${newCustomer.name} (الهاتف: ${newCustomer.phone}) عبر قناة: ${cleanSource}`,
        details: `قناة الاكتساب: ${cleanSource}`,
        status: 'success',
        metadata: {
          customerId: newCustomer._id.toString(),
          customerName: newCustomer.name,
          phone: newCustomer.phone,
          sourcePlatform: cleanSource,
        },
        after: {
          id: newCustomer._id.toString(),
          name: newCustomer.name,
          phone: newCustomer.phone,
          source: newCustomer.source,
        },
      });
    } catch (auditErr) {
      console.warn('[ActivityLog] Direct audit log persist notice:', auditErr);
    }

    sendSuccess(res, newCustomer, 'تم إنشاء حساب العميل بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message || 'فشل إنشاء حساب العميل', 500);
  }
}

export async function updateCustomerStatusAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, note, tags, discount, name, phone, email } = req.body;

    const customer = await User.findById(id);
    if (!customer) {
      sendError(res, 'العميل غير موجود', 404);
      return;
    }

    if (name && typeof name === 'string' && name.trim()) {
      customer.name = name.trim();
    }

    if (email !== undefined) {
      customer.email = email ? String(email).trim() : undefined;
    }

    if (phone !== undefined) {
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

      if (cleanPhone !== customer.phone) {
        const existing = await User.findOne({ phone: cleanPhone });
        if (existing && String(existing._id || existing.id) !== String(customer._id || customer.id)) {
          sendError(res, 'رقم الهاتف مسجل بالفعل لحساب عميل آخر', 409, 'PHONE_ALREADY_EXISTS');
          return;
        }
        customer.phone = cleanPhone;
      }
    }

    if (status) {
      customer.status = status;
      if (status === 'active') {
        customer.isDeleted = false;
        customer.deletedAt = null;
        customer.deletedBy = null;
        customer.deletionReason = null;
      } else if (status === 'deleted' || status === 'disabled') {
        customer.isDeleted = true;
        customer.deletedAt = new Date();
        customer.deletedBy = (req as any).admin?.name || 'admin';
      }
    }
    if (tags) customer.tags = tags;
    if (discount !== undefined) customer.discount = Number(discount);
    if (!Array.isArray(customer.notes)) {
      customer.notes = [];
    }
    if (note) {
      customer.notes.push({
        id: `note-${Date.now()}`,
        text: note,
        date: new Date().toISOString().split('T')[0],
        author: (req as any).admin?.name || 'admin',
      });
    }

    await customer.save();
    sendSuccess(res, customer, 'تم تحديث بيانات العميل بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Hard Delete Customer Account permanently from PostgreSQL Database.
 * Releases phone and email so the account can be re-registered or recreated from scratch with zero trace.
 */
export async function deleteCustomerAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);
    if (!customer) {
      sendError(res, 'العميل غير موجود', 404, 'CUSTOMER_NOT_FOUND');
      return;
    }

    const adminName = req.admin?.name || req.admin?.username || 'admin';
    const customerIdStr = String(customer._id || customer.id);
    const customerPhone = customer.phone;
    const customerName = customer.name;

    const isHard = req.query.hard === 'true';

    // 1. Cancel active in-flight orders for this customer
    const activeStatuses: BookingStatus[] = ['pending', 'confirmed', 'assigned', 'in_progress'];
    const activeBookings = await Booking.find({
      $or: [{ customerId: customerIdStr }, { customerPhone }],
      status: { $in: activeStatuses },
    });

    for (const b of activeBookings) {
      const existingMeta =
        b.metadata && typeof b.metadata === 'object' && !Array.isArray(b.metadata) ? b.metadata : {};
      await Booking.updateOne(
        { _id: b._id },
        {
          $set: {
            status: 'cancelled',
            metadata: {
              ...existingMeta,
              cancelledDueToAccountDeletion: true,
              accountDeletedAt: new Date(),
              accountDeletedBy: adminName,
            },
          },
        }
      );
    }

    if (isHard) {
      await Booking.updateMany({ customerId: customerIdStr }, { $set: { customerId: null } });
      await CouponUsage.updateMany({ customerId: customerIdStr }, { $set: { customerId: null } });
      await CustomerAddress.deleteMany({ userId: customerIdStr });
      await Notification.deleteMany({ userId: customerIdStr });
      await User.deleteOne({ id: customerIdStr });

      (req as any).auditAction = 'delete_customer_hard';
      sendSuccess(res, { deletedId: customerIdStr, deleted: true, status: 'deleted', isDeleted: true }, 'تم حذف الحساب نهائياً');
      return;
    }

    // Default Soft Delete
    customer.status = 'deleted';
    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.deletedBy = adminName;
    customer.deletionReason = req.body?.reason || 'حذف الحساب من قِبل الإدارة';
    await customer.save();

    (req as any).auditAction = 'delete_customer_soft';
    (req as any).auditTarget = customerName;
    (req as any).auditStatus = 'warning';
    (req as any).auditDetails = `قام المشرف (${adminName}) بحذف حساب العميل (${customerName}) ناعماً وحظر دخوله.`;

    sendSuccess(
      res,
      customer,
      'تم إيقاف وحذف حساب العميل بنجاح'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Restore / Reactivate Customer Account.
 * Reverses soft-delete, restores status to 'active', and re-enables login.
 */
export async function restoreCustomerAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const customer = await User.findById(id);
    if (!customer) {
      sendError(res, 'العميل غير موجود', 404, 'CUSTOMER_NOT_FOUND');
      return;
    }

    const adminName = req.admin?.name || req.admin?.username || 'admin';

    customer.status = 'active';
    customer.isDeleted = false;
    customer.deletedAt = null;
    customer.deletedBy = null;
    customer.deletionReason = null;

    if (!Array.isArray(customer.notes)) {
      customer.notes = [];
    }

    customer.notes.push({
      id: `note-${Date.now()}`,
      text: `[إجراء إداري] تم استعادة وتفعيل حساب العميل بنجاح وإلغاء الحظر بواسطة المشرف: ${adminName}`,
      date: new Date().toISOString().split('T')[0],
      author: adminName,
    });

    await customer.save();

    (req as any).auditAction = 'restore_customer';
    (req as any).auditTarget = customer.name;
    (req as any).auditStatus = 'success';
    (req as any).auditDetails = `قام المشرف (${adminName}) باستعادة وتفعيل حساب العميل (${customer.name} - ${customer.phone}) وإلغاء الحظر.`;

    sendSuccess(res, customer, 'تم استعادة وتفعيل حساب العميل بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Reset Customer Password by Admin.
 * Hashes the new password using bcrypt before saving.
 * Audits the action and prevents plain-text storage or exposure.
 */
export async function resetCustomerPasswordAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword || typeof newPassword !== 'string' || typeof confirmPassword !== 'string') {
      sendError(res, 'يرجى إدخال كلمة المرور الجديدة وتأكيدها', 422, 'MISSING_FIELDS');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      sendError(res, 'كلمتا المرور غير متطابقتين', 422, 'PASSWORD_MISMATCH');
      return;
    }

    if (newPassword.trim().length < 6) {
      sendError(res, 'كلمة المرور يجب أن تتكون من 6 خانات على الأقل', 422, 'PASSWORD_TOO_SHORT');
      return;
    }

    const customer = await User.findById(id);
    if (!customer) {
      sendError(res, 'العميل غير موجود', 404, 'CUSTOMER_NOT_FOUND');
      return;
    }

    // Hash the password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);
    customer.password = hashedPassword;

    const adminName = req.admin?.name || req.admin?.username || 'admin';

    if (!Array.isArray(customer.notes)) {
      customer.notes = [];
    }

    customer.notes.push({
      id: `note-${Date.now()}`,
      text: `[إجراء أمني] تم تغيير وتعيين كلمة مرور جديدة للحساب بواسطة المشرف: ${adminName}`,
      date: new Date().toISOString().split('T')[0],
      author: adminName,
    });

    await customer.save();

    // Audit Log tracking
    (req as any).auditAction = 'reset_customer_password';
    (req as any).auditTarget = customer.name;
    (req as any).auditStatus = 'success';
    (req as any).auditDetails = `قام المشرف (${adminName}) بتغيير وتعيين كلمة مرور جديدة لحساب العميل (${customer.name} - ${customer.phone}).`;

    sendSuccess(
      res,
      {
        customerId: customer._id?.toString() || customer.id || id,
        customerName: customer.name,
        customerPhone: customer.phone,
      },
      'تم تغيير وتعيين كلمة المرور الجديدة للعميل بنجاح وبشكل آمن'
    );
  } catch (err: any) {
    sendError(res, err.message || 'فشل تغيير كلمة المرور', 500);
  }
}
