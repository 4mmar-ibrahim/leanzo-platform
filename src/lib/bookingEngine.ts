import { BookingSettings, Order } from '@/types';
import { formatTimeTo12Hour, formatSingleTimeTo12Hour, formatStartTimeTo12Hour } from './timeUtils';

export { formatTimeTo12Hour, formatSingleTimeTo12Hour, formatStartTimeTo12Hour };

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

export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const raw = String(timeStr).trim();
  // If given a range or hyphenated string, extract the first segment
  const firstSegment = raw.split(/[-–—]/)[0].trim();
  const clean = firstSegment.toUpperCase();
  const isPM = clean.includes('PM') || clean.includes('مساء');
  const isAM = clean.includes('AM') || clean.includes('صباح');

  const timePart = clean.replace(/(AM|PM|مساءً|مساء|صباحاً|صباح)/g, '').trim();
  const cleanNumbers = timePart.replace(/[^0-9:]/g, '');
  const [hourStr, minuteStr] = cleanNumbers.split(':');
  let hours = parseInt(hourStr || '0', 10);
  const minutes = parseInt(minuteStr || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
}

export function minutesTo24H(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function getBookingTimeInterval(b?: {
  time?: string;
  duration?: number;
  serviceDurationMinutes?: number;
  travelTimeMinutes?: number;
  totalOccupiedMinutes?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  service?: { duration?: number };
  serviceSnapshot?: { duration?: number };
} | null): { startMin: number; endMin: number; display: string } {
  if (!b) return { startMin: 0, endMin: 60, display: '—' };

  const timeStr = String(b.time || '').trim();
  const fullDuration =
    b.totalOccupiedMinutes ||
    (b.serviceDurationMinutes ? b.serviceDurationMinutes + (b.travelTimeMinutes || 0) : undefined) ||
    b.duration ||
    b.service?.duration ||
    b.serviceSnapshot?.duration ||
    60;

  // 1. Explicit scheduledStart & scheduledEnd
  if (b.scheduledStart && b.scheduledEnd) {
    const sMin = timeStringToMinutes(b.scheduledStart);
    const eMin = timeStringToMinutes(b.scheduledEnd);
    if (sMin > 0 && eMin > sMin) {
      return {
        startMin: sMin,
        endMin: Math.max(eMin, sMin + fullDuration),
        display: timeStr || `${b.scheduledStart} – ${b.scheduledEnd}`,
      };
    }
  }

  // 2. Range strings with dash/hyphen
  if (timeStr.includes('–') || timeStr.includes('-') || timeStr.includes('—')) {
    const parts = timeStr.split(/[-–—]/).map((p) => p.trim());
    if (parts.length >= 2) {
      const min1 = timeStringToMinutes(parts[0]);
      const min2 = timeStringToMinutes(parts[1]);

      if (min1 > 0 && min2 > 0) {
        // Robust against both LTR and RTL string ordering:
        const startMin = Math.min(min1, min2);
        const endMin = Math.max(Math.max(min1, min2), startMin + fullDuration);
        return {
          startMin,
          endMin,
          display: timeStr,
        };
      } else if (min1 > 0) {
        return {
          startMin: min1,
          endMin: min1 + fullDuration,
          display: timeStr,
        };
      }
    }
  }

  // 3. Single start time
  const rawStart = b.scheduledStart || timeStr;
  const startMin = timeStringToMinutes(rawStart);
  const endMin = startMin + fullDuration;

  return {
    startMin,
    endMin,
    display: timeStr || `${Math.floor(startMin / 60).toString().padStart(2, '0')}:${(startMin % 60).toString().padStart(2, '0')}`,
  };
}

export function isTimeIntervalOverlapping(
  intA: { startMin: number; endMin: number },
  intB: { startMin: number; endMin: number }
): boolean {
  return intA.startMin < intB.endMin && intB.startMin < intA.endMin;
}

export function findConflictingOrder(
  targetOrder: any,
  technicianId: string,
  allOrders: any[] = [],
  subscriptionVisits: any[] = []
): any | undefined {
  if (!targetOrder || !technicianId) return undefined;
  const currentInterval = getBookingTimeInterval(targetOrder);

  // 1. Check regular bookings
  const regularConflict = allOrders.find((o) => {
    if (!o) return false;
    if (o.id === targetOrder.id) return false;
    if (o.status === 'cancelled') return false;
    if (o.date !== targetOrder.date) return false;

    const assignedId = o.technician?.id || o.assignedTechnicianId || (o.technician as any)?.technicianId;
    if (assignedId !== technicianId) return false;

    const otherInterval = getBookingTimeInterval(o);
    return isTimeIntervalOverlapping(currentInterval, otherInterval);
  });

  if (regularConflict) return regularConflict;

  // 2. Check subscription visits
  if (subscriptionVisits && subscriptionVisits.length > 0) {
    const visitConflict = subscriptionVisits.find((v) => {
      if (!v) return false;
      if (v.id === targetOrder.id) return false;
      if (v.status === 'cancelled') return false;
      if (v.date !== targetOrder.date) return false;

      const assignedId = v.technician?.id || v.assignedTechnicianId || (v.technician as any)?.technicianId;
      if (assignedId !== technicianId) return false;

      const otherInterval = getBookingTimeInterval(v);
      return isTimeIntervalOverlapping(currentInterval, otherInterval);
    });

    if (visitConflict) return visitConflict;
  }

  return undefined;
}

export function minutesToDisplayTime(totalMinutes: number): { time12Ar: string; time12En: string } {
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

export interface FormattedReservationSchedule {
  rawDate: string;
  formattedDateAr: string;
  formattedDateEn: string;
  dayNameAr: string;
  dayNameEn: string;
  dayName: string;
  startMinutes: number;
  endMinutes: number;
  startTime12Ar: string;
  startTime12En: string;
  endTime12Ar: string;
  endTime12En: string;
  timeRangeDisplayAr: string;
  timeRangeDisplayEn: string;
  displayTime: string;
  startTime: string;
  endTime: string;
}

export function formatReservationSchedule(order?: {
  date?: string;
  time?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  duration?: number;
  serviceDurationMinutes?: number;
  totalOccupiedMinutes?: number;
  service?: { duration?: number };
  serviceSnapshot?: { duration?: number };
} | null): FormattedReservationSchedule {
  if (!order) {
    return {
      rawDate: '',
      formattedDateAr: '—',
      formattedDateEn: '—',
      dayNameAr: '',
      dayNameEn: '',
      dayName: '',
      startMinutes: 0,
      endMinutes: 0,
      startTime12Ar: '—',
      startTime12En: '—',
      endTime12Ar: '—',
      endTime12En: '—',
      timeRangeDisplayAr: '—',
      timeRangeDisplayEn: '—',
      displayTime: '—',
      startTime: '—',
      endTime: '—',
    };
  }

  const rawDate = order.date || '';
  let formattedDateAr = rawDate;
  let formattedDateEn = rawDate;
  let dayNameAr = '';
  let dayNameEn = '';

  if (rawDate) {
    try {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) {
          dayNameAr = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' });
          dayNameEn = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
          formattedDateAr = dateObj.toLocaleDateString('ar-EG', { day: '2-digit', month: 'long', year: 'numeric' });
          formattedDateEn = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        }
      }
    } catch {
      // fallback
    }
  }

  const interval = getBookingTimeInterval(order);
  const startDisp = minutesToDisplayTime(interval.startMin);
  const endDisp = minutesToDisplayTime(interval.endMin);

  return {
    rawDate,
    formattedDateAr: formattedDateAr || rawDate || '—',
    formattedDateEn: formattedDateEn || rawDate || '—',
    dayNameAr,
    dayNameEn,
    dayName: dayNameAr || dayNameEn || '',
    startMinutes: interval.startMin,
    endMinutes: interval.endMin,
    startTime12Ar: startDisp.time12Ar,
    startTime12En: startDisp.time12En,
    endTime12Ar: endDisp.time12Ar,
    endTime12En: endDisp.time12En,
    timeRangeDisplayAr: `${startDisp.time12Ar} – ${endDisp.time12Ar}`,
    timeRangeDisplayEn: `${startDisp.time12En} – ${endDisp.time12En}`,
    displayTime: `${startDisp.time12En} – ${endDisp.time12En}`,
    startTime: startDisp.time12En,
    endTime: endDisp.time12En,
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
 * Robust against leading zeros, 12h/24h, interval ranges, and language suffixes.
 */
export function isSameTime(timeA?: string, timeB?: string): boolean {
  if (!timeA || !timeB) return false;
  const tA = timeA.trim().toUpperCase();
  const tB = timeB.trim().toUpperCase();
  if (tA === tB) return true;

  const toMinutes = (str: string): number => {
    const firstPart = str.split(/[-–—]/)[0].trim();
    const isPM = firstPart.includes('PM') || firstPart.includes('مساء');
    const isAM = firstPart.includes('AM') || firstPart.includes('صباح');
    const clean = firstPart.replace(/[^0-9:]/g, '').trim();
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

/**
 * Dynamic Continuous Sequential Availability Generator (Model A)
 * TOTAL OCCUPANCY = SERVICE DURATION + TRAVEL/ARRIVAL DURATION
 * Appointments are continuous sequential intervals: Next starts exactly when previous ends.
 * No arbitrary 30-minute or 60-minute roundings.
 */
export function getTimeSlotsForDate(
  dateString: string,
  settings?: Partial<BookingSettings>,
  serviceId?: string,
  serviceTitle?: string,
  existingOrders?: Order[],
  serviceDuration?: number,
  travelDuration?: number
): BookingSlot[] {
  const isBlocked = (settings?.blockedDates || []).includes(dateString);
  const holiday = (settings?.holidays || []).find((h) => h.date === dateString);

  if (isBlocked || holiday) {
    return [];
  }

  const startStr = settings?.workingHoursStart || '09:00';
  const endStr = settings?.workingHoursEnd || '22:00';
  const startMin = timeStringToMinutes(startStr);
  const endMin = timeStringToMinutes(endStr);

  const durationMin = serviceDuration !== undefined && serviceDuration > 0 ? serviceDuration : 45;
  const travelMin = travelDuration !== undefined ? travelDuration : (settings?.bufferTime !== undefined ? Number(settings.bufferTime) : 15);
  const totalOccupancy = durationMin + travelMin;

  if (totalOccupancy <= 0 || startMin + totalOccupancy > endMin) {
    return [];
  }

  const breakStartMin = settings?.breakStart ? timeStringToMinutes(settings.breakStart) : null;
  const breakEndMin = settings?.breakEnd ? timeStringToMinutes(settings.breakEnd) : null;

  // Filter today's past times
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  const isToday = dateString === todayStr;
  const currentMinutes = isToday ? today.getHours() * 60 + today.getMinutes() : -1;

  const slots: BookingSlot[] = [];
  let cursor = startMin;

  while (cursor + totalOccupancy <= endMin) {
    const slotStart = cursor;
    const slotEnd = cursor + totalOccupancy;

    // Check break overlap: mark slot unavailable instead of silently skipping
    const isBreak =
      breakStartMin !== null &&
      breakEndMin !== null &&
      slotStart < breakEndMin &&
      slotEnd > breakStartMin;

    const start24 = minutesTo24H(slotStart);
    const end24 = minutesTo24H(slotEnd);
    const intervalLabel = `${start24} – ${end24}`;

    // Filter past times for current day
    if (isToday && slotStart <= currentMinutes) {
      cursor += totalOccupancy;
      continue;
    }

    let isAvailable = !isBreak;
    let reason: string | undefined = isBreak ? 'استراحة عمل' : undefined;

    // Check overlap with active orders
    if (existingOrders && existingOrders.length > 0 && isAvailable) {
      const isBooked = existingOrders.some((o) => {
        if (o.status === 'cancelled') return false;
        if (o.date !== dateString) return false;
        if (serviceId || serviceTitle) {
          if (!isSameService(o, serviceId, serviceTitle)) return false;
        }
        const oStart = timeStringToMinutes(o.time);
        const oDur = (o as any).totalOccupiedMinutes || (o.duration ? o.duration + 15 : totalOccupancy);
        const oEnd = oStart + oDur;
        return slotStart < oEnd && slotEnd > oStart;
      });

      if (isBooked) {
        isAvailable = false;
        reason = 'محجوز بالكامل';
      }
    }

    const time12 = formatTimeTo12Hour(start24);
    slots.push({
      time: time12,
      label: time12,
      labelEn: time12,
      isAvailable,
      reason,
    });

    cursor += totalOccupancy;
  }

  return slots;
}
