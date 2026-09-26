'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { Button } from '@/components/ui/Button';

export default function AccountOverviewPage() {
  const { t, locale, direction } = useLocaleStore();
  const { orders, fetchMyOrders } = useOrderStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const activeOrders = orders.filter((o) => ['pending', 'confirmed', 'assigned', 'in_progress'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const upcomingOrder = activeOrders[0];

  const totalSpent = completedOrders.reduce((acc, curr) => acc + curr.finalPrice, 0);

  return (
    <div className="space-y-8 text-start">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white pt-2">
            {activeOrders.length}
          </p>
          <p className="text-xs text-slate-500 font-medium">{t.account.activeOrders}</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white pt-2">
            {completedOrders.length}
          </p>
          <p className="text-xs text-slate-500 font-medium">{t.account.completedOrders}</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-[#07345C]/30 text-[#0866C6] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-sm font-black text-slate-900 dark:text-white pt-3 truncate">
            {upcomingOrder ? upcomingOrder.date : isAr ? 'لا يوجد' : 'None'}
          </p>
          <p className="text-xs text-slate-500 font-medium">{t.account.upcomingBooking}</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white pt-2">
            {totalSpent} <span className="text-xs font-bold text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
          </p>
          <p className="text-xs text-slate-500 font-medium">{t.account.totalSpent}</p>
        </div>
      </div>

      {/* Upcoming Order Spotlight */}
      {upcomingOrder && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-900 via-slate-900 to-slate-900 text-white shadow-xl border border-sky-500/20 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                {t.account.upcomingBooking}
              </span>
            </div>
            <StatusBadge status={upcomingOrder.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            <div className="sm:col-span-8 space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {isAr
                  ? upcomingOrder.service?.title || (upcomingOrder as any).serviceSnapshot?.title || (upcomingOrder as any).serviceName || 'خدمة كلينزو المتميزة'
                  : upcomingOrder.service?.titleEn || (upcomingOrder as any).serviceSnapshot?.titleEn || (upcomingOrder as any).serviceNameEn || upcomingOrder.service?.title || 'Cleanzo Premium Service'}
              </h3>
              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  {upcomingOrder.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#83AED0]" />
                  {upcomingOrder.time}
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-1">
                {upcomingOrder.address?.governorate || ''} — {upcomingOrder.address?.city || ''}, {upcomingOrder.address?.area || ''}
              </p>
            </div>

            <div className="sm:col-span-4 flex flex-col sm:items-end gap-3">
              <PriceDisplay price={upcomingOrder.finalPrice} size="lg" className="text-white" />
              <Link href={`/account/orders/${upcomingOrder.id}`}>
                <Button variant="primary" size="sm" className="shadow-lg shadow-sky-500/25">
                  <span>{isAr ? 'تتبع تفاصيل الطلب' : 'Track Booking'}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders List */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t.account.recentOrders}
          </h3>
          <Link
            href="/account/orders"
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>{isAr ? 'عرض كل الطلبات' : 'View all orders'}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {orders.slice(0, 3).map((order) => (
            <div
              key={order.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-4">
                <img
                  src={order.service?.image || (order as any).serviceSnapshot?.image || '/images/cleanzo-logo.png'}
                  alt={order.service?.title || (order as any).serviceSnapshot?.title || 'Cleanzo'}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {order.id}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isAr
                      ? order.service?.title || (order as any).serviceSnapshot?.title || (order as any).serviceName || 'خدمة كلينزو المتميزة'
                      : order.service?.titleEn || (order as any).serviceSnapshot?.titleEn || (order as any).serviceNameEn || order.service?.title || 'Cleanzo Premium Service'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {order.date} • {order.time}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <PriceDisplay price={order.finalPrice} size="sm" />
                <Link href={`/account/orders/${order.id}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    <span>{isAr ? 'التفاصيل' : 'Details'}</span>
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
