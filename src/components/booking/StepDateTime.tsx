'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Calendar, Clock, Sparkles, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Sun, CloudSun, Moon, RefreshCw } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getUpcomingBookingDates, BookingDateOption } from '@/lib/bookingEngine';
import { formatTimeTo12Hour } from '@/lib/timeUtils';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { cn } from '@/lib/utils';

interface SlotItem {
  time: string;           // e.g. "09:00 – 09:45"
  start: string;          // e.g. "09:00"
  end: string;            // e.g. "09:45"
  labelAr: string;        // e.g. "09:00 ص – 09:45 ص"
  labelEn: string;        // e.g. "09:00 AM – 09:45 AM"
  period: 'morning' | 'afternoon' | 'evening';
  available: boolean;
}

export function StepDateTime() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';

  const {
    selectedDate,
    setDate,
    selectedTime,
    setTime,
    selectedService,
    selectedServices,
    category,
    getTotalDuration,
    nextStep,
  } = useBookingStore();

  const bookingSettings = useSettingsStore((s) => s.settings.booking);
  const fetchPublicSettings = useSettingsStore((s) => s.fetchPublicSettings);

  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(true);
  const [activePeriod, setActivePeriod] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');

  // Exact total service duration = service execution + travel time + addons (Zero added buffer)
  const totalDuration = useMemo(() => {
    return (
      getTotalDuration() ||
      selectedService?.totalOccupiedMinutes ||
      (Number(selectedService?.serviceDurationMinutes || selectedService?.duration || 30) +
        Number(selectedService?.travelTimeMinutes || 0)) ||
      45
    );
  }, [getTotalDuration, selectedService]);

  const effectiveCategory = useMemo(() => {
    return selectedService?.category || selectedServices[0]?.service?.category || category || 'car';
  }, [selectedService, selectedServices, category]);

  const currentServiceIds = useMemo(() => {
    if (selectedServices && selectedServices.length > 0) {
      return selectedServices.map((s) => s.service.id).filter(Boolean);
    }
    return selectedService?.id ? [selectedService.id] : [];
  }, [selectedServices, selectedService]);

  // Load public settings on mount
  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  // Generate 14 upcoming selectable days
  const dateOptions: BookingDateOption[] = useMemo(() => {
    return getUpcomingBookingDates(bookingSettings?.advanceBookingDays || 14, bookingSettings);
  }, [bookingSettings]);

  // Automatically select first available date if none selected or current is invalid
  useEffect(() => {
    const firstAvailable = dateOptions.find((d) => d.isAvailable);
    const isCurrentValid = dateOptions.some((d) => d.dateString === selectedDate && d.isAvailable);
    if ((!selectedDate || !isCurrentValid) && firstAvailable) {
      setDate(firstAvailable.dateString);
    }
  }, [selectedDate, dateOptions, setDate]);

  // Fetch available slots from backend with exact duration and category
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate) {
      setSlots([]);
      setIsLoadingSlots(false);
      return;
    }

    try {
      setIsLoadingSlots(true);
      const res = await cleanzoApi.availability.checkDate(
        selectedDate,
        selectedService?.id,
        totalDuration,
        currentServiceIds,
        undefined,
        effectiveCategory
      );

      if (res && Array.isArray(res.slots)) {
        // Only return truly available slots for the customer
        const availableOnly = res.slots.filter((s: any) => Boolean(s.available ?? s.isAvailable));

        const parsedSlots: SlotItem[] = availableOnly.map((s: any) => {
          const rawStart = s.start || s.time24 || (s.time ? s.time.split(/[-–—]/)[0].trim() : '09:00');
          const rawEnd = s.end || (s.time ? s.time.split(/[-–—]/)[1]?.trim() : '');
          const rawTime = s.time || `${rawStart} – ${rawEnd}`;

          const [h] = rawStart.split(':').map((x: string) => parseInt(x, 10));
          let period: 'morning' | 'afternoon' | 'evening' = 'morning';
          if (h >= 17) {
            period = 'evening';
          } else if (h >= 12) {
            period = 'afternoon';
          }

          const labelAr = formatTimeTo12Hour(rawTime, { locale: 'ar' });
          const labelEn = formatTimeTo12Hour(rawTime, { locale: 'en' });

          return {
            time: rawTime,
            start: rawStart,
            end: rawEnd,
            labelAr,
            labelEn,
            period,
            available: true,
          };
        });

        setSlots(parsedSlots);

        // If currently selected time is no longer available in the freshly fetched slots, reset selection
        if (selectedTime) {
          const stillValid = parsedSlots.some(
            (p) => p.time === selectedTime || p.labelAr === selectedTime || p.labelEn === selectedTime
          );
          if (!stillValid) {
            setTime('');
          }
        }
      } else {
        setSlots([]);
      }
    } catch {
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedDate, selectedService?.id, totalDuration, currentServiceIds, effectiveCategory, selectedTime, setTime]);

  // Initial and reactive fetch upon date or duration change
  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  // Real-Time Sync: Listen for cross-tab bookings and live polling without manual refresh
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('cleanzo_availability');
        bc.onmessage = (event) => {
          if (event.data?.type === 'BOOKING_CHANGED' || event.data?.type?.startsWith('BOOKING_')) {
            fetchAvailableSlots();
          }
        };
      }
    } catch {}

    const handleCustomBookingEvent = () => fetchAvailableSlots();
    window.addEventListener('cleanzo:booking-changed', handleCustomBookingEvent);
    window.addEventListener('focus', fetchAvailableSlots);

    // Live continuous sync polling every 3.5 seconds
    const intervalTimer = setInterval(fetchAvailableSlots, 3500);

    return () => {
      clearInterval(intervalTimer);
      window.removeEventListener('cleanzo:booking-changed', handleCustomBookingEvent);
      window.removeEventListener('focus', fetchAvailableSlots);
      if (bc) bc.close();
    };
  }, [fetchAvailableSlots]);

  // Filter slots by selected day period
  const filteredSlots = useMemo(() => {
    if (activePeriod === 'all') return slots;
    return slots.filter((s) => s.period === activePeriod);
  }, [slots, activePeriod]);

  // Period counts for tab indicators
  const periodCounts = useMemo(() => {
    return {
      all: slots.length,
      morning: slots.filter((s) => s.period === 'morning').length,
      afternoon: slots.filter((s) => s.period === 'afternoon').length,
      evening: slots.filter((s) => s.period === 'evening').length,
    };
  }, [slots]);

  // Find active date label
  const selectedDateObj = useMemo(() => {
    return dateOptions.find((d) => d.dateString === selectedDate);
  }, [dateOptions, selectedDate]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-300">
      {/* 1. Header & Service Timing Transparency */}
      <div className="bg-white dark:bg-[#071E34] p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wide uppercase text-emerald-600 dark:text-emerald-400">
              {isAr ? 'تحديث حي ومباشر' : 'Live Real-Time Availability'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {isAr ? 'اختر اليوم وموعد وصول سيارة الخدمة' : 'Select Date & Service Arrival Time'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAr
              ? 'المواعيد تتحدث تلقائياً وفورياً بحسب جدول الفنيين وسيارات الخدمة'
              : 'Slots update dynamically based on live mobile unit routes and category bookings'}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 px-3.5 py-2.5 rounded-xl shrink-0">
          <Clock className="w-5 h-5 text-[#0866C6] dark:text-[#38BDF8] shrink-0" />
          <div className="text-xs">
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              {isAr ? 'إجمالي وقت الحجز' : 'Total Service Window'}
            </div>
            <div className="text-[#0866C6] dark:text-[#38BDF8] font-black text-sm">
              {totalDuration} {isAr ? 'دقيقة' : 'mins'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Date Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0866C6]" />
            <span>{isAr ? 'الأيام المتاحة للحجز' : 'Available Booking Dates'}</span>
          </h3>
          {selectedDateObj && (
            <span className="text-xs font-bold text-[#0866C6] dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full">
              {isAr ? selectedDateObj.dayNameAr : selectedDateObj.dayNameEn} •{' '}
              {isAr ? selectedDateObj.formattedDateAr : selectedDateObj.formattedDateEn}
            </span>
          )}
        </div>

        {/* Date Cards Horizontal Carousel */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x snap-mandatory">
          {dateOptions.map((opt) => {
            const isSelected = selectedDate === opt.dateString;
            const isAvailable = opt.isAvailable;

            return (
              <button
                key={opt.dateString}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (isAvailable) {
                    setDate(opt.dateString);
                  }
                }}
                className={cn(
                  'snap-start shrink-0 min-w-[88px] sm:min-w-[102px] p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 select-none relative',
                  isSelected
                    ? 'bg-[#0866C6] border-[#0866C6] text-white shadow-md shadow-[#0866C6]/25 scale-[1.02]'
                    : isAvailable
                    ? 'bg-white dark:bg-[#071E34] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-[#0866C6]/60 dark:hover:border-[#0866C6]/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20'
                    : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                )}
              >
                {opt.isToday && (
                  <span
                    className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider',
                      isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    )}
                  >
                    {isAr ? 'اليوم' : 'Today'}
                  </span>
                )}

                <span className={cn('text-xs font-bold', isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300')}>
                  {isAr ? opt.dayNameAr : opt.dayNameEn}
                </span>

                <span className="text-base sm:text-lg font-black tracking-tight">
                  {opt.dateString.split('-')[2]}
                </span>

                <span
                  className={cn(
                    'text-[10px] font-medium truncate w-full',
                    isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {isAr ? opt.formattedDateAr.split(' ')[1] : opt.formattedDateEn.split(' ')[1]}
                </span>

                {isSelected && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-[#0866C6] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Time Slots Section */}
      <div className="space-y-4 bg-white dark:bg-[#071E34] p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0866C6]" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {isAr ? 'المواعيد المتاحة لهذا اليوم' : 'Available Time Slots'}
            </h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full">
              {slots.length} {isAr ? 'موعد متاح' : 'slots'}
            </span>
          </div>

          {/* Period Filter Tabs */}
          {slots.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActivePeriod('all')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  activePeriod === 'all'
                    ? 'bg-white dark:bg-[#071E34] text-[#0866C6] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                {isAr ? 'الكل' : 'All'} ({periodCounts.all})
              </button>
              {periodCounts.morning > 0 && (
                <button
                  type="button"
                  onClick={() => setActivePeriod('morning')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer',
                    activePeriod === 'morning'
                      ? 'bg-white dark:bg-[#071E34] text-[#0866C6] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>{isAr ? 'صباحاً' : 'Morning'}</span>
                </button>
              )}
              {periodCounts.afternoon > 0 && (
                <button
                  type="button"
                  onClick={() => setActivePeriod('afternoon')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer',
                    activePeriod === 'afternoon'
                      ? 'bg-white dark:bg-[#071E34] text-[#0866C6] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <CloudSun className="w-3 h-3 text-orange-500" />
                  <span>{isAr ? 'ظهراً' : 'Afternoon'}</span>
                </button>
              )}
              {periodCounts.evening > 0 && (
                <button
                  type="button"
                  onClick={() => setActivePeriod('evening')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer',
                    activePeriod === 'evening'
                      ? 'bg-white dark:bg-[#071E34] text-[#0866C6] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <Moon className="w-3 h-3 text-indigo-500" />
                  <span>{isAr ? 'مساءً' : 'Evening'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoadingSlots && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200/50 dark:border-slate-800/50"
              />
            ))}
          </div>
        )}

        {/* Empty State: No Slots Available */}
        {!isLoadingSlots && slots.length === 0 && (
          <div className="text-center py-10 px-4 space-y-3 bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'جميع مواعيد هذا اليوم محجوزة بالكامل' : 'All slots on this date are fully booked'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {isAr
                ? 'يرجى اختيار يوم آخر من شريط الأيام بالأعلى للاطلاع على المواعيد المتاحة'
                : 'Please pick another date from the calendar bar above to view open slots'}
            </p>
          </div>
        )}

        {/* Slots Grid */}
        {!isLoadingSlots && filteredSlots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSlots.map((slot) => {
              const isSelected = selectedTime === slot.time || selectedTime === slot.labelAr || selectedTime === slot.labelEn;
              const displayLabel = isAr ? slot.labelAr : slot.labelEn;

              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => {
                    setTime(slot.time);
                  }}
                  className={cn(
                    'p-3.5 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between gap-3 relative group',
                    isSelected
                      ? 'bg-gradient-to-r from-[#0866C6] to-[#0756A6] text-white border-[#0866C6] shadow-md shadow-[#0866C6]/20 ring-2 ring-[#0866C6]/30'
                      : 'bg-white dark:bg-[#071E34] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-[#0866C6]/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : slot.period === 'morning'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : slot.period === 'afternoon'
                          ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      )}
                    >
                      {slot.period === 'morning' ? (
                        <Sun className="w-4 h-4" />
                      ) : slot.period === 'afternoon' ? (
                        <CloudSun className="w-4 h-4" />
                      ) : (
                        <Moon className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div
                        className={cn(
                          'text-xs sm:text-sm font-black font-mono tracking-tight',
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        )}
                        dir="ltr"
                      >
                        {displayLabel}
                      </div>
                      <div
                        className={cn(
                          'text-[10px] font-medium mt-0.5',
                          isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                        )}
                      >
                        {isAr ? 'فترة الحجز المؤكدة' : 'Confirmed window'}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0 animate-in zoom-in-75 duration-200" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Notice Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/30 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
        <AlertCircle className="w-4 h-4 text-[#0866C6] shrink-0" />
        <p className="leading-relaxed">
          {isAr
            ? 'تلتزم سيارة الخدمة المتنقلة بالحضور في الموعد المحدد بدقة. سيصلك إشعار مباشر عند تحرك الفني نحو موقعك.'
            : 'Our mobile service unit arrives within the confirmed appointment window. You will receive live updates when en route.'}
        </p>
      </div>

      {/* 5. Selected Appointment Confirmation & Next Button */}
      {selectedDate && selectedTime && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-950 dark:text-emerald-100">
                  {isAr ? 'تم اختيار الموعد بنجاح' : 'Appointment Confirmed'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  {isAr ? 'جاهز للمتابعة' : 'Ready'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 mt-0.5" dir="ltr">
                {selectedDateObj ? (isAr ? selectedDateObj.formattedDateAr : selectedDateObj.formattedDateEn) : selectedDate}{' '}
                • {formatTimeTo12Hour(selectedTime, { locale: isAr ? 'ar' : 'en' })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => nextStep()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
          >
            <span>{isAr ? 'تأكيد الموعد والمتابعة للعنوان' : 'Confirm & Proceed to Address'}</span>
            <span className="text-base font-bold">{isAr ? '←' : '→'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
