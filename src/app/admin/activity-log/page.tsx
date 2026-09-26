'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Search,
  Download,
  Trash2,
  Shield,
  Clock,
  User,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertOctagon,
  Eye,
  RefreshCw,
  Laptop,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { ActivityLog, AuditLogStatus } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/api/apiClient';

export default function AdminActivityLogPage() {
  const { currentAdmin } = useAdminStore();
  const {
    logs,
    pagination,
    summary,
    filters,
    isLoading,
    fetchLogs,
    setPage,
    setLimit,
    setFilters,
    resetFilters,
    purgeLogs,
    selectedLog,
    setSelectedLog,
  } = useActivityLogStore();

  const [isPending, startTransition] = useTransition();

  // Search local state for debouncing
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Purge modal state
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [isPurging, setIsPurging] = useState(false);

  // Initial load
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        startTransition(() => {
          setFilters({ search: searchInput });
          fetchLogs({ search: searchInput, page: 1 });
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilters, fetchLogs]);

  // Status styling map
  const statusStyles: Record<
    AuditLogStatus,
    { label: string; icon: any; badgeBg: string; text: string; dot: string }
  > = {
    success: {
      label: 'ناجح',
      icon: CheckCircle2,
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
      text: 'text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
    warning: {
      label: 'تنبيه',
      icon: AlertTriangle,
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500',
    },
    failed: {
      label: 'فشل',
      icon: XCircle,
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
      text: 'text-rose-700 dark:text-rose-400',
      dot: 'bg-rose-500',
    },
    critical: {
      label: 'حرج',
      icon: AlertOctagon,
      badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
      text: 'text-purple-700 dark:text-purple-400',
      dot: 'bg-purple-500',
    },
  };

  const isOwner = currentAdmin?.role === 'owner';

  // Handle Export CSV
  const handleExportCSV = () => {
    try {
      const searchParams = new URLSearchParams();
      if (filters.module && filters.module !== 'all') searchParams.append('module', filters.module);
      if (filters.action && filters.action !== 'all') searchParams.append('action', filters.action);
      if (filters.status && filters.status !== 'all') searchParams.append('status', filters.status);
      if (filters.actorRole && filters.actorRole !== 'all') searchParams.append('actorRole', filters.actorRole);
      if (filters.search) searchParams.append('search', filters.search);
      if (filters.startDate) searchParams.append('startDate', filters.startDate);
      if (filters.endDate) searchParams.append('endDate', filters.endDate);

      const q = searchParams.toString();
      const baseUrl = getApiBaseUrl() || '';
      const exportUrl = `${baseUrl}/audit-logs/export${q ? `?${q}` : ''}`;

      // Open in download window or direct anchor
      const link = document.createElement('a');
      link.href = exportUrl;
      link.setAttribute('download', `cleanzo-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('جارٍ تنزيل ملف سجل التدقيق CSV متوافق مع Excel...');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تصدير السجل');
    }
  };

  // Handle Purge
  const handleConfirmPurge = async () => {
    setIsPurging(true);
    const result = await purgeLogs(retentionDays);
    setIsPurging(false);
    setIsPurgeModalOpen(false);

    if (result.success) {
      toast.success(result.message || 'تم تنظيف السجلات بنجاح');
    } else {
      toast.error(result.message || 'فشلت عملية تنظيف السجلات');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                سجل تدقيق النشاطات (Audit Activity Log)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تتبع شامل لعمليات النظام، تعديلات الأسعار، الحجوزات، المحتوى ومقارنة التغييرات الحية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh button */}
          <button
            onClick={() => fetchLogs()}
            disabled={isLoading || isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', (isLoading || isPending) && 'animate-spin')} />
            <span>تحديث</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير CSV</span>
          </button>

          {/* Purge button (Owner only) */}
          {isOwner && (
            <button
              onClick={() => setIsPurgeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 transition-colors shadow-2xs"
              title="تنظيف السجلات القديمة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تنظيف السجلات</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي العمليات</span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {summary.total.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] text-slate-400">سجل</span>
          </div>
        </div>

        {/* Success Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">عمليات ناجحة</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.success.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] text-emerald-500">ناجحة</span>
          </div>
        </div>

        {/* Warning Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">تنبيهات</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {summary.warning.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] text-amber-500">تنبيه</span>
          </div>
        </div>

        {/* Failed Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">فشل في التنفيذ</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {summary.failed.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] text-rose-500">فشل</span>
          </div>
        </div>

        {/* Critical Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/40 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">حالات حرجة وأمنية</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {summary.critical.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] text-purple-500">حرج</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث بالمسؤول، الإجراء، المعرف، عنوان IP..."
              className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Module Selector */}
          <div>
            <select
              value={filters.module || 'all'}
              onChange={(e) => {
                const val = e.target.value;
                setFilters({ module: val });
                fetchLogs({ module: val, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              <option value="all">كافة الأقسام (All Modules)</option>
              <option value="services">الخدمات والأسعار (Services)</option>
              <option value="orders">الطلبات والحجوزات (Orders)</option>
              <option value="offers">العروض والخصومات (Offers)</option>
              <option value="coupons">كوبونات الخصم (Coupons)</option>
              <option value="content">محتوى المنصة (CMS Content)</option>
              <option value="media">إدارة الوسائط (Media)</option>
              <option value="users">المسؤولون والمستخدمون (Users)</option>
              <option value="roles">الأدوار والصلاحيات (Roles)</option>
              <option value="locations">المواقع والمناطق (Locations)</option>
              <option value="technicians">الفنيين والفرق (Technicians)</option>
              <option value="settings">إعدادات النظام (Settings)</option>
              <option value="backup">النسخ الاحتياطي (Backup)</option>
              <option value="auth">تسجيل الدخول والأمان (Auth)</option>
              <option value="system">النظام العام (System)</option>
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <select
              value={filters.status || 'all'}
              onChange={(e) => {
                const val = e.target.value;
                setFilters({ status: val });
                fetchLogs({ status: val, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              <option value="all">كافة الحالات (All Statuses)</option>
              <option value="success">ناجح فقط (Success)</option>
              <option value="warning">تنبيهات (Warning)</option>
              <option value="failed">فشل (Failed)</option>
              <option value="critical">حالات حرجة (Critical)</option>
            </select>
          </div>

          {/* Role Selector */}
          <div>
            <select
              value={filters.actorRole || 'all'}
              onChange={(e) => {
                const val = e.target.value;
                setFilters({ actorRole: val });
                fetchLogs({ actorRole: val, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              <option value="all">كافة الأدوار (All Roles)</option>
              <option value="owner">المالك (Owner)</option>
              <option value="admin">مدير عام (Admin)</option>
              <option value="booking_manager">مدير حجوزات</option>
              <option value="content_manager">مدير محتوى</option>
              <option value="technician_supervisor">مشرف فنيين</option>
              <option value="customer_service">خدمة عملاء</option>
              <option value="system">النظام الآلي (System)</option>
            </select>
          </div>
        </div>

        {/* Date Filters & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>الفترة:</span>
            </span>

            {/* Quick date presets */}
            <button
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setFilters({ startDate: today, endDate: today });
                fetchLogs({ startDate: today, endDate: today, page: 1 });
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg border text-[11px] transition-colors',
                filters.startDate === new Date().toISOString().slice(0, 10) && filters.endDate === new Date().toISOString().slice(0, 10)
                  ? 'bg-sky-50 border-sky-300 text-sky-700 dark:bg-sky-950/60 dark:border-sky-700 dark:text-sky-300 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              اليوم
            </button>

            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                const start = d.toISOString().slice(0, 10);
                const today = new Date().toISOString().slice(0, 10);
                setFilters({ startDate: start, endDate: today });
                fetchLogs({ startDate: start, endDate: today, page: 1 });
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] transition-colors"
            >
              آخر 7 أيام
            </button>

            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                const start = d.toISOString().slice(0, 10);
                const today = new Date().toISOString().slice(0, 10);
                setFilters({ startDate: start, endDate: today });
                fetchLogs({ startDate: start, endDate: today, page: 1 });
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] transition-colors"
            >
              آخر 30 يوماً
            </button>

            {/* Custom Dates */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => {
                  setFilters({ startDate: e.target.value });
                  fetchLogs({ startDate: e.target.value, page: 1 });
                }}
                className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                title="تاريخ البدء"
              />
              <span className="text-slate-400">إلى</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => {
                  setFilters({ endDate: e.target.value });
                  fetchLogs({ endDate: e.target.value, page: 1 });
                }}
                className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                title="تاريخ الانتهاء"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearchInput('');
                resetFilters();
              }}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline text-[11px] transition-colors"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">المسؤول / الفاعل</th>
                <th className="py-3.5 px-4">الإجراء والوصف الإنساني</th>
                <th className="py-3.5 px-4">القسم / الكيان</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4">الشبكة والمصدر</th>
                <th className="py-3.5 px-4">التاريخ والوقت</th>
                <th className="py-3.5 px-4 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                    <span>جارٍ تحميل سجلات التدقيق...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-400">لا توجد سجلات مطابقة للفلاتر الحالية</p>
                    <p className="text-[11px] text-slate-400 mt-1">جرب تغيير شروط البحث أو مسح الفلاتر</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const statusInfo = statusStyles[log.status || 'success'] || statusStyles.success;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={cn(
                        'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer',
                        selectedLog?.id === log.id && 'bg-sky-50/40 dark:bg-sky-950/20'
                      )}
                    >
                      {/* Actor Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                            {log.actorName ? log.actorName.charAt(0) : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {log.actorName || log.adminName || 'مستخدم النظام'}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {log.actorRole || log.adminRole || 'admin'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description & Action */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {log.description || log.action}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{log.action}</span>
                          {log.diff && log.diff.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              تعديل {log.diff.length} حقول
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Module & Entity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            {log.module}
                          </span>
                          {(log.entityId || log.targetId || log.target) && (
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                              {log.target || log.entityId || log.targetId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border',
                            statusInfo.badgeBg,
                            statusInfo.text
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dot)} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* IP & Origin */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        <div>{log.ip || '127.0.0.1'}</div>
                        {log.requestId && (
                          <div className="text-[9px] text-slate-400 truncate max-w-[100px]" title={log.requestId}>
                            req: {log.requestId.slice(0, 8)}...
                          </div>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                          title="عرض تفاصيل التغيير والمقارنة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination Bar */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
            <span>
              عرض {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} إلى{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} من إجمالي{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{pagination.total}</strong> سجل
            </span>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            <div className="flex items-center gap-1">
              <span>لكل صفحة:</span>
              <select
                value={pagination.limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300">
              صفحة {pagination.page} من {Math.max(1, pagination.pages)}
            </span>

            <button
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages || isLoading}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Details Side Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'p-2 rounded-xl border',
                    statusStyles[selectedLog.status || 'success']?.badgeBg || 'bg-slate-100'
                  )}
                >
                  <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">تفاصيل سجل التدقيق</h2>
                  <div className="text-[11px] text-slate-400 font-mono">ID: {selectedLog.id}</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Main Human Readable Card */}
              <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300">الوصف الإنساني للحدث:</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                      statusStyles[selectedLog.status || 'success']?.badgeBg,
                      statusStyles[selectedLog.status || 'success']?.text
                    )}
                  >
                    {statusStyles[selectedLog.status || 'success']?.label}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                  {selectedLog.description}
                </p>
                {selectedLog.details && selectedLog.details !== selectedLog.description && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{selectedLog.details}</p>
                )}
              </div>

              {/* Actor & Source Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">المسؤول / الفاعل</span>
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {selectedLog.actorName || selectedLog.adminName || 'مستخدم النظام'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    الدور: {selectedLog.actorRole || selectedLog.adminRole || 'admin'}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                    المعرف: {selectedLog.actorId || selectedLog.adminId || '-'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">معلومات المصدر والشبكة</span>
                  <div className="font-mono text-slate-800 dark:text-slate-200 text-xs">
                    IP: {selectedLog.ip || '127.0.0.1'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate" title={selectedLog.requestId}>
                    Request ID: {selectedLog.requestId ? `${selectedLog.requestId.slice(0, 12)}...` : '-'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    الوقت: {selectedLog.timestamp}
                  </div>
                </div>
              </div>

              {/* Module & Target */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">القسم (Module)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 inline-block">
                      {selectedLog.module}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">نوع العملية (Action)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 inline-block">
                      {selectedLog.action}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">العنصر / الكيان</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400 mt-0.5 inline-block truncate max-w-full">
                      {selectedLog.target || selectedLog.entityType || selectedLog.entityId || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Before vs After Diff Viewer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ArrowUpDown className="w-4 h-4 text-sky-500" />
                    <span>مقارنة التغييرات (Before vs After Diff)</span>
                  </h3>
                  {selectedLog.diff && selectedLog.diff.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {selectedLog.diff.length} تغييرات مسجلة
                    </span>
                  )}
                </div>

                {selectedLog.diff && selectedLog.diff.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">اسم الحقل</th>
                          <th className="py-2.5 px-3">القيمة السابقة (Before)</th>
                          <th className="py-2.5 px-3">القيمة الجديدة (After)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedLog.diff.map((diffItem, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {diffItem.fieldLabelAr || diffItem.field}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{diffItem.field}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 max-w-xs break-all">
                                {typeof diffItem.before === 'object'
                                  ? JSON.stringify(diffItem.before)
                                  : String(diffItem.before ?? 'فارغ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 max-w-xs break-all">
                                {typeof diffItem.after === 'object'
                                  ? JSON.stringify(diffItem.after)
                                  : String(diffItem.after ?? 'فارغ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : selectedLog.before || selectedLog.after ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/60">
                      <span className="text-[10px] font-bold text-rose-600 block mb-1">البيانات السابقة (Before)</span>
                      <pre className="text-[10px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg">
                        {JSON.stringify(selectedLog.before, null, 2)}
                      </pre>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60">
                      <span className="text-[10px] font-bold text-emerald-600 block mb-1">البيانات الجديدة (After)</span>
                      <pre className="text-[10px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg">
                        {JSON.stringify(selectedLog.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
                    لا توجد تعديلات حقول قابلة للمقارنة في هذه العملية (عملية استعلام أو إنشاء أولي)
                  </div>
                )}
              </div>

              {/* User Agent & Client Details */}
              {selectedLog.userAgent && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold mb-1">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>متصفح وبيئة العميل (User Agent):</span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all leading-relaxed">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {/* Raw Metadata Inspector */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <details className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/30">
                  <summary className="font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                    البيانات التقنية الإضافية (Raw Metadata)
                  </summary>
                  <pre className="mt-2 text-[10px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirmation Modal (Owner Only) */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">تنظيف سجلات التدقيق القديمة</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">إجراء إداري مقيّد بالمالك (Owner) فقط</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold mb-1">⚠️ تحذير أمني:</p>
              <p>
                سيتم حذف السجلات الأقدم من المدة المحددة نهائياً من قاعدة البيانات. سيتم تسجيل عملية التنظيف نفسها في
                سجل التدقيق.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300">الاحتفاظ بالسجلات لمدة:</label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              >
                <option value={30}>حذف السجلات الأقدم من 30 يوماً</option>
                <option value={60}>حذف السجلات الأقدم من 60 يوماً</option>
                <option value={90}>حذف السجلات الأقدم من 90 يوماً (موصى به)</option>
                <option value={180}>حذف السجلات الأقدم من 180 يوماً</option>
                <option value={365}>حذف السجلات الأقدم من سنة كاملة (365 يوماً)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isPurging}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmPurge}
                disabled={isPurging}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs"
              >
                {isPurging && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد التنظيف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
