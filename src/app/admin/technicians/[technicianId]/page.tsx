'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  HardHat,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Briefcase,
  Layers,
  Star,
  ExternalLink,
  Loader2,
  RotateCcw,
  Sparkles,
  Award,
  ShieldCheck,
  Check,
  Percent,
  Activity,
  MapPin,
  CalendarDays,
  User,
} from 'lucide-react';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { cn, formatTimeTo12Hour } from '@/lib/utils';
import { toast } from 'sonner';
import { getCategoryDisplayName, normalizeCategory } from '@/lib/services/categoryUtils';
import {
  TechnicianExtended,
  TechnicianAnalyticsSummary,
  TechnicianServiceExecution,
  TechnicianMonthlyTrendItem,
} from '@/types';

export default function TechnicianProfileDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const technicianId = params.technicianId as string;

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  // Store fallback
  const fallbackTech = useTechnicianStore((s) => s.getTechnicianById(technicianId));
  const toggleStoreAvailability = useTechnicianStore((s) => s.toggleAvailability);
  const toggleStoreActive = useTechnicianStore((s) => s.toggleActive);

  // Profile data from backend
  const [data, setData] = useState<TechnicianAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch technician profile data with active backend filters
  const fetchProfileData = useCallback(async () => {
    if (!technicianId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await cleanzoApi.technicians.getById(technicianId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        completionStatus: completionFilter !== 'all' ? completionFilter : undefined,
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: 15,
      });

      if (res && res.technician) {
        setData(res);
      } else {
        throw new Error('لم يتم العثور على بيانات الفني');
      }
    } catch (err: any) {
      console.error('Failed to load technician dashboard:', err);
      setError(err?.message || 'فشل تحميل بيانات ملف الفني');
    } finally {
      setLoading(false);
    }
  }, [technicianId, dateFrom, dateTo, statusFilter, categoryFilter, completionFilter, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Active technician instance (from backend or fallback)
  const tech = data?.technician || fallbackTech;

  // Toggle availability handler
  const handleToggleAvailability = async () => {
    if (!tech) return;
    try {
      await toggleStoreAvailability(tech.id);
      await cleanzoApi.technicians.toggleAvailability(tech.id);
      toast.success(`تم تحديث جاهزية الكابتن ${tech.name}`);
      fetchProfileData();
    } catch {
      toast.error('حدث خطأ أثناء تبديل الحالة');
    }
  };

  // Toggle active handler
  const handleToggleActive = async () => {
    if (!tech) return;
    try {
      await toggleStoreActive(tech.id);
      await cleanzoApi.technicians.update(tech.id, { active: !tech.active });
      toast.success(tech.active ? 'تم تعطيل حساب الفني' : 'تم تنشيط حساب الفني');
      fetchProfileData();
    } catch {
      toast.error('حدث خطأ أثناء تعديل حالة الحساب');
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setCompletionFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const metrics = data?.metrics || {
    totalAssigned: tech?.assignedOrders || 0,
    completedOrders: tech?.completedOrders || 0,
    cancelledOrders: 0,
    inProgressOrders: 0,
    pendingOrders: 0,
    uniqueCustomersCount: 0,
    completionRate: 0,
  };

  const servicesExecuted = data?.servicesExecuted || [];
  const monthlyTrend = data?.monthlyTrend || [];
  const orders = data?.orders || [];
  const recentOrders = data?.recentOrders || [];
  const pagination = data?.pagination || { total: orders.length, page: 1, pages: 1, limit: 15 };

  // Maximum monthly value for chart scale calculation
  const maxMonthlyOrders = useMemo(() => {
    if (!monthlyTrend.length) return 10;
    const max = Math.max(...monthlyTrend.map((m) => Math.max(m.assignedCount, m.completedCount)));
    return max > 0 ? max : 10;
  }, [monthlyTrend]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/technicians"
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-sky-600 hover:border-sky-500/40 transition-all shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                لوحة أداء الفني (Technician Profile Dashboard)
              </h1>
              {tech && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
                  {tech.id}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              متابعة مباشرة للإحصائيات الحقيقية، معدل الإنجاز، وسجل الطلبات من قاعدة البيانات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchProfileData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-500 shadow-xs transition-all"
          >
            <RotateCcw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-sky-500')} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Technician Identity Card */}
      {tech && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative">
                <img
                  src={tech.avatar || '/uploads/images/default-avatar.png'}
                  alt={tech.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
                  }}
                  className="w-20 h-20 sm:w-24 sm:sm:h-24 rounded-3xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow-xl"
                />
                <span
                  className={cn(
                    'w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 ring-4 ring-white dark:ring-slate-900',
                    tech.status === 'available'
                      ? 'bg-emerald-500'
                      : tech.status === 'busy'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {tech.name}
                  </h2>
                  <span
                    className={cn(
                      'px-3 py-0.5 rounded-full text-[11px] font-black',
                      tech.status === 'available'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : tech.status === 'busy'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    )}
                  >
                    {tech.status === 'available' ? 'متاح للعمل' : tech.status === 'busy' ? 'في مهمة حالياً' : 'غير متصل'}
                  </span>

                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                      tech.active
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {tech.active ? 'الحساب نشط' : 'الحساب معطل'}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tech.specialty}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{Number(tech.rating || 5).toFixed(1)} / 5.0</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-sky-500" />
                    <span className="font-mono font-bold" dir="ltr">{tech.phone}</span>
                  </div>

                  {tech.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tech.email}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      انضم:{' '}
                      {tech.joinedDate
                        ? new Date(tech.joinedDate).toLocaleDateString('ar-EG', { dateStyle: 'medium' })
                        : 'فريق العمل الأساسي'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Status Control Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleToggleAvailability}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-sky-500 hover:text-white transition-all shadow-xs"
              >
                <span>تبديل حالة التواجد 🔄</span>
              </button>

              <button
                type="button"
                onClick={handleToggleActive}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs',
                  tech.active
                    ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white'
                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                )}
              >
                <span>{tech.active ? 'تعطيل الحساب' : 'تنشيط الحساب'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Assigned */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">إجمالي المسند</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.totalAssigned}
          </h3>
          <span className="text-[10px] text-slate-400 block mt-0.5">طلب منذ انضمامه</span>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">الطلبات المكتملة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.completedOrders}
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
            <Percent className="w-3 h-3" />
            <span>معدل إنجاز {metrics.completionRate}%</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">قيد التنفيذ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {metrics.inProgressOrders}
          </h3>
          <span className="text-[10px] text-slate-400 block mt-0.5">مهام جارية الآن</span>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">المعلقة والمجدولة</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.pendingOrders}
          </h3>
          <span className="text-[10px] text-slate-400 block mt-0.5">في قائمة الانتظار</span>
        </div>

        {/* Cancelled */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">الطلبات الملغاة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {metrics.cancelledOrders}
          </h3>
          <span className="text-[10px] text-slate-400 block mt-0.5">ملغاة من العميل/الإدارة</span>
        </div>

        {/* Unique Customers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">العملاء المخدومون</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            {metrics.uniqueCustomersCount}
          </h3>
          <span className="text-[10px] text-slate-400 block mt-0.5">عميل مختلف</span>
        </div>
      </div>

      {/* Interactive Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Orders Over Time (Monthly Trend) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  مسار الطلبات عبر الشهور (Orders Over Time)
                </h3>
                <p className="text-[11px] text-slate-400">
                  مقارنة بين الطلبات المسندة والطلبات المكتملة لكل شهر
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span className="text-slate-600 dark:text-slate-300">المسند</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300">المكتمل</span>
              </div>
            </div>
          </div>

          {monthlyTrend.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs text-slate-400">
              لا توجد بيانات كافية لعرض الرسم البياني الشهري بعد
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {monthlyTrend.map((item) => {
                const assignedPercent = Math.min(100, Math.round((item.assignedCount / maxMonthlyOrders) * 100));
                const completedPercent = Math.min(100, Math.round((item.completedCount / maxMonthlyOrders) * 100));

                return (
                  <div key={item.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-sky-600 dark:text-sky-400 font-bold">{item.assignedCount} مسند</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.completedCount} مكتمل</span>
                      </div>
                    </div>

                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                      <div
                        style={{ width: `${completedPercent}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        title={`مكتمل: ${item.completedCount}`}
                      />
                      <div
                        style={{ width: `${Math.max(0, assignedPercent - completedPercent)}%` }}
                        className="h-full bg-sky-400 rounded-full transition-all duration-500"
                        title={`قيد العمل أو أخرى: ${item.assignedCount - item.completedCount}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Services Distribution */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                توزيع الخدمات المنفذة (Services Distribution)
              </h3>
              <p className="text-[11px] text-slate-400">
                الخدمات الأكثر إسناداً وتنفيذاً بواسطة الفني
              </p>
            </div>
          </div>

          {servicesExecuted.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs text-slate-400">
              لم ينفذ الفني أي خدمات مسجلة حتى الآن
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {servicesExecuted.slice(0, 6).map((srv) => {
                const total = metrics.totalAssigned > 0 ? metrics.totalAssigned : 1;
                const percent = Math.min(100, Math.round((srv.count / total) * 100));

                return (
                  <div key={srv.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            srv.category === 'car' ? 'bg-sky-500' : 'bg-amber-500'
                          )}
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {srv.title}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                        {srv.count} طلب ({percent}%)
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          srv.category === 'car' ? 'bg-sky-500' : 'bg-amber-500'
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Backend-backed Filters Toolbar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-black text-slate-900 dark:text-white">
              تصفية وبحث في طلبات الفني (Backend Live Filters)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              إجمالي نتائج البحث: <strong className="text-slate-900 dark:text-white">{pagination.total}</strong> طلب
            </span>
            {(search || statusFilter !== 'all' || categoryFilter !== 'all' || completionFilter !== 'all' || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
              >
                <span>إلغاء الفلاتر</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              بحث بالعميل أو رقم الطلب
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="اسم العميل أو الهاتف أو ID..."
                className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              حالة الطلب
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="completed">مكتمل (Completed)</option>
              <option value="in_progress">قيد التنفيذ (In Progress)</option>
              <option value="assigned">مسند للفني (Assigned)</option>
              <option value="confirmed">مؤكد (Confirmed)</option>
              <option value="pending">معلق (Pending)</option>
              <option value="cancelled">ملغى (Cancelled)</option>
            </select>
          </div>

          {/* Completion Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              حالة الإنجاز
            </label>
            <select
              value={completionFilter}
              onChange={(e) => {
                setCompletionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            >
              <option value="all">الكل</option>
              <option value="completed">مكتملة فقط</option>
              <option value="uncompleted">غير مكتملة (جارية أو معلقة)</option>
              <option value="cancelled">ملغاة فقط</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              من تاريخ
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            >
            </input>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            >
            </input>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-sky-500" />
            <h3 className="text-xs font-black text-slate-900 dark:text-white">
              سجل الطلبات المسندة للفني ({pagination.total} طلب)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            صفحة {pagination.page} من {pagination.pages || 1}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">جاري تحميل الطلبات وتطبيق الفلاتر...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">لا توجد طلبات مطابقة</h4>
            <p className="text-xs text-slate-400 mt-1">جرب إزالة أو تعديل فلاتر التاريخ وحالة الطلب</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="py-3 px-4">رقم الطلب</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">الخدمة</th>
                  <th className="py-3 px-4">تاريخ ووقت الحجز</th>
                  <th className="py-3 px-4">وقت التنفيذ / الإكمال</th>
                  <th className="py-3 px-4">القيمة</th>
                  <th className="py-3 px-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order: any) => {
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    completed: {
                      label: 'مكتمل بنجاح',
                      cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    },
                    in_progress: {
                      label: 'جاري التنفيذ',
                      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    },
                    assigned: {
                      label: 'مسند للفني',
                      cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
                    },
                    confirmed: {
                      label: 'مؤكد',
                      cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
                    },
                    pending: {
                      label: 'معلق',
                      cls: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
                    },
                    cancelled: {
                      label: 'ملغى',
                      cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                    },
                  };

                  const currentStatus = statusMap[order.status] || {
                    label: order.status,
                    cls: 'bg-slate-100 text-slate-600',
                  };

                  // Execution time formatting
                  const executionTimeText = order.completedAt
                    ? new Date(order.completedAt).toLocaleString('ar-EG', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : formatTimeTo12Hour(order.timeSlotStart || order.time) || 'قيد الجدولة';

                  return (
                    <tr
                      key={order.id || order._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Order Number */}
                      <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {order.id}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{order.customerName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5" dir="ltr">
                          {order.customerPhone}
                        </div>
                      </td>

                      {/* Service Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {order.serviceSnapshot?.title || 'خدمة كلينزو'}
                        </div>
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.2 rounded text-[10px] font-bold mt-0.5',
                            normalizeCategory(order.category) === 'car'
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {getCategoryDisplayName(order.category, true)}
                        </span>
                      </td>

                      {/* Booking Date & Time */}
                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-white font-medium">{order.date}</div>
                        <div className="text-[11px] text-slate-400">{formatTimeTo12Hour(order.time)}</div>
                      </td>

                      {/* Execution Time */}
                      <td className="py-3 px-4">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {executionTimeText}
                        </div>
                        {order.completedAt && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                            اكتمل بنجاح
                          </span>
                        )}
                      </td>

                      {/* Final Price */}
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                        {order.finalPrice ?? order.basePrice ?? 0} ج.م
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[10px] font-black border inline-flex items-center gap-1',
                            currentStatus.cls
                          )}
                        >
                          {order.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {order.status === 'in_progress' && <Clock className="w-3 h-3" />}
                          {order.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                          <span>{currentStatus.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>الصفحة السابقة</span>
            </button>

            <span className="text-xs font-bold text-slate-500">
              صفحة {currentPage} من {pagination.pages}
            </span>

            <button
              disabled={currentPage >= pagination.pages}
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span>الصفحة التالية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
