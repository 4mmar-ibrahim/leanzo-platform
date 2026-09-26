import { Request, Response } from 'express';
import { Technician, ITechnician } from '../models/Technician.js';
import { Booking, BookingStatus } from '../models/Booking.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';

function findTechnicianByIdOrMongoId(id: string) {
  const isMongoId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  return Technician.findOne({
    $or: [{ id }, { _id: isMongoId ? id : null }].filter(Boolean) as any,
  });
}

/**
 * Get all technicians with live database stats
 */
export async function getAllTechniciansAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { search, status, active } = req.query;

    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (active !== undefined && active !== 'all') {
      filter.active = active === 'true';
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { specialty: { $regex: q, $options: 'i' } },
        { id: { $regex: q, $options: 'i' } },
      ];
    }

    const technicians = await Technician.find(filter).sort({ createdAt: -1 }).lean();

    // Dynamically calculate live real-time booking statistics for each technician
    const techIds = technicians.map((t) => t.id);
    const [completedAgg, currentAgg] = await Promise.all([
      Booking.aggregate([
        { $match: { assignedTechnicianId: { $in: techIds }, status: 'completed' } },
        { $group: { _id: '$assignedTechnicianId', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { assignedTechnicianId: { $in: techIds }, status: { $in: ['assigned', 'in_progress'] } } },
        { $group: { _id: '$assignedTechnicianId', count: { $sum: 1 } } },
      ]),
    ]);

    const completedMap = new Map<string, number>(completedAgg.map((a) => [a._id, a.count]));
    const currentMap = new Map<string, number>(currentAgg.map((a) => [a._id, a.count]));

    const enrichedTechnicians = technicians.map((t) => ({
      ...t,
      completedOrders: completedMap.get(t.id) ?? t.completedOrders ?? 0,
      assignedOrders: currentMap.get(t.id) ?? t.assignedOrders ?? 0,
    }));

    sendSuccess(res, enrichedTechnicians, 'تم جلب قائمة الفنيين بنجاح');
  } catch (err: any) {
    sendError(res, err.message || 'فشل جلب قائمة الفنيين', 500);
  }
}

/**
 * Get detailed Technician Profile Dashboard with real DB metrics, charts data & filterable orders
 */
export async function getTechnicianProfileAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const {
      dateFrom,
      dateTo,
      status,
      serviceId,
      category,
      completionStatus,
      search,
      page = '1',
      limit = '15',
    } = req.query;

    const technician = await findTechnicianByIdOrMongoId(id);

    if (!technician) {
      sendError(res, 'الفني غير موجود في سجلات النظام', 404, 'TECHNICIAN_NOT_FOUND');
      return;
    }

    const techId = technician.id;

    // 1. Calculate Real KPIs from Booking collection
    const [
      totalAssigned,
      completedOrders,
      cancelledOrders,
      inProgressOrders,
      pendingOrders,
      uniqueCustomerPhones,
    ] = await Promise.all([
      Booking.countDocuments({ assignedTechnicianId: techId }),
      Booking.countDocuments({ assignedTechnicianId: techId, status: 'completed' }),
      Booking.countDocuments({ assignedTechnicianId: techId, status: 'cancelled' }),
      Booking.countDocuments({ assignedTechnicianId: techId, status: 'in_progress' }),
      Booking.countDocuments({ assignedTechnicianId: techId, status: { $in: ['pending', 'confirmed', 'assigned'] } }),
      Booking.distinct('customerPhone', { assignedTechnicianId: techId }),
    ]);

    const completionRate = totalAssigned > 0 ? Math.round((completedOrders / totalAssigned) * 100) : 0;

    // 2. Services Breakdown aggregation
    const servicesAgg = await Booking.aggregate([
      { $match: { assignedTechnicianId: techId } },
      {
        $group: {
          _id: {
            title: '$serviceSnapshot.title',
            category: '$category',
            id: '$serviceId',
          },
          count: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const servicesExecuted = servicesAgg.map((item) => ({
      id: item._id.id || item._id.title,
      title: item._id.title || 'خدمة غير محددة',
      category: item._id.category || 'car',
      count: item.count,
      completedCount: item.completedCount,
    }));

    // 3. Monthly Trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAgg = await Booking.aggregate([
      {
        $match: {
          assignedTechnicianId: techId,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          assignedCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthlyTrend = monthlyAgg.map((item) => {
      const monthIdx = item._id.month - 1;
      return {
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        label: `${arabicMonths[monthIdx]} ${item._id.year}`,
        assignedCount: item.assignedCount,
        completedCount: item.completedCount,
        cancelledCount: item.cancelledCount,
      };
    });

    // 4. Filterable Orders Query
    const orderFilter: any = { assignedTechnicianId: techId };

    if (status && status !== 'all') {
      orderFilter.status = status;
    }

    if (completionStatus && completionStatus !== 'all') {
      if (completionStatus === 'completed') {
        orderFilter.status = 'completed';
      } else if (completionStatus === 'cancelled') {
        orderFilter.status = 'cancelled';
      } else if (completionStatus === 'uncompleted') {
        orderFilter.status = { $nin: ['completed', 'cancelled'] };
      }
    }

    if (category && category !== 'all') {
      orderFilter.category = category;
    }

    if (serviceId && serviceId !== 'all') {
      orderFilter.serviceId = serviceId;
    }

    if (dateFrom || dateTo) {
      orderFilter.createdAt = {};
      if (dateFrom) {
        orderFilter.createdAt.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        orderFilter.createdAt.$lte = end;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      orderFilter.$or = [
        { id: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } },
        { 'serviceSnapshot.title': { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 15);
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalOrdersCount, recentOrders] = await Promise.all([
      Booking.find(orderFilter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Booking.countDocuments(orderFilter),
      Booking.find({ assignedTechnicianId: techId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    sendSuccess(
      res,
      {
        technician,
        metrics: {
          totalAssigned,
          completedOrders,
          cancelledOrders,
          inProgressOrders,
          pendingOrders,
          uniqueCustomersCount: uniqueCustomerPhones.length,
          completionRate,
        },
        servicesExecuted,
        monthlyTrend,
        recentOrders,
        orders,
        pagination: {
          total: totalOrdersCount,
          page: pageNum,
          pages: Math.ceil(totalOrdersCount / limitNum),
          limit: limitNum,
        },
      },
      'تم جلب لوحة بيانات الفني بنجاح'
    );
  } catch (err: any) {
    sendError(res, err.message || 'فشل جلب ملف الفني', 500);
  }
}

/**
 * Create a new technician
 */
export async function createTechnicianAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { name, phone, specialty, avatar, specialtiesList, bio, nationalId, email } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      sendError(res, 'يرجى إدخال اسم الفني بالكامل', 422, 'NAME_REQUIRED');
      return;
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      sendError(res, 'يرجى إدخال رقم هاتف الفني', 422, 'PHONE_REQUIRED');
      return;
    }

    // Strict validation against raw Base64 in Database
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:image')) {
      sendError(
        res,
        'لا يُسمح بتخزين صور بصيغة Base64 في قاعدة البيانات. يرجى رفع الصورة عبر زر رفع الصورة المخصص ليتم حفظها في خادم التخزين والحفاظ على مرجع الرابط فقط.',
        422,
        'BASE64_NOT_ALLOWED'
      );
      return;
    }

    // Default placeholder if none provided
    const avatarPath = avatar && typeof avatar === 'string' && avatar.trim()
      ? avatar.trim()
      : '/uploads/images/default-avatar.png';

    const techId = `tech-${Date.now().toString().slice(-6)}`;

    const newTechnician = await Technician.create({
      id: techId,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      avatar: avatarPath,
      specialty: specialty?.trim() || 'غسيل وتلميع سيارات متنقل',
      specialtiesList: Array.isArray(specialtiesList) ? specialtiesList : ['car_wash', 'steam_wash'],
      status: 'available',
      active: true,
      rating: 5.0,
      completedOrders: 0,
      assignedOrders: 0,
      bio: bio?.trim() || '',
      nationalId: nationalId?.trim() || '',
      joinedDate: new Date(),
    });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'owner',
      action: 'create_technician',
      module: 'technicians',
      target: newTechnician.name,
      details: `تم إضافة الفني الجديد (${newTechnician.name}) برقم هاتف (${newTechnician.phone}) ومعرف (${newTechnician.id}) وحفظ صورته المرفوعة (${newTechnician.avatar})`,
      status: 'success',
    });

    sendSuccess(res, newTechnician, 'تمت إضافة الفني بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message || 'فشل إضافة الفني', 500);
  }
}

/**
 * Update an existing technician
 */
export async function updateTechnicianAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, phone, specialty, avatar, specialtiesList, status, active, bio, nationalId, email } = req.body;

    const technician = await findTechnicianByIdOrMongoId(id);

    if (!technician) {
      sendError(res, 'الفني غير موجود', 404, 'TECHNICIAN_NOT_FOUND');
      return;
    }

    // Strict validation against raw Base64 in Database
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:image')) {
      sendError(
        res,
        'لا يُسمح بتخزين صور بصيغة Base64 في قاعدة البيانات. يرجى رفع الصورة عبر زر رفع الصورة المخصص.',
        422,
        'BASE64_NOT_ALLOWED'
      );
      return;
    }

    if (name) technician.name = name.trim();
    if (phone) technician.phone = phone.trim();
    if (specialty) technician.specialty = specialty.trim();
    if (avatar) technician.avatar = avatar.trim();
    if (Array.isArray(specialtiesList)) technician.specialtiesList = specialtiesList;
    if (status && ['available', 'busy', 'offline'].includes(status)) technician.status = status;
    if (active !== undefined) technician.active = Boolean(active);
    if (bio !== undefined) technician.bio = bio;
    if (nationalId !== undefined) technician.nationalId = nationalId;
    if (email !== undefined) technician.email = email;

    await technician.save();

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'owner',
      action: 'update_technician',
      module: 'technicians',
      target: technician.name,
      details: `تم تعديل بيانات الفني (${technician.name}) وتحديث حالته إلى (${technician.status})`,
      status: 'success',
    });

    sendSuccess(res, technician, 'تم تحديث بيانات الفني بنجاح');
  } catch (err: any) {
    sendError(res, err.message || 'فشل تحديث بيانات الفني', 500);
  }
}

/**
 * Toggle availability status
 */
export async function toggleTechnicianAvailabilityAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const technician = await findTechnicianByIdOrMongoId(id);

    if (!technician) {
      sendError(res, 'الفني غير موجود', 404, 'TECHNICIAN_NOT_FOUND');
      return;
    }

    const nextStatusMap: Record<string, 'available' | 'busy' | 'offline'> = {
      available: 'busy',
      busy: 'offline',
      offline: 'available',
    };

    technician.status = nextStatusMap[technician.status] || 'available';
    await technician.save();

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'owner',
      action: 'toggle_technician_availability',
      module: 'technicians',
      target: technician.name,
      details: `تم تغيير حالة جاهزية الفني (${technician.name}) إلى (${technician.status})`,
      status: 'success',
    });

    sendSuccess(res, technician, `تم تبديل حالة الفني إلى (${technician.status})`);
  } catch (err: any) {
    sendError(res, err.message || 'فشل تبديل حالة الفني', 500);
  }
}

/**
 * Delete / deactivate technician
 */
export async function deleteTechnicianAdmin(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const technician = await findTechnicianByIdOrMongoId(id);

    if (!technician) {
      sendError(res, 'الفني غير موجود', 404, 'TECHNICIAN_NOT_FOUND');
      return;
    }

    // Check if there are active bookings currently assigned to this technician
    const activeAssignedCount = await Booking.countDocuments({
      assignedTechnicianId: technician.id,
      status: { $in: ['assigned', 'in_progress'] },
    });

    if (activeAssignedCount > 0) {
      sendError(
        res,
        `لا يمكن حذف الفني لوجود (${activeAssignedCount}) طلبات نشطة مسندة إليه حالياً. يرجى إعادة إسناد الطلبات أولاً أو استكمالها`,
        400,
        'HAS_ACTIVE_BOOKINGS'
      );
      return;
    }

    // Safe deactivation / removal
    await Technician.deleteOne({ _id: technician._id });

    await AuditLog.create({
      adminId: req.admin?._id?.toString() || 'admin',
      adminName: req.admin?.name || 'Admin',
      adminRole: req.admin?.role || 'owner',
      action: 'delete_technician',
      module: 'technicians',
      target: technician.name,
      details: `تم حذف الفني (${technician.name}) من سجلات النظام بنجاح`,
      status: 'warning',
    });

    sendSuccess(res, { id: technician.id, deleted: true }, 'تم حذف الفني بنجاح');
  } catch (err: any) {
    sendError(res, err.message || 'فشل حذف الفني', 500);
  }
}

/**
 * Public: Get active technicians for customer team showcase
 */
export async function getPublicTechnicians(req: Request, res: Response): Promise<void> {
  try {
    const technicians = await Technician.find({ active: { $ne: false } })
      .select('id name nameEn specialty specialtyEn avatar rating completedOrders bio bioEn experienceYears active available')
      .sort({ rating: -1, completedOrders: -1, createdAt: -1 })
      .lean();

    sendSuccess(res, technicians, 'تم جلب قائمة الفنيين بنجاح');
  } catch (err: any) {
    sendError(res, err.message || 'فشل جلب قائمة الفنيين', 500);
  }
}

