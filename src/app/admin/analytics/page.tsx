'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  BrainCircuit,
  Users,
  ShoppingBag,
  Banknote,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Sparkles,
  Percent,
  CheckCircle2,
  XCircle,
  Calendar,
  TicketPercent,
  RefreshCw,
  Car,
  Home,
} from 'lucide-react';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { ClearStatsButton } from '@/components/admin/ClearStatsButton';
import { useAdminStore } from '@/store/useAdminStore';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminAnalyticsPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canViewAnalytics = hasPermission(currentAdmin, 'reports.view') || hasPermission(currentAdmin, 'dashboard.view');

  const [period, setPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [topInsight, setTopInsight] = useState<any>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!canViewAnalytics) return;
    setIsLoading(true);
    try {
      const [res, aiRes] = await Promise.all([
        cleanzoApi.admin.getAnalytics(
          period,
          period === 'custom' ? startDate : undefined,
          period === 'custom' ? endDate : undefined
        ),
        cleanzoApi.admin.getAIInsights().catch(() => []),
      ]);
      setAnalyticsData(res || {});
      if (Array.isArray(aiRes) && aiRes.length > 0) {
        setTopInsight(aiRes[0]);
      }
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحميل بيانات التحليلات من الخادم');
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, canViewAnalytics]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    const handleRefresh = () => fetchAnalytics();
    window.addEventListener('cleanzo:refresh-data', handleRefresh);
    return () => window.removeEventListener('cleanzo:refresh-data', handleRefresh);
  }, [fetchAnalytics]);

  if (!canViewAnalytics) {
    return (
      <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">صلاحيات الوصول مقيدة</h2>
        <p className="text-xs text-slate-500 mt-1">ليس لديك صلاحية عرض قسم التحليلات والمؤشرات.</p>
      </div>
    );
  }

  const comparisons = analyticsData?.comparisons || {};
  const efficiency = analyticsData?.efficiency || {};
  const categoryShare = analyticsData?.categoryShare || {};
  const peakHours = analyticsData?.peakHours || [];

  const growthBadge = (growth: number | undefined) => {
    const val = growth || 0;
    const isPositive = val >= 0;
    return (
      <span
        className={cn(
          'text-xs font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full',
          isPositive
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        )}
      >
        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        <span>
          {isPositive ? '+' : ''}
          {val}%
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            <span>التحليلات ومؤشرات الأداء المتقدمة (KPI Analytics)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مقارنة نمو الفترات، معدلات التحويل والإلغاء، وساعات الذروة التشغيلية الميدانية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ClearStatsButton onRefresh={fetchAnalytics} />

          <Link
            href="/admin/analytics/ai"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>تحليلات الذكاء الاصطناعي (AI Insights)</span>
          </Link>
        </div>
      </div>

      {/* Date Filters Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {[
            { id: 'today', label: 'اليوم' },
            { id: 'yesterday', label: 'أمس' },
            { id: 'last_7_days', label: 'آخر 7 أيام' },
            { id: 'last_30_days', label: 'آخر 30 يوماً' },
            { id: 'this_month', label: 'هذا الشهر' },
            { id: 'last_month', label: 'الشهر السابق' },
            { id: 'this_year', label: 'هذا العام' },
            { id: 'custom', label: 'فترة مخصصة' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                period === item.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs outline-hidden"
              />
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>الفترة الحالية: {analyticsData?.currentRange?.start || '—'} إلى {analyticsData?.currentRange?.end || '—'}</span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>السابقة: {analyticsData?.previousRange?.start || '—'} إلى {analyticsData?.previousRange?.end || '—'}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-400">جاري احتساب نسب النمو والفترات السابقة من قاعدة البيانات...</span>
        </div>
      ) : (
        <>
          {/* Top AI Insight Alert Banner */}
          {topInsight && (
            <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-indigo-950/80 via-slate-900 to-[#04213B] border border-indigo-500/30 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300">
                      رؤية ذكية مميزة (Top AI Insight)
                    </span>
                    {topInsight.metric && (
                      <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg bg-white/10 text-emerald-300">
                        {topInsight.metric}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {topInsight.title}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {topInsight.description}
                  </p>
                </div>
              </div>

              <Link
                href="/admin/analytics/ai"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 self-end sm:self-center transition-all flex items-center gap-1.5"
              >
                <span>كافة تحليلات الـ AI</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          )}

          {/* Growth Cards: Current vs Previous Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Orders Growth */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">حجم الطلبات والنمو</span>
                {growthBadge(comparisons.orders?.growthPercent)}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {comparisons.orders?.current || 0} طلب
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>الفترة السابقة:</span>
                <span className="font-bold text-slate-600 dark:text-slate-300 font-mono">{comparisons.orders?.previous || 0} طلب</span>
              </div>
            </div>

            {/* Revenue Growth */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">نمو الإيرادات المكتملة</span>
                {growthBadge(comparisons.revenue?.growthPercent)}
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {(comparisons.revenue?.current || 0).toLocaleString()} ج.م
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>الفترة السابقة:</span>
                <span className="font-bold text-slate-600 dark:text-slate-300 font-mono">{(comparisons.revenue?.previous || 0).toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Customers Growth */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">نمو العملاء الجدد</span>
                {growthBadge(comparisons.customers?.growthPercent)}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {comparisons.customers?.current || 0} عميل
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>الفترة السابقة:</span>
                <span className="font-bold text-slate-600 dark:text-slate-300 font-mono">{comparisons.customers?.previous || 0} عميل</span>
              </div>
            </div>

            {/* AOV Change */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">متوسط قيمة الطلب (AOV)</span>
                {growthBadge(comparisons.averageOrderValue?.growthPercent)}
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {comparisons.averageOrderValue?.current || 0} ج.م
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>الفترة السابقة:</span>
                <span className="font-bold text-slate-600 dark:text-slate-300 font-mono">{comparisons.averageOrderValue?.previous || 0} ج.م</span>
              </div>
            </div>
          </div>

          {/* Operational Rates & Demand Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Operational Rates */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">مؤشرات الكفاءة التشغيلية</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">معدل إكمال الحجوزات</span>
                    <span className="font-bold text-emerald-500 font-mono">{efficiency.completionRate || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${efficiency.completionRate || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">معدل الإلغاء العام</span>
                    <span className="font-bold text-rose-500 font-mono">{efficiency.cancellationRate || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${efficiency.cancellationRate || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">معدل استخدام الكوبونات الترويجية</span>
                    <span className="font-bold text-purple-500 font-mono">{efficiency.couponAdoptionRate || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${efficiency.couponAdoptionRate || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Demand Share */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">توزيع الطلب حسب قطاع الخدمة</h3>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 text-center space-y-1">
                  <Car className="w-6 h-6 text-sky-500 mx-auto" />
                  <span className="text-xs text-slate-500 block">خدمات السيارات</span>
                  <span className="text-xl font-black text-sky-600 dark:text-sky-400">{categoryShare.carPercentage || 0}%</span>
                  <span className="text-[10px] text-slate-400 block font-mono">({categoryShare.carOrders || 0} طلب)</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center space-y-1">
                  <Home className="w-6 h-6 text-amber-500 mx-auto" />
                  <span className="text-xs text-slate-500 block">خدمات المنازل</span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">{categoryShare.homePercentage || 0}%</span>
                  <span className="text-[10px] text-slate-400 block font-mono">({categoryShare.homeOrders || 0} طلب)</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-sky-500" style={{ width: `${categoryShare.carPercentage || 0}%` }} />
                <div className="h-full bg-amber-500" style={{ width: `${categoryShare.homePercentage || 0}%` }} />
              </div>
            </div>

            {/* Quick Strategic Note */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-sm font-bold">ذكاء الأعمال ومحرك القرارات</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                يتم تحديث جميع مؤشرات التحليلات لحظياً بحسابات رياضية مقارنة مباشرة مع الفترات السابقة دون أي بيانات افتراضية.
              </p>
              <Link
                href="/admin/analytics/ai"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
              >
                <span>الانتقال إلى توصيات الذكاء الاصطناعي التنبؤية</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Peak Booking Hours Breakdown */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  توزيع كثافة الحجوزات حسب ساعات اليوم (Peak Booking Hours)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ساعات الإقبال والضغط الميداني على فنيي كلينزو مستخرجة من مواعيد الحجوزات الفعلية
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-rose-500 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>ساعات ذروة (ضغط عالي)</span>
                </span>
                <span className="flex items-center gap-1 text-sky-500 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>ساعات اعتيادية</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 text-center pt-4">
              {peakHours.map((slot: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="h-32 w-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-end p-1 relative group">
                    <div
                      style={{ height: `${slot.load}%` }}
                      className={cn(
                        'w-full rounded-lg transition-all',
                        slot.isPeak
                          ? 'bg-gradient-to-t from-rose-500 to-amber-400'
                          : 'bg-gradient-to-t from-sky-600 to-sky-400'
                      )}
                    />
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-md pointer-events-none whitespace-nowrap shadow-md z-10">
                      {slot.count} طلب ({slot.load}%)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 font-mono">{slot.hour}</span>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
              ساعات الذروة التشغيلية المرصودة:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {peakHours.filter((p: any) => p.isPeak).map((p: any) => p.hour).join('، ') || 'معدل الطلب متوازن وموزع على كافة الفترات'}
              </strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
