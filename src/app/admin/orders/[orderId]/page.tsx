'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HardHat,
  Banknote,
  Send,
  X,
  FileText,
  Trash2,
  Tag,
  ShieldCheck,
  RefreshCw,
  Printer,
  Users,
  Search,
  UserCheck,
  PlayCircle,
  Car,
} from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { apiGet } from '@/lib/api';
import { Order, OrderStatus } from '@/types';
import { generateOfficialInvoiceHtml, printHtmlDocument } from '@/lib/printUtils';
import { findConflictingOrder, formatReservationSchedule } from '@/lib/bookingEngine';
import { RescheduleModal } from '@/components/orders/RescheduleModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getCategoryDisplayName } from '@/lib/services/categoryUtils';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const updateOrderStatusApi = useOrderStore((s) => s.updateOrderStatusApi);
  const assignTechnician = useOrderStore((s) => s.assignTechnician);
  const updateOrderNotes = useOrderStore((s) => s.updateOrderNotes);
  const orders = useOrderStore((s) => s.orders);
  const fetchAdminOrders = useOrderStore((s) => s.fetchAdminOrders);
  const technicians = useTechnicianStore((s) => s.technicians);
  const fetchTechnicians = useTechnicianStore((s) => s.fetchTechnicians);
  const isLoadingTechnicians = useTechnicianStore((s) => s.isLoading);
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canEditOrders = useAdminStore((s) => s.canEdit('orders'));
  const addLog = useActivityLogStore((s) => s.addLog);

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetchingTechs, setIsFetchingTechs] = useState(false);

  const [notesText, setNotesText] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [techSearch, setTechSearch] = useState('');
  const [assigningTechId, setAssigningTechId] = useState<string | null>(null);
  const [subscriptionVisits, setSubscriptionVisits] = useState<any[]>([]);
  const [dayOrders, setDayOrders] = useState<any[]>([]);

  // Memoize unified orders list for robust cross-category conflict detection
  const allOrdersForConflict = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const o of orders) {
      if (o?.id) map.set(o.id, o);
    }
    for (const o of dayOrders) {
      if (o?.id) map.set(o.id, o);
    }
    return Array.from(map.values());
  }, [orders, dayOrders]);

  const handleOpenAssignModal = async () => {
    setTechSearch('');
    setAssignModalOpen(true);
    // Always fetch fresh technicians, date-specific orders (across all categories), and subscription visits
    setIsFetchingTechs(true);
    try {
      const targetDate = String(order?.date || '').split('T')[0].trim();
      const [, ordersRes, visitsRes] = await Promise.all([
        fetchTechnicians(),
        cleanzoApi.admin.getOrders(targetDate ? { date: targetDate, limit: 500 } : { limit: 100 }).catch(() => null),
        apiGet(targetDate ? `/subscriptions/admin/visits/all?date=${targetDate}&limit=200` : '/subscriptions/admin/visits/all?limit=200').catch(() => null),
      ]);

      if (ordersRes && Array.isArray((ordersRes as any).bookings)) {
        setDayOrders((ordersRes as any).bookings);
      }
      if (visitsRes && (visitsRes as any).data) {
        const payload = (visitsRes as any).data;
        const list = Array.isArray(payload) ? payload : payload.visits || [];
        setSubscriptionVisits(list);
      }
    } finally {
      setIsFetchingTechs(false);
    }
  };

  // Fetch live order from backend
  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const liveOrder = await cleanzoApi.admin.getOrderById(orderId);
      if (liveOrder) {
        setOrder(liveOrder);
        setNotesText(liveOrder.notes || '');
        useOrderStore.getState().addOrder(liveOrder);
      } else {
        const local = useOrderStore.getState().getOrderById(orderId);
        if (local) {
          setOrder(local);
          setNotesText(local.notes || '');
        }
      }
    } catch (err: any) {
      console.warn('Backend order fetch failed, checking local store:', err);
      const local = useOrderStore.getState().getOrderById(orderId);
      if (local) {
        setOrder(local);
        setNotesText(local.notes || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
    // Pre-fetch technicians and orders on mount
    fetchTechnicians();
    fetchAdminOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto" />
        <p className="text-xs text-slate-500 font-bold">جاري تحميل بيانات الطلب من الخادم...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">الطلب غير موجود</h2>
        <p className="text-xs text-slate-400">لم يتم العثور على طلب بالرقم {orderId}</p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-sky-500 hover:text-sky-600"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة الطلبات
        </Link>
      </div>
    );
  }

  // Handle status update to backend
  const handleStatusChange = async (newStatus: OrderStatus, customNote?: string) => {
    if (!canEditOrders) {
      toast.error('ليس لديك صلاحية لتعديل حالة الطلبات');
      return;
    }

    if (newStatus === 'cancelled') {
      setCancelModalOpen(true);
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await updateOrderStatusApi(order.id, newStatus, customNote);
      if (updated) {
        setOrder(updated);
      }
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: newStatus === 'completed' ? 'إنهاء واكتمال الطلب' : `تحديث حالة الطلب إلى ${newStatus}`,
        module: 'orders',
        target: order.id,
        details: customNote,
      });

      const statusLabelsAr: Record<string, string> = {
        pending: 'قيد المراجعة',
        confirmed: 'مؤكد',
        assigned: 'تم تعيين فني',
        on_the_way: 'الفني في الطريق',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتمل بنجاح',
        cancelled: 'ملغي',
      };
      toast.success(`تم تحديث حالة الطلب إلى: ${statusLabelsAr[newStatus] || newStatus}`);
    } catch (err: any) {
      console.error('Update status error:', err);
      toast.error(err?.message || 'فشل تحديث حالة الطلب على الخادم');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelModalOpen(false);
    await handleStatusChange('cancelled', cancelReason ? `سبب الإلغاء: ${cancelReason}` : undefined);
    setCancelReason('');
  };

  const handleAssignTech = async (tech: typeof technicians[0]) => {
    if (!order) return;
    if (!canEditOrders) {
      toast.error('ليس لديك صلاحية لتعيين الفنيين');
      return;
    }

    // Overlap prevention check across all categories
    const conflict = findConflictingOrder(order, tech.id, allOrdersForConflict, subscriptionVisits);
    if (conflict) {
      const conflictTime = conflict.time || `${conflict.scheduledStart} – ${conflict.scheduledEnd}`;
      toast.error(
        `تعذر إسناد الطلب للفني (${tech.name}): الفني مرتبط بالفعل بحجز آخر متعارض في نفس التاريخ (${order.date}) في الفترة من ${conflictTime} (${conflict.type === 'visit' ? 'زيارة اشتراك' : 'طلب'} #${conflict.id}). يرجى اختيار فني آخر غير متعارض.`
      );
      return;
    }

    setAssigningTechId(tech.id);
    try {
      await cleanzoApi.admin.assignTechnician(order.id, tech.id);
      assignTechnician(order.id, {
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
        avatar: tech.avatar,
        rating: tech.rating,
        specialty: tech.specialty,
      });
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تعيين فني للطلب',
        module: 'orders',
        target: order.id,
        details: `تم تعيين: ${tech.name}`,
      });
      toast.success(`تم إسناد الطلب للفني ${tech.name} بنجاح!`);
      await fetchOrder();
      await fetchAdminOrders();
      setAssignModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'فشل إسناد الفني على الخادم');
    } finally {
      setAssigningTechId(null);
    }
  };

  const handleSaveNotes = () => {
    updateOrderNotes(order.id, notesText);
    toast.success('تم حفظ ملاحظات الطلب بنجاح');
  };

  const coupon = order.couponSnapshot || (order as any).coupon;
  const totalDiscount = Number(order.discount) || 0;
  const couponDiscount = Number(coupon?.actualDiscountAmount || coupon?.discountAmount) || 0;
  const catalogDiscount = Math.max(0, totalDiscount - couponDiscount);

  const durationMinutes =
    order.service?.duration ||
    (order as any).serviceSnapshot?.duration ||
    (order.service as any)?.serviceDurationMinutes ||
    order.serviceDurationMinutes ||
    order.duration ||
    60;

  const schedule = formatReservationSchedule(order);

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لكافة الطلبات</span>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (!order) return;
              const html = generateOfficialInvoiceHtml(order);
              printHtmlDocument(`فاتورة رسمية - ${order.id}`, html);
              toast.success('جاري فتح الفاتورة الضريبية الرسمية للطباعة...');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0866C6] hover:bg-[#06529E] text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            title="طباعة الفاتورة الضريبية الرسمية المعتمدة"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الفاتورة الرسمية</span>
          </button>
          <button
            onClick={fetchOrder}
            disabled={isLoading || isUpdating}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-sky-500 transition-colors cursor-pointer"
            title="تحديث بيانات الطلب"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', (isLoading || isUpdating) && 'animate-spin text-sky-500')} />
          </button>
        </div>
      </div>

      {/* Completion Banner if completed */}
      {order.status === 'completed' && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-300">
                تم اكتمال تنفيذ هذا الطلب بنجاح
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {order.completedAt ? `تاريخ الإتمام: ${new Date(order.completedAt).toLocaleString('ar-EG')}` : 'تم إنهاء الزيارة والتأكد من جودة الخدمة'}
                {order.completedBy?.name && ` • المنفذ: ${order.completedBy.name}`}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg">
            مكتمل وموثق
          </span>
        </div>
      )}

      {/* Title & Status Changer Ribbon */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              طلب حجز #{order.id}
            </h1>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold',
                order.status === 'completed' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                order.status === 'pending' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                order.status === 'confirmed' && 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
                order.status === 'assigned' && 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                order.status === 'in_progress' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                order.status === 'cancelled' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            الخدمة: {order.service?.title || (order as any).serviceSnapshot?.title || 'خدمة كلينزو'} (
            {getCategoryDisplayName(order.category || (order as any).serviceSnapshot?.category, true)})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Step 1: Pending -> استلام الطلب */}
          {order.status === 'pending' && (
            <button
              onClick={() => handleStatusChange('confirmed', 'تم استلام الطلب وتأكيد الحجز')}
              disabled={!canEditOrders || isUpdating}
              className="px-4 py-2 rounded-xl text-xs font-black bg-[#0866C6] hover:bg-[#0759B0] text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>استلام الطلب</span>
            </button>
          )}

          {/* Step 2: Received (confirmed) -> تعيين فني */}
          {order.status === 'confirmed' && (
            <button
              onClick={handleOpenAssignModal}
              disabled={!canEditOrders || isUpdating}
              className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <HardHat className="w-4 h-4" />
              <span>تعيين فني</span>
            </button>
          )}

          {/* Step 3: Assigned -> الفني في الطريق أو بدء التنفيذ + تغيير الفني */}
          {order.status === 'assigned' && (
            <>
              <button
                onClick={() => handleStatusChange('on_the_way', 'تحرك الفني إلى موقع العميل')}
                disabled={!canEditOrders || isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-black bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Car className="w-4 h-4" />
                <span>الفني في الطريق</span>
              </button>
              <button
                onClick={() => handleStatusChange('in_progress', 'بدء تنفيذ الخدمة')}
                disabled={!canEditOrders || isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>بدء التنفيذ</span>
              </button>
              <button
                onClick={handleOpenAssignModal}
                disabled={!canEditOrders || isUpdating}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>تغيير الفني</span>
              </button>
            </>
          )}

          {/* Step 3.5: On the way -> بدء التنفيذ + تغيير الفني */}
          {order.status === 'on_the_way' && (
            <>
              <button
                onClick={() => handleStatusChange('in_progress', 'وصل الفني إلى الموقع وبدأ التنفيذ')}
                disabled={!canEditOrders || isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>بدء التنفيذ</span>
              </button>
              <button
                onClick={handleOpenAssignModal}
                disabled={!canEditOrders || isUpdating}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>تغيير الفني</span>
              </button>
            </>
          )}

          {/* Step 4: In Progress -> تم الانتهاء (تلقائياً ينقل الطلب إلى مكتمل) */}
          {order.status === 'in_progress' && (
            <button
              onClick={() => handleStatusChange('completed', 'تم الانتهاء من تنفيذ الطلب')}
              disabled={!canEditOrders || isUpdating}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تم الانتهاء</span>
            </button>
          )}

          {/* Reschedule allowed for active non-terminal orders */}
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <button
              onClick={() => setIsRescheduleOpen(true)}
              disabled={!canEditOrders || isUpdating}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="تعديل موعد الحجز"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>تعديل الموعد</span>
            </button>
          )}

          {/* Cancellation allowed for active non-terminal orders */}
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <button
              onClick={() => setCancelModalOpen(true)}
              disabled={!canEditOrders || isUpdating}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              إلغاء الطلب
            </button>
          )}
        </div>
      </div>

      {/* Prominent Reservation Date & Exact Start/End Time Banner (Single Source of Truth) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-r from-sky-50 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border-2 border-sky-500/30 dark:border-sky-500/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0866C6] text-white flex items-center justify-center shadow-md shadow-[#0866C6]/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Reservation • بيانات موعد الحجز المعتمدة
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                المصدر المعتمد
              </span>
              {order.rescheduledFrom && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>تم تعديل الموعد (السابق: {order.rescheduledFrom})</span>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              موعد وتوقيت تنفيذ الخدمة
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:min-w-[480px]">
          {/* Reservation Date */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <Calendar className="w-4 h-4 text-sky-500" />
                <span>Reservation Date:</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">{order.date || '—'}</span>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
              {schedule.formattedDateEn}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-semibold">
              <span>{schedule.formattedDateAr}</span>
              {schedule.dayNameAr && <span>• {schedule.dayNameAr}</span>}
            </div>
          </div>

          {/* Time: [start time] – [end time] */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-100 dark:border-slate-700/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Time:</span>
              </span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {durationMinutes} دقيقة
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
              {schedule.startTime12En} – {schedule.endTime12En}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold" dir="rtl">
              <span>{schedule.startTime12Ar} – {schedule.endTime12Ar}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Order Info & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Service & Price Breakdown */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              <span>تفاصيل الخدمة والأسعار</span>
            </h3>

            {/* If Multi-Service booking */}
            {Array.isArray((order as any).serviceSnapshot?.services) && (order as any).serviceSnapshot.services.length > 1 ? (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 block">
                  الخدمات المشمولة في الحجز ({(order as any).serviceSnapshot.services.length}):
                </span>
                <div className="space-y-2">
                  {(order as any).serviceSnapshot.services.map((subSrv: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          #{idx + 1} {subSrv.title || subSrv.titleEn}
                        </span>
                        {subSrv.package && (
                          <span className="text-sky-600 dark:text-sky-400 block text-[11px]">
                            باقة: {subSrv.package.name} ({subSrv.package.price} ج.م)
                          </span>
                        )}
                        {subSrv.addons && subSrv.addons.length > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 block text-[10px]">
                            +{subSrv.addons.length} إضافات
                          </span>
                        )}
                      </div>
                      <div className="text-end font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {subSrv.subtotal || subSrv.price} ج.م
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {subSrv.duration} دقيقة
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <img
                  src={order.service?.image || (order as any).serviceSnapshot?.image || '/images/cleanzo-logo.png'}
                  alt={order.service?.title || (order as any).serviceSnapshot?.title || 'خدمة كلينزو'}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {order.service?.title || (order as any).serviceSnapshot?.title || 'خدمة كلينزو المتميزة'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {order.service?.shortDescription || (order as any).serviceSnapshot?.titleEn || ''}
                  </p>
                  <span className="text-[10px] font-semibold text-sky-500 mt-1 inline-block">
                    المدة التقديرية: {order.service?.duration || (order as any).serviceSnapshot?.duration || 60} دقيقة
                  </span>
                </div>
              </div>
            )}

            {/* Selected Package Details */}
            {order.packageSnapshot && (
              <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500 text-white">
                      الباقة المختارة
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {order.packageSnapshot.name}
                    </span>
                  </div>
                  <div className="text-xs font-black text-sky-600 dark:text-sky-400">
                    {order.packageSnapshot.price} ج.م
                    {order.packageSnapshot.originalPrice && order.packageSnapshot.originalPrice > order.packageSnapshot.price && (
                      <span className="text-[10px] text-slate-400 line-through mr-1.5 font-normal">
                        {order.packageSnapshot.originalPrice} ج.م
                      </span>
                    )}
                  </div>
                </div>
                {order.packageSnapshot.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {order.packageSnapshot.description}
                  </p>
                )}
                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-sky-500" />
                  <span>مدة الباقة: {order.packageSnapshot.durationMinutes} دقيقة</span>
                </div>
              </div>
            )}

            {/* Selected Add-ons Details */}
            {order.addons && order.addons.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white inline-block">
                  الإضافات المطلوبة ({order.addons.length})
                </span>
                <div className="space-y-1.5">
                  {order.addons.map((addon: any, idx: number) => (
                    <div key={addon.id || idx} className="flex items-center justify-between text-xs py-1 border-b border-amber-100/60 dark:border-amber-900/30 last:border-0">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{addon.name}</span>
                        {addon.durationMinutes > 0 && (
                          <span className="text-[10px] text-slate-400 mr-2">
                            (+{addon.durationMinutes} دقيقة)
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        +{addon.price} ج.م
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex justify-between text-slate-600 dark:text-slate-400">
                <span>{order.packageSnapshot ? 'المجموع الأساسي (الباقة والإضافات)' : 'السعر الأساسي للخدمة'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{order.basePrice} ج.م</span>
              </div>

              {catalogDiscount > 0 && (
                <div className="py-2.5 flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>خصم الخدمة المباشر</span>
                  </span>
                  <span>-{catalogDiscount} ج.م</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="py-2.5 flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>خصم الكوبون {coupon?.couponCode ? `(${coupon.couponCode})` : ''}</span>
                  </span>
                  <span>-{couponDiscount} ج.م</span>
                </div>
              )}

              {catalogDiscount === 0 && couponDiscount === 0 && totalDiscount > 0 && (
                <div className="py-2.5 flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>الخصم المطبق</span>
                  </span>
                  <span>-{totalDiscount} ج.م</span>
                </div>
              )}

              <div className="py-2.5 flex justify-between text-slate-600 dark:text-slate-400">
                <span>رسوم الخدمة والمعدات المتنقلة</span>
                <span className="font-semibold text-slate-900 dark:text-white">{order.serviceFee || 0} ج.م</span>
              </div>
              <div className="pt-3 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>المبلغ النهائي المستحق</span>
                <span className="text-sky-600 dark:text-sky-400">{order.finalPrice} ج.م</span>
              </div>
            </div>
          </div>

          {/* Customer & Location */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-sky-500" />
              <span>بيانات العميل وموقع التنفيذ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">معلومات العميل</span>
                <p className="font-bold text-slate-900 dark:text-white">
                  {order.customerName || 'عميل كلينزو'}
                </p>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-sky-500" />
                  <span dir="ltr">{order.customerPhone || '—'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">العنوان والموقع</span>
                <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {order.address?.governorate || ''} — {order.address?.city || ''}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {order.address?.area || ''}
                      {order.address?.building ? `، مبنى ${order.address.building}` : ''}
                      {order.address?.apartment ? `، شقة ${order.address.apartment}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ملاحظات إدارة الحجز (داخلية)
              </label>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={3}
                placeholder="أضف أية تعليمات خاصة للفريق أو تفاصيل إضافية..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
              />
              <button
                onClick={handleSaveNotes}
                className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-600 text-white"
              >
                حفظ الملاحظات
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Technician Card & Timeline */}
        <div className="space-y-6">
          {/* Assigned Technician Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HardHat className="w-4 h-4 text-indigo-500" />
                <span>الفني المكلف</span>
              </h3>
              <button
                onClick={handleOpenAssignModal}
                disabled={!canEditOrders || order.status === 'completed' || order.status === 'cancelled'}
                className="text-[11px] font-bold text-sky-500 hover:text-sky-600 disabled:opacity-50 cursor-pointer"
              >
                {order.technician ? 'تغيير الفني' : '+ تعيين فني'}
              </button>
            </div>

            {order.technician ? (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20">
                <img
                  src={order.technician.avatar || '/images/cleanzo-logo.png'}
                  alt={order.technician.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/30"
                />
                <div className="flex-1 text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-white">{order.technician.name}</h4>
                  <p className="text-[11px] text-slate-500">{order.technician.specialty}</p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                    هاتف: {order.technician.phone}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20 text-center text-xs">
                <p className="text-amber-600 dark:text-amber-400 font-semibold mb-2">
                  لم يتم إسناد فني لهذا الطلب بعد
                </p>
                <button
                  onClick={handleOpenAssignModal}
                  disabled={!canEditOrders || order.status === 'completed' || order.status === 'cancelled'}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  تعيين فني الآن
                </button>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              <span>سجل مسار الطلب (Timeline)</span>
            </h3>

            <div className="relative pr-4 space-y-6 border-r border-slate-200 dark:border-slate-800 mr-2 text-xs">
              {(order.timeline || []).map((event, idx) => (
                <div key={idx} className="relative">
                  <span
                    className={cn(
                      'absolute -right-[21px] top-0.5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-900',
                      event.status === 'completed' ? 'bg-emerald-500' : 'bg-sky-500'
                    )}
                  />
                  <div className="font-bold text-slate-900 dark:text-white">{event.label}</div>
                  <span className="text-[10px] text-slate-400 block mb-1">{event.timestamp}</span>
                  {event.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Technician Assignment Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">إسناد فني للطلب #{order.id}</h3>
                  <p className="text-[11px] text-slate-400">اختر أحد الفنيين المعتمدين من قسم الفنيين</p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick search & refresh */}
            <div className="relative">
              <input
                type="text"
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                placeholder="ابحث باسم الفني، التخصص، أو الهاتف..."
                className="w-full ps-9 pe-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => fetchTechnicians()}
                title="تحديث قائمة الفنيين الآن"
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-sky-500 p-0.5 cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoadingTechnicians && "animate-spin text-sky-500")} />
              </button>
            </div>

            {/* Technicians List Body */}
            {(isLoadingTechnicians || isFetchingTechs) && technicians.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-7 h-7 animate-spin text-sky-500 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">جاري تحميل قائمة الفنيين من الخادم...</p>
              </div>
            ) : technicians.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                    لا يوجد فنيين مسجلين في قسم الفنيين حتى الآن
                  </p>
                  <p className="text-[11px] text-slate-400">
                    يمكنك إضافة فني جديد من لوحة إدارة الفنيين
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => fetchTechnicians()}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                  <Link
                    href="/admin/technicians"
                    className="px-3.5 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 cursor-pointer"
                  >
                    إدارة الفنيين
                  </Link>
                </div>
              </div>
            ) : (() => {
              const filtered = technicians.filter((t) => {
                if (!techSearch.trim()) return true;
                const q = techSearch.toLowerCase().trim();
                return (
                  (t.name && t.name.toLowerCase().includes(q)) ||
                  (t.phone && t.phone.includes(q)) ||
                  (t.specialty && t.specialty.toLowerCase().includes(q))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-slate-400 font-bold">لا يوجد فني مطابق لبحثك &quot;{techSearch}&quot;</p>
                    <button
                      onClick={() => setTechSearch('')}
                      className="text-xs text-sky-500 hover:underline font-bold"
                    >
                      مسح البحث وعرض الكل
                    </button>
                  </div>
                );
              }

              // Sort technicians: available workers first, conflicting ones below
              const sorted = [...filtered].sort((a, b) => {
                const confA = findConflictingOrder(order, a.id, allOrdersForConflict, subscriptionVisits);
                const confB = findConflictingOrder(order, b.id, allOrdersForConflict, subscriptionVisits);
                if (!confA && confB) return -1;
                if (confA && !confB) return 1;
                return 0;
              });

              return (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pe-1">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      <span>موعد الطلب: <strong className="font-mono text-slate-900 dark:text-white">{order.date}</strong> ({schedule.displayTime})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">استبعاد التعارض تلقائياً</span>
                  </div>

                  {sorted.map((t) => {
                    const isCurrent = order.technician?.id === t.id || (order as any).assignedTechnicianId === t.id;
                    const isAssigningThis = assigningTechId === t.id;
                    const conflictingOrder = findConflictingOrder(order, t.id, allOrdersForConflict, subscriptionVisits);
                    const isConflicting = !!conflictingOrder;

                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'p-3 rounded-2xl border transition-all flex items-center justify-between gap-3',
                          isConflicting
                            ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 opacity-80'
                            : isCurrent
                            ? 'border-sky-500/50 bg-sky-50/40 dark:bg-sky-950/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-sky-400 bg-white dark:bg-slate-900'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={t.avatar || '/images/cleanzo-logo.png'}
                            alt={t.name}
                            className={cn(
                              "w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0",
                              isConflicting && "grayscale-30"
                            )}
                          />
                          <div className="text-xs min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{t.name}</p>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-sky-500 text-white shrink-0">
                                  الفني الحالي
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {t.specialty || 'فني ميداني'} • {t.phone}
                            </p>
                            
                            {/* Availability and Conflict Indicators */}
                            {isConflicting ? (
                              <div className="pt-0.5 space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                  <span>غير متاح (تعارض في المواعيد)</span>
                                </span>
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                  مرتبط بـ {conflictingOrder.type === 'visit' ? 'زيارة اشتراك' : 'الطلب'} #{conflictingOrder.id} ({conflictingOrder.time})
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pt-0.5">
                                <span
                                  className={cn(
                                    'text-[10px] font-semibold px-2 py-0.5 rounded-md',
                                    t.status === 'available'
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                  )}
                                >
                                  {t.status === 'available' ? 'متاح' : t.status === 'busy' ? 'في مهمة' : t.status || 'متاح'}
                                </span>
                                {t.rating ? (
                                  <span className="text-[10px] text-amber-500 font-bold">
                                    ★ {t.rating}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAssignTech(t)}
                          disabled={isAssigningThis || isConflicting}
                          title={
                            isConflicting
                              ? `غير متاح لوجود تعارض مع ${conflictingOrder.type === 'visit' ? 'زيارة اشتراك' : 'الطلب'} #${conflictingOrder.id} (${conflictingOrder.time})`
                              : undefined
                          }
                          className={cn(
                            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0',
                            isConflicting
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                              : isCurrent
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white cursor-pointer'
                              : 'bg-sky-500 hover:bg-sky-600 text-white shadow-xs cursor-pointer'
                          )}
                        >
                          {isAssigningThis && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{isConflicting ? 'متعارض' : isCurrent ? 'إعادة الإسناد' : 'إسناد'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-500">تأكيد إلغاء الحجز</h3>
              <button onClick={() => setCancelModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ سيتم إشعار العميل وتحديث لوحة حسابه فوراً.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                سبب الإلغاء (اختياري)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="مثال: تعذر الوصول للعميل / بناءً على طلبه"
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-500"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {order && (
        <RescheduleModal
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
          order={order}
          onSuccess={async (updated) => {
            setOrder(updated);
            await fetchOrder();
            toast.success('تم تحديث موعد الطلب في لوحة التحكم بنجاح');
          }}
        />
      )}
    </div>
  );
}
