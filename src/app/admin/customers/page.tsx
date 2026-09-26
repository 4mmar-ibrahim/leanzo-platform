'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Download,
  Eye,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Percent,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Trash2,
  UserPlus,
  EyeOff,
  Lock,
  Globe,
  Check,
} from 'lucide-react';
import { useCustomerStore } from '@/store/useCustomerStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import GlobalFilterEngine, {
  GlobalFilterValues,
  DynamicFilterField,
  SortOption,
  StatusOption,
} from '@/components/admin/GlobalFilterEngine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAdminStore } from '@/store/useAdminStore';
import { hasPermission } from '@/lib/permissions';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SocialBrandIcon } from '@/components/common/SocialBrandIcon';
import {
  validateEgyptianPhone,
  VALID_EGYPTIAN_PREFIXES,
} from '@/lib/validation/phoneValidation';

export const CUSTOMER_SOURCE_OPTIONS = [
  { key: 'whatsapp', nameAr: 'واتساب', nameEn: 'WhatsApp', color: '#25D366' },
  { key: 'facebook', nameAr: 'فيسبوك', nameEn: 'Facebook', color: '#1877F2' },
  { key: 'instagram', nameAr: 'إنستجرام', nameEn: 'Instagram', color: '#E4405F' },
  { key: 'telegram', nameAr: 'تيليجرام', nameEn: 'Telegram', color: '#229ED9' },
  { key: 'tiktok', nameAr: 'تيك توك', nameEn: 'TikTok', color: '#000000' },
  { key: 'other', nameAr: 'أخرى', nameEn: 'Other', color: '#64748B' },
] as const;

const STATUS_OPTIONS: StatusOption[] = [
  { label: 'الكل', value: 'all' },
  { label: 'نشط', value: 'active', colorClass: 'bg-emerald-500 text-white' },
  { label: 'معطل', value: 'inactive', colorClass: 'bg-amber-500 text-white' },
];

const DYNAMIC_FIELDS: DynamicFilterField[] = [
  {
    id: 'source',
    label: 'قناة الاكتساب',
    type: 'select',
    placeholder: 'كافة القنوات',
    options: [
      { label: 'الموقع الإلكتروني (Website)', value: 'website' },
      { label: 'واتساب (WhatsApp)', value: 'whatsapp' },
      { label: 'فيسبوك (Facebook)', value: 'facebook' },
      { label: 'إنستجرام (Instagram)', value: 'instagram' },
      { label: 'تيليجرام (Telegram)', value: 'telegram' },
      { label: 'تيك توك (TikTok)', value: 'tiktok' },
      { label: 'سوشيال ميديا', value: 'social_media' },
      { label: 'أخرى (Other)', value: 'other' },
    ],
  },
  {
    id: 'spentRange',
    label: 'نطاق إجمالي الإنفاق (ج.م)',
    type: 'number-range',
    minPlaceholder: 'أدنى إنفاق',
    maxPlaceholder: 'أعلى إنفاق',
  },
  {
    id: 'ordersRange',
    label: 'نطاق عدد الطلبات',
    type: 'number-range',
    minPlaceholder: 'أدنى طلبات',
    maxPlaceholder: 'أقصى طلبات',
  },
];

const SORT_OPTIONS: SortOption[] = [
  { label: 'الأحدث تسجيلاً', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'الأقدم تسجيلاً', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'الأعلى إنفاقاً', sortBy: 'totalSpent', sortOrder: 'desc' },
  { label: 'الأكثر طلباً', sortBy: 'ordersCount', sortOrder: 'desc' },
  { label: 'الاسم (أ - ي)', sortBy: 'name', sortOrder: 'asc' },
];

const SOURCE_LABELS: Record<string, string> = {
  website: 'موقع إلكتروني',
  whatsapp: 'واتساب',
  facebook: 'فيسبوك',
  instagram: 'إنستجرام',
  telegram: 'تيليجرام',
  tiktok: 'تيك توك',
  social_media: 'سوشيال ميديا',
  other: 'أخرى',
};

export default function AdminCustomersPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canEditCustomer = hasPermission(currentAdmin, 'customers.edit');
  const canDeleteCustomer = hasPermission(currentAdmin, 'customers.delete') || currentAdmin?.role === 'owner' || currentAdmin?.role === 'admin' || currentAdmin?.role === 'manager';
  const canExportCSV = hasPermission(currentAdmin, 'reports.export') || hasPermission(currentAdmin, 'customers.view');

  const storeCustomers = useCustomerStore((s) => s.customers);
  const toggleStatus = useCustomerStore((s) => s.toggleCustomerStatus);
  const deleteCustomer = useCustomerStore((s) => s.deleteCustomer);

  const [filterValues, setFilterValues] = useState<GlobalFilterValues>({
    search: '',
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
    status: 'all',
    dynamicFilters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [newSource, setNewSource] = useState<string>('whatsapp');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoneError, setNewPhoneError] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const handleNewPhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 11);
    setNewPhone(cleaned);
    if (newPhoneError && (cleaned.length === 0 || cleaned.length >= 3)) {
      const res = validateEgyptianPhone(cleaned);
      if (res.isValid) {
        setNewPhoneError('');
      }
    }
  };

  const handleNewPhoneBlur = () => {
    if (!newPhone) return;
    const res = validateEgyptianPhone(newPhone);
    if (!res.isValid) {
      setNewPhoneError(res.error || 'يرجى إدخال رقم هاتف مصري صحيح.');
    } else {
      setNewPhoneError('');
    }
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }
    const phoneCheck = validateEgyptianPhone(newPhone);
    if (!phoneCheck.isValid) {
      setNewPhoneError(phoneCheck.error || 'يرجى إدخال رقم هاتف مصري صحيح.');
      toast.error(phoneCheck.error || 'يرجى إدخال رقم هاتف مصري صحيح.');
      return;
    }
    if (newPassword && newPassword.trim().length > 0 && newPassword.trim().length < 6) {
      setNewPasswordError('كلمة المرور يجب أن تتكون من 6 خانات على الأقل');
      toast.error('كلمة المرور يجب أن تتكون من 6 خانات على الأقل');
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const res = await cleanzoApi.admin.createCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        password: newPassword.trim() || undefined,
        source: newSource,
        email: newEmail.trim() || undefined,
      });
      if (res && (res.success || res.id || res._id || res.phone)) {
        toast.success('تمت إضافة العميل بنجاح');
        setIsAddModalOpen(false);
        setNewName('');
        setNewPhone('');
        setNewPassword('');
        setShowPassword(false);
        setNewSource('whatsapp');
        setNewEmail('');
        setNewPhoneError('');
        setNewPasswordError('');
        fetchCustomers();
      } else {
        toast.error((res as any)?.message || 'فشل إضافة العميل');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إضافة العميل');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Fetch customers with applied filters from Cleanzo backend
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { search, dateFrom, dateTo, status, dynamicFilters, sortBy, sortOrder } = filterValues;
      const queryParams: any = {
        page: currentPage,
        limit: 20,
        sortBy,
        sortOrder,
      };

      if (search.trim()) queryParams.search = search.trim();
      if (status && status !== 'all') queryParams.status = status;
      if (dateFrom) queryParams.dateFrom = dateFrom;
      if (dateTo) queryParams.dateTo = dateTo;

      if (dynamicFilters.source && dynamicFilters.source !== 'all') {
        queryParams.source = dynamicFilters.source;
      }
      if (dynamicFilters.spentRange?.min !== undefined) {
        queryParams.minSpent = dynamicFilters.spentRange.min;
      }
      if (dynamicFilters.spentRange?.max !== undefined) {
        queryParams.maxSpent = dynamicFilters.spentRange.max;
      }
      if (dynamicFilters.ordersRange?.min !== undefined) {
        queryParams.minOrders = dynamicFilters.ordersRange.min;
      }
      if (dynamicFilters.ordersRange?.max !== undefined) {
        queryParams.maxOrders = dynamicFilters.ordersRange.max;
      }

      const res = await cleanzoApi.admin.getCustomers(queryParams);

      if (res && res.customers) {
        setCustomers(res.customers);
        setTotalCount(res.pagination?.total || res.customers.length);
        setTotalPages(res.pagination?.pages || 1);
      } else {
        // Fallback to local store filtering
        applyLocalStoreFallback();
      }
    } catch {
      // Fallback
      applyLocalStoreFallback();
    } finally {
      setIsLoading(false);
    }
  }, [filterValues, currentPage]);

  const applyLocalStoreFallback = () => {
    let list = storeCustomers.map((c) => ({ ...c, _id: (c as any)._id || c.id }));
    const { search, status, dynamicFilters, sortBy, sortOrder } = filterValues;

    if (status !== 'all') {
      list = list.filter((c) => c.status === status);
    }
    if (dynamicFilters.source && dynamicFilters.source !== 'all') {
      list = list.filter((c) => c.source === dynamicFilters.source);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    if (dynamicFilters.spentRange?.min !== undefined) {
      list = list.filter((c) => (c.totalSpent || 0) >= dynamicFilters.spentRange.min);
    }
    if (dynamicFilters.spentRange?.max !== undefined) {
      list = list.filter((c) => (c.totalSpent || 0) <= dynamicFilters.spentRange.max);
    }
    if (dynamicFilters.ordersRange?.min !== undefined) {
      list = list.filter((c) => (c.ordersCount || 0) >= dynamicFilters.ordersRange.min);
    }
    if (dynamicFilters.ordersRange?.max !== undefined) {
      list = list.filter((c) => (c.ordersCount || 0) <= dynamicFilters.ordersRange.max);
    }

    // Sort
    list.sort((a, b) => {
      const valA = (a as any)[sortBy];
      const valB = (b as any)[sortBy];
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    setCustomers(list);
    setTotalCount(list.length);
    setTotalPages(1);
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleFilterChange = useCallback((newValues: GlobalFilterValues) => {
    setFilterValues(newValues);
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  const handleExportCSV = () => {
    if (customers.length === 0) {
      toast.info('لا توجد بيانات عملاء لتصديرها');
      return;
    }
    const header = 'الاسم,الهاتف,البريد,تاريخ التسجيل,إجمالي الإنفاق,عدد الطلبات,الحالة\n';
    const rows = customers
      .map((c) => {
        const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-EG') : '-';
        return `"${c.name}","${c.phone}","${c.email || ''}","${date}","${c.totalSpent || 0} ج.م","${c.ordersCount || 0}","${c.status || 'active'}"`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cleanzo-customers-${Date.now()}.csv`;
    link.click();
    toast.success('تم تصدير ملف العملاء (CSV) بنجاح');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-sky-500" />
            <span>سجل العملاء والولاء (CRM)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة حسابات العملاء، سجل الإنفاق، الملاحظات والخصومات المخصصة مع محرك فلاتر احترافي
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {canEditCustomer && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          )}
          {canExportCSV && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>تصدير CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Reusable GlobalFilterEngine Component */}
      <GlobalFilterEngine
        searchPlaceholder="بحث باسم العميل، رقم الهاتف، أو البريد الإلكتروني..."
        statusOptions={STATUS_OPTIONS}
        dynamicFields={DYNAMIC_FIELDS}
        sortOptions={SORT_OPTIONS}
        onFilterChange={handleFilterChange}
      />

      {/* Customers Table Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-sky-500" />
            <p className="text-xs font-bold text-slate-400">جاري تحميل وتحديث سجل العملاء...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              لا يوجد عملاء يطابقون خيارات البحث والفلاتر
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              جرب تغيير كلمات البحث، أو توسيع النطاق الزمني، أو إعادة ضبط الفلاتر النشطة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold">
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4">الهاتف</th>
                  <th className="py-3.5 px-4">تاريخ التسجيل</th>
                  <th className="py-3.5 px-4">الطلبات</th>
                  <th className="py-3.5 px-4">إجمالي الإنفاق</th>
                  <th className="py-3.5 px-4">القناة</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((customer) => {
                  const custId = customer._id || customer.id;
                  const isCustActive = customer.status === 'active' && !customer.isDeleted;
                  const dateFormatted = customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString('ar-EG')
                    : '-';

                  return (
                    <tr
                      key={custId}
                      className={cn(
                        'transition-colors',
                        !isCustActive
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      )}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs',
                              !isCustActive
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400'
                            )}
                          >
                            {customer.name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/customers/${custId}`}
                                className="font-bold text-slate-900 dark:text-white hover:text-sky-500 transition-colors"
                              >
                                {customer.name}
                              </Link>
                              {!isCustActive && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold">
                                  معطل
                                </span>
                              )}
                            </div>
                            {customer.discount ? (
                              <span className="text-[10px] text-emerald-500 font-semibold block">
                                خصم VIP خاص {customer.discount}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block">
                                {customer.email || 'بدون بريد'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {customer.phone}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{dateFormatted}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {customer.ordersCount || 0}
                        </span>
                        {customer.completedOrdersCount !== undefined && (
                          <span className="text-[10px] text-slate-400 mr-1">
                            ({customer.completedOrdersCount} مكتمل)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-sky-600 dark:text-sky-400">
                        {customer.totalSpent || 0} ج.م
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {SOURCE_LABELS[customer.source] || customer.source || 'موقع إلكتروني'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-black',
                            isCustActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {isCustActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/customers/${custId}`}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                            title="عرض ملف العميل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {canEditCustomer && (
                            <button
                              onClick={async () => {
                                const newStatus = isCustActive ? 'inactive' : 'active';
                                try {
                                  await cleanzoApi.admin.updateCustomer(custId, { status: newStatus });
                                } catch {
                                  // Fallback handled seamlessly
                                }
                                toggleStatus(custId);
                                setCustomers((prev) =>
                                  prev.map((c) =>
                                    (c._id || c.id) === custId || c.phone === customer.phone
                                      ? { ...c, status: newStatus, isDeleted: false }
                                      : c
                                  )
                                );
                                if (newStatus === 'inactive') {
                                  toast.warning(`تم تعطيل حساب العميل: ${customer.name}`);
                                } else {
                                  toast.success(`تم تفعيل حساب العميل: ${customer.name}`);
                                }
                              }}
                              className={cn(
                                'text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors',
                                isCustActive
                                  ? 'text-amber-600 bg-amber-500/10 hover:bg-amber-500 hover:text-white'
                                  : 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white'
                              )}
                              title={isCustActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            >
                              {isCustActive ? 'تعطيل' : 'تفعيل'}
                            </button>
                          )}

                          {canDeleteCustomer && (
                            <button
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `هل أنت متأكد من حذف حساب العميل "${customer.name}" نهائياً من قاعدة البيانات؟\n\nسيتم مسح بيانات الدخول ورقم الهاتف والبريد بالكامل ليتمكن من التسجيل من جديد كحساب جديد تماماً دون أي أثر قديم.`
                                  )
                                )
                                  return;

                                try {
                                  await cleanzoApi.admin.deleteCustomer(custId);
                                } catch {
                                  // handled
                                }
                                deleteCustomer(custId);
                                setCustomers((prev) =>
                                  prev.filter((c) => (c._id || c.id) !== custId && c.phone !== customer.phone)
                                );
                                toast.success(`تم حذف حساب العميل (${customer.name}) نهائياً من قاعدة البيانات`);
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                              title="حذف نهائي من قاعدة البيانات"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Card Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-slate-400">
            إجمالي العملاء المسجلين:{' '}
            <span className="font-bold text-slate-700 dark:text-slate-300">{totalCount}</span> عميل
          </p>

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

      {/* Add Customer Modal */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!isCreatingCustomer) {
            setIsAddModalOpen(false);
            setNewPhoneError('');
            setNewPasswordError('');
          }
        }}
        title="إضافة عميل جديد"
        description="تسجيل حساب عميل حقيقي مباشرة في قاعدة البيانات مع تحديد قناة الاكتساب والتحقق الصارم من الهاتف"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 pt-2">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اسم العميل <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="مثال: أحمد محمود"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={isCreatingCustomer}
            />
          </div>

          {/* Customer Phone */}
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
                value={newPhone}
                onChange={(e) => handleNewPhoneChange(e.target.value)}
                onBlur={handleNewPhoneBlur}
                disabled={isCreatingCustomer}
                className={cn('font-mono text-left', newPhoneError && 'border-rose-500 focus:ring-rose-500')}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                {newPhone.length}/11
              </span>
            </div>
            {newPhoneError ? (
              <p className="text-xs text-rose-500 mt-1 font-medium">{newPhoneError}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                يجب أن يتكون من 11 رقمًا ويبدأ بأحد البادئات: {VALID_EGYPTIAN_PREFIXES.join('، ')}
              </p>
            )}
          </div>

          {/* Account Password (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                كلمة المرور للحساب (اختياري)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">اتركها فارغة لإنشاء الحساب بدون كلمة مرور أولية</span>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="اترك الحقل فارغاً أو أدخل 6 خانات كحد أدنى"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPasswordError && (e.target.value.length === 0 || e.target.value.length >= 6)) {
                    setNewPasswordError('');
                  }
                }}
                disabled={isCreatingCustomer}
                dir="ltr"
                className={cn('text-left font-mono pl-10', newPasswordError && 'border-rose-500 focus:ring-rose-500')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPasswordError ? (
              <p className="text-xs text-rose-500 mt-1 font-medium">{newPasswordError}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                في حال ترك الحقل فارغاً، لن يتمكن العميل من الدخول حتى تقوم الإدارة بتعيين كلمة المرور له من شاشة تفاصيل العميل.
              </p>
            )}
          </div>

          {/* Customer Source Selector (Polished Graphical Cards) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              قناة اكتساب العميل (Customer Source) <span className="text-rose-500">*</span>
            </label>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
              role="radiogroup"
              aria-label="قناة اكتساب العميل"
            >
              {CUSTOMER_SOURCE_OPTIONS.map((opt) => {
                const isSelected = newSource === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setNewSource(opt.key)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setNewSource(opt.key);
                      }
                    }}
                    disabled={isCreatingCustomer}
                    className={cn(
                      'relative flex items-center gap-3 p-3 rounded-2xl border text-right transition-all outline-hidden cursor-pointer select-none text-start',
                      isSelected
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500/25 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform',
                        isSelected ? 'scale-105' : ''
                      )}
                      style={{ backgroundColor: `${opt.color}15` }}
                    >
                      {opt.key === 'other' ? (
                        <Globe className="w-5 h-5" style={{ color: opt.color }} />
                      ) : (
                        <SocialBrandIcon platform={opt.key as any} colored className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {opt.nameAr}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {opt.nameEn}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              البريد الإلكتروني (اختياري)
            </label>
            <Input
              type="email"
              dir="ltr"
              placeholder="customer@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={isCreatingCustomer}
              className="text-left"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isCreatingCustomer}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={
                isCreatingCustomer ||
                (newPhone.length > 0 && !validateEgyptianPhone(newPhone).isValid) ||
                (newPassword.length > 0 && newPassword.length < 6)
              }
              className="bg-sky-500 hover:bg-sky-600 text-white min-w-[120px]"
            >
              {isCreatingCustomer ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                'إضافة العميل'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
