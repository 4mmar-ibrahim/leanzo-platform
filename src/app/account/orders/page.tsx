'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight, PackageOpen, Car, RefreshCw, Tag } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useOrderStore } from '@/store/useOrderStore';
import { OrderStatus } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';

export default function AccountOrdersPage() {
  const { t, locale, direction } = useLocaleStore();
  const { orders, fetchMyOrders, isLoading } = useOrderStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled'>('all');

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') return ['pending', 'confirmed', 'assigned'].includes(o.status);
    if (activeTab === 'in_progress') return o.status === 'in_progress';
    if (activeTab === 'completed') return o.status === 'completed';
    if (activeTab === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const tabs = [
    { id: 'all', label: t.account.allOrders, count: orders.length },
    { id: 'upcoming', label: t.account.upcoming, count: orders.filter((o) => ['pending', 'confirmed', 'assigned'].includes(o.status)).length },
    { id: 'in_progress', label: t.account.inProgress, count: orders.filter((o) => o.status === 'in_progress').length },
    { id: 'completed', label: t.account.completed, count: orders.filter((o) => o.status === 'completed').length },
    { id: 'cancelled', label: t.account.cancelled, count: orders.filter((o) => o.status === 'cancelled').length },
  ];

  return (
    <div className="space-y-6 text-start">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.account.ordersTitle}
          </h2>
          <p className="text-xs text-slate-500">
            {isAr ? 'سجل كافة حجوزاتك وتفاصيل زيارات الخدمة' : 'History of all your service appointments'}
          </p>
        </div>

        <button
          onClick={() => fetchMyOrders()}
          disabled={isLoading}
          title={isAr ? 'تحديث السجل من السيرفر' : 'Refresh orders from server'}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:border-sky-300 dark:hover:border-sky-700 transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
          <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-sky-300 dark:hover:border-sky-800 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {(() => {
                const serviceTitle = order.service?.title || (order as any).serviceSnapshot?.title || 'خدمة كلينزو المتميزة';
                const serviceTitleEn = order.service?.titleEn || (order as any).serviceSnapshot?.titleEn || 'Cleanzo Premium Service';
                const serviceImage = order.service?.image || (order as any).serviceSnapshot?.image || '/images/cleanzo-logo.png';
                const addressText = order.address ? `${order.address.city || ''} — ${order.address.area || ''}` : '';
                const coupon = order.couponSnapshot || (order as any).coupon;
                const discountAmt = coupon?.discountAmount || coupon?.actualDiscountAmount;

                return (
                  <div className="flex items-start sm:items-center gap-4">
                    <img
                      src={serviceImage}
                      alt={serviceTitle}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-sky-600 dark:text-sky-400">
                          {order.id}
                        </span>
                        <StatusBadge status={order.status} />
                        {coupon && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <Tag className="w-3 h-3" />
                            {coupon.couponCode} (-{discountAmt} ج.م)
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {isAr ? serviceTitle : serviceTitleEn}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-500" />
                          {order.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#0866C6]" />
                          {order.time}
                        </span>
                        {addressText && <span>{addressText}</span>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <PriceDisplay price={order.finalPrice} size="md" />

                <div className="flex items-center gap-2">
                  <Link href={`/track/${order.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Car className="w-3.5 h-3.5 text-sky-500" />
                      <span>{isAr ? 'تتبع مباشر' : 'Track'}</span>
                    </Button>
                  </Link>

                  <Link href={`/account/orders/${order.id}`}>
                    <Button variant="primary" size="sm" className="text-xs">
                      <span>{isAr ? 'التفاصيل' : 'Details'}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={isAr ? 'لا توجد طلبات في هذا القسم' : 'No orders found'}
          description={isAr ? 'يمكنك حجز خدمة جديدة بسهولة لتظهر هنا في سجل طلباتك.' : 'Book a new service and it will appear here in your history.'}
          actionLabel={t.nav.bookNow}
          onAction={() => (window.location.href = '/booking')}
        />
      )}
    </div>
  );
}
