'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  RefreshCw,
  Filter,
  MapPin,
  Phone,
  AlertCircle,
  Tag,
  Check,
  CalendarDays,
  CalendarRange,
  Layers,
} from 'lucide-react';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useOrderStore } from '@/store/useOrderStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const ARABIC_WEEKDAYS = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
];

function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminCalendarPage() {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  // Default to October 2026 (or current date in 2026)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 3)); // 03 October 2026
  const [selectedBooking, setSelectedBooking] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCancelled, setShowCancelled] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const updateOrderStatusStore = useOrderStore((s) => s.updateOrderStatus);
  const technicians = useTechnicianStore((s) => s.technicians);

  // Fetch real bookings from backend
  const fetchCalendarOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await cleanzoApi.admin.getOrders({
        limit: 500,
        sortBy: 'date',
        sortOrder: 'asc',
      });
      if (res && res.bookings) {
        setOrders(res.bookings);
        try {
          useOrderStore.getState().setOrders(res.bookings);
        } catch {
          // ignore store sync errors
        }
      }
    } catch (err: any) {
      console.warn('Backend bookings fetch fallback:', err?.message);
      const fallback = useOrderStore.getState().orders;
      if (fallback && fallback.length > 0) {
        setOrders(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarOrders();
  }, [fetchCalendarOrders]);

  // Current year & month values
  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth(); // 0-11
  const currentDateStr = formatYYYYMMDD(currentDate);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 3)); // Match current operational year/month (October 2026)
  };

  const handleQuickMonthSelect = (monthIdx: number) => {
    const next = new Date(currentDate);
    next.setMonth(monthIdx);
    setCurrentDate(next);
  };

  // Status visual mapping
  const statusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'قيد الانتظار',
          chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
        };
      case 'confirmed':
        return {
          label: 'مؤكد',
          chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
          badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
        };
      case 'assigned':
        return {
          label: 'تم الإسناد',
          chip: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
        };
      case 'in_progress':
        return {
          label: 'قيد التنفيذ',
          chip: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
        };
      case 'completed':
        return {
          label: 'مكتمل',
          chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        };
      case 'cancelled':
        return {
          label: 'ملغي',
          chip: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 line-through opacity-75',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 line-through',
        };
      default:
        return {
          label: status,
          chip: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
          badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        };
    }
  };

  // Filter orders based on cancelled & status toggles
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!showCancelled && o.status === 'cancelled') return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, showCancelled, statusFilter]);

  // Calendar Month Grid Calculation
  const monthGridDays = useMemo(() => {
    const year = currentYear;
    const month = currentMonthIndex;
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Saturday is day 0 in our Arab week grid (JS: Sun=0, Mon=1... Sat=6)
    const startWeekdayOffset = (firstDay.getDay() + 1) % 7;

    // Previous month padding
    const prevMonthDaysCount = new Date(year, month, 0).getDate();
    const cells: Array<{
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      orders: Order[];
    }> = [];

    for (let i = startWeekdayOffset - 1; i >= 0; i--) {
      const dNum = prevMonthDaysCount - i;
      const prevDate = new Date(year, month - 1, dNum);
      const dStr = formatYYYYMMDD(prevDate);
      const dayOrders = filteredOrders.filter((o) => (o.date || '').slice(0, 10) === dStr);
      cells.push({
        dayNum: dNum,
        dateStr: dStr,
        isCurrentMonth: false,
        orders: dayOrders,
      });
    }

    // Current month days
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const d = new Date(year, month, dNum);
      const dStr = formatYYYYMMDD(d);
      const dayOrders = filteredOrders.filter((o) => (o.date || '').slice(0, 10) === dStr);
      cells.push({
        dayNum: dNum,
        dateStr: dStr,
        isCurrentMonth: true,
        orders: dayOrders,
      });
    }

    // Trailing next month padding to reach full rows of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dNum = 1; dNum <= remaining; dNum++) {
      const nextDate = new Date(year, month + 1, dNum);
      const dStr = formatYYYYMMDD(nextDate);
      const dayOrders = filteredOrders.filter((o) => (o.date || '').slice(0, 10) === dStr);
      cells.push({
        dayNum: dNum,
        dateStr: dStr,
        isCurrentMonth: false,
        orders: dayOrders,
      });
    }

    return cells;
  }, [currentYear, currentMonthIndex, filteredOrders]);

  // Calendar Week Grid Calculation (Saturday to Friday)
  const weekDays = useMemo(() => {
    const jsDay = currentDate.getDay();
    const daysSinceSat = (jsDay + 1) % 7;
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - daysSinceSat);
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dStr = formatYYYYMMDD(d);
      const dayOrders = filteredOrders
        .filter((o) => (o.date || '').slice(0, 10) === dStr)
        .sort((a, b) => (a.scheduledStart || a.time || '').localeCompare(b.scheduledStart || b.time || ''));
      return {
        date: d,
        dayNum: d.getDate(),
        dateStr: dStr,
        weekdayName: ARABIC_WEEKDAYS[i],
        orders: dayOrders,
      };
    });
  }, [currentDate, filteredOrders]);

  // Calendar Day View Orders (Active single day)
  const dayViewOrders = useMemo(() => {
    return filteredOrders
      .filter((o) => (o.date || '').slice(0, 10) === currentDateStr)
      .sort((a, b) => (a.scheduledStart || a.time || '').localeCompare(b.scheduledStart || b.time || ''));
  }, [filteredOrders, currentDateStr]);

  // Handle status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await cleanzoApi.admin.updateOrderStatus(orderId, newStatus);
      updateOrderStatusStore(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedBooking && selectedBooking.id === orderId) {
        setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success('تم تحديث حالة الموعد بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث حالة الموعد');
    }
  };

  // Header Date Label
  const getHeaderDateLabel = () => {
    if (viewMode === 'month') {
      return `${ARABIC_MONTHS[currentMonthIndex]} ${currentYear}`;
    }
    if (viewMode === 'week') {
      const first = weekDays[0];
      const last = weekDays[6];
      if (first.date.getMonth() === last.date.getMonth()) {
        return `${first.dayNum} – ${last.dayNum} ${ARABIC_MONTHS[first.date.getMonth()]} ${currentYear}`;
      }
      return `${first.dayNum} ${ARABIC_MONTHS[first.date.getMonth()]} – ${last.dayNum} ${ARABIC_MONTHS[last.date.getMonth()]} ${currentYear}`;
    }
    // Day view
    const jsDay = currentDate.getDay();
    const dayName = ARABIC_WEEKDAYS[(jsDay + 1) % 7];
    return `${dayName}، ${currentDate.getDate()} ${ARABIC_MONTHS[currentMonthIndex]} ${currentYear}`;
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              جدول ومواعيد الحجوزات
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
              {filteredOrders.length} حجز
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            استعراض المواعيد المحجوزة وتوزيع الفنيين ميدانياً في وضع الشهر والأسبوع واليوم
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Refresh Button */}
          <button
            onClick={fetchCalendarOrders}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-500 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin text-sky-500')} />
          </button>

          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            اليوم
          </button>

          {/* Date Navigation */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-2xs">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-500 transition-colors"
              title="السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-900 dark:text-white font-black min-w-[120px] text-center">
              {getHeaderDateLabel()}
            </span>
            <button
              onClick={handleNext}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-500 transition-colors"
              title="التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Month Jump Chips */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold">
            <button
              onClick={() => handleQuickMonthSelect(8)}
              className={cn(
                'px-2 py-1 rounded-lg transition-colors',
                currentMonthIndex === 8 && currentYear === 2026
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-sky-500'
              )}
            >
              سبتمبر
            </button>
            <button
              onClick={() => handleQuickMonthSelect(9)}
              className={cn(
                'px-2 py-1 rounded-lg transition-colors',
                currentMonthIndex === 9 && currentYear === 2026
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-sky-500'
              )}
            >
              أكتوبر
            </button>
            <button
              onClick={() => handleQuickMonthSelect(10)}
              className={cn(
                'px-2 py-1 rounded-lg transition-colors',
                currentMonthIndex === 10 && currentYear === 2026
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-sky-500'
              )}
            >
              نوفمبر
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all',
                viewMode === 'month'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              شهر
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all',
                viewMode === 'week'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              أسبوع
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                'px-3 py-1 rounded-lg font-bold transition-all',
                viewMode === 'day'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              يوم
            </button>
          </div>

          {/* Show Cancelled Filter */}
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="rounded-sm text-sky-500 focus:ring-sky-500 w-3.5 h-3.5"
            />
            <span>إظهار الملغية</span>
          </label>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. MONTH VIEW GRID                                            */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'month' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-3 bg-slate-50/70 dark:bg-slate-900/60">
            {ARABIC_WEEKDAYS.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 text-right">
            {monthGridDays.map((day, idx) => {
              const isTodayOrSelected =
                day.isCurrentMonth && day.dateStr === currentDateStr;

              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => {
                    const [y, m, d] = day.dateStr.split('-').map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
                  }}
                  className={cn(
                    'min-h-[110px] sm:min-h-[130px] p-2 sm:p-2.5 transition-colors flex flex-col justify-between cursor-pointer',
                    day.isCurrentMonth
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                      : 'bg-slate-50/40 dark:bg-slate-950/40 opacity-40',
                    isTodayOrSelected &&
                      'bg-sky-50/40 dark:bg-sky-950/30 ring-1 ring-sky-500/40'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={cn(
                        'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg transition-colors',
                        isTodayOrSelected
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {day.dayNum}
                    </span>
                    {day.orders.length > 0 && (
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded-full">
                        {day.orders.length} حجز
                      </span>
                    )}
                  </div>

                  {/* Day Orders Chips */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[90px] scrollbar-thin">
                    {day.orders.map((o) => {
                      const cfg = statusConfig(o.status);
                      const sTitle =
                        o.service?.title ||
                        (o as any).serviceSnapshot?.title ||
                        'خدمة كلينزو';
                      const startTime =
                        o.scheduledStart ||
                        (o.time ? o.time.split('–')[0].trim() : '--:--');

                      return (
                        <div
                          key={o.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(o);
                          }}
                          className={cn(
                            'p-1.5 rounded-lg border text-[10px] font-medium truncate cursor-pointer transition-transform hover:scale-[1.02] shadow-2xs',
                            cfg.chip
                          )}
                          title={`${sTitle} - ${o.customerName || ''} (${o.time || ''})`}
                        >
                          <span className="font-bold">{startTime}</span> - {sTitle}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. WEEK VIEW GRID                                             */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'week' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Week Days Header Row */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center bg-slate-50/70 dark:bg-slate-900/60 divide-x divide-slate-100 dark:divide-slate-800">
            {weekDays.map((wd) => {
              const isSelectedDay = wd.dateStr === currentDateStr;
              return (
                <div
                  key={wd.dateStr}
                  onClick={() => setCurrentDate(wd.date)}
                  className={cn(
                    'py-3 px-2 cursor-pointer transition-colors',
                    isSelectedDay
                      ? 'bg-sky-50/70 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-black'
                      : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  )}
                >
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {wd.weekdayName}
                  </p>
                  <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {wd.dayNum}
                  </p>
                  <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                    {ARABIC_MONTHS[wd.date.getMonth()]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Week Days Content Columns */}
          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800 min-h-[380px] p-2 bg-slate-50/20 dark:bg-slate-950/20">
            {weekDays.map((wd) => (
              <div
                key={`col-${wd.dateStr}`}
                className={cn(
                  'p-2 space-y-2 flex flex-col',
                  wd.dateStr === currentDateStr &&
                    'bg-sky-50/30 dark:bg-sky-950/20 rounded-2xl'
                )}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span>{wd.orders.length} موعد</span>
                  {wd.dateStr === currentDateStr && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  )}
                </div>

                {wd.orders.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-slate-400 dark:text-slate-500">
                    <p className="text-[11px]">لا توجد حجوزات</p>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {wd.orders.map((o) => {
                      const cfg = statusConfig(o.status);
                      const sTitle =
                        o.service?.title ||
                        (o as any).serviceSnapshot?.title ||
                        'خدمة كلينزو';

                      return (
                        <div
                          key={o.id}
                          onClick={() => setSelectedBooking(o)}
                          className={cn(
                            'p-2.5 rounded-2xl border text-xs cursor-pointer transition-all hover:scale-[1.02] shadow-2xs space-y-1.5 bg-white dark:bg-slate-900',
                            cfg.chip
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-black text-[11px] text-slate-900 dark:text-white flex items-center gap-1">
                              <Clock className="w-3 h-3 text-sky-500 inline" />
                              {o.time || o.scheduledStart || '--:--'}
                            </span>
                            <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold', cfg.badge)}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {sTitle}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                            {o.customerName || 'عميل كلينزو'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <span>#{o.id}</span>
                            <span className="font-black text-sky-600 dark:text-sky-400">
                              {o.finalPrice || 0} ج.م
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. DAY VIEW TIMELINE                                          */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'day' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                جدول مواعيد اليوم ({getHeaderDateLabel()})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                إجمالي المواعيد المحجوزة لهذا اليوم: {dayViewOrders.length} حجز
              </p>
            </div>
            <button
              onClick={() => setViewMode('month')}
              className="text-xs font-bold text-sky-500 hover:text-sky-600"
            >
              العودة للشهر
            </button>
          </div>

          {dayViewOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-3">
              <CalendarDays className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">لا توجد حجوزات مجدولة في هذا اليوم</p>
              <button
                onClick={handleToday}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-bold shadow-xs hover:bg-sky-600 transition-colors"
              >
                الانتقال لليوم (3 أكتوبر 2026)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayViewOrders.map((o) => {
                const cfg = statusConfig(o.status);
                const sTitle =
                  o.service?.title ||
                  (o as any).serviceSnapshot?.title ||
                  'خدمة كلينزو';

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedBooking(o)}
                    className={cn(
                      'p-4 rounded-2xl border transition-all hover:scale-[1.01] cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 shadow-xs',
                      cfg.chip
                    )}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-sky-500 inline" />
                          {o.scheduledStart || o.time || '--:--'}
                          {o.scheduledEnd ? ` – ${o.scheduledEnd}` : ''}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold', cfg.badge)}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">#{o.id}</span>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        {sTitle}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {o.customerName || 'عميل كلينزو'}
                        </span>
                        {o.customerPhone && (
                          <span className="flex items-center gap-1 font-mono" dir="ltr">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {o.customerPhone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <HardHat className="w-3.5 h-3.5 text-indigo-500" />
                          {o.technician?.name || 'فني غير محدد'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <span className="text-base font-black text-sky-600 dark:text-sky-400">
                        {o.finalPrice || 0} ج.م
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(o);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        عرض التفاصيل
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. SELECTED BOOKING DETAILS MODAL                             */}
      {/* ------------------------------------------------------------- */}
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {selectedBooking.service?.title ||
                      (selectedBooking as any).serviceSnapshot?.title ||
                      'خدمة كلينزو'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    العميل: {selectedBooking.customerName || 'عميل كلينزو'}
                    {selectedBooking.customerPhone ? ` (${selectedBooking.customerPhone})` : ''}
                  </p>
                </div>
                <span className="font-black text-sky-600 dark:text-sky-400 text-sm">
                  {selectedBooking.finalPrice || 0} ج.م
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                  <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>
                    {selectedBooking.scheduledStart || selectedBooking.time || '--:--'}
                    {selectedBooking.scheduledEnd ? ` – ${selectedBooking.scheduledEnd}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                  <HardHat className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {selectedBooking.technician ? selectedBooking.technician.name : 'فني غير محدد'}
                  </span>
                </div>
              </div>

              {/* Service Duration & Travel Buffer breakdown */}
              <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>التاريخ المحجوز:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {selectedBooking.date}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>مدة الخدمة الفعلية:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedBooking.serviceDurationMinutes || selectedBooking.duration || 60} دقيقة
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>الحالة الحالية:</span>
                  <span className={cn('px-2 py-0.5 rounded-full font-bold text-[10px]', statusConfig(selectedBooking.status).badge)}>
                    {statusConfig(selectedBooking.status).label}
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
                {selectedBooking.status !== 'confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    تأكيد الموعد
                  </button>
                )}
                {selectedBooking.status !== 'cancelled' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 text-xs font-bold transition-colors"
                  >
                    إلغاء الموعد
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
