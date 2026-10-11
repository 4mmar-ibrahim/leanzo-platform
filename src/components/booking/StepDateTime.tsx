'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Calendar, Clock, ChevronDown, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getUpcomingBookingDates, BookingDateOption } from '@/lib/bookingEngine';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { cn } from '@/lib/utils';

interface SlotItem {
  time: string;           // Machine value e.g. "09:00 – 09:45"
  start: string;          // e.g. "09:00"
  end: string;            // e.g. "09:45"
  displayAr: string;      // e.g. "9:00 – 9:45 ص" (single suffix)
  displayEn: string;      // e.g. "9:00 – 9:45 AM"
  available: boolean;
}

/**
 * Format a time range with a single AM/PM (ص/م) suffix when both start and end fall in the same period
 * Example:
 * 09:00 to 09:45 -> "9:00 – 9:45 ص"
 * 11:15 to 12:00 -> "11:15 ص – 12:00 م"
 * 13:00 to 13:45 -> "1:00 – 1:45 م"
 */
function formatCleanInterval(start24: string, end24: string, isAr: boolean): string {
  if (!start24) return '';
  const [sHStr, sMStr] = start24.split(':');
  const [eHStr, eMStr] = (end24 || start24).split(':');

  const sH = parseInt(sHStr || '0', 10);
  const sM = parseInt(sMStr || '0', 10);
  const eH = parseInt(eHStr || '0', 10);
  const eM = parseInt(eMStr || '0', 10);

  const sPeriod = sH >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const ePeriod = eH >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');

  const sH12 = sH % 12 === 0 ? 12 : sH % 12;
  const eH12 = eH % 12 === 0 ? 12 : eH % 12;

  const sMinFormatted = sM.toString().padStart(2, '0');
  const eMinFormatted = eM.toString().padStart(2, '0');

  if (sPeriod === ePeriod) {
    // Single period suffix as requested
    return `${sH12}:${sMinFormatted} – ${eH12}:${eMinFormatted} ${ePeriod}`;
  } else {
    // Cross-boundary (e.g. 11:15 AM to 12:00 PM)
    return `${sH12}:${sMinFormatted} ${sPeriod} – ${eH12}:${eMinFormatted} ${ePeriod}`;
  }
}

export function StepDateTime() {
  const { locale } = useLocaleStore();
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

  // Dropdown states
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Total duration: service time + travel time + addons (Zero added buffer)
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

  // Automatically select first available date on load if none selected
  useEffect(() => {
    const firstAvailable = dateOptions.find((d) => d.isAvailable);
    const isCurrentValid = dateOptions.some((d) => d.dateString === selectedDate && d.isAvailable);
    if ((!selectedDate || !isCurrentValid) && firstAvailable) {
      setDate(firstAvailable.dateString);
    }
  }, [selectedDate, dateOptions, setDate]);

  // Fetch available slots from backend with real-time accuracy
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
        // Customer view: only available slots
        const availableOnly = res.slots.filter((s: any) => Boolean(s.available ?? s.isAvailable));

        const parsedSlots: SlotItem[] = availableOnly.map((s: any) => {
          const rawStart = s.start || s.time24 || (s.time ? s.time.split(/[-–—]/)[0].trim() : '09:00');
          const rawEnd = s.end || (s.time ? s.time.split(/[-–—]/)[1]?.trim() : '');
          const rawTime = s.time || `${rawStart} – ${rawEnd}`;

          const displayAr = formatCleanInterval(rawStart, rawEnd, true);
          const displayEn = formatCleanInterval(rawStart, rawEnd, false);

          return {
            time: rawTime,
            start: rawStart,
            end: rawEnd,
            displayAr,
            displayEn,
            available: true,
          };
        });

        setSlots(parsedSlots);

        // If currently selected time is no longer available in the fresh slots, reset
        if (selectedTime) {
          const stillValid = parsedSlots.some(
            (p) => p.time === selectedTime || p.displayAr === selectedTime || p.displayEn === selectedTime
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

  // Refetch when date changes
  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  // Real-time listener: broadcast updates and 3.5s auto-polling
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

    const intervalTimer = setInterval(fetchAvailableSlots, 3500);

    return () => {
      clearInterval(intervalTimer);
      window.removeEventListener('cleanzo:booking-changed', handleCustomBookingEvent);
      window.removeEventListener('focus', fetchAvailableSlots);
      if (bc) bc.close();
    };
  }, [fetchAvailableSlots]);

  // Current selected date object
  const selectedDateObj = useMemo(() => {
    return dateOptions.find((d) => d.dateString === selectedDate);
  }, [dateOptions, selectedDate]);

  // Current selected slot object
  const selectedSlotObj = useMemo(() => {
    if (!selectedTime) return null;
    return slots.find(
      (s) => s.time === selectedTime || s.displayAr === selectedTime || s.displayEn === selectedTime
    );
  }, [slots, selectedTime]);

  // Display label for selected date button
  const dateButtonLabel = useMemo(() => {
    if (!selectedDateObj) return isAr ? 'اختر اليوم المناسب' : 'Select Date';
    const dayLabel = isAr ? selectedDateObj.dayNameAr : selectedDateObj.dayNameEn;
    const dateLabel = isAr ? selectedDateObj.formattedDateAr : selectedDateObj.formattedDateEn;
    const prefix = selectedDateObj.isToday ? (isAr ? 'اليوم · ' : 'Today · ') : '';
    return `${prefix}${dayLabel} (${dateLabel})`;
  }, [selectedDateObj, isAr]);

  // Display label for selected time button
  const timeButtonLabel = useMemo(() => {
    if (isLoadingSlots) return isAr ? 'جاري فحص المواعيد المتاحة...' : 'Loading slots...';
    if (!selectedSlotObj) {
      return slots.length === 0
        ? (isAr ? 'لا توجد مواعيد متاحة لهذا اليوم' : 'No available slots')
        : (isAr ? 'اختر توقيت الحجز المناسب' : 'Select Time Slot');
    }
    return isAr ? selectedSlotObj.displayAr : selectedSlotObj.displayEn;
  }, [selectedSlotObj, slots.length, isLoadingSlots, isAr]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in-50 duration-300 max-w-2xl mx-auto">
      {/* Header Info */}
      <div className="bg-white dark:bg-[#071E34] p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {isAr ? 'تحديث حي ومباشر' : 'Live Real-Time Availability'}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {isAr ? 'اختر تاريخ وتوقيت الحجز' : 'Select Booking Date & Time'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAr
              ? 'المواعيد تظهر بدقة وتتحدث تلقائياً بمجرد حجز أي موعد'
              : 'Slots update dynamically based on live mobile unit routes'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 px-3.5 py-2 rounded-xl shrink-0">
          <Clock className="w-4 h-4 text-[#0866C6] dark:text-[#38BDF8]" />
          <div className="text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">{isAr ? 'إجمالي الوقت: ' : 'Duration: '}</span>
            <span className="text-[#0866C6] dark:text-[#38BDF8] font-black">{totalDuration} {isAr ? 'دقيقة' : 'min'}</span>
          </div>
        </div>
      </div>

      {/* Dropdown Section: Date & Time */}
      <div className="bg-white dark:bg-[#071E34] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        {/* 1. Date Dropdown */}
        <div className="space-y-2 relative" ref={dateDropdownRef}>
          <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0866C6]" />
            <span>{isAr ? 'تاريخ الحجز (اليوم)' : 'Booking Date'}</span>
          </label>

          <button
            type="button"
            onClick={() => {
              setIsDateOpen((prev) => !prev);
              setIsTimeOpen(false);
            }}
            className={cn(
              'w-full h-12 px-4 rounded-xl border flex items-center justify-between transition-all bg-white dark:bg-[#071E34] text-slate-900 dark:text-white font-medium text-xs sm:text-sm cursor-pointer',
              isDateOpen
                ? 'border-[#0866C6] ring-2 ring-[#0866C6]/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-[#0866C6]/50'
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Calendar className="w-4 h-4 text-[#0866C6] shrink-0" />
              <span className="truncate font-bold">{dateButtonLabel}</span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0',
                isDateOpen && 'rotate-180 text-[#0866C6]'
              )}
            />
          </button>

          {/* Date Dropdown List */}
          {isDateOpen && (
            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-[#071E34] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-64 overflow-y-auto p-1.5 space-y-1">
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
                        setIsDateOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-lg flex items-center justify-between text-xs sm:text-sm transition-colors text-start cursor-pointer',
                      !isAvailable
                        ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500'
                        : isSelected
                        ? 'bg-[#0866C6] text-white font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold">{isAr ? opt.dayNameAr : opt.dayNameEn}</span>
                      <span className={isSelected ? 'text-blue-100' : 'text-slate-400'}>·</span>
                      <span>{isAr ? opt.formattedDateAr : opt.formattedDateEn}</span>
                      {opt.isToday && (
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          )}
                        >
                          {isAr ? 'اليوم' : 'Today'}
                        </span>
                      )}
                    </div>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : !isAvailable && opt.reason ? (
                      <span className="text-[10px] text-red-500 font-semibold">{opt.reason}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Time Dropdown */}
        <div className="space-y-2 relative" ref={timeDropdownRef}>
          <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0866C6]" />
              <span>{isAr ? 'توقيت الحجز (الموعد)' : 'Booking Time'}</span>
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {slots.length} {isAr ? 'موعد متاح' : 'available'}
            </span>
          </label>

          <button
            type="button"
            disabled={isLoadingSlots || slots.length === 0}
            onClick={() => {
              setIsTimeOpen((prev) => !prev);
              setIsDateOpen(false);
            }}
            className={cn(
              'w-full h-12 px-4 rounded-xl border flex items-center justify-between transition-all bg-white dark:bg-[#071E34] text-slate-900 dark:text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
              isTimeOpen
                ? 'border-[#0866C6] ring-2 ring-[#0866C6]/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-[#0866C6]/50'
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Clock className="w-4 h-4 text-[#0866C6] shrink-0" />
              <span className="truncate font-bold font-mono" dir="ltr">
                {timeButtonLabel}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0',
                isTimeOpen && 'rotate-180 text-[#0866C6]'
              )}
            />
          </button>

          {/* Time Dropdown List */}
          {isTimeOpen && (
            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-[#071E34] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-64 overflow-y-auto p-1.5 space-y-1">
              {slots.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isAr ? 'لا توجد مواعيد متاحة لهذا اليوم' : 'No available slots for this date'}
                </div>
              ) : (
                slots.map((slot) => {
                  const isSelected =
                    selectedTime === slot.time ||
                    selectedTime === slot.displayAr ||
                    selectedTime === slot.displayEn;
                  const label = isAr ? slot.displayAr : slot.displayEn;

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => {
                        setTime(slot.time);
                        setIsTimeOpen(false);
                      }}
                      className={cn(
                        'w-full px-3.5 py-2.5 rounded-lg flex items-center justify-between text-xs sm:text-sm transition-colors text-start cursor-pointer',
                        isSelected
                          ? 'bg-[#0866C6] text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <span className="font-mono font-bold tracking-tight" dir="ltr">
                        {label}
                      </span>
                      {isSelected ? <Check className="w-4 h-4 text-white shrink-0" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notice info */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/30 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
        <AlertCircle className="w-4 h-4 text-[#0866C6] shrink-0" />
        <p className="leading-relaxed">
          {isAr
            ? 'تلتزم سيارة الخدمة المتنقلة بالحضور في الموعد المحدد بدقة. سيصلك إشعار مباشر عند تحرك الفني نحو موقعك.'
            : 'Our mobile service unit arrives within the confirmed appointment window. You will receive live updates when en route.'}
        </p>
      </div>

      {/* 3. Selected Confirmation & Proceed */}
      {selectedDate && selectedTime && selectedSlotObj && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/30 dark:border-emerald-500/20 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in-50 duration-300">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-950 dark:text-emerald-100">
                  {isAr ? 'تم تحديد الموعد' : 'Appointment Confirmed'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  {isAr ? 'جاهز للمتابعة' : 'Ready'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 mt-0.5" dir="ltr">
                {selectedDateObj ? (isAr ? selectedDateObj.formattedDateAr : selectedDateObj.formattedDateEn) : selectedDate}{' '}
                • {isAr ? selectedSlotObj.displayAr : selectedSlotObj.displayEn}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => nextStep()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>{isAr ? 'تأكيد الموعد والمتابعة للعنوان' : 'Confirm & Proceed to Address'}</span>
            <span className="text-base font-bold">{isAr ? '←' : '→'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
