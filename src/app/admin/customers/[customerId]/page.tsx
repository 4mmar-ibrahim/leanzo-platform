'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  ShoppingBag,
  Percent,
  Plus,
  MessageSquare,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  CreditCard,
  TrendingUp,
  XCircle,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  Award,
  Sparkles,
  BarChart3,
  Layers,
  Wrench,
  Check,
  Trash2,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  X,
  Edit,
} from 'lucide-react';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  validateEgyptianPhone,
  VALID_EGYPTIAN_PREFIXES,
} from '@/lib/validation/phoneValidation';

interface SummaryData {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  servicesCount: number;
  servicesBreakdown: Array<{
    id: string;
    title: string;
    category: string;
    count: number;
    totalSpent: number;
    lastUsed: string;
  }>;
  promotionsUsed: Array<{
    orderId: string;
    date: string;
    promoCode: string;
    discountAmount: number;
    finalPrice: number;
    status: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    label: string;
    ordersCount: number;
    spending: number;
  }>;
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;

  // Local & Store state
  const fallbackCustomer = useCustomerStore((s) => s.getCustomerById(customerId));
  const toggleStoreStatus = useCustomerStore((s) => s.toggleCustomerStatus);
  const deleteCustomer = useCustomerStore((s) => s.deleteCustomer);
  const addStoreNote = useCustomerStore((s) => s.addCustomerNote);
  const setStoreDiscount = useCustomerStore((s) => s.setCustomerDiscount);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canEdit = useAdminStore((s) => s.canEdit);
  const canEditCustomer = canEdit('customers');
  const addLog = useActivityLogStore((s) => s.addLog);

  // Live data fetched from backend
  const [customer, setCustomer] = useState<any>(fallbackCustomer || null);
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Edit Customer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhoneError, setEditPhoneError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Notes & Discount editing state
  const [newNote, setNewNote] = useState('');
  const [discountVal, setDiscountVal] = useState<string>('0');
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Order Filters state
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 8;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'services' | 'promotions' | 'timeline' | 'notes'>('orders');

  // Load customer and live booking details from backend
  const loadCustomerData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await cleanzoApi.admin.getCustomerDetails(customerId);
      if (res && res.customer) {
        setCustomer(res.customer);
        setOrders(res.bookings || []);
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.activityLogs) {
          setActivityLogs(res.activityLogs);
        }
        setDiscountVal(String(res.customer.discount || 0));
      } else if (fallbackCustomer) {
        setCustomer(fallbackCustomer);
        setDiscountVal(String(fallbackCustomer.discount || 0));
      }
    } catch {
      if (fallbackCustomer) {
        setCustomer(fallbackCustomer);
        setDiscountVal(String(fallbackCustomer.discount || 0));
      } else {
        toast.error('تعذر جلب بيانات العميل من الخادم');
      }
    } finally {
      setLoading(false);
    }
  }, [customerId, fallbackCustomer]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  // Derived Summary if backend didn't return summary object
  const computedSummary: SummaryData = useMemo(() => {
    if (summary) return summary;

    const totalOrders = orders.length;
    const completedOrders = orders.filter((b) => b.status === 'completed').length;
    const cancelledOrders = orders.filter((b) => b.status === 'cancelled').length;
    const pendingOrders = orders.filter((b) => b.status === 'pending').length;
    const inProgressOrders = orders.filter((b) =>
      ['in_progress', 'assigned', 'confirmed'].includes(b.status)
    ).length;

    const totalSpent = orders
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);

    const averageOrderValue = completedOrders > 0 ? Math.round(totalSpent / completedOrders) : 0;

    const serviceMap = new Map<string, any>();
    orders.forEach((b) => {
      const sId = b.serviceId || b.serviceSnapshot?.id || 'service';
      const sTitle = b.serviceSnapshot?.title || 'خدمة كلينزو';
      const sCat = b.category || b.serviceSnapshot?.category || 'car';
      const cur = serviceMap.get(sId) || {
        id: sId,
        title: sTitle,
        category: sCat,
        count: 0,
        totalSpent: 0,
        lastUsed: b.date || '',
      };
      cur.count += 1;
      if (b.status === 'completed') cur.totalSpent += Number(b.finalPrice) || 0;
      if (b.date && (!cur.lastUsed || b.date > cur.lastUsed)) cur.lastUsed = b.date;
      serviceMap.set(sId, cur);
    });

    const servicesBreakdown = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count);

    const promotionsUsed = orders
      .filter((b) => b.promoCode || b.couponSnapshot || (b.discount && b.discount > 0))
      .map((b) => ({
        orderId: b.id,
        date: b.date,
        promoCode: b.promoCode || b.couponSnapshot?.couponCode || 'خصم خاص',
        discountAmount: b.couponSnapshot?.actualDiscountAmount || b.couponSnapshot?.discountAmount || b.discount || 0,
        finalPrice: b.finalPrice,
        status: b.status,
      }));

    const monthlyMap = new Map<string, any>();
    orders.forEach((b) => {
      const dateStr = b.date || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '');
      if (dateStr) {
        const monthKey = dateStr.slice(0, 7);
        const cur = monthlyMap.get(monthKey) || {
          month: monthKey,
          label: monthKey,
          ordersCount: 0,
          spending: 0,
        };
        cur.ordersCount += 1;
        if (b.status === 'completed') cur.spending += Number(b.finalPrice) || 0;
        monthlyMap.set(monthKey, cur);
      }
    });
    const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    return {
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
    };
  }, [summary, orders]);

  // Is customer active or disabled?
  const isActive = customer?.status === 'active' && !customer?.isDeleted;

  // Handle Account Disable / Enable
  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    const newStatus = isActive ? 'inactive' : 'active';
    const cId = customer?._id || customer?.id || customerId;
    try {
      await cleanzoApi.admin.updateCustomer(cId, { status: newStatus });
      toggleStoreStatus(cId);
      setCustomer((prev: any) => ({ ...prev, status: newStatus, isDeleted: false }));
      if (newStatus === 'active') {
        toast.success(`تم تفعيل حساب العميل (${customer?.name || ''}) بنجاح`);
      } else {
        toast.warning(`تم تعطيل حساب العميل (${customer?.name || ''})`);
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث حالة الحساب');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Handle Permanent Hard Delete from Database
  const handleDeleteCustomer = async () => {
    if (
      !window.confirm(
        `تحذير نهائي: هل أنت متأكد من حذف حساب العميل (${customer?.name || ''}) نهائياً من قاعدة البيانات؟\n\n- سيتم مسح بيانات الدخول ورقم الهاتف والبريد بالكامل.\n- سيتم تحرير رقم الهاتف ليتمكن العميل من التسجيل لاحقاً كحساب جديد تماماً دون أي أثر للحساب القديم.\n- هذا الإجراء نهائي ولا يمكن التراجع عنه.`
      )
    ) {
      return;
    }

    const cId = customer?._id || customer?.id || customerId;
    setIsDeleting(true);
    try {
      await cleanzoApi.admin.deleteCustomer(cId);
      deleteCustomer(cId);
      toast.success(`تم حذف حساب العميل (${customer?.name || ''}) نهائياً من قاعدة البيانات بنجاح`);
      router.push('/admin/customers');
    } catch (err: any) {
      toast.error(err.message || 'فشل حذف الحساب نهائياً');
      setIsDeleting(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew || !trimmedConfirm) {
      setPasswordError('يرجى إدخال كلمة المرور الجديدة وتأكيدها.');
      return;
    }

    if (trimmedNew.length < 6) {
      setPasswordError('كلمة المرور يجب أن تتكون من 6 خانات على الأقل.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setPasswordError('كلمتا المرور غير متطابقتين.');
      return;
    }

    const cId = customer?._id || customer?.id || customerId;
    setIsResettingPassword(true);

    try {
      await cleanzoApi.admin.resetCustomerPassword(cId, {
        newPassword: trimmedNew,
        confirmPassword: trimmedConfirm,
      });

      // Audit Log locally & in store
      const adminName = currentAdmin?.name || 'المشرف';
      addLog({
        adminName,
        adminRole: currentAdmin?.role || 'admin',
        action: 'تغيير كلمة مرور عميل',
        module: 'customers',
        target: customer?.name,
        details: `قام المشرف (${adminName}) بتغيير وتعيين كلمة مرور جديدة لحساب العميل (${customer?.name || ''} - ${customer?.phone || ''}).`,
      });

      // Add note in customer notes
      const newAdminNote = {
        id: `note-${Date.now()}`,
        text: `[إجراء أمني] تم تعيين كلمة مرور جديدة للحساب بواسطة المشرف: ${adminName}`,
        date: new Date().toISOString().split('T')[0],
        author: adminName,
      };

      setCustomer((prev: any) => ({
        ...prev,
        notes: [newAdminNote, ...(prev?.notes || [])],
      }));

      toast.success(`تم تغيير وتعيين كلمة المرور الجديدة للعميل (${customer?.name || ''}) بنجاح`);
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordError(null);
    } catch (err: any) {
      setPasswordError(err.message || 'فشل تغيير كلمة المرور');
      toast.error(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle Edit Customer Details
  const handleOpenEditModal = () => {
    setEditName(customer?.name || '');
    setEditPhone(customer?.phone || '');
    setEditEmail(customer?.email || '');
    setEditPhoneError('');
    setIsEditModalOpen(true);
  };

  const handleEditPhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 11);
    setEditPhone(cleaned);
    if (editPhoneError && (cleaned.length === 0 || cleaned.length >= 3)) {
      const res = validateEgyptianPhone(cleaned);
      if (res.isValid) {
        setEditPhoneError('');
      }
    }
  };

  const handleEditPhoneBlur = () => {
    if (!editPhone) return;
    const res = validateEgyptianPhone(editPhone);
    if (!res.isValid) {
      setEditPhoneError(res.error || 'يرجى إدخال رقم هاتف مصري صحيح.');
    } else {
      setEditPhoneError('');
    }
  };

  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }
    const phoneCheck = validateEgyptianPhone(editPhone);
    if (!phoneCheck.isValid) {
      setEditPhoneError(phoneCheck.error || 'يرجى إدخال رقم هاتف مصري صحيح.');
      toast.error(phoneCheck.error || 'يرجى إدخال رقم هاتف مصري صحيح.');
      return;
    }
    setIsSavingEdit(true);
    try {
      const cId = customer._id || customer.id || customerId;
      const res = await cleanzoApi.admin.updateCustomer(cId, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
      });
      if (res && (res.success || res.id || res._id || res.phone)) {
        toast.success('تم تحديث بيانات العميل بنجاح');
        setCustomer((prev: any) => ({
          ...prev,
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
        }));
        setIsEditModalOpen(false);
      } else {
        toast.error((res as any)?.message || 'فشل تحديث بيانات العميل');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء تحديث بيانات العميل');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Adding Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !customer) return;
    const noteText = newNote.trim();
    const author = currentAdmin?.name || 'Admin';
    const cId = customer._id || customer.id || customerId;

    try {
      await cleanzoApi.admin.updateCustomer(cId, { note: noteText });
    } catch {
      // fallback
    }

    addStoreNote(cId, noteText, author);
    const updatedNote = {
      id: `note-${Date.now()}`,
      text: noteText,
      date: new Date().toISOString().split('T')[0],
      author,
    };
    setCustomer((prev: any) => ({
      ...prev,
      notes: [updatedNote, ...(prev?.notes || [])],
    }));
    setNewNote('');
    toast.success('تمت إضافة الملاحظة بنجاح');
  };

  // Handle Saving VIP Discount
  const handleSaveDiscount = async () => {
    if (!customer) return;
    const val = Number(discountVal) || 0;
    if (val < 0 || val > 100) {
      toast.error('نسبة الخصم يجب أن تكون بين 0 و 100%');
      return;
    }
    setIsSavingDiscount(true);
    const cId = customer._id || customer.id || customerId;

    try {
      await cleanzoApi.admin.updateCustomer(cId, { discount: val });
    } catch {
      // fallback
    }

    setStoreDiscount(cId, val);
    setCustomer((prev: any) => ({ ...prev, discount: val }));
    setIsSavingDiscount(false);
    toast.success(`تم تحديث نسبة الخصم إلى ${val}%`);
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      if (orderSearch.trim()) {
        const q = orderSearch.trim().toLowerCase();
        const matchesId = (order.id || '').toLowerCase().includes(q);
        const matchesService = (order.serviceSnapshot?.title || '').toLowerCase().includes(q);
        if (!matchesId && !matchesService) return false;
      }

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'in_progress') {
          if (!['in_progress', 'assigned', 'confirmed'].includes(order.status)) return false;
        } else if (order.status !== statusFilter) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'all') {
        const cat = order.category || order.serviceSnapshot?.category;
        if (cat !== categoryFilter) return false;
      }

      // Date Range
      if (dateFromFilter && order.date && order.date < dateFromFilter) return false;
      if (dateToFilter && order.date && order.date > dateToFilter) return false;

      return true;
    });
  }, [orders, orderSearch, statusFilter, categoryFilter, dateFromFilter, dateToFilter]);

  // Paginated Orders
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, currentPage]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500" />
        <p className="text-xs font-bold text-slate-400">جاري تحميل لوحة ملف العميل وسجل الطلبات بالكامل...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">العميل غير موجود</h2>
        <p className="text-xs text-slate-500">تعذر العثور على العميل المطلوب، ربما تم تغيير المعرّف.</p>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold shadow-md hover:bg-sky-600 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لسجل العملاء</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-start pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/customers" className="hover:text-sky-500 transition-colors flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>سجل العملاء (CRM)</span>
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{customer.name}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span>لوحة تحكم ملف العميل</span>
            <span
              className={cn(
                'text-xs font-bold px-3 py-1 rounded-full border',
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
              )}
            >
              {isActive ? 'حساب نشط' : 'حساب معطل'}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditCustomer && (
            <button
              onClick={handleOpenEditModal}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 shadow-xs"
              title="تعديل بيانات العميل الأساسية"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>تعديل البيانات</span>
            </button>
          )}

          {canEditCustomer && (
            <button
              onClick={() => {
                setPasswordError(null);
                setNewPassword('');
                setConfirmPassword('');
                setShowNewPassword(false);
                setShowConfirmPassword(false);
                setIsPasswordModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500 hover:text-white flex items-center gap-1.5 shadow-xs"
              title="تغيير كلمة المرور لحساب العميل"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>تغيير كلمة المرور</span>
            </button>
          )}

          <button
            onClick={handleToggleStatus}
            disabled={isTogglingStatus}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-xs',
              isActive
                ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/15'
                : 'border-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            )}
          >
            {isTogglingStatus ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isActive ? null : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>{isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}</span>
          </button>

          <button
            onClick={handleDeleteCustomer}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white flex items-center gap-1.5 shadow-xs"
            title="حذف الحساب نهائياً من قاعدة البيانات"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>حذف الحساب نهائياً</span>
          </button>
        </div>
      </div>

      {/* Amber Notice Banner if Account is Disabled */}
      {!isActive && (
        <div className="p-4 rounded-3xl bg-amber-500/15 dark:bg-amber-950/40 border-2 border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-700 dark:text-amber-300">
                هذا الحساب معطل حالياً بواسطة الإدارة
              </h3>
              <p className="text-xs text-amber-600/90 dark:text-amber-400 mt-0.5">
                العميل محظور من تسجيل الدخول أو إتمام طلبات جديدة حتى تتم إعادة تفعيل حسابه. تم الحفاظ على كافة الحجوزات والتقارير المالية.
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={isTogglingStatus}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
          >
            {isTogglingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            <span>تفعيل الحساب الآن</span>
          </button>
        </div>
      )}

      {/* Customer Identity Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={cn(
                  'w-16 h-16 rounded-3xl flex items-center justify-center text-xl font-black text-white shadow-lg',
                  !isActive
                    ? 'bg-gradient-to-tr from-amber-600 to-amber-400 shadow-amber-500/20'
                    : 'bg-gradient-to-tr from-[#0866C6] to-[#07345C] shadow-sky-500/20'
                )}
              >
                {customer.name?.charAt(0) || 'C'}
              </div>
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 absolute -bottom-1 -left-1',
                  isActive ? 'bg-emerald-500' : 'bg-amber-500'
                )}
                title={isActive ? 'نشط' : 'معطل'}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{customer.name}</h2>
                {customer.discount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    خصم VIP {customer.discount}%
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    انضم منذ:{' '}
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('ar-EG') : 'غير محدد'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    القناة:{' '}
                    {({
                      website: 'موقع إلكتروني',
                      whatsapp: 'واتساب',
                      facebook: 'فيسبوك',
                      instagram: 'إنستجرام',
                      telegram: 'تيليجرام',
                      tiktok: 'تيك توك',
                      social_media: 'سوشيال ميديا',
                      other: 'أخرى',
                    } as Record<string, string>)[customer.source] || customer.source || 'موقع إلكتروني'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions: VIP Discount Editor */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <Percent className="w-4 h-4 text-emerald-500 ml-1" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">خصم دائم:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={discountVal}
              onChange={(e) => setDiscountVal(e.target.value)}
              className="w-14 px-2 py-1 rounded-lg text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
            <span className="text-xs text-slate-400 font-bold">%</span>
            <button
              onClick={handleSaveDiscount}
              disabled={isSavingDiscount}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              {isSavingDiscount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'حفظ'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Analytics Cards Grid (Calculated from Real Database Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Orders */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold">إجمالي الطلبات</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {computedSummary.totalOrders}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">حجز مسجل</span>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">طلبات مكتملة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {computedSummary.completedOrders}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">منفذة بنجاح</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">قيد التنفيذ والمؤكدة</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {computedSummary.inProgressOrders}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">طلب جاري</span>
          </div>
        </div>

        {/* Cancelled Orders */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">طلبات ملغاة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {computedSummary.cancelledOrders}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">ملغي</span>
          </div>
        </div>

        {/* Total Spending */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">إجمالي الإنفاق</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {computedSummary.totalSpent}
            </span>
            <span className="text-[11px] text-slate-400 font-bold">ج.م</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics / Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Spending & Orders Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                مسار الطلبات والإنفاق المالي للعميل (شهرياً)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              متوسط قيمة الطلب: <strong className="text-sky-500">{computedSummary.averageOrderValue} ج.م</strong>
            </span>
          </div>

          {computedSummary.monthlyTrend.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لا توجد بيانات تاريخية كافية لتوليد الرسم البياني لهذا العميل حتى الآن.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {computedSummary.monthlyTrend.map((m) => (
                  <div
                    key={m.month}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 font-mono block">{m.month}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                      {m.ordersCount} طلب
                    </span>
                    <span className="text-xs font-bold text-emerald-500 block">{m.spending} ج.م</span>
                  </div>
                ))}
              </div>

              {/* Simple Visual Height Bar Comparison */}
              <div className="h-28 flex items-end gap-2 pt-4 border-b border-slate-100 dark:border-slate-800 px-2">
                {computedSummary.monthlyTrend.map((m) => {
                  const maxSpend = Math.max(...computedSummary.monthlyTrend.map((t) => t.spending), 100);
                  const heightPercent = Math.max(15, Math.round((m.spending / maxSpend) * 100));

                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-sky-500 to-indigo-500 transition-all group-hover:brightness-110"
                      />
                      <span className="text-[9px] text-slate-400 truncate max-w-full">{m.month.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Services Used Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">الخدمات التي استخدمها</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">{computedSummary.servicesCount} خدمات</span>
          </div>

          {computedSummary.servicesBreakdown.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">لم يطلب هذا العميل أي خدمات بعد.</div>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {computedSummary.servicesBreakdown.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white block">{s.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {s.category === 'car' ? 'غسيل وعناية سيارات' : 'خدمات منزلية'} • آخر طلب: {s.lastUsed || '-'}
                    </span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="font-black text-sky-600 dark:text-sky-400 block">{s.count} مرات</span>
                    <span className="text-[10px] text-emerald-500 font-bold">{s.totalSpent} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={cn(
            'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
            activeTab === 'orders'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>سجل الطلبات والحجوزات ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={cn(
            'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
            activeTab === 'services'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>الخدمات المستخدمة ({computedSummary.servicesBreakdown.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          className={cn(
            'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
            activeTab === 'promotions'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>الكوبونات والعروض المستخدمة ({computedSummary.promotionsUsed.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={cn(
            'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
            activeTab === 'timeline'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>سجل النشاط والتدقيق ({activityLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={cn(
            'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
            activeTab === 'notes'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>الملاحظات الإدارية ({customer.notes?.length || 0})</span>
        </button>
      </div>

      {/* Tab Content: All Orders with Filters and Pagination */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث برقم الطلب أو اسم الخدمة..."
                  value={orderSearch}
                  onChange={(e) => {
                    setOrderSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pr-8 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="all">كافة الحالات</option>
                <option value="completed">مكتمل</option>
                <option value="in_progress">قيد التنفيذ والمؤكد</option>
                <option value="pending">معلق</option>
                <option value="cancelled">ملغي</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="all">كافة الأقسام</option>
                <option value="car">عناية سيارات</option>
                <option value="home">خدمات منزلية</option>
              </select>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">من:</span>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => {
                  setDateFromFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
              <span className="text-slate-400 font-semibold">إلى:</span>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => {
                  setDateToFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {paginatedOrders.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد طلبات تطابق الفلاتر</h4>
                <p className="text-xs text-slate-400">جرب تغيير معايير البحث أو التاريخ أو الحالة.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold">
                      <th className="py-3.5 px-4">رقم الطلب</th>
                      <th className="py-3.5 px-4">الخدمة</th>
                      <th className="py-3.5 px-4">تاريخ الحجز والموعد</th>
                      <th className="py-3.5 px-4">الفني المسؤول</th>
                      <th className="py-3.5 px-4">السعر والخصم</th>
                      <th className="py-3.5 px-4">الحالة</th>
                      <th className="py-3.5 px-4 text-center">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedOrders.map((order) => {
                      const isOrderCompleted = order.status === 'completed';
                      const isOrderCancelled = order.status === 'cancelled';
                      const isOrderInProgress = ['in_progress', 'assigned', 'confirmed'].includes(order.status);

                      return (
                        <tr key={order.id || order._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                            <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                              {order.id}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {order.serviceSnapshot?.title || 'خدمة كلينزو'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {order.category === 'car' ? 'عناية سيارات' : 'خدمات منزلية'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 font-mono text-slate-700 dark:text-slate-300">
                              <span>{order.date}</span>
                              <span className="text-[10px] text-slate-400 block">{order.time}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {order.technician ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {order.technician.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {order.technician.phone}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">لم يُعيّن فني بعد</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-black text-slate-900 dark:text-white">
                              {order.finalPrice || order.basePrice || 0} ج.م
                            </span>
                            {order.discount > 0 && (
                              <span className="text-[10px] text-rose-500 block">
                                خصم {order.discount} ج.م ({order.promoCode || 'كوبون'})
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                                isOrderCompleted
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : isOrderCancelled
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  : isOrderInProgress
                                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              )}
                            >
                              {isOrderCompleted
                                ? 'مكتمل'
                                : isOrderCancelled
                                ? 'ملغي'
                                : isOrderInProgress
                                ? 'قيد التنفيذ'
                                : 'معلق'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white inline-flex transition-colors"
                              title="عرض تفاصيل الطلب"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                عرض {paginatedOrders.length} من أصل {filteredOrders.length} طلب
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Services Used */}
      {activeTab === 'services' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            تفاصيل وتكرار كافة الخدمات المطلوبة من قِبل العميل
          </h3>

          {computedSummary.servicesBreakdown.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">لم يطلب هذا العميل أي خدمات حتى الآن.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {computedSummary.servicesBreakdown.map((service) => (
                <div
                  key={service.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">{service.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                      {service.category === 'car' ? 'سيارات' : 'منازل'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[11px] block">مرات الاستخدام:</span>
                      <span className="font-black text-slate-900 dark:text-white">{service.count} مرات</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">إجمالي الصرف:</span>
                      <span className="font-black text-emerald-500">{service.totalSpent} ج.م</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">آخر موعد حجز: {service.lastUsed || 'غير محدد'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Promotions & Coupons Used */}
      {activeTab === 'promotions' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            سجل الخصومات والعروض والكوبونات المستخدمة
          </h3>

          {computedSummary.promotionsUsed.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لم يقم هذا العميل باستخدام أي أكواد خصم أو عروض حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-4">رقم الطلب</th>
                    <th className="py-3 px-4">كود الخصم / العرض</th>
                    <th className="py-3 px-4">قيمة الخصم</th>
                    <th className="py-3 px-4">السعر النهائي للطلب</th>
                    <th className="py-3 px-4">تاريخ الاستخدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {computedSummary.promotionsUsed.map((promo, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-sky-500">{promo.orderId}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {promo.promoCode}
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-500">-{promo.discountAmount} ج.م</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{promo.finalPrice} ج.م</td>
                      <td className="py-3 px-4 text-slate-400">{promo.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Timeline & Activity Logs */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            الجدول الزمني وسجل تدقيق النشاط (Audit Log)
          </h3>

          {activityLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لا توجد سجلات تدقيق مسجلة لهذا العميل حتى الآن.
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:right-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 pr-8">
              {activityLogs.map((log) => (
                <div key={log._id || log.id} className="relative space-y-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-500 absolute -right-[23px] top-1.5" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {log.action || log.description}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('ar-EG') : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{log.details || log.description}</p>
                  <span className="text-[10px] text-slate-400">بواسطة: {log.actorName || log.adminName || 'النظام'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Notes & Admin Updates */}
      {activeTab === 'notes' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">ملاحظات الإدارة الداخلية</h3>
            <p className="text-xs text-slate-400 mt-0.5">ملاحظات سرية للإدارة فقط ولا يراها العميل.</p>
          </div>

          {/* Add Note Form */}
          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="اكتب ملاحظة جديدة حول العميل (مثال: يفضل الخدمة صباحاً، أو لديه طلبات خاصة)..."
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs focus:outline-hidden"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة ملاحظة</span>
              </button>
            </div>
          </form>

          {/* Notes List */}
          <div className="space-y-3 pt-2">
            {!customer.notes || customer.notes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد ملاحظات مسجلة بعد.</p>
            ) : (
              customer.notes.map((n: any) => (
                <div
                  key={n.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                >
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{n.text}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>الكاتب: {n.author}</span>
                    <span className="font-mono">{n.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Admin Customer Password Reset Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 text-start animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/80 flex items-center justify-center shrink-0 shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    تغيير كلمة المرور
                  </h3>
                  <p className="text-xs text-slate-500">
                    حساب: <span className="font-bold text-slate-700 dark:text-slate-300">{customer.name}</span> ({customer.phone})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isResettingPassword) {
                    setIsPasswordModalOpen(false);
                    setPasswordError(null);
                  }
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {passwordError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold">{passwordError}</span>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  كلمة المرور الجديدة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="أدخل 6 خانات أو أكثر..."
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  تأكيد كلمة المرور الجديدة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="أعد إدخال كلمة المرور..."
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Validation Feedback Indicators */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border transition-colors',
                      newPassword.trim().length >= 6
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-700 text-transparent'
                    )}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span
                    className={cn(
                      newPassword.trim().length >= 6
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-400'
                    )}
                  >
                    الحد الأدنى 6 خانات
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border transition-colors',
                      confirmPassword.trim().length > 0 &&
                        newPassword.trim() === confirmPassword.trim()
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-700 text-transparent'
                    )}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span
                    className={cn(
                      confirmPassword.trim().length > 0 &&
                        newPassword.trim() === confirmPassword.trim()
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-400'
                    )}
                  >
                    تطابق كلمتي المرور
                  </span>
                </div>
              </div>

              {/* Security Banner Notice */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>تنبيه أمني:</strong> يتم تشفير كلمة المرور فوراً عبر خوارزمية Bcrypt Hashing قبل حفظها في قاعدة البيانات. لن يتم عرض كلمة المرور الحالية أو الجديدة لأي مشرف بعد الحفظ.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isResettingPassword}
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={
                    isResettingPassword ||
                    newPassword.trim().length < 6 ||
                    newPassword.trim() !== confirmPassword.trim()
                  }
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 flex items-center gap-1.5"
                >
                  {isResettingPassword ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ كلمة المرور</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Details Modal */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!isSavingEdit) {
            setIsEditModalOpen(false);
            setEditPhoneError('');
          }
        }}
        title="تعديل بيانات العميل"
        description="تعديل الاسم ورقم الهاتف والبريد الإلكتروني مع التحقق الصارم من صحة رقم الهاتف المصري"
        maxWidth="md"
      >
        <form onSubmit={handleEditCustomerSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اسم العميل <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={isSavingEdit}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              رقم الهاتف المحمول (11 رقم) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={11}
                required
                dir="ltr"
                placeholder="010XXXXXXXX"
                value={editPhone}
                onChange={(e) => handleEditPhoneChange(e.target.value)}
                onBlur={handleEditPhoneBlur}
                disabled={isSavingEdit}
                className={cn('font-mono text-left', editPhoneError && 'border-rose-500 focus:ring-rose-500')}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                {editPhone.length}/11
              </span>
            </div>
            {editPhoneError ? (
              <p className="text-xs text-rose-500 mt-1 font-medium">{editPhoneError}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                يجب أن يتكون من 11 رقمًا ويبدأ بأحد البادئات: {VALID_EGYPTIAN_PREFIXES.join('، ')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              البريد الإلكتروني (اختياري)
            </label>
            <Input
              type="email"
              dir="ltr"
              placeholder="customer@example.com"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              disabled={isSavingEdit}
              className="text-left"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSavingEdit}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSavingEdit || (editPhone.length > 0 && !validateEgyptianPhone(editPhone).isValid)}
              className="bg-sky-500 hover:bg-sky-600 text-white min-w-[120px]"
            >
              {isSavingEdit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ التعديلات'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
