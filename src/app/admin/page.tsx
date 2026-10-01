'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  TrendingUp,
  Sparkles,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ChevronRight,
  HardHat,
  Car,
  Home,
  Check,
} from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { useAnalyticsResetStore } from '@/store/useAnalyticsResetStore';
import { ClearStatsButton } from '@/components/admin/ClearStatsButton';
import { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AdminTour } from '@/components/admin/AdminTour';
import { SubscriptionDashboardOverview } from '@/components/admin/subscriptions/SubscriptionDashboardOverview';

export default function AdminDashboardPage() {
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'year'>('30days');

  const orders = useOrderStore((s) => s.orders);
  const customers = useCustomerStore((s) => s.customers);
  const services = useServiceStore((s) => s.services);
  const technicians = useTechnicianStore((s) => s.technicians);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const fetchAdminOrders = useOrderStore((s) => s.fetchAdminOrders);
  const isCleared = useAnalyticsResetStore((s) => s.isCleared);

  React.useEffect(() => {
    fetchAdminOrders();
  }, [fetchAdminOrders]);

  // Computed Real Dynamic KPIs
  const isZeroed = isCleared && orders.length === 0;
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  const newOrders = orders.filter((o) => o.status === 'pending').length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

  const totalRevenue = orders
    .filter((o) => o.status === 'completed' || o.status === 'in_progress' || o.status === 'assigned')
    .reduce((acc, o) => acc + (o.finalPrice || 0), 0);

  const averageOrderValue = completedOrders > 0
    ? Math.round(totalRevenue / completedOrders)
    : (orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0);

  // Popular service calculation
  const serviceCounts: Record<string, number> = {};
  orders.forEach((o) => {
    const title = o.service?.title || 'خدمة كلينزو';
    serviceCounts[title] = (serviceCounts[title] || 0) + 1;
  });
  let popularServiceName = orders.length > 0 ? (services[0]?.title || 'غسيل وتلميع واكس VIP') : 'لا توجد طلبات مسجلة';
  let maxServiceCount = 0;
  Object.entries(serviceCounts).forEach(([title, count]) => {
    if (count > maxServiceCount) {
      maxServiceCount = count;
      popularServiceName = title;
    }
  });
  const popularServicePct = orders.length > 0 ? Math.round((maxServiceCount / orders.length) * 100) : 0;

  // Real Dynamic KPIs
  const kpis = [
    {
      title: 'إجمالي العملاء',
      value: totalCustomers,
      change: totalCustomers > 0 ? `${totalCustomers} مسجل` : '0 عملاء',
      positive: true,
      icon: Users,
      color: 'text-[#0866C6] bg-sky-50 dark:bg-sky-950/60',
    },
    {
      title: 'إجمالي الطلبات',
      value: totalOrders,
      change: totalOrders > 0 ? `${completedOrders} مكتمل` : '0 طلبات',
      positive: true,
      icon: ShoppingBag,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60',
    },
    {
      title: 'طلبات جديدة معلقة',
      value: newOrders,
      change: newOrders > 0 ? 'يتطلب اتخاذ إجراء' : 'لا توجد معلقات',
      positive: newOrders === 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60',
    },
    {
      title: 'طلبات مكتملة',
      value: completedOrders,
      change: totalOrders > 0 ? `${Math.round((completedOrders / totalOrders) * 100)}% إنجاز` : '0.0%',
      positive: true,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      title: 'طلبات ملغاة',
      value: cancelledOrders,
      change: totalOrders > 0 ? `${((cancelledOrders / totalOrders) * 100).toFixed(1)}% إلغاء` : '0.0%',
      positive: cancelledOrders === 0,
      icon: XCircle,
      color: 'text-[#F0444C] bg-red-50 dark:bg-red-950/60',
    },
    {
      title: 'إجمالي الإيرادات',
      value: `${totalRevenue.toLocaleString()} ج.م`,
      change: totalRevenue > 0 ? 'إيراد فعلي محقق' : '0.0 ج.م',
      positive: true,
      icon: Banknote,
      color: 'text-[#07345C] dark:text-sky-400 bg-slate-100 dark:bg-slate-800',
    },
    {
      title: 'متوسط قيمة الطلب',
      value: `${averageOrderValue} ج.م`,
      change: averageOrderValue > 0 ? 'لكل طلب' : '0 ج.م',
      positive: true,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60',
    },
    {
      title: 'الخدمة الأكثر طلباً',
      value: popularServiceName,
      change: popularServicePct > 0 ? `${popularServicePct}% من الحجوزات` : '0 طلبات',
      positive: true,
      icon: Sparkles,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60',
    },
  ];

  const recentOrders = orders.slice(0, 6);

  const statusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">قيد المراجعة</span>;
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-[#0866C6] dark:text-sky-400 border border-sky-200 dark:border-sky-800">مؤكد</span>;
      case 'assigned':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">مُعيّن لفني</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">جاري التنفيذ</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">مكتمل</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950 text-[#F0444C] border border-red-200 dark:border-red-800">ملغي</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{status}</span>;
    }
  };

  const handleQuickStatus = (orderId: string, status: OrderStatus) => {
    try {
      updateOrderStatus(orderId, status);
      toast.success('تم تحديث حالة الطلب بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  // Weekly distribution
  const daysMap: Record<number, { rev: number; ord: number }> = {
    6: { rev: 0, ord: 0 },
    0: { rev: 0, ord: 0 },
    1: { rev: 0, ord: 0 },
    2: { rev: 0, ord: 0 },
    3: { rev: 0, ord: 0 },
    4: { rev: 0, ord: 0 },
    5: { rev: 0, ord: 0 },
  };

  orders.forEach((o) => {
    const d = new Date(o.date);
    const dayIndex = isNaN(d.getDay()) ? 4 : d.getDay();
    if (daysMap[dayIndex]) {
      daysMap[dayIndex].ord += 1;
      daysMap[dayIndex].rev += o.finalPrice || 0;
    }
  });

  const maxDailyRev = Math.max(...Object.values(daysMap).map((d) => d.rev), 1);
  const maxDailyOrd = Math.max(...Object.values(daysMap).map((d) => d.ord), 1);

  const dailyChart = [
    { day: 'السبت', rev: orders.length > 0 ? Math.round((daysMap[6].rev / maxDailyRev) * 100) : 0, ord: orders.length > 0 ? Math.round((daysMap[6].ord / maxDailyOrd) * 100) : 0 },
    { day: 'الأحد', rev: orders.length > 0 ? Math.round((daysMap[0].rev / maxDailyRev) * 100) : 0, ord: orders.length > 0 ? Math.round((daysMap[0].ord / maxDailyOrd) * 100) : 0 },
    { day: 'الاثنين', rev: orders.length > 0 ? Math.round((daysMap[1].rev / maxDailyRev) * 100) : 0, ord: orders.length > 0 ? Math.round((daysMap[1].ord / maxDailyOrd) * 100) : 0 },
    { day: 'الثلاثاء', rev: orders.length > 0 ? Math.round((daysMap[2].rev / maxDailyRev) * 100) : 0, ord: orders.length > 0 ? Math.round((daysMap[2].ord / maxDailyOrd) * 100) : 0 },
    { day: 'الأربعاء', rev: orders.length > 0 ? Math.round((daysMap[3].rev / maxDailyRev) * 100) : 0, ord: orders.length > 0 ? Math.round((daysMap[3].ord / maxDailyOrd) * 100) : 0 },
    { day: 'الخميس', rev: orders.length > 0 ? Math.round((daysMap[4].rev / maxDailyRev) * 100) : 0, ord: orders.length > 0 ? Math.round((daysMap[4].ord / maxDailyOrd) * 100) : 0 },
    { day: 'الجمعة', rev: orders.length > 0 ? Math.round((daysMap[5].rev / maxDailyRev) * 100) : 0, ord: orders.length > 0 ? Math.round((daysMap[5].ord / maxDailyOrd) * 100) : 0 },
  ];

  const carOrders = orders.filter((o) => o.category === 'car').length;
  const carPct = orders.length > 0 ? Math.round((carOrders / orders.length) * 100) : 60;
  const homePct = 100 - carPct;

  return (
    <div className="space-y-8">
      {/* Header with Date Filter and Clear Stats Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#07345C] dark:text-white">
            نظرة عامة على لوحة العمليات
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة فورية ومباشرة للأداء التجاري، حركة الحجوزات، والإيرادات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ClearStatsButton />

          {/* Date Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] self-start shadow-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer', dateFilter === 'today' ? 'bg-[#0866C6] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white')}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer', dateFilter === '7days' ? 'bg-[#0866C6] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white')}
            >
              7 أيام
            </button>
            <button
              onClick={() => setDateFilter('30days')}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer', dateFilter === '30days' ? 'bg-[#0866C6] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white')}
            >
              30 يوم
            </button>
            <button
              onClick={() => setDateFilter('year')}
              className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer', dateFilter === 'year' ? 'bg-[#0866C6] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white')}
            >
              هذا العام
            </button>
          </div>
        </div>
      </div>

      {/* Real KPIs Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs hover:border-[#0866C6]/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{kpi.title}</span>
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', kpi.color)}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg sm:text-xl font-black text-[#07345C] dark:text-white truncate">{kpi.value}</span>
                <div className={cn('flex items-center text-[10px] font-bold', kpi.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#F0444C]')}>
                  {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{kpi.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual SaaS Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Bookings Over Time Chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-[#07345C] dark:text-white">حركة الإيرادات والطلبات خلال الأسبوع</h3>
              <p className="text-xs text-slate-400">توزيع الحجوزات والسيولة اليومية المحققة</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0866C6]" />
                الإيرادات
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#07345C] dark:bg-sky-400" />
                الطلبات
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-56 flex items-end gap-3 sm:gap-6 pt-6 pb-2 border-b border-slate-100 dark:border-[#133B61]/80">
            {dailyChart.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div
                    className="w-1/2 bg-[#0866C6] hover:bg-[#07345C] rounded-t-md transition-all duration-300 cursor-pointer"
                    style={{ height: `${Math.max(item.rev, 4)}%` }}
                    title={`إيراد: ${item.rev}%`}
                  />
                  <div
                    className="w-1/2 bg-[#07345C] dark:bg-sky-400 hover:bg-[#05213b] rounded-t-md transition-all duration-300 cursor-pointer"
                    style={{ height: `${Math.max(item.ord, 4)}%` }}
                    title={`طلبات: ${item.ord}%`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {item.day}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>السبت الماضي</span>
            <span>اليوم الجمعة</span>
          </div>
        </div>

        {/* Right Distribution & Sources */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#07345C] dark:text-white mb-1">توزيع الطلبات حسب القطاع</h3>
            <p className="text-xs text-slate-400 mb-6">نسبة إقبال العملاء بين السيارات والمنازل</p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Car className="w-4 h-4 text-[#0866C6]" />
                    خدمات السيارات
                  </span>
                  <span className="text-[#0866C6] font-bold">{carPct}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0866C6] rounded-full" style={{ width: `${carPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Home className="w-4 h-4 text-[#07345C] dark:text-sky-400" />
                    تنظيف المنازل والمفروشات
                  </span>
                  <span className="text-[#07345C] dark:text-sky-400 font-bold">{homePct}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#07345C] dark:bg-sky-400 rounded-full" style={{ width: `${homePct}%` }} />
                </div>
              </div>
            </div>

            {/* Channels */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-[#133B61]/80">
              <h4 className="text-xs font-bold text-[#07345C] dark:text-white mb-3">قنوات اكتساب العملاء</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200/60 dark:border-[#133B61]">
                  <span className="text-[11px] text-slate-400 block">الموقع الإلكتروني</span>
                  <span className="font-bold text-[#07345C] dark:text-white">{isZeroed ? '0%' : '58% (مباشر)'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200/60 dark:border-[#133B61]">
                  <span className="text-[11px] text-slate-400 block">واتساب كلينزو</span>
                  <span className="font-bold text-[#07345C] dark:text-white">{isZeroed ? '0%' : '24%'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200/60 dark:border-[#133B61]">
                  <span className="text-[11px] text-slate-400 block">السوشيال ميديا</span>
                  <span className="font-bold text-[#07345C] dark:text-white">{isZeroed ? '0%' : '12%'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200/60 dark:border-[#133B61]">
                  <span className="text-[11px] text-slate-400 block">أخرى / ترشيح</span>
                  <span className="font-bold text-[#07345C] dark:text-white">{isZeroed ? '0%' : '6%'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#133B61]/80 text-center">
            <Link href="/admin/reports" className="text-xs text-[#0866C6] hover:text-[#07345C] font-bold">
              تصدير تقرير القنوات والمبيعات ←
            </Link>
          </div>
        </div>
      </div>

      {/* Subscription Comprehensive Dashboard Overview (TASK 07) */}
      <SubscriptionDashboardOverview />

      {/* Recent Orders Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#07345C] dark:text-white">أحدث طلبات الحجز</h3>
            <p className="text-xs text-slate-400">آخر الحجوزات المسجلة عبر الموقع واللوحة</p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-[#0866C6] hover:text-[#07345C] flex items-center gap-1"
          >
            <span>عرض كافة الطلبات ({orders.length})</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-[#133B61] bg-slate-50/80 dark:bg-[#041728] text-[#07345C] dark:text-slate-300 font-bold">
                <th className="py-3 px-3">رقم الطلب</th>
                <th className="py-3 px-3">الخدمة</th>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">الموقع / العنوان</th>
                <th className="py-3 px-3">السعر</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-3">الفني المكلف</th>
                <th className="py-3 px-3 text-center">إجراء سريع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لا توجد طلبات مسجلة حالياً
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const tech = order.technician || technicians.find((t) => t.id === (order as any).technicianId);
                  return (
                    <tr key={order.id} className="hover:bg-sky-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-[#07345C] dark:text-white">
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-[#0866C6]">
                          {order.id}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{order.service?.title || 'خدمة كلينزو'}</div>
                        <span className="text-[10px] text-slate-400">{order.category === 'car' ? 'سيارات' : 'منازل'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800 dark:text-slate-200">{order.date}</div>
                        <span className="text-[10px] text-slate-400">{order.time}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-[150px] truncate">
                        {order.address?.area || 'الرياض'}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#07345C] dark:text-white">
                        {order.finalPrice} ج.م
                      </td>
                      <td className="py-3 px-3">
                        {statusBadge(order.status)}
                      </td>
                      <td className="py-3 px-3">
                        {tech ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <HardHat className="w-3.5 h-3.5 text-amber-500" />
                            <span>{tech.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">غير محدد</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#0866C6] hover:text-white transition-colors"
                            title="تفاصيل الطلب"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleQuickStatus(order.id, 'confirmed')}
                              className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              تأكيد
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

      <AdminTour />
    </div>
  );
}
