'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, Clock, AlertCircle, Ban, ChevronDown, Check } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useOrderStore } from '@/store/useOrderStore';
import { getUpcomingBookingDates, getTimeSlotsForDate, BookingSlot, isSameService, isSameTime, getBookingTimeInterval, isTimeIntervalOverlapping, getOrderCategory } from '@/lib/bookingEngine';
import { isSameCategory } from '@/lib/services/categoryUtils';
import { formatTimeTo12Hour } from '@/lib/timeUtils';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { cn } from '@/lib/utils';

export function StepDateTime() {
  const { t, locale } = useLocaleStore();
  const { selectedDate, setDate, selectedTime, setTime, selectedService, selectedServices, category, getTotalDuration, nextStep } = useBookingStore();
  const bookingSettings = useSettingsStore((s) => s.settings.booking);
  const fetchPublicSettings = useSettingsStore((s) => s.fetchPublicSettings);
  const orders = useOrderStore((s) => s.orders);
  const [liveSlots, setLiveSlots] = useState<BookingSlot[] | null>(null);
  const isAr = locale === 'ar';

  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  // Derive active service IDs for multi-service booking availability checks
  const currentServiceIds = useMemo(() => {
    if (selectedServices && selectedServices.length > 0) {
      return selectedServices.map((s) => s.service.id).filter(Boolean);
    }
    return selectedService?.id ? [selectedService.id] : [];
  }, [selectedServices, selectedService]);

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

  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  const dateOptions = useMemo(
    () => getUpcomingBookingDates(bookingSettings?.advanceBookingDays || 14, bookingSettings),
    [bookingSettings]
  );

  // Default to first available date on load if none selected or if selected is unavailable
  useEffect(() => {
    const firstAvailable = dateOptions.find((d) => d.isAvailable);
    const isCurrentValid = dateOptions.some((d) => d.dateString === selectedDate && d.isAvailable);
    if ((!selectedDate || !isCurrentValid) && firstAvailable) {
      setDate(firstAvailable.dateString);
    }
  }, [selectedDate, dateOptions, setDate]);

  // Query live availability from backend with real-time reactive sync & auto-polling
  useEffect(() => {
    if (!selectedDate) {
      setLiveSlots(null);
      return;
    }
    let isMounted = true;
    const duration = getTotalDuration() || selectedService?.serviceDurationMinutes || selectedService?.duration || 45;
    const effectiveCategory = selectedService?.category || selectedServices[0]?.service?.category || category;

    const fetchLiveSlots = () => {
      cleanzoApi.availability
        .checkDate(selectedDate, selectedService?.id, duration, currentServiceIds, undefined, effectiveCategory)
        .then((res) => {
          if (!isMounted) return;
          if (res && Array.isArray(res.slots)) {
            const formattedSlots: BookingSlot[] = res.slots
              .filter((slot: any) => Boolean(slot.available ?? slot.isAvailable))
              .map((slot: any) => {
                const labelAr = formatTimeTo12Hour(slot.label || slot.time, { locale: 'ar' });
                const labelEn = formatTimeTo12Hour(slot.label || slot.time, { locale: 'en' });
                return {
                  time: labelEn,
                  label: labelAr,
                  labelEn: labelEn,
                  isAvailable: true,
                  reason: undefined,
                  scheduledStart: slot.start || slot.scheduledStart || slot.time24,
                  scheduledEnd: slot.end || slot.scheduledEnd,
                  totalOccupiedMinutes: slot.totalOccupiedMinutes || duration,
                  serviceDurationMinutes: slot.serviceDurationMinutes || duration,
                };
              });
            setLiveSlots(formattedSlots);
          }
        })
        .catch(() => {
          if (isMounted) {
            // Keep current live slots or fallback only on true network failure
            setLiveSlots(null);
          }
        });
    };

    // 1. Initial immediate fetch
    fetchLiveSlots();

    // 2. Real-time BroadcastChannel listener (updates across tabs/windows instantly when any booking occurs)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('cleanzo_availability');
        bc.onmessage = (event) => {
          if (event.data?.type === 'BOOKING_CHANGED' || event.data?.type?.startsWith('BOOKING_')) {
            fetchLiveSlots();
          }
        };
      }
    } catch {}

    // 3. Local window custom event listener
    const handleBookingChanged = () => {
      fetchLiveSlots();
    };
    window.addEventListener('cleanzo:booking-changed', handleBookingChanged);
    window.addEventListener('focus', fetchLiveSlots);

    // 4. Short live polling interval (every 3.5s) to guarantee live slot sync without manual refresh
    const pollTimer = setInterval(fetchLiveSlots, 3500);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('cleanzo:booking-changed', handleBookingChanged);
      window.removeEventListener('focus', fetchLiveSlots);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [selectedDate, selectedService?.id, currentServiceIds, getTotalDuration, bookingSettings, category, selectedService?.category]);

  // Compute available time slots for the chosen date & category:
  // Strict Category rule: All services within the same category share the schedule pool.
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];

    const effectiveCategory = selectedService?.category || selectedServices[0]?.service?.category || category;
    if (liveSlots !== null) {
      return liveSlots.filter((s) => s.isAvailable);
    }

    const calculated = getTimeSlotsForDate(
      selectedDate,
      bookingSettings,
      selectedService?.id,
      selectedService?.title,
      orders,
      getTotalDuration() || selectedService?.serviceDurationMinutes || selectedService?.duration,
      selectedService?.travelTimeMinutes,
      currentServiceIds,
      effectiveCategory,
      false
    );
    return calculated.filter((s) => s.isAvailable);
  }, [selectedDate, liveSlots, bookingSettings, selectedService, currentServiceIds, orders, category, getTotalDuration]);

  // Auto-select first available slot if current slot is invalid, or invalidate clearly if none available
  useEffect(() => {
    if (timeSlots.length > 0) {
      const isCurrentSlotValid = timeSlots.some((s) => s.time === selectedTime && s.isAvailable);
      if (!isCurrentSlotValid) {
        const firstAvailable = timeSlots.find((s) => s.isAvailable);
        if (firstAvailable) {
          setTime(firstAvailable.time);
        } else {
          setTime('');
        }
      }
    } else {
      setTime('');
    }
  }, [timeSlots, selectedTime, setTime]);

  const selectedDateOpt = useMemo(
    () => dateOptions.find((d) => d.dateString === selectedDate),
    [dateOptions, selectedDate]
  );

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateOpt) {
      return isAr ? 'اختر التاريخ المناسب' : 'Select preferred date';
    }
    const day = isAr ? selectedDateOpt.dayNameAr : selectedDateOpt.dayNameEn;
    const dateFormatted = isAr ? selectedDateOpt.formattedDateAr : selectedDateOpt.formattedDateEn;
    const badge = selectedDateOpt.isToday ? (isAr ? ' (اليوم)' : ' (Today)') : '';
    return `${day}، ${dateFormatted}${badge}`;
  }, [selectedDateOpt, isAr]);

  const selectedTimeSlot = useMemo(
    () => timeSlots.find((s) => s.time === selectedTime || isSameTime(s.time, selectedTime)),
    [timeSlots, selectedTime]
  );

  const selectedTimeLabel = useMemo(() => {
    if (!selectedTime) {
      return isAr ? 'اختر الوقت المناسب' : 'Select preferred time';
    }
    if (selectedTimeSlot) {
      return formatTimeTo12Hour(isAr ? selectedTimeSlot.label : selectedTimeSlot.labelEn);
    }
    return formatTimeTo12Hour(selectedTime);
  }, [selectedTime, selectedTimeSlot, isAr]);

  return (
    <div className="space-y-4 sm:space-y-6 text-start">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Date Dropdown */}
        <div className="relative space-y-1.5" ref={dateDropdownRef}>
          <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>{t.booking.selectDate}</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              {isAr ? 'اختر اليوم الأنسب' : 'Choose date'}
            </span>
          </label>

          <button
            type="button"
            onClick={() => {
              setIsDateOpen((prev) => !prev);
              setIsTimeOpen(false);
            }}
            className={cn(
              "w-full h-11 sm:h-12 px-3 sm:px-4 rounded-xl border flex items-center justify-between transition-all bg-white dark:bg-[#071E34] text-slate-900 dark:text-white font-medium text-xs sm:text-sm cursor-pointer",
              isDateOpen
                ? "border-[#0866C6] ring-2 ring-[#0866C6]/20 dark:ring-[#0866C6]/30 shadow-sm"
                : "border-[#DDE7EC] dark:border-[#133B61] hover:border-[#0866C6]/40 dark:hover:border-[#0866C6]/40"
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Calendar className="w-4 h-4 text-[#0866C6] shrink-0" />
              <span className="truncate font-semibold">{selectedDateLabel}</span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                isDateOpen && "rotate-180 text-[#0866C6]"
              )}
            />
          </button>

          {isDateOpen && (
            <div className="absolute z-40 mt-1.5 w-full bg-white dark:bg-[#071E34] border border-[#DDE7EC] dark:border-[#133B61] rounded-xl shadow-xl max-h-64 overflow-y-auto p-1.5 space-y-1">
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
                      "w-full px-3 py-2 rounded-lg flex items-center justify-between text-xs sm:text-sm transition-colors text-start cursor-pointer",
                      !isAvailable
                        ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500"
                        : isSelected
                        ? "bg-[#0866C6]/10 text-[#0866C6] dark:text-[#83AED0] font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold">{isAr ? opt.dayNameAr : opt.dayNameEn}</span>
                      <span className="text-slate-400">·</span>
                      <span>{isAr ? opt.formattedDateAr : opt.formattedDateEn}</span>
                      {opt.isToday && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-[#0866C6] dark:text-sky-300">
                          {isAr ? 'اليوم' : 'Today'}
                        </span>
                      )}
                    </div>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-[#0866C6] shrink-0" />
                    ) : !isAvailable && opt.reason ? (
                      <span className="text-[10px] text-[#F0444C] font-semibold">{opt.reason}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Time Dropdown */}
        <div className="relative space-y-1.5" ref={timeDropdownRef}>
          <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0866C6]" />
              <span>{t.booking.selectTime}</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              {isAr ? 'حجز الموعد بدقة' : 'Select time'}
            </span>
          </label>

          <button
            type="button"
            disabled={timeSlots.length === 0}
            onClick={() => {
              setIsTimeOpen((prev) => !prev);
              setIsDateOpen(false);
            }}
            className={cn(
              "w-full h-11 sm:h-12 px-3 sm:px-4 rounded-xl border flex items-center justify-between transition-all bg-white dark:bg-[#071E34] text-slate-900 dark:text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
              isTimeOpen
                ? "border-[#0866C6] ring-2 ring-[#0866C6]/20 dark:ring-[#0866C6]/30 shadow-sm"
                : "border-[#DDE7EC] dark:border-[#133B61] hover:border-[#0866C6]/40 dark:hover:border-[#0866C6]/40"
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Clock className="w-4 h-4 text-[#0866C6] shrink-0" />
              <span className="truncate font-semibold" dir="ltr">
                {timeSlots.length === 0
                  ? (isAr ? 'لا توجد مواعيد متاحة' : 'No available slots')
                  : selectedTimeLabel}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                isTimeOpen && "rotate-180 text-[#0866C6]"
              )}
            />
          </button>

          {isTimeOpen && (
            <div className="absolute z-40 mt-1.5 w-full bg-white dark:bg-[#071E34] border border-[#DDE7EC] dark:border-[#133B61] rounded-xl shadow-xl max-h-64 overflow-y-auto p-1.5 space-y-1">
              {timeSlots.length === 0 ? (
                <div className="p-4 text-center space-y-1">
                  <Ban className="w-5 h-5 text-amber-500 mx-auto opacity-70" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isAr ? 'لا توجد مواعيد متاحة لهذا اليوم' : 'No available slots for this date'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'يرجى اختيار يوم آخر' : 'Please select another date'}
                  </p>
                </div>
              ) : (
                timeSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time || isSameTime(selectedTime, slot.time);
                  const displayLabel = formatTimeTo12Hour(isAr ? slot.label : slot.labelEn);

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => {
                        setTime(slot.time);
                        setIsTimeOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg flex items-center justify-between text-xs sm:text-sm transition-colors text-start cursor-pointer",
                        isSelected
                          ? "bg-[#0866C6]/10 text-[#0866C6] dark:text-[#83AED0] font-bold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                      )}
                    >
                      <span className="font-mono font-bold" dir="ltr">
                        {displayLabel}
                      </span>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-[#0866C6] shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notice info */}
      <div className="p-2.5 sm:p-3.5 rounded-xl bg-[#EAF8FC] dark:bg-[#072540] border border-[#0866C6]/20 dark:border-[#0866C6]/30 flex items-center gap-2.5 text-[11px] sm:text-xs text-[#07345C] dark:text-[#F6F8FA] font-sans">
        <AlertCircle className="w-4 h-4 shrink-0 text-[#0866C6] dark:text-[#38BDF8]" />
        <p className="leading-snug">
          {isAr
            ? 'تصل سيارة الخدمة المتنقلة في نافذة الموعد المحددة. سيصلك إشعار عند تحرك الفني نحو موقعك.'
            : 'Our mobile service unit arrives within the scheduled window. You will receive real-time updates when the technician is en route.'}
        </p>
      </div>

      {/* Selected Confirmation Banner & Proceed Action */}
      {selectedDate && selectedTime && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-500/30 dark:border-emerald-500/20 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                <span>{isAr ? 'تم تحديد موعد الزيارة' : 'Appointment Confirmed'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  {isAr ? 'جاهز للمتابعة' : 'Ready'}
                </span>
              </p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold mt-0.5" dir="ltr">
                {selectedDateLabel} • {selectedTimeLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => nextStep()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>{isAr ? 'تأكيد الميعاد والمتابعة للعنوان' : 'Confirm & Proceed to Address'}</span>
            <span className="text-sm font-bold">{isAr ? '←' : '→'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
