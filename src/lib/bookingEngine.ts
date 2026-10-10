import { BookingSettings, Order } from '@/types';
import { formatTimeTo12Hour, formatSingleTimeTo12Hour, formatStartTimeTo12Hour } from './timeUtils';
import { normalizeCategory } from './services/categoryUtils';

export { formatTimeTo12Hour, formatSingleTimeTo12Hour, formatStartTimeTo12Hour };

export interface BookingSlot {
  time: string;
  label: string;
  labelEn: string;
  isAvailable: boolean;
  reason?: string;
  interval?: string;
  intervalEn?: string;
  totalOccupiedMinutes?: number;
  serviceDurationMinutes?: number;
  travelTimeMinutes?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
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

  const isPM =
    clean.includes('PM') ||
    clean.includes('مساء') ||
    clean.includes('ظهراً') ||
    clean.includes('عصراً') ||
    /(?:^|\s|\d)م(?:$|\s)/.test(clean) ||
    clean.endsWith('م');

  const isAM =
    clean.includes('AM') ||
    clean.includes('صباح') ||
    /(?:^|\s|\d)ص(?:$|\s)/.test(clean) ||
    clean.endsWith('ص');

  const timePart = clean.replace(/(AM|PM|مساءً|مساء|صباحاً|صباح|ظهراً|عصراً|[صم])/gi, '').trim();
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

/**
 * Snaps a time in minutes to the next clean 15-minute boundary.
 * Examples: 607 (10:07) -> 615 (10:15), 540 (9:00) -> 540, 541 -> 555 (9:15)
 * This ensures all displayed/accepted times are :00, :15, :30, or :45.
 */
export function snapTo15Minutes(minutes: number): number {
  return Math.ceil(minutes / 15) * 15;
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
  const targetDateNorm = String(targetOrder.date || '').split('T')[0].trim();

  // 1. Check regular bookings across ALL categories (car, home, etc.)
  const regularConflict = allOrders.find((o) => {
    if (!o) return false;
    if (o.id === targetOrder.id) return false;
    if (o.status === 'cancelled' || o.status === 'CANCELLED') return false;
    const oDateNorm = String(o.date || '').split('T')[0].trim();
    if (oDateNorm !== targetDateNorm) return false;

    const assignedId =
      (typeof o.technician === 'string' ? o.technician : o.technician?.id) ||
      o.assignedTechnicianId ||
      (o.technician as any)?.technicianId;
    if (!assignedId || String(assignedId) !== String(technicianId)) return false;

    const otherInterval = getBookingTimeInterval(o);
    return isTimeIntervalOverlapping(currentInterval, otherInterval);
  });

  if (regularConflict) return regularConflict;

  // 2. Check subscription visits
  if (subscriptionVisits && subscriptionVisits.length > 0) {
    const visitConflict = subscriptionVisits.find((v) => {
      if (!v) return false;
      if (v.id === targetOrder.id) return false;
      if (v.status === 'cancelled' || v.status === 'CANCELLED') return false;
      const vDateNorm = String(v.date || '').split('T')[0].trim();
      if (vDateNorm !== targetDateNorm) return false;

      const assignedId =
        (typeof v.technician === 'string' ? v.technician : v.technician?.id) ||
        v.assignedTechnicianId ||
        (v.technician as any)?.technicianId;
      if (!assignedId || String(assignedId) !== String(technicianId)) return false;

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

  const minA = timeStringToMinutes(tA);
  const minB = timeStringToMinutes(tB);
  return minA === minB && minA >= 0;
}

/**
 * Extracts all service IDs associated with an order (primary + multi-service snapshots/metadata).
 */
export function getOrderServiceIds(order: any): string[] {
  const ids = new Set<string>();
  if (order.serviceId) ids.add(String(order.serviceId));
  if (order.service?.id) ids.add(String(order.service.id));
  if (order.serviceSnapshot?.id) ids.add(String(order.serviceSnapshot.id));

  // Multi-service items in metadata
  if (Array.isArray(order.metadata?.services)) {
    for (const s of order.metadata.services) {
      if (s.serviceId) ids.add(String(s.serviceId));
      if (s.id) ids.add(String(s.id));
    }
  }
  if (Array.isArray(order.metadata?.serviceIds)) {
    for (const id of order.metadata.serviceIds) {
      if (id) ids.add(String(id));
    }
  }

  // Multi-service items in serviceSnapshot
  if (Array.isArray(order.serviceSnapshot?.services)) {
    for (const s of order.serviceSnapshot.services) {
      if (s.serviceId) ids.add(String(s.serviceId));
      if (s.id) ids.add(String(s.id));
    }
  }

  // Frontend multi-service items
  if (Array.isArray(order.selectedServices)) {
    for (const s of order.selectedServices) {
      if (s.service?.id) ids.add(String(s.service.id));
      if (s.id) ids.add(String(s.id));
      if (s.serviceId) ids.add(String(s.serviceId));
    }
  }
  if (Array.isArray(order.services)) {
    for (const s of order.services) {
      if (s.service?.id) ids.add(String(s.service.id));
      if (s.id) ids.add(String(s.id));
      if (s.serviceId) ids.add(String(s.serviceId));
    }
  }

  return Array.from(ids);
}

/**
 * Extracts category from an order record.
 */
export function getOrderCategory(order: any): string | undefined {
  if (!order) return undefined;
  if (order.category && order.category !== 'all') {
    const norm = normalizeCategory(order.category);
    if (norm) return norm;
  }
  if (order.service?.category) {
    const norm = normalizeCategory(order.service.category);
    if (norm) return norm;
  }
  if (order.serviceSnapshot?.category) {
    const norm = normalizeCategory(order.serviceSnapshot.category);
    if (norm) return norm;
  }
  if (Array.isArray(order.selectedServices) && order.selectedServices[0]?.service?.category) {
    const norm = normalizeCategory(order.selectedServices[0].service.category);
    if (norm) return norm;
  }
  if (Array.isArray(order.metadata?.services) && order.metadata.services[0]?.category) {
    const norm = normalizeCategory(order.metadata.services[0].category);
    if (norm) return norm;
  }
  return undefined;
}

/**
 * Checks if an order belongs to the target category.
 */
export function isSameCategory(order: any, targetCategory?: string): boolean {
  if (!targetCategory || targetCategory === 'all') return true;
  const orderCat = getOrderCategory(order);
  if (!orderCat) return false;
  return normalizeCategory(orderCat) === normalizeCategory(targetCategory);
}

/**
 * Checks if an order belongs to the same service by ID or title (multi-service aware).
 */
export function isSameService(
  order: Order,
  targetServiceId?: string,
  targetServiceTitle?: string
): boolean {
  if (!targetServiceId && !targetServiceTitle) return false;

  const orderServices = getOrderServiceIds(order);

  // 1. By ID match across all services included in the order
  if (targetServiceId) {
    if (orderServices.includes(String(targetServiceId))) {
      return true;
    }
  }

  // 2. By Title match
  if (targetServiceTitle) {
    const cleanTarget = targetServiceTitle.trim().toLowerCase();
    const orderTitle = order.service?.title || (order as any)?.serviceSnapshot?.title || '';
    if (orderTitle && orderTitle.trim().toLowerCase() === cleanTarget) {
      return true;
    }
    const allTitles = [
      ...(Array.isArray((order as any).metadata?.services) ? (order as any).metadata.services.map((s: any) => s.title) : []),
      ...(Array.isArray((order as any).serviceSnapshot?.services) ? (order as any).serviceSnapshot.services.map((s: any) => s.title) : []),
      ...(Array.isArray((order as any).selectedServices) ? (order as any).selectedServices.map((s: any) => s.service?.title || s.title) : []),
    ];
    if (allTitles.some((t) => t && String(t).trim().toLowerCase() === cleanTarget)) {
      return true;
    }
  }

  return false;
}

/**
 * Dynamic Continuous Sequential Availability Generator (Category-Based)
 * TOTAL OCCUPANCY = SERVICE DURATION + TRAVEL/ARRIVAL DURATION
 * Appointments are continuous sequential intervals: Next starts exactly when previous ends.
 * Services in the SAME category share one unified schedule.
 * Different categories have completely independent schedules.
 * Boundary Awareness: Previous booking boundaries (e.g. 11:55 finish) are offered as valid start times.
 */
export function getTimeSlotsForDate(
  dateString: string,
  settings?: Partial<BookingSettings>,
  serviceId?: string,
  serviceTitle?: string,
  existingOrders?: Order[],
  serviceDuration?: number,
  travelDuration?: number,
  serviceIds?: string[],
  category?: string
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
  const travelMin = travelDuration !== undefined ? Number(travelDuration) : 0;
  const totalOccupancy = durationMin + travelMin;

  if (totalOccupancy <= 0 || startMin + durationMin > endMin) {
    return [];
  }

  const breakStartMin = settings?.breakStart ? timeStringToMinutes(settings.breakStart) : null;
  const breakEndMin = settings?.breakEnd ? timeStringToMinutes(settings.breakEnd) : null;

  // Filter today's past times in project timezone (Africa/Cairo)
  let todayStr = '';
  let currentCairoMinutes = -1;
  try {
    const formatterDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    todayStr = formatterDate.format(new Date());

    const formatterTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const [h, m] = formatterTime.format(new Date()).split(':').map(Number);
    currentCairoMinutes = h * 60 + m;
  } catch {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    todayStr = `${y}-${m}-${d}`;
    currentCairoMinutes = today.getHours() * 60 + today.getMinutes();
  }

  const isToday = dateString === todayStr;
  const minNoticeHours = typeof settings?.minNoticeHours === 'number' ? settings.minNoticeHours : 0;
  const earliestAllowedMinutes = isToday ? currentCairoMinutes + minNoticeHours * 60 : 0;

  // Normalized target category
  const targetCategory = category ? normalizeCategory(category) : undefined;

  // Filter relevant existing orders on this date in this category
  const relevantOrders = (existingOrders || []).filter((o) => {
    if (!o) return false;
    if (o.status === 'cancelled') return false;
    if (o.date !== dateString) return false;

    if (targetCategory && targetCategory !== 'all') {
      const oCat = getOrderCategory(o);
      if (!oCat || normalizeCategory(oCat) !== targetCategory) {
        return false;
      }
    } else {
      const targetIds = Array.isArray(serviceIds) && serviceIds.length > 0
        ? serviceIds.filter(Boolean)
        : serviceId ? [serviceId] : [];

      if (targetIds.length > 0) {
        const matches = targetIds.some((sId) => isSameService(o, sId, undefined));
        if (!matches) return false;
      } else if (serviceTitle) {
        if (!isSameService(o, undefined, serviceTitle)) return false;
      }
    }
    return true;
  });

  // Build occupied intervals for this category (including breaks)
  const rawOccupied: { start: number; end: number; reason: string; isBreak?: boolean }[] = [];

  if (breakStartMin !== null && breakEndMin !== null && breakEndMin > breakStartMin) {
    rawOccupied.push({
      start: breakStartMin,
      end: breakEndMin,
      reason: 'استراحة عمل',
      isBreak: true,
    });
  }

  for (const o of relevantOrders) {
    const int = getBookingTimeInterval(o);
    rawOccupied.push({
      start: int.startMin,
      end: int.endMin,
      reason: 'محجوز بالكامل',
    });
  }

  const sortedOccupied = rawOccupied
    .map((int) => ({
      start: Math.max(startMin, int.start),
      end: Math.min(endMin, int.end),
      reason: int.reason,
      isBreak: int.isBreak,
    }))
    .filter((int) => int.end > int.start)
    .sort((a, b) => a.start - b.start);

  const mergedOccupied: { start: number; end: number; reason: string; isBreak?: boolean }[] = [];
  for (const int of sortedOccupied) {
    if (mergedOccupied.length === 0) {
      mergedOccupied.push({ ...int });
    } else {
      const prev = mergedOccupied[mergedOccupied.length - 1];
      if (int.start <= prev.end) {
        prev.end = Math.max(prev.end, int.end);
        if (int.isBreak || prev.isBreak) {
          prev.isBreak = true;
          prev.reason = 'استراحة عمل';
        }
      } else {
        mergedOccupied.push({ ...int });
      }
    }
  }

  // Compute Disjoint Free Blocks within working window
  const freeBlocks: { start: number; end: number }[] = [];
  let blockCursor = startMin;

  for (const occ of mergedOccupied) {
    if (occ.start > blockCursor) {
      freeBlocks.push({ start: blockCursor, end: occ.start });
    }
    blockCursor = Math.max(blockCursor, occ.end);
  }

  if (blockCursor < endMin) {
    freeBlocks.push({ start: blockCursor, end: endMin });
  }

  // Generate sequential slots within each free block (snapped to 15-min grid)
  const candidateStarts = new Set<number>();

  for (const block of freeBlocks) {
    // Snap the free block start to the next clean 15-min boundary
    let slotCursor = snapTo15Minutes(block.start);
    while (slotCursor + totalOccupancy <= block.end) {
      candidateStarts.add(slotCursor);
      // Next slot starts at the next 15-min boundary at or after current slot ends
      const rawNext = slotCursor + totalOccupancy;
      slotCursor = snapTo15Minutes(rawNext);
    }

    // For today: if prior sequential slots in this free block have already elapsed,
    // also generate slots starting from the next clean 15-min boundary after earliestAllowedMinutes
    if (isToday && earliestAllowedMinutes > block.start && earliestAllowedMinutes < block.end) {
      const alignedTodayStart = snapTo15Minutes(earliestAllowedMinutes);
      let todayCursor = alignedTodayStart;
      while (todayCursor >= block.start && todayCursor + totalOccupancy <= block.end) {
        candidateStarts.add(todayCursor);
        const rawNext = todayCursor + totalOccupancy;
        todayCursor = snapTo15Minutes(rawNext);
      }
    }
  }

  // Include starts of occupied booking intervals so they are visible as unavailable slots
  for (const occ of mergedOccupied) {
    candidateStarts.add(snapTo15Minutes(occ.start));
  }

  const sortedStarts = Array.from(candidateStarts).sort((a, b) => a - b);
  const slots: BookingSlot[] = [];

  for (const slotStart of sortedStarts) {
    const slotEnd = slotStart + totalOccupancy;

    // Check service completion before end of working hours (allow 1440 for 23:59 end-of-day)
    const completionLimit = endMin === 1439 ? 1440 : endMin;
    if (slotStart + durationMin > completionLimit) {
      continue;
    }

    // Filter past times and enforce minimum notice for current day
    if (isToday && slotStart < earliestAllowedMinutes) {
      continue;
    }

    // Check collision against occupied intervals in this category
    const collidingOcc = mergedOccupied.find((occ) => slotStart < occ.end && slotEnd > occ.start);
    const isAvailable = !collidingOcc;
    const reason = collidingOcc ? collidingOcc.reason : undefined;

    const start24 = minutesTo24H(slotStart);
    const end24 = minutesTo24H(Math.min(endMin, slotEnd));
    const intervalLabel = `${start24} – ${end24}`;

    const time12En = formatTimeTo12Hour(intervalLabel, { locale: 'en' });
    const time12Ar = formatTimeTo12Hour(intervalLabel, { locale: 'ar' });

    slots.push({
      time: time12En,
      label: time12Ar,
      labelEn: time12En,
      isAvailable,
      reason,
      interval: intervalLabel,
      intervalEn: intervalLabel,
      totalOccupiedMinutes: totalOccupancy,
      serviceDurationMinutes: durationMin,
      travelTimeMinutes: travelMin,
      scheduledStart: start24,
      scheduledEnd: end24,
    });
  }

  return slots;
}

