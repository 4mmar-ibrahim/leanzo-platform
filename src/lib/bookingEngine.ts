import { BookingSettings, Order } from '@/types';

export interface BookingSlot {
  time: string;
  label: string;
  labelEn: string;
  isAvailable: boolean;
  reason?: string;
}

export interface BookingDateOption {
  dateString: string; // YYYY-MM-DD
  dayNameAr: string;
  dayNameEn: string;
  formattedDateAr: string;
  formattedDateEn: string;
  isToday: boolean;
  isAvailable: boolean;
  reason?: string;
}

function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');

  const timePart = clean.replace(/(AM|PM)/g, '').trim();
  const [hourStr, minuteStr] = timePart.split(':');
  let hours = parseInt(hourStr || '0', 10);
  const minutes = parseInt(minuteStr || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
}

function minutesToDisplayTime(totalMinutes: number): { time12Ar: string; time12En: string } {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const minsStr = mins.toString().padStart(2, '0');

  const period = hours >= 12 ? 'PM' : 'AM';
  const periodAr = hours >= 12 ? (hours >= 17 ? 'مساءً' : 'ظهراً') : 'صباحاً';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const hours12Str = hours12.toString().padStart(2, '0');

  return {
    time12En: `${hours12Str}:${minsStr} ${period}`,
    time12Ar: `${hours12Str}:${minsStr} ${periodAr}`,
  };
}

export function getUpcomingBookingDates(
  daysAhead: number = 14,
  settings?: Partial<BookingSettings>
): BookingDateOption[] {
  const dates: BookingDateOption[] = [];
  const today = new Date();

  const totalDays = settings?.advanceBookingDays || daysAhead || 14;
  const workingDays = settings?.workingDays && settings.workingDays.length > 0
    ? settings.workingDays
    : [0, 1, 2, 3, 4, 5, 6];
  const sameDay = settings?.sameDayBooking ?? true;
  const holidays = settings?.holidays || [];
  const blockedDates = settings?.blockedDates || [];

  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const dayIndex = d.getDay();
    const isToday = i === 0;

    let isAvailable = true;
    let reason: string | undefined;

    if (isToday && !sameDay) {
      isAvailable = false;
      reason = 'الحجز في نفس اليوم غير متاح';
    } else if (!workingDays.includes(dayIndex)) {
      isAvailable = false;
      reason = 'عطلة أسبوعية';
    } else if (blockedDates.includes(dateString)) {
      isAvailable = false;
      reason = 'محجوب للصيانة';
    } else {
      const holiday = holidays.find((h) => h.date === dateString);
      if (holiday) {
        isAvailable = false;
        reason = holiday.name || 'عطلة رسمية';
      }
    }

    dates.push({
      dateString,
      dayNameAr: i === 0 ? 'اليوم' : i === 1 ? 'غداً' : arabicDays[dayIndex],
      dayNameEn: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : englishDays[dayIndex],
      formattedDateAr: `${d.getDate()} ${arabicMonths[d.getMonth()]}`,
      formattedDateEn: `${englishMonths[d.getMonth()]} ${d.getDate()}`,
      isToday,
      isAvailable,
      reason,
    });
  }

  return dates;
}

/**
 * Checks if two time strings represent the exact same time of day.
 * Robust against leading zeros, 12h/24h, and language suffixes (e.g. "09:00 AM", "9:00 AM", "09:00").
 */
export function isSameTime(timeA?: string, timeB?: string): boolean {
  if (!timeA || !timeB) return false;
  const tA = timeA.trim().toUpperCase();
  const tB = timeB.trim().toUpperCase();
  if (tA === tB) return true;

  const toMinutes = (str: string): number => {
    const isPM = str.includes('PM') || str.includes('مساء');
    const isAM = str.includes('AM') || str.includes('صباح');
    const clean = str.replace(/[^0-9:]/g, '').trim();
    const [hStr, mStr] = clean.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + (isNaN(m) ? 0 : m);
  };

  const minA = toMinutes(tA);
  const minB = toMinutes(tB);
  return minA === minB && minA >= 0;
}

/**
 * Checks if an order belongs to the same service by ID or title.
 */
export function isSameService(
  order: Order,
  targetServiceId?: string,
  targetServiceTitle?: string
): boolean {
  if (!targetServiceId && !targetServiceTitle) return false;

  // 1. By ID match
  if (targetServiceId) {
    if (order.serviceId && order.serviceId === targetServiceId) return true;
    if (order.service?.id && order.service.id === targetServiceId) return true;
    if ((order as any)?.serviceSnapshot?.id && (order as any).serviceSnapshot.id === targetServiceId) return true;
  }

  // 2. By Title match
  if (targetServiceTitle) {
    const orderTitle = order.service?.title || (order as any)?.serviceSnapshot?.title;
    if (orderTitle && orderTitle.trim().toLowerCase() === targetServiceTitle.trim().toLowerCase()) {
      return true;
    }
  }

  return false;
}

export function getTimeSlotsForDate(
  dateString: string,
  settings?: Partial<BookingSettings>,
  serviceId?: string,
  serviceTitle?: string,
  existingOrders?: Order[]
): BookingSlot[] {
  const isBlocked = (settings?.blockedDates || []).includes(dateString);
  const holiday = (settings?.holidays || []).find((h) => h.date === dateString);

  if (isBlocked) {
    return [];
  }
  if (holiday) {
    return [];
  }

  const startStr = settings?.workingHoursStart || '09:00';
  const endStr = settings?.workingHoursEnd || '22:00';
  const interval = Number(settings?.slotInterval) || 60;
  const buffer = Number(settings?.bufferTime) || 15;

  const startMin = timeStringToMinutes(startStr);
  const endMin = timeStringToMinutes(endStr);

  const slots: BookingSlot[] = [];

  for (let m = startMin; m + buffer <= endMin; m += interval) {
    const { time12Ar, time12En } = minutesToDisplayTime(m);
    slots.push({
      time: time12En,
      label: time12Ar,
      labelEn: time12En,
      isAvailable: true,
    });
  }

  // Fallback defaults if generation produced no slots due to invalid boundaries
  if (slots.length === 0) {
    slots.push(
      { time: '09:00 AM', label: '09:00 صباحاً', labelEn: '09:00 AM', isAvailable: true },
      { time: '11:00 AM', label: '11:00 صباحاً', labelEn: '11:00 AM', isAvailable: true },
      { time: '01:00 PM', label: '01:00 ظهراً', labelEn: '01:00 PM', isAvailable: true },
      { time: '03:00 PM', label: '03:00 عصراً', labelEn: '03:00 PM', isAvailable: true },
      { time: '05:00 PM', label: '05:00 مساءً', labelEn: '05:00 PM', isAvailable: true },
      { time: '07:00 PM', label: '07:00 مساءً', labelEn: '07:00 PM', isAvailable: true },
      { time: '09:00 PM', label: '09:00 مساءً', labelEn: '09:00 PM', isAvailable: true }
    );
  }

  // Enforce Per-Service Availability Rule:
  // If an active order exists for the SAME service on this date and time, mark the slot as booked/unavailable!
  if (existingOrders && existingOrders.length > 0 && (serviceId || serviceTitle)) {
    for (const slot of slots) {
      const isBooked = existingOrders.some((o) => {
        if (o.status === 'cancelled') return false;
        if (o.date !== dateString) return false;
        if (!isSameService(o, serviceId, serviceTitle)) return false;
        return isSameTime(o.time, slot.time);
      });

      if (isBooked) {
        slot.isAvailable = false;
        slot.reason = 'محجوز';
      }
    }
  }

  return slots;
}
