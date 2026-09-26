'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, AlertCircle, Ban } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useOrderStore } from '@/store/useOrderStore';
import { getUpcomingBookingDates, getTimeSlotsForDate, BookingSlot, isSameService, isSameTime } from '@/lib/bookingEngine';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

export function StepDateTime() {
  const { t, locale } = useLocaleStore();
  const { selectedDate, setDate, selectedTime, setTime, selectedService } = useBookingStore();
  const bookingSettings = useSettingsStore((s) => s.settings.booking);
  const fetchPublicSettings = useSettingsStore((s) => s.fetchPublicSettings);
  const orders = useOrderStore((s) => s.orders);
  const [liveSlots, setLiveSlots] = useState<BookingSlot[] | null>(null);
  const isAr = locale === 'ar';

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

  // Query live availability from backend when date or selected service changes
  useEffect(() => {
    if (!selectedDate) return;
    let isMounted = true;
    const duration = selectedService?.serviceDurationMinutes || selectedService?.duration;
    cleanzoApi.availability
      .checkDate(selectedDate, selectedService?.id, duration)
      .then((res) => {
        if (isMounted && res?.slots && res.slots.length > 0) {
          const formattedSlots: BookingSlot[] = res.slots.map((slot: { time: string; available: boolean; reason?: string }) => ({
            time: slot.time,
            label: slot.time,
            labelEn: slot.time,
            isAvailable: slot.available,
            reason: slot.reason,
          }));
          setLiveSlots(formattedSlots);
        }
      })
      .catch(() => {
        // Fallback quietly to deterministic engine
      });
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedService?.id, selectedService?.serviceDurationMinutes, selectedService?.duration]);

  // Compute available time slots for the chosen date & service:
  // Strict Per-Service rule: If an active booking exists for THIS SAME SERVICE at date & time, mark slot closed!
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];

    let baseSlots: BookingSlot[] = [];
    if (liveSlots && liveSlots.length > 0) {
      baseSlots = [...liveSlots];
    } else {
      baseSlots = getTimeSlotsForDate(
        selectedDate,
        bookingSettings,
        selectedService?.id,
        selectedService?.title,
        orders
      );
    }

    // Cross-reference with all active orders in store to guarantee local and remote sync
    return baseSlots.map((slot) => {
      const isAlreadyBooked = orders.some((o) => {
        if (o.status === 'cancelled') return false;
        if (o.date !== selectedDate) return false;
        if (!isSameService(o, selectedService?.id, selectedService?.title)) return false;
        return isSameTime(o.time, slot.time);
      });

      if (isAlreadyBooked) {
        return {
          ...slot,
          isAvailable: false,
          reason: isAr ? 'محجوز' : 'Booked',
        };
      }
      return slot;
    });
  }, [selectedDate, liveSlots, bookingSettings, selectedService, orders, isAr]);

  // Auto-select first available slot if current slot is invalid or empty
  useEffect(() => {
    if (timeSlots.length > 0) {
      const isCurrentSlotValid = timeSlots.some((s) => s.time === selectedTime && s.isAvailable);
      if (!isCurrentSlotValid) {
        const firstAvailable = timeSlots.find((s) => s.isAvailable);
        if (firstAvailable) {
          setTime(firstAvailable.time);
        }
      }
    }
  }, [timeSlots, selectedTime, setTime]);

  return (
    <div className="space-y-8 text-start">
      {/* 1. Date Selector */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-500" />
          <span>{t.booking.selectDate}</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {dateOptions.map((opt) => {
            const isSelected = selectedDate === opt.dateString;
            const isAvailable = opt.isAvailable;

            return (
              <button
                key={opt.dateString}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && setDate(opt.dateString)}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  !isAvailable
                    ? 'border-slate-200/50 dark:border-slate-800/40 bg-slate-100/60 dark:bg-slate-900/40 opacity-50 cursor-not-allowed text-slate-400'
                    : isSelected
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 shadow-md ring-1 ring-sky-500/50'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isAr ? opt.dayNameAr : opt.dayNameEn}
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {isAr ? opt.formattedDateAr : opt.formattedDateEn}
                </span>
                {opt.isToday ? (
                  <span className="text-[10px] font-bold text-[#0866C6] dark:text-[#83AED0]">
                    {isAr ? 'اليوم' : 'Today'}
                  </span>
                ) : !isAvailable && opt.reason ? (
                  <span className="text-[9px] font-medium text-[#F0444C] truncate max-w-[80px]">
                    {opt.reason}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Time Slots Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0866C6]" />
            <span>{t.booking.selectTime}</span>
          </label>
          <span className="text-xs text-slate-400">
            {isAr ? 'المواعيد بنظام الحجز الدقيق' : 'Precision scheduling'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {timeSlots.map((slot) => {
            const isSelected = selectedTime === slot.time;
            const isAvailable = slot.isAvailable;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && setTime(slot.time)}
                className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  !isAvailable
                    ? 'border-slate-200/50 dark:border-slate-800/40 bg-slate-100/50 dark:bg-slate-950/40 opacity-50 cursor-not-allowed text-slate-400'
                    : isSelected
                    ? 'border-[#0866C6] bg-blue-50 dark:bg-[#082845] text-[#0866C6] dark:text-white shadow-md ring-1 ring-[#0866C6]/50'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-bold">
                  {isAr ? slot.label : slot.labelEn}
                </span>
                <span className="text-[10px] font-medium">
                  {isAvailable ? (
                    <span className="text-[#0866C6] dark:text-[#83AED0] font-semibold">
                      {isAr ? 'متاح' : 'Available'}
                    </span>
                  ) : (
                    <span className="text-[#F0444C] font-semibold">
                      {slot.reason || (isAr ? 'غير متاح' : 'Unavailable')}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notice info */}
      <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 flex items-start gap-3 text-xs text-sky-800 dark:text-sky-300">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
        <p className="leading-relaxed">
          {isAr
            ? 'تصل سيارة الخدمة المتنقلة في نافذة الموعد المحددة. سيصلك إشعار عند تحرك الفني نحو موقعك.'
            : 'Our mobile service unit arrives within the scheduled window. You will receive real-time updates when the technician is en route.'}
        </p>
      </div>
    </div>
  );
}
