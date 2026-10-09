'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
  Loader2,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Order } from '@/types';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useOrderStore } from '@/store/useOrderStore';
import { getUpcomingBookingDates } from '@/lib/bookingEngine';
import { formatTimeTo12Hour } from '@/lib/timeUtils';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onSuccess?: (updatedOrder: Order) => void;
}

export function RescheduleModal({ isOpen, onClose, order, onSuccess }: RescheduleModalProps) {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const bookingSettings = useSettingsStore((s) => s.settings.booking);
  const fetchPublicSettings = useSettingsStore((s) => s.fetchPublicSettings);
  const rescheduleOrder = useOrderStore((s) => s.rescheduleOrder);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isDayAvailable, setIsDayAvailable] = useState<boolean>(true);
  const [dayReason, setDayReason] = useState<string>('');

  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  // Extract multi-service IDs
  const serviceIds = useMemo(() => {
    const list: string[] = [];
    if (order.serviceId) list.push(order.serviceId);
    if ((order as any).metadata?.serviceIds) list.push(...(order as any).metadata.serviceIds);
    if ((order as any).serviceSnapshot?.services) {
      list.push(...(order as any).serviceSnapshot.services.map((s: any) => s.id));
    }
    return Array.from(new Set(list)).filter(Boolean);
  }, [order]);

  const duration =
    order.totalOccupiedMinutes ||
    order.duration ||
    (order.service as any)?.duration ||
    60;

  // Upcoming valid dates
  const dateOptions = useMemo(
    () => getUpcomingBookingDates(bookingSettings?.advanceBookingDays || 14, bookingSettings),
    [bookingSettings]
  );

  // Initialize selected date
  useEffect(() => {
    if (isOpen) {
      const firstAvailable = dateOptions.find((d) => d.isAvailable);
      if (firstAvailable) {
        setSelectedDate(firstAvailable.dateString);
      } else if (dateOptions.length > 0) {
        setSelectedDate(dateOptions[0].dateString);
      }
      setSelectedSlotTime('');
      setReason('');
    }
  }, [isOpen, dateOptions]);

  // Fetch live slots whenever selected date changes
  useEffect(() => {
    if (!isOpen || !selectedDate) return;

    let isMounted = true;
    setIsLoadingSlots(true);
    setSelectedSlotTime('');

    cleanzoApi.availability
      .checkDate(selectedDate, order.serviceId, duration, serviceIds, order.id)
      .then((res) => {
        if (!isMounted) return;
        setIsDayAvailable(res?.isDayAvailable ?? true);
        setDayReason(res?.dayReason || '');
        const slots = res?.slots || [];
        setAvailableSlots(slots);
        const firstAvail = slots.find((s: any) => s.available !== false);
        if (firstAvail) {
          setSelectedSlotTime(firstAvail.time24 || firstAvail.time);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Failed to load slots for reschedule:', err);
        setIsDayAvailable(false);
        setDayReason(isAr ? 'تعذر تحميل المواعيد لهذا اليوم' : 'Failed to load slots');
        setAvailableSlots([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDate, order.id, order.serviceId, duration, serviceIds, isAr]);

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedSlotTime) {
      toast.error(isAr ? 'يرجى اختيار تاريخ وموعد متاح' : 'Please select an available date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await rescheduleOrder(
        order.id,
        selectedDate,
        selectedSlotTime,
        reason.trim() || undefined,
        order.customerPhone
      );

      toast.success(
        isAr
          ? 'تم تعديل موعد الحجز بنجاح وإشعار فريق العمليات!'
          : 'Appointment rescheduled successfully!'
      );

      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err: any) {
      const message =
        err?.message ||
        (isAr
          ? 'حدث خطأ أثناء تعديل الموعد. يرجى اختيار موعد آخر أو التواصل مع الدعم.'
          : 'Failed to reschedule. Please pick another slot or contact support.');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSlotObj = availableSlots.find(
    (s) => s.time24 === selectedSlotTime || s.time === selectedSlotTime
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'تعديل موعد الحجز' : 'Reschedule Appointment'}
      description={
        isAr
          ? 'اختر موعداً جديداً من المواعيد المتاحة. سيتم تحرير موعدك السابق فوراً وتأكيد الموعد الجديد.'
          : 'Pick a new available slot. Your previous slot will be released and the new slot confirmed.'
      }
      maxWidth="lg"
    >
      <div className="space-y-6 text-start py-2">
        {/* Current appointment reminder */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'الموعد الحالي المحجوز' : 'Current Scheduled Slot'}
            </span>
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>{order.date}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <Clock className="w-3.5 h-3.5 text-[#0866C6]" />
              <span dir="ltr">{formatTimeTo12Hour(order.time)}</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            #{order.id}
          </span>
        </div>

        {/* Date Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {isAr ? '1. اختر تاريخ الموعد الجديد' : '1. Select New Date'}
          </label>
          <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-3 ps-10 pe-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white appearance-none focus:outline-hidden focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/20 transition-all cursor-pointer"
            >
              {dateOptions.map((opt) => (
                <option
                  key={opt.dateString}
                  value={opt.dateString}
                  disabled={!opt.isAvailable}
                >
                  {isAr ? `${opt.dayNameAr}، ${opt.formattedDateAr}` : `${opt.dayNameEn}, ${opt.formattedDateEn}`}
                  {!opt.isAvailable ? ` (${opt.reason || (isAr ? 'مغلق' : 'Closed')})` : ''}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-sky-500 absolute start-3.5 top-3.5 pointer-events-none" />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute end-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Time Slots Selection - Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? '2. اختر توقيت الموعد الجديد' : '2. Pick an Available Time Slot'}
            </label>
            {isLoadingSlots && (
              <span className="text-[11px] text-sky-600 dark:text-sky-400 flex items-center gap-1 font-semibold">
                <Loader2 className="w-3 h-3 animate-spin" />
                {isAr ? 'جاري فحص المواعيد...' : 'Checking availability...'}
              </span>
            )}
          </div>

          {!isDayAvailable ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{dayReason || (isAr ? 'هذا اليوم غير متاح للحجز' : 'This day is not available')}</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedSlotTime}
                onChange={(e) => setSelectedSlotTime(e.target.value)}
                disabled={isSubmitting || isLoadingSlots || availableSlots.length === 0}
                className="w-full p-3 ps-10 pe-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white appearance-none focus:outline-hidden focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingSlots
                    ? (isAr ? 'جاري تحميل المواعيد...' : 'Loading slots...')
                    : availableSlots.filter((s: any) => s.available !== false).length === 0
                    ? (isAr ? 'لا توجد مواعيد متاحة في هذا اليوم' : 'No available slots for this day')
                    : (isAr ? '-- اختر التوقيت المناسب --' : '-- Choose a time --')}
                </option>
                {availableSlots
                  .filter((s: any) => s.available !== false)
                  .map((slot: any, idx: number) => {
                    const slotVal = slot.time24 || slot.time;
                    const displayLabel = formatTimeTo12Hour(slot.label || slot.time);
                    return (
                      <option key={slotVal || idx} value={slotVal}>
                        {displayLabel}
                      </option>
                    );
                  })}
              </select>
              <Clock className="w-4 h-4 text-sky-500 absolute start-3.5 top-3.5 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute end-3.5 top-3.5 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Reason / Notes (Optional) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'سبب التعديل (اختياري)' : 'Reschedule Reason (Optional)'}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            placeholder={
              isAr
                ? 'مثال: تغيير في جدول المواعيد أو ظروف خاصة...'
                : 'e.g. Schedule change or personal circumstances...'
            }
            className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/20 transition-all"
          />
        </div>

        {/* Summary pill */}
        {selectedSlotTime && (
          <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <span className="font-bold">
                {isAr ? 'الموعد الجديد المعتمد: ' : 'New scheduled time: '}
              </span>
              <span>
                {selectedDate} في تمام {formatTimeTo12Hour(selectedSlotTime)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmReschedule}
            disabled={!selectedDate || !selectedSlotTime || isSubmitting || !isDayAvailable}
            className="text-xs flex items-center gap-1.5 min-w-[140px] justify-center bg-[#0866C6] hover:bg-[#0759B0] text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isAr ? 'جاري التأكيد...' : 'Confirming...'}</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'تأكيد تعديل الموعد' : 'Confirm Reschedule'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
