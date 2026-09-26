'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  HardHat,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminCalendarPage() {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedBooking, setSelectedBooking] = useState<Order | null>(null);

  const orders = useOrderStore((s) => s.orders);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const technicians = useTechnicianStore((s) => s.technicians);

  // Calendar dates mock (September 2026)
  const daysInMonth = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-09-${dayNum.toString().padStart(2, '0')}`;
    const dayOrders = orders.filter((o) => o.date === dateStr);
    return { dayNum, dateStr, orders: dayOrders };
  });

  const statusBg = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'confirmed':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
      case 'assigned':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      case 'in_progress':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'cancelled':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            جدول ومواعيد الحجوزات
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            استعراض المواعيد المحجوزة وتوزيع الفنيين ميدانياً
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button className="p-1 hover:text-sky-500">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-slate-900 dark:text-white">سبتمبر 2026</span>
            <button className="p-1 hover:text-sky-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-3 py-1 rounded-lg font-semibold transition-colors',
                viewMode === 'month' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-500 hover:text-white'
              )}
            >
              شهر
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1 rounded-lg font-semibold transition-colors',
                viewMode === 'week' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-500 hover:text-white'
              )}
            >
              أسبوع
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                'px-3 py-1 rounded-lg font-semibold transition-colors',
                viewMode === 'day' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-500 hover:text-white'
              )}
            >
              يوم
            </button>
          </div>
        </div>
      </div>

      {/* Month View Grid */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-400 py-3 bg-slate-50/50 dark:bg-slate-900/50">
          <span>السبت</span>
          <span>الأحد</span>
          <span>الاثنين</span>
          <span>الثلاثاء</span>
          <span>الأربعاء</span>
          <span>الخميس</span>
          <span>الجمعة</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 text-right">
          {daysInMonth.map((day) => (
            <div
              key={day.dayNum}
              className={cn(
                'min-h-[110px] sm:min-h-[125px] p-2 sm:p-2.5 transition-colors flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/20',
                day.dayNum === 8 && 'bg-sky-50/30 dark:bg-sky-950/20 ring-1 ring-sky-500/30'
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg',
                    day.dayNum === 8
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300'
                  )}
                >
                  {day.dayNum}
                </span>
                {day.orders.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400">
                    {day.orders.length} حجز
                  </span>
                )}
              </div>

              {/* Day Orders Chips */}
              <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                {day.orders.map((o) => {
                  const sTitle =
                    o.service?.title || (o as any).serviceSnapshot?.title || 'خدمة كلينزو';
                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedBooking(o)}
                      className={cn(
                        'p-1.5 rounded-lg border text-[10px] font-medium truncate cursor-pointer transition-transform hover:scale-[1.02]',
                        statusBg(o.status)
                      )}
                    >
                      <span className="font-bold">{o.time || '--:--'}</span> - {sTitle}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Booking Quick Popover Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  تفاصيل موعد الحجز #{selectedBooking.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
              >
                إغلاق
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {selectedBooking.service?.title || (selectedBooking as any).serviceSnapshot?.title || 'خدمة كلينزو'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedBooking.category === 'car' ? 'سيارات' : 'منازل'}</p>
                </div>
                <span className="font-black text-sky-600 dark:text-sky-400">{selectedBooking.finalPrice || 0} ج.م</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>
                    {selectedBooking.scheduledStart || selectedBooking.time || '--:--'}
                    {selectedBooking.scheduledEnd ? ` - ${selectedBooking.scheduledEnd}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HardHat className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{selectedBooking.technician ? selectedBooking.technician.name : 'فني غير محدد'}</span>
                </div>
              </div>

              {/* Service Duration & Travel Buffer breakdown */}
              <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>مدة الخدمة الفعلية:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedBooking.serviceDurationMinutes || selectedBooking.duration || 45} دقيقة
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>وقت الانتقال والتجهيز:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    +{selectedBooking.travelTimeMinutes ?? 15} دقيقة
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between font-bold text-sky-600 dark:text-sky-400">
                  <span>إجمالي الإشغال المحجوز:</span>
                  <span>
                    {selectedBooking.totalOccupiedMinutes ||
                      (selectedBooking.serviceDurationMinutes || selectedBooking.duration || 45) +
                        (selectedBooking.travelTimeMinutes ?? 15)}{' '}
                    دقيقة
                  </span>
                </div>
              </div>

              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                العنوان:{' '}
                {selectedBooking.address
                  ? `${selectedBooking.address.governorate || ''}، ${selectedBooking.address.city || ''} ${selectedBooking.address.area ? `- ${selectedBooking.address.area}` : ''}`
                  : 'غير محدد'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href={`/admin/orders/${selectedBooking.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-500 hover:text-sky-600"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>فتح صفحة الطلب الكاملة</span>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    updateOrderStatus(selectedBooking.id, 'confirmed');
                    setSelectedBooking(null);
                    toast.success('تم تأكيد الموعد بنجاح');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  تأكيد الموعد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
