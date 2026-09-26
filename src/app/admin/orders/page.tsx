'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  HardHat,
  Trash2,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Printer,
  PlayCircle,
} from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { generateOfficialInvoiceHtml, printHtmlDocument } from '@/lib/printUtils';
import { OrderStatus, ServiceCategory } from '@/types';
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

const ORDER_STATUS_OPTIONS: StatusOption[] = [
  { label: 'الكل', value: 'all' },
  { label: 'قيد المراجعة', value: 'pending', colorClass: 'bg-amber-500 text-white' },
  { label: 'مستلم', value: 'confirmed', colorClass: 'bg-sky-500 text-white' },
  { label: 'تم تعيين فني', value: 'assigned', colorClass: 'bg-indigo-500 text-white' },
  { label: 'قيد التنفيذ', value: 'in_progress', colorClass: 'bg-blue-600 text-white' },
  { label: 'مكتمل', value: 'completed', colorClass: 'bg-emerald-600 text-white' },
  { label: 'ملغي', value: 'cancelled', colorClass: 'bg-rose-600 text-white' },
];

const ORDER_DYNAMIC_FIELDS: DynamicFilterField[] = [
  {
    id: 'category',
    label: 'نوع الخدمة',
    type: 'select',
    placeholder: 'كافة التصنيفات',
    options: [
      { label: 'خدمات غسيل وتنظيف السيارات (Car)', value: 'car' },
      { label: 'خدمات تنظيف المنازل والأثاث (Home)', value: 'home' },
    ],
  },
  {
    id: 'priceRange',
    label: 'نطاق السعر الإجمالي (ج.م)',
    type: 'number-range',
    minPlaceholder: 'أدنى سعر',
    maxPlaceholder: 'أعلى سعر',
  },
];

const ORDER_SORT_OPTIONS: SortOption[] = [
  { label: 'الأحدث حجزاً', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'الأقدم حجزاً', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'تاريخ تنفيذ الخدمة', sortBy: 'date', sortOrder: 'desc' },
  { label: 'الأعلى قيمة وسعراً', sortBy: 'finalPrice', sortOrder: 'desc' },
  { label: 'الأقل قيمة وسعراً', sortBy: 'finalPrice', sortOrder: 'asc' },
];

export default function AdminOrdersPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canChangeStatus = hasPermission(currentAdmin, 'orders.status');
  const canDeleteOrder = hasPermission(currentAdmin, 'orders.delete');
  const canExportCSV = hasPermission(currentAdmin, 'reports.export') || hasPermission(currentAdmin, 'orders.view');

  const orders = useOrderStore((s) => s.orders);
  const fetchAdminOrders = useOrderStore((s) => s.fetchAdminOrders);
  const updateOrderStatusApi = useOrderStore((s) => s.updateOrderStatusApi);
  const deleteOrder = useOrderStore((s) => s.deleteOrder);
  const isLoading = useOrderStore((s) => s.isLoading);
  const technicians = useTechnicianStore((s) => s.technicians);
  const fetchTechnicians = useTechnicianStore((s) => s.fetchTechnicians);

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

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      await deleteOrder(orderToDelete.id);
      toast.success(`تم حذف الطلب رقم #${String(orderToDelete.id).slice(-6)} بنجاح`);
      setOrderToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'فشل حذف الطلب');
    } finally {
      setIsDeletingOrder(false);
    }
  };


  // Query server when filters change
  const loadOrders = useCallback(() => {
    const params: any = {
      sortBy: filterValues.sortBy,
      sortOrder: filterValues.sortOrder,
    };
    if (filterValues.search.trim()) params.search = filterValues.search.trim();
    if (filterValues.status && filterValues.status !== 'all') params.status = filterValues.status;
    if (filterValues.dateFrom) params.dateFrom = filterValues.dateFrom;
    if (filterValues.dateTo) params.dateTo = filterValues.dateTo;
    if (filterValues.dynamicFilters.category && filterValues.dynamicFilters.category !== 'all') {
      params.category = filterValues.dynamicFilters.category;
    }
    if (filterValues.dynamicFilters.priceRange?.min !== undefined) {
      params.minPrice = filterValues.dynamicFilters.priceRange.min;
    }
    if (filterValues.dynamicFilters.priceRange?.max !== undefined) {
      params.maxPrice = filterValues.dynamicFilters.priceRange.max;
    }

    fetchAdminOrders(params);
  }, [filterValues, fetchAdminOrders]);

  useEffect(() => {
    loadOrders();
    fetchTechnicians();
  }, [loadOrders, fetchTechnicians]);

  const handleFilterChange = useCallback((newValues: GlobalFilterValues) => {
    setFilterValues(newValues);
    setPage(1);
  }, []);

  // Filter and sort locally if store has in-memory modifications or offline
  const filtered = orders.filter((o) => {
    const matchStatus = filterValues.status === 'all' || o.status === filterValues.status;
    const cat = filterValues.dynamicFilters.category;
    const matchCategory = !cat || cat === 'all' || o.category === cat;
    const q = filterValues.search.trim().toLowerCase();
    const matchSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.service.title.toLowerCase().includes(q) ||
      (o.address?.area && o.address.area.toLowerCase().includes(q)) ||
      (o.notes && o.notes.toLowerCase().includes(q));

    const minP = filterValues.dynamicFilters.priceRange?.min;
    const maxP = filterValues.dynamicFilters.priceRange?.max;
    const price = Number(o.finalPrice) || 0;
    const matchPrice =
      (minP === undefined || price >= minP) && (maxP === undefined || price <= maxP);

    return matchStatus && matchCategory && matchSearch && matchPrice;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedOrders = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === paginatedOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(paginatedOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleQuickStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    try {
      await updateOrderStatusApi(orderId, status, note);
      const statusLabelsAr: Record<string, string> = {
        pending: 'قيد المراجعة',
        confirmed: 'مؤكد',
        assigned: 'تم تعيين فني',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتمل',
        cancelled: 'ملغي',
      };
      toast.success(`تم تحديث حالة الطلب #${orderId} إلى: ${statusLabelsAr[status] || status}`);
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث حالة الطلب');
    }
  };

  const handleBulkStatus = async (status: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    for (const id of selectedOrderIds) {
      try {
        await updateOrderStatusApi(id, status);
      } catch {}
    }
    toast.success(`تم تحديث حالة ${selectedOrderIds.length} طلبات بنجاح إلى: ${status}`);
    setSelectedOrderIds([]);
  };

  const handleExportCSV = () => {
    const header = 'رقم الطلب,الخدمة,التصنيف,التاريخ,الوقت,السعر,الحالة\n';
    const rows = filtered
      .map(
        (o) =>
          `"${o.id}","${o.service.title}","${o.category}","${o.date}","${o.time}","${o.finalPrice}","${o.status}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cleanzo-orders-${Date.now()}.csv`;
    link.click();
    toast.success('تم تصدير ملف الطلبات (CSV) بنجاح');
  };

  const statusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            قيد المراجعة
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
            مستلم
          </span>
        );
      case 'assigned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            تم تعيين فني
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
            قيد التنفيذ
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            مكتمل
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
            ملغي
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            إدارة الطلبات والحجوزات
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إجمالي {filtered.length} حجز مسجل عبر المنصة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadOrders()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin text-sky-500')} />
            <span>تحديث</span>
          </button>
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

      {/* Global Filter Engine */}
      <GlobalFilterEngine
        searchPlaceholder="بحث برقم الطلب، اسم الخدمة، العنوان، أو الملاحظات..."
        statusOptions={ORDER_STATUS_OPTIONS}
        dynamicFields={ORDER_DYNAMIC_FIELDS}
        sortOptions={ORDER_SORT_OPTIONS}
        onFilterChange={handleFilterChange}
      />

      {/* Bulk Action Bar - Only if user has orders.status permission */}
      {selectedOrderIds.length > 0 && canChangeStatus && (
        <div className="flex flex-wrap items-center justify-between p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs animate-in fade-in">
          <span className="font-bold text-sky-700 dark:text-sky-300">
            تم تحديد {selectedOrderIds.length} طلبات
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatus('confirmed')}
              className="px-3 py-1.5 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors cursor-pointer"
            >
              استلام الطلبات المحددة
            </button>
            <button
              onClick={() => handleBulkStatus('cancelled')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              إلغاء المحددة
            </button>
          </div>
        </div>
      )}

      {/* Orders List Container */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* MOBILE CARDS VIEW (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              لا توجد طلبات مطابقة لمعايير البحث الحالية.
            </div>
          ) : (
            paginatedOrders.map((order) => {
              const isSelected = selectedOrderIds.includes(order.id);
              return (
                <div
                  key={order.id}
                  className={cn(
                    'p-4 space-y-3 transition-colors',
                    isSelected ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="rounded-sm border-slate-400"
                      />
                      <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                        #{order.id}
                      </span>
                    </div>
                    <div>{statusBadge(order.status)}</div>
                  </div>

                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {order.service?.title || (order as any).serviceSnapshot?.title || 'خدمة كلينزو'}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {order.date} — {order.time}
                    </span>
                    <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                      {order.finalPrice} ج.م
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      {order.technician ? order.technician.name : 'لم يُعيّن فني'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300"
                      >
                        تفاصيل
                      </Link>
                      {order.status === 'pending' && canChangeStatus && (
                        <button
                          onClick={() => handleQuickStatus(order.id, 'confirmed', 'تم استلام الطلب وتأكيده')}
                          className="px-2.5 py-1 rounded-lg bg-[#0866C6]/10 text-[#0866C6] text-[11px] font-bold hover:bg-[#0866C6] hover:text-white transition-colors cursor-pointer"
                        >
                          استلام
                        </button>
                      )}
                      {order.status === 'confirmed' && canChangeStatus && (
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 text-[11px] font-bold hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"
                        >
                          تعيين فني
                        </Link>
                      )}
                      {order.status === 'assigned' && canChangeStatus && (
                        <button
                          onClick={() => handleQuickStatus(order.id, 'in_progress', 'بدء تنفيذ الخدمة')}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 text-[11px] font-bold hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                        >
                          بدء التنفيذ
                        </button>
                      )}
                      {order.status === 'in_progress' && canChangeStatus && (
                        <button
                          onClick={() => handleQuickStatus(order.id, 'completed', 'تم الانتهاء من تنفيذ الطلب بنجاح')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-[11px] font-bold hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                        >
                          تم الانتهاء
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedOrders.length > 0 &&
                      selectedOrderIds.length === paginatedOrders.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded-sm border-slate-400 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">رقم الطلب</th>
                <th className="py-3.5 px-4">الخدمة</th>
                <th className="py-3.5 px-4">الموعد</th>
                <th className="py-3.5 px-4">العنوان</th>
                <th className="py-3.5 px-4">السعر</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4">الفني</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    لا توجد طلبات مطابقة للبحث أو الفلاتر المختارة.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors',
                        isSelected ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                      )}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="rounded-sm border-slate-400 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:text-sky-500 font-mono"
                        >
                          #{String(order.id).slice(-6)}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {order.service?.title || (order as any).serviceSnapshot?.title || 'خدمة كلينزو'}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {order.category === 'car' ? 'سيارات' : 'منازل'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 dark:text-slate-200">{order.date}</div>
                        <span className="text-[10px] text-slate-400">{order.time}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[160px] truncate text-slate-600 dark:text-slate-300">
                        {order.address?.area || 'المنطقة'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {order.finalPrice} ج.م
                      </td>
                      <td className="py-3.5 px-4">{statusBadge(order.status)}</td>
                      <td className="py-3.5 px-4">
                        {order.technician ? (
                          <div className="font-semibold text-sky-600 dark:text-sky-400">
                            {order.technician.name}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">لم يُعيّن</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                            title="تفاصيل الطلب"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const html = generateOfficialInvoiceHtml(order);
                              printHtmlDocument(`فاتورة رسمية - ${order.id}`, html);
                            }}
                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-[#0866C6] hover:text-white transition-colors cursor-pointer"
                            title="طباعة الفاتورة الضريبية الرسمية"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {order.status === 'pending' && canChangeStatus && (
                            <button
                              onClick={() => handleQuickStatus(order.id, 'confirmed', 'تم استلام الطلب وتأكيده')}
                              className="p-1.5 rounded-lg bg-[#0866C6]/10 text-[#0866C6] hover:bg-[#0866C6] hover:text-white transition-colors cursor-pointer"
                              title="استلام الطلب"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {order.status === 'confirmed' && canChangeStatus && (
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
                              title="تعيين فني للطلب"
                            >
                              <HardHat className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          {order.status === 'assigned' && canChangeStatus && (
                            <button
                              onClick={() =>
                                handleQuickStatus(order.id, 'in_progress', 'بدء تنفيذ الخدمة')
                              }
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                              title="بدء التنفيذ"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {order.status === 'in_progress' && canChangeStatus && (
                            <button
                              onClick={() =>
                                handleQuickStatus(order.id, 'completed', 'تم الانتهاء من تنفيذ الطلب بنجاح')
                              }
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                              title="تم الانتهاء"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'completed' && canChangeStatus && (
                            <button
                              onClick={() =>
                                handleQuickStatus(order.id, 'cancelled', 'إلغاء بواسطة الإدارة')
                              }
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                              title="إلغاء الطلب"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDeleteOrder && (
                            <button
                              onClick={() => setOrderToDelete(order)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                              title="حذف الطلب نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            عرض {(page - 1) * itemsPerPage + 1} إلى{' '}
            {Math.min(page * itemsPerPage, filtered.length)} من إجمالي {filtered.length} طلب
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              السابق
            </button>
            <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تأكيد حذف الطلب #{String(orderToDelete.id).slice(-6)}
                </h3>
                <p className="text-xs text-slate-400">سيتم مسح سجل هذا الطلب نهائياً</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">الخدمة:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {orderToDelete.service?.title || (orderToDelete as any).serviceSnapshot?.title || 'خدمة كلينزو'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">العميل:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {orderToDelete.customerName || (orderToDelete as any).customerSnapshot?.name || 'العميل'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المبلغ:</span>
                <span className="font-bold text-slate-900 dark:text-white">{orderToDelete.finalPrice} ج.م</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={handleDeleteOrder}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-xs transition-colors"
              >
                {isDeletingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>تأكيد حذف الطلب نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
