'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TicketPercent,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Users,
  Calendar,
  Percent,
  Coins,
  Edit2,
  Trash2,
  Eye,
  Power,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  ArrowUpDown,
  ShoppingBag,
  Phone,
  Shield,
  X,
} from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { Coupon, CouponDiscountType, CouponStatus, CouponUsageItem, Service } from '@/types';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function AdminCouponsPage() {
  const { currentAdmin, hasPermission } = useAdminStore();

  const canCreate = hasPermission('coupons', 'create');
  const canEdit = hasPermission('coupons', 'edit');
  const canDelete = hasPermission('coupons', 'delete');

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [stats, setStats] = useState({
    totalCoupons: 0,
    activeCount: 0,
    expiredCount: 0,
    exhaustedCount: 0,
    disabledCount: 0,
    totalUsages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'exhausted' | 'disabled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<CouponDiscountType>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(20);
  const [formTotalLimit, setFormTotalLimit] = useState<number>(1000);
  const [formPerCustomerLimit, setFormPerCustomerLimit] = useState<number>(2);
  const [formMinOrderAmount, setFormMinOrderAmount] = useState<number>(0);
  const [formMaxDiscount, setFormMaxDiscount] = useState<string>('');
  const [formApplicableServices, setFormApplicableServices] = useState<string[]>([]);
  const [formStartDate, setFormStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [formStatus, setFormStatus] = useState<CouponStatus>('active');

  // Usages Drawer / Modal
  const [viewingUsageCoupon, setViewingUsageCoupon] = useState<Coupon | null>(null);
  const [couponUsages, setCouponUsages] = useState<CouponUsageItem[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [isLoadingUsages, setIsLoadingUsages] = useState(false);

  // Delete Confirmation Modal
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clipboard helper
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await cleanzoApi.admin.getCoupons({
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        discountType: typeFilter === 'all' ? undefined : typeFilter,
      });

      if (res && res.coupons) {
        setCoupons(res.coupons);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل بيانات الكوبونات');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter]);

  // Fetch available services for applicable scope selector
  useEffect(() => {
    const loadServices = async () => {
      try {
        const services = await cleanzoApi.services.getServices();
        if (Array.isArray(services)) {
          setAvailableServices(services);
        }
      } catch {
        // non-blocking
      }
    };
    loadServices();
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormName('');
    setFormDiscountType('percentage');
    setFormDiscountValue(20);
    setFormTotalLimit(1000);
    setFormPerCustomerLimit(2);
    setFormMinOrderAmount(0);
    setFormMaxDiscount('');
    setFormApplicableServices([]);
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setFormStatus('active');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormName(coupon.name || '');
    setFormDiscountType(coupon.discountType);
    setFormDiscountValue(coupon.discountValue);
    setFormTotalLimit(coupon.totalUsageLimit);
    setFormPerCustomerLimit(coupon.perCustomerLimit);
    setFormMinOrderAmount(coupon.minOrderAmount || 0);
    setFormMaxDiscount(
      coupon.maxDiscount !== undefined && coupon.maxDiscount !== null ? String(coupon.maxDiscount) : ''
    );
    setFormApplicableServices(coupon.applicableServiceIds || []);
    setFormStartDate(coupon.startDate);
    setFormEndDate(coupon.endDate);
    setFormStatus(coupon.status);
    setIsModalOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      toast.error('يرجى كتابة كود الكوبون');
      return;
    }
    if (formDiscountValue <= 0) {
      toast.error('قيمة الخصم يجب أن تكون أكبر من 0');
      return;
    }
    if (formDiscountType === 'percentage' && formDiscountValue > 100) {
      toast.error('نسبة الخصم لا يمكن أن تتجاوز 100%');
      return;
    }
    if (formStartDate > formEndDate) {
      toast.error('تاريخ بداية الكوبون يجب أن يسبق تاريخ الانتهاء');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Coupon> = {
        code: formCode.trim().toUpperCase(),
        name: formName.trim() || undefined,
        discountType: formDiscountType,
        discountValue: Number(formDiscountValue),
        totalUsageLimit: Number(formTotalLimit) || 100,
        perCustomerLimit: Number(formPerCustomerLimit) || 1,
        minOrderAmount: Number(formMinOrderAmount) || 0,
        maxDiscount: formMaxDiscount !== '' ? Number(formMaxDiscount) : null,
        applicableServiceIds: formApplicableServices,
        startDate: formStartDate,
        endDate: formEndDate,
        status: formStatus,
      };

      if (editingCoupon) {
        const couponId = (editingCoupon as any)._id || editingCoupon.id;
        await cleanzoApi.admin.updateCoupon(couponId, payload);
        toast.success(`تم تحديث الكوبون (${payload.code}) بنجاح`);
      } else {
        await cleanzoApi.admin.createCoupon(payload);
        toast.success(`تم إنشاء الكوبون (${payload.code}) بنجاح`);
      }

      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حفظ الكوبون');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Active / Inactive
  const handleToggleStatus = async (coupon: Coupon) => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتعديل حالة الكوبونات');
      return;
    }
    const newStatus: CouponStatus = coupon.status === 'active' ? 'inactive' : 'active';
    const couponId = (coupon as any)._id || coupon.id;

    try {
      await cleanzoApi.admin.updateCoupon(couponId, { status: newStatus });
      toast.success(
        newStatus === 'active'
          ? `تم تفعيل الكوبون (${coupon.code})`
          : `تم تعطيل الكوبون (${coupon.code})`
      );
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث الحالة');
    }
  };

  // Delete / Archive Coupon
  const handleConfirmDelete = async () => {
    if (!couponToDelete) return;
    setIsDeleting(true);
    const couponId = (couponToDelete as any)._id || couponToDelete.id;

    try {
      await cleanzoApi.admin.deleteCoupon(couponId);
      toast.success(`تم أرشفة وحذف الكوبون (${couponToDelete.code}) بأمان`);
      setCouponToDelete(null);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حذف الكوبون');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Usages Modal
  const handleOpenUsages = async (coupon: Coupon) => {
    setViewingUsageCoupon(coupon);
    setUsageStats(null);
    setIsLoadingUsages(true);
    const couponId = (coupon as any)._id || coupon.id;

    try {
      const res = await cleanzoApi.admin.getCouponUsage(couponId);
      if (res) {
        if ((res as any).stats) {
          setUsageStats((res as any).stats);
        } else if ((res as any).coupon) {
          setUsageStats((res as any).coupon);
        }
        if (res.usages) {
          setCouponUsages(res.usages);
        } else {
          setCouponUsages([]);
        }
      } else {
        setCouponUsages([]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشل جلب تفاصيل الاستخدامات');
      setCouponUsages([]);
    } finally {
      setIsLoadingUsages(false);
    }
  };

  // Copy code to clipboard
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.info(`تم نسخ الكود: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      {/* Page Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25">
              <TicketPercent className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                إدارة الكوبونات والخصومات
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تحكم ذكي ومحكم بكافة قسائم التخفيض، مع حماية المعاملات المتزامنة وتتبع دقيق للاستخدامات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCoupons}
            className="gap-2 rounded-xl text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
            <span>تحديث</span>
          </Button>

          {canCreate && (
            <Button
              onClick={handleOpenCreateModal}
              className="gap-2 px-4 py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة كوبون جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Coupons */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الكوبونات</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <TicketPercent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.totalCoupons}
          </p>
          <div className="text-[10px] text-slate-400 mt-1">المتاحة في المنظومة</div>
        </div>

        {/* Active Coupons */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">الكوبونات الفعالة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.activeCount}
          </p>
          <div className="text-[10px] text-slate-400 mt-1">صالحة للاستخدام الآن</div>
        </div>

        {/* Expired Coupons */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">الكوبونات المنتهية</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.expiredCount}
          </p>
          <div className="text-[10px] text-slate-400 mt-1">تجاوزت تاريخ الانتهاء</div>
        </div>

        {/* Exhausted Coupons */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">الكوبونات المستنفدة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {stats.exhaustedCount}
          </p>
          <div className="text-[10px] text-slate-400 mt-1">بلغت الحد الأقصى</div>
        </div>

        {/* Total Redemptions */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden col-span-2 lg:col-span-1 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">مرات الاستخدام</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            {stats.totalUsages}
          </p>
          <div className="text-[10px] text-slate-400 mt-1">إجمالي الحجوزات المخصومة</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم الكوبون أو الكود (مثال: CLEANZO20)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              فعال
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'expired'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              منتهي
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('exhausted')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'exhausted'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              مستنفد
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disabled')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'disabled'
                  ? 'bg-slate-500 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              معطل
            </button>
          </div>

          {/* Discount Type Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">جميع أنواع الخصم</option>
            <option value="percentage">نسبة مئوية (%)</option>
            <option value="fixed">مبلغ ثابت (ج.م)</option>
          </select>
        </div>
      </div>

      {/* Main Coupons Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase">
              <tr>
                <th className="py-3.5 px-4">اسم / كود الكوبون</th>
                <th className="py-3.5 px-3">نوع الخصم</th>
                <th className="py-3.5 px-3">قيمة الخصم</th>
                <th className="py-3.5 px-3">إجمالي الاستخدام</th>
                <th className="py-3.5 px-3">الحالي</th>
                <th className="py-3.5 px-3">المتبقي</th>
                <th className="py-3.5 px-3">حد العميل</th>
                <th className="py-3.5 px-3">فترة الصلاحية</th>
                <th className="py-3.5 px-3">الحالة</th>
                <th className="py-3.5 px-3">آخر استخدام</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
                      <span className="text-xs text-slate-400 font-bold">جاري تحميل بيانات الكوبونات...</span>
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <TicketPercent className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        لا توجد كوبونات مطابقة لخيارات البحث
                      </p>
                      <p className="text-xs text-slate-400">
                        يمكنك إضافة كوبون جديد بالضغط على زر &quot;إضافة كوبون جديد&quot;
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const compStatus = coupon.computedStatus || (coupon.status === 'inactive' ? 'inactive' : 'active');
                  const remaining = Math.max(0, coupon.totalUsageLimit - coupon.currentUsageCount);
                  const isCopied = copiedCode === coupon.code;

                  return (
                    <tr
                      key={(coupon as any)._id || coupon.id || coupon.code}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Coupon Code & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-sm text-slate-900 dark:text-white tracking-wider">
                                {coupon.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(coupon.code)}
                                title="نسخ الكود"
                                className="text-slate-400 hover:text-sky-500 transition-colors"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {coupon.name && (
                              <span className="text-[11px] text-slate-400 font-normal">
                                {coupon.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Discount Type */}
                      <td className="py-3.5 px-3">
                        {coupon.discountType === 'percentage' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-[11px] font-bold border border-sky-100 dark:border-sky-900">
                            <Percent className="w-3 h-3" />
                            <span>نسبة مئوية</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-100 dark:border-emerald-900">
                            <Coins className="w-3 h-3" />
                            <span>مبلغ ثابت</span>
                          </span>
                        )}
                      </td>

                      {/* Discount Value */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-white text-sm">
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}%`
                              : `${coupon.discountValue} ج.م`}
                          </span>
                          {Boolean(coupon.minOrderAmount && coupon.minOrderAmount > 0) && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              أدنى طلب: {coupon.minOrderAmount} ج.م
                            </span>
                          )}
                          {Boolean(coupon.maxDiscount && coupon.maxDiscount > 0) && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                              سقف: {coupon.maxDiscount} ج.م
                            </span>
                          )}
                          {Boolean(coupon.applicableServiceIds && coupon.applicableServiceIds.length > 0) && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              مخصص ({coupon.applicableServiceIds?.length || 0} خدمة)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Limit */}
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-200 font-bold">
                        {coupon.totalUsageLimit.toLocaleString()}
                      </td>

                      {/* Current Usage */}
                      <td className="py-3.5 px-3 font-bold text-sky-600 dark:text-sky-400">
                        {coupon.currentUsageCount.toLocaleString()}
                      </td>

                      {/* Remaining */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-bold ${
                            remaining === 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {remaining.toLocaleString()}
                        </span>
                      </td>

                      {/* Per Customer */}
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                          {coupon.perCustomerLimit} لكل عميل
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-3 text-[11px]">
                        <div className="flex flex-col text-slate-500 dark:text-slate-400 space-y-0.5">
                          <span>من: {coupon.startDate}</span>
                          <span>إلى: {coupon.endDate}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {compStatus === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>فعال</span>
                          </span>
                        )}
                        {compStatus === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>منتهي</span>
                          </span>
                        )}
                        {compStatus === 'exhausted' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[11px]">
                            <Flame className="w-3 h-3" />
                            <span>مستنفد</span>
                          </span>
                        )}
                        {compStatus === 'inactive' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold text-[11px]">
                            <Power className="w-3 h-3" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>

                      {/* Last Used */}
                      <td className="py-3.5 px-3 text-[11px] text-slate-400">
                        {coupon.lastUsedAt
                          ? new Date(coupon.lastUsedAt).toLocaleDateString('ar-EG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'لم يُستخدم بعد'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Usages */}
                          <button
                            type="button"
                            onClick={() => handleOpenUsages(coupon)}
                            title="سجل استخدامات العملاء"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Users className="w-4 h-4" />
                          </button>

                          {/* Toggle Active/Disabled */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(coupon)}
                              title={coupon.status === 'active' ? 'تعطيل الكوبون' : 'تفعيل الكوبون'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                coupon.status === 'active'
                                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
                                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(coupon)}
                              title="تعديل الكوبون"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setCouponToDelete(coupon)}
                              title="أرشفة / حذف الكوبون"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Coupon */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                  <TicketPercent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingCoupon ? 'تعديل بيانات الكوبون' : 'إضافة كوبون جديد'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    حدد شروط الكود، الخصم، حدود الاستخدام وتواريخ الصلاحية
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Code & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    كود الكوبون (Coupon Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: CLEANZO20"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    الاسم الوصفي (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: خصم افتتاح فرع التجمع"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    نوع الخصم (Discount Type) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('percentage')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        formDiscountType === 'percentage'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>نسبة مئوية</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDiscountType('fixed')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        formDiscountType === 'fixed'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>مبلغ ثابت</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    قيمة الخصم ({formDiscountType === 'percentage' ? '%' : 'ج.م'}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={formDiscountType === 'percentage' ? 100 : 10000}
                    required
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    إجمالي عدد مرات الاستخدام (Total Usage) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formTotalLimit}
                    onChange={(e) => setFormTotalLimit(Number(e.target.value))}
                    placeholder="مثال: 1000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    الحد الأقصى للعميل الواحد (Per Customer) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formPerCustomerLimit}
                    onChange={(e) => setFormPerCustomerLimit(Number(e.target.value))}
                    placeholder="مثال: 2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Conditions: Min Order Amount & Max Discount Cap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    الحد الأدنى لقيمة الطلب (ج.م)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formMinOrderAmount}
                    onChange={(e) => setFormMinOrderAmount(Number(e.target.value))}
                    placeholder="0 = لا يوجد حد أدنى"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-[10px] text-slate-400">لن يُطبّق الخصم إلا إذا تجاوز الطلب هذه القيمة</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    الحد الأقصى للخصم (ج.م)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                    placeholder="اختياري - سقف الخصم"
                    disabled={formDiscountType !== 'percentage'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-slate-400">
                    {formDiscountType === 'percentage'
                      ? 'سقف لأعلى مبلغ خصم ممكن للنسب المئوية'
                      : 'متاح فقط عند اختيار خصم نسبة مئوية'}
                  </span>
                </div>
              </div>

              {/* Applicable Services */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    نطاق الخدمات المشمولة بالخصم
                  </label>
                  <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                    {formApplicableServices.length === 0
                      ? 'جميع الخدمات (شامل)'
                      : `${formApplicableServices.length} خدمات محددة`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormApplicableServices([])}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      formApplicableServices.length === 0
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    تطبيق على جميع الخدمات
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formApplicableServices.length === 0 && availableServices.length > 0) {
                        setFormApplicableServices([availableServices[0].id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      formApplicableServices.length > 0
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    تحديد خدمات معينة فقط
                  </button>
                </div>

                {formApplicableServices.length > 0 && availableServices.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {availableServices.map((srv) => {
                      const isSelected = formApplicableServices.includes(srv.id);
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => {
                            setFormApplicableServices((prev) =>
                              isSelected ? prev.filter((id) => id !== srv.id) : [...prev, srv.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                          <span>{srv.title}</span>
                          <span className="text-[10px] opacity-70">({srv.price} ج.م)</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    تاريخ البداية (Start Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    تاريخ الانتهاء (End Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  حالة الكوبون (Status)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-emerald-600 dark:text-emerald-400">فعال (Active)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                      className="text-slate-500 focus:ring-slate-500"
                    />
                    <span className="text-slate-500">غير فعال (Disabled)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-black shadow-md transition-all cursor-pointer"
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingCoupon ? 'حفظ التعديلات' : 'تأكيد إنشاء الكوبون'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Usages Drawer */}
      {viewingUsageCoupon && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    سجل استخدامات الكوبون ({viewingUsageCoupon.code})
                  </h3>
                  <p className="text-xs text-slate-400">
                    استُخدم {viewingUsageCoupon.currentUsageCount} مرة من أصل {viewingUsageCoupon.totalUsageLimit}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUsageCoupon(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Aggregate Stats Summary Grid */}
            {usageStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold block">إجمالي الاستخدام</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {usageStats.used ?? viewingUsageCoupon.currentUsageCount} / {usageStats.totalUsageLimit ?? viewingUsageCoupon.totalUsageLimit}
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    المتبقي: {usageStats.remaining ?? Math.max(0, viewingUsageCoupon.totalUsageLimit - viewingUsageCoupon.currentUsageCount)}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold block">عدد العملاء</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {usageStats.customersCount ?? '0'} <span className="text-[11px] text-slate-400">عميل</span>
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    حد العميل: {usageStats.perCustomerLimit ?? viewingUsageCoupon.perCustomerLimit}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold block">إجمالي الطلبات</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {usageStats.ordersCount ?? couponUsages.length} <span className="text-[11px] text-slate-400">طلب</span>
                  </p>
                  <span className="text-[10px] text-sky-500 font-medium">
                    طلب مكتمل ومؤكد
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold block">آخر استخدام</span>
                  <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                    {usageStats.lastUsedAt ? new Date(usageStats.lastUsedAt).toLocaleDateString('ar-EG') : 'لم يستخدم بعد'}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {usageStats.firstUsedAt ? `الأول: ${new Date(usageStats.firstUsedAt).toLocaleDateString('ar-EG')}` : '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-2.5">
              {isLoadingUsages ? (
                <div className="py-12 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
                  <span>جاري جلب سجلات الاستخدام...</span>
                </div>
              ) : couponUsages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-bold">
                  لم يقم أي عميل باستخدام هذا الكوبون حتى الآن.
                </div>
              ) : (
                couponUsages.map((u) => (
                  <div
                    key={u._id}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {u.customerName || 'عميل كلينزو'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {u.customerPhone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-mono bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 rounded-md font-bold">
                          طلب: #{u.orderId}
                        </span>
                        <span>•</span>
                        <span>{new Date(u.usedAt).toLocaleString('ar-EG')}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        -{u.actualDiscountAmount} ج.م
                      </span>
                      <div className="text-[10px] text-slate-400">
                        من {u.originalPrice} إلى {u.finalPrice} ج.م
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setViewingUsageCoupon(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {couponToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد أرشفة وحذف الكوبون ({couponToDelete.code})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                سيتم أرشفة الكوبون وتعطيله فوراً ولن يتمكن أي عميل من استخدامه. لن تتأثر الطلبات التاريخية التي تمت مسبقاً بهذا الكوبون حفاظاً على سلامة البيانات المالية.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCouponToDelete(null)}
                disabled={isDeleting}
              >
                تراجع
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? 'جاري الأرشفة...' : 'نعم، أرشف واحذف'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
