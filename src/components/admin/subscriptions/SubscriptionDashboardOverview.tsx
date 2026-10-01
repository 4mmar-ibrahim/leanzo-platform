'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Users,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  RotateCcw,
  Wallet,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  Layers,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface PlanPerformanceItem {
  id: string;
  name: string;
  subscriptionsCount: number;
  revenue: number;
  visitsCount: number;
  renewalsCount: number;
}

interface AnalyticsData {
  summary: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    expiringSoon: number;
    expired: number;
    cancelled: number;
    renewed: number;
    nonRenewed: number;
    totalSubscriptionCustomers: number;
    newSubscriptionCustomers: number;
    totalSubscriptionRevenue: number;
    activeSubscriptionValue: number;
    upcomingVisits: number;
    completedVisits: number;
    cancelledVisits: number;
    rescheduledVisits: number;
    renewalRate: number;
    cashbackGenerated: number;
    cashbackUsed: number;
    cashbackRemaining: number;
  };
  planPerformance: PlanPerformanceItem[];
}

export function SubscriptionDashboardOverview() {
  const [range, setRange] = useState<string>('30days');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<AnalyticsData>(`/subscriptions/admin/analytics?range=${range}`);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const s = data?.summary || (data as any)?.kpis || {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    expired: 0,
    cancelled: 0,
    renewed: 0,
    nonRenewed: 0,
    totalSubscriptionCustomers: 0,
    newSubscriptionCustomers: 0,
    totalSubscriptionRevenue: 0,
    activeSubscriptionValue: 0,
    upcomingVisits: 0,
    completedVisits: 0,
    cancelledVisits: 0,
    rescheduledVisits: 0,
    renewalRate: 0,
    cashbackGenerated: 0,
    cashbackUsed: 0,
    cashbackRemaining: 0,
  };

  const planList = data?.planPerformance || (data as any)?.planBreakdown || [];

  const timeFilterOptions = [
    { value: 'today', label: 'اليوم' },
    { value: 'yesterday', label: 'أمس' },
    { value: '7days', label: 'آخر 7 أيام' },
    { value: '30days', label: 'آخر 30 يوم' },
    { value: 'this_month', label: 'هذا الشهر' },
    { value: 'last_month', label: 'الشهر الماضي' },
    { value: 'year', label: 'هذا العام' },
  ];

  return (
    <div className="space-y-6 rounded-3xl bg-slate-50/60 dark:bg-slate-900/40 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              مؤشرات وأداء الاشتراكات الدورية
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            بيانات وتحليلات حية بنسبة 100% من قاعدة بيانات PostgreSQL (19 مؤشر أداء رئيسي)
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {timeFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer',
                range === opt.value
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <span className="text-xs font-medium text-slate-400">جاري احتساب مؤشرات الاشتراكات...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Financial & Customer Overview */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
              المؤشرات المالية والمشتركين
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">إجمالي إيراد الاشتراكات</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {s.totalSubscriptionRevenue.toLocaleString()} ج.م
                </div>
                <span className="text-[10px] text-slate-400">إيراد فعلي محقق</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">قيمة الاشتراكات النشطة</span>
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {s.activeSubscriptionValue.toLocaleString()} ج.م
                </div>
                <span className="text-[10px] text-slate-400">قيمة العقود السارية</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">إجمالي المشتركين</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {s.totalSubscriptionCustomers}
                </div>
                <span className="text-[10px] text-slate-400">عميل لديه اشتراك</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">مشتركون جدد</span>
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {s.newSubscriptionCustomers}
                </div>
                <span className="text-[10px] text-slate-400">خلال الفترة المحددة</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">معدل التجديد</span>
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {s.renewalRate}%
                </div>
                <span className="text-[10px] text-slate-400">نسبة الاشتراكات المجددة</span>
              </div>
            </div>
          </div>

          {/* Section 2: Subscription Status Distribution */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
              حالات الاشتراكات وتوزيعها
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-1">إجمالي الاشتراكات</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{s.totalSubscriptions}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mb-1">النشطة حالياً</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{s.activeSubscriptions}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 block mb-1">تنتهي قريباً (7 أيام)</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">{s.expiringSoon}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-600 dark:text-slate-300 block mb-1">المنتهية</span>
                <span className="text-base font-black text-slate-700 dark:text-slate-300">{s.expired}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                <span className="text-[11px] text-rose-700 dark:text-rose-400 block mb-1">الملغاة</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">{s.cancelled}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                <span className="text-[11px] text-blue-700 dark:text-blue-400 block mb-1">مُجددة</span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400">{s.renewed}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-1">غير مُجددة</span>
                <span className="text-base font-black text-slate-600 dark:text-slate-400">{s.nonRenewed}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Subscription Visits & Operations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span>حركة زيارات ومواعيد الاشتراكات</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-center">
                  <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 block mb-0.5">القادمة</span>
                  <span className="text-base font-black text-sky-600 dark:text-sky-400">{s.upcomingVisits}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">المكتملة</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{s.completedVisits}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-center">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block mb-0.5">المُعاد جدولتها</span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400">{s.rescheduledVisits}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-center">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block mb-0.5">الملغاة</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">{s.cancelledVisits}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                <span>محفظة الكاش باك للاشتراكات</span>
              </h3>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">تم توليده</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{s.cashbackGenerated.toLocaleString()} ج.م</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-center">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block mb-0.5">تم استخدامه</span>
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400">{s.cashbackUsed.toLocaleString()} ج.م</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-center">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block mb-0.5">المتبقي بالمحافظ</span>
                  <span className="text-sm font-black text-purple-600 dark:text-purple-400">{s.cashbackRemaining.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Plan Performance Breakdown */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>أداء باقات الاشتراكات (الأكثر طلباً والإيرادات)</span>
            </h3>

            {(!planList || planList.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                لا توجد اشتراكات مسجلة على الباقات في هذه الفترة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">اسم الباقة</th>
                      <th className="py-2.5 px-3">عدد المشتركين</th>
                      <th className="py-2.5 px-3">إجمالي الإيرادات</th>
                      <th className="py-2.5 px-3">الزيارات المنفذة</th>
                      <th className="py-2.5 px-3">مرات التجديد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {planList.map((plan: any, idx: number) => (
                      <tr key={plan.id || plan.planId || `sub-plan-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {plan.name || plan.planName}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {plan.subscriptionsCount || plan.subscriptionCount || 0} اشتراك
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(plan.revenue || plan.totalRevenue || 0).toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {plan.visitsCount || plan.completedVisits || 0} زيارة
                        </td>
                        <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400 font-semibold">
                          {plan.renewalsCount || plan.renewalCount || 0} تجديد
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
