import { Booking, IBooking } from '../models/Booking.js';
import { SubscriptionVisit } from '../models/SubscriptionVisit.js';
import { Service } from '../models/Service.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { AuditLog } from '../models/AuditLog.js';

export interface TimeSlotOption {
  time: string; // e.g. "13:00 – 13:30"
  time24: string; // e.g. "13:00"
  label: string; // e.g. "13:00 – 13:30"
  labelEn: string; // e.g. "13:00 – 13:30"
  start: string; // "13:00"
  end: string; // "13:30"
  available: boolean;
  reason?: string;
  serviceDurationMinutes?: number;
  travelTimeMinutes?: number;
  totalOccupiedMinutes?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
}

/**
 * Returns current time string in Africa/Cairo timezone ("HH:mm")
 */
export function getCurrentCairoTimeString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
}

/**
 * Returns current date string in Africa/Cairo timezone ("YYYY-MM-DD")
 */
export function getCurrentCairoDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Returns time string in Africa/Cairo timezone ("HH:mm") for a given Date
 */
export function getCairoTimeFromDate(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  } catch {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}

/**
 * Returns date string in Africa/Cairo timezone ("YYYY-MM-DD") for a given Date
 */
export function getCairoDateFromDate(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Converts "13:00", "13:00 – 13:30", "10:00 AM", "02:30 PM" to minutes from midnight (0..1439).
 * If a range is provided (e.g. "13:00 – 13:30"), extracts the start time.
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const raw = String(timeStr).trim();
  // If it's a range like "13:00 – 13:30" or "13:00 - 13:30", extract the start portion
  const firstPart = raw.split(/[-–—]/)[0].trim();

  const clean = firstPart.toUpperCase();
  const isPM = clean.includes('PM') || clean.includes('مساء');
  const isAM = clean.includes('AM') || clean.includes('صباح');

  const timePart = clean.replace(/(AM|PM|مساءً|صباحاً|مساء|صباح)/g, '').trim();
  const [hourStr, minuteStr] = timePart.split(':');
  let hours = parseInt(hourStr || '0', 10);
  const minutes = parseInt(minuteStr || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
}

/**
 * Converts minutes from midnight back to 12-hour and 24-hour formats
 */
export function minutesToDisplayTime(totalMinutes: number): {
  time12: string;
  time24: string;
  time12Ar: string;
  time12En: string;
} {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  const hours24Str = hours.toString().padStart(2, '0');
  const minsStr = mins.toString().padStart(2, '0');
  const time24 = `${hours24Str}:${minsStr}`;

  const periodEn = hours >= 12 ? 'PM' : 'AM';
  const periodAr = hours >= 12 ? (hours >= 17 ? 'مساءً' : 'ظهراً') : 'صباحاً';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const hours12Str = hours12.toString();

  const time12 = `${hours12Str}:${minsStr} ${periodEn}`;
  const time12Ar = `${hours12Str}:${minsStr} ${periodAr}`;
  const time12En = `${hours12Str}:${minsStr} ${periodEn}`;

  return { time12, time24, time12Ar, time12En };
}

/**
 * Checks if two intervals [startA, endA) and [startB, endB) overlap.
 * Overlap Rule: newStart < existingEnd && newEnd > existingStart
 */
export function doIntervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Gets default booking settings from database or fallback configuration
 */
export async function getEffectiveBookingSettings() {
  const settingsDoc = await SystemSettings.findOne({ key: 'global_settings' });
  const b = (settingsDoc?.booking as any) || {};

  return {
    workingDays: Array.isArray(b.workingDays) && b.workingDays.length > 0 ? b.workingDays : [0, 1, 2, 3, 4, 5, 6],
    workingHoursStart: b.workingHoursStart || '09:00',
    workingHoursEnd: b.workingHoursEnd || '22:00',
    breakStart: b.breakStart,
    breakEnd: b.breakEnd,
    slotInterval: Number(b.slotInterval) || 60,
    slotDuration: Number(b.slotDuration) || 60,
    defaultTravelTime: b.bufferTime !== undefined ? Number(b.bufferTime) : 15,
    bufferTime: b.bufferTime !== undefined ? Number(b.bufferTime) : 15,
    maxBookingsPerSlot: Number(b.maxBookingsPerSlot) || 1,
    advanceBookingDays: Number(b.advanceBookingDays) || 14,
    minNoticeHours: Number(b.minNoticeHours) || 0,
    sameDayBooking: b.sameDayBooking !== undefined ? Boolean(b.sameDayBooking) : true,
    blockedDates: Array.isArray(b.blockedDates) ? b.blockedDates : [],
    holidays: Array.isArray(b.holidays) ? b.holidays : [],
  };
}

/**
 * Resolves the service's duration, travel time, and total occupancy.
 * Formula: totalOccupiedMinutes = serviceDurationMinutes + travelTimeMinutes
 * NO roundings to 30 or 60 minutes - minute-level precision is strictly preserved.
 */
export async function resolveServiceTiming(
  serviceId?: string,
  customDuration?: number,
  fallbackTravel = 15
): Promise<{ serviceDurationMinutes: number; travelTimeMinutes: number; totalOccupiedMinutes: number }> {
  if (serviceId) {
    const service = await Service.findOne({ id: serviceId });
    if (service) {
      const serviceDurationMinutes =
        customDuration !== undefined && customDuration !== null && customDuration > 0
          ? customDuration
          : service.serviceDurationMinutes || service.duration || 45;
      const travelTimeMinutes =
        service.travelTimeMinutes !== undefined ? service.travelTimeMinutes : fallbackTravel;
      const totalOccupiedMinutes = serviceDurationMinutes + travelTimeMinutes;

      return {
        serviceDurationMinutes,
        travelTimeMinutes,
        totalOccupiedMinutes,
      };
    }
  }

  const duration = customDuration !== undefined && customDuration > 0 ? customDuration : 45;
  return {
    serviceDurationMinutes: duration,
    travelTimeMinutes: fallbackTravel,
    totalOccupiedMinutes: duration + fallbackTravel,
  };
}

/**
 * In-memory concurrency lock to serialize simultaneous booking submissions per (date, serviceId)
 */
const bookingResourceLocks = new Map<string, Promise<void>>();

export async function withBookingLock<T>(lockKey: string, task: () => Promise<T>): Promise<T> {
  while (bookingResourceLocks.has(lockKey)) {
    await bookingResourceLocks.get(lockKey);
  }

  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  bookingResourceLocks.set(lockKey, lockPromise);

  try {
    return await task();
  } finally {
    bookingResourceLocks.delete(lockKey);
    releaseLock!();
  }
}

/**
 * Availability Engine (Model A: Dynamic Continuous Sequential Scheduling)
 * Generates continuous sequential appointments:
 * - Next appointment starts exactly when previous ends.
 * - Total duration = serviceDuration + travelDuration.
 * - Active bookings block their exact occupied intervals.
 * - Cancelled bookings release future remaining time.
 * - In-progress and completed bookings cannot release time.
 */
export async function getAvailableSlots(
  dateStr: string,
  serviceId?: string,
  customDuration?: number
): Promise<{
  date: string;
  isDayAvailable: boolean;
  dayReason?: string;
  serviceTiming: { serviceDurationMinutes: number; travelTimeMinutes: number; totalOccupiedMinutes: number };
  slots: TimeSlotOption[];
}> {
  const settings = await getEffectiveBookingSettings();
  const timing = await resolveServiceTiming(serviceId, customDuration, settings.defaultTravelTime);

  // If service is specified, check if service exists and is active
  if (serviceId) {
    const srv = await Service.findOne({ id: serviceId });
    if (!srv || srv.active === false || srv.available === false || srv.isArchived === true) {
      return {
        date: dateStr,
        isDayAvailable: false,
        dayReason: 'الخدمة المطلوبة غير متاحة حالياً للحجز',
        serviceTiming: timing,
        slots: [],
      };
    }
  }

  // 1. Check if date is in blocked dates or holidays
  if (settings.blockedDates.includes(dateStr)) {
    return {
      date: dateStr,
      isDayAvailable: false,
      dayReason: 'هذا اليوم مغلق بالكامل وغير متاح للحجز',
      serviceTiming: timing,
      slots: [],
    };
  }

  const holiday = settings.holidays.find((h: any) => h.date === dateStr);
  if (holiday) {
    return {
      date: dateStr,
      isDayAvailable: false,
      dayReason: `عطلة رسمية: ${holiday.name}`,
      serviceTiming: timing,
      slots: [],
    };
  }

  // 2. Check day of week
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay();
  if (!settings.workingDays.includes(dayOfWeek)) {
    return {
      date: dateStr,
      isDayAvailable: false,
      dayReason: 'عطلة أسبوعية خارج أيام العمل الرسمية',
      serviceTiming: timing,
      slots: [],
    };
  }

  // 3. Minimum notice check if booking is today
  const todayStr = getCurrentCairoDateString();
  const isToday = dateStr === todayStr;

  if (isToday && settings.sameDayBooking === false) {
    return {
      date: dateStr,
      isDayAvailable: false,
      dayReason: 'الحجز في نفس اليوم غير متاح وفقاً لسياسة الحجز الحالية',
      serviceTiming: timing,
      slots: [],
    };
  }

  const currentCairoTimeStr = getCurrentCairoTimeString();
  const currentMinutesNow = timeStringToMinutes(currentCairoTimeStr);
  const earliestAllowedMinutes = isToday
    ? currentMinutesNow + (settings.minNoticeHours || 0) * 60
    : 0;

  // 4. Fetch all bookings on this date for this service (or all services if not scoped)
  const bookingQuery: any = { date: dateStr };
  if (serviceId) {
    bookingQuery.serviceId = serviceId;
  }

  const allBookings = await Booking.find(bookingQuery).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration serviceDurationMinutes travelTimeMinutes totalOccupiedMinutes cancelledAt timeline assignedTechnicianId metadata'
  );

  // 5. Build occupied intervals
  // An interval is occupied if:
  // - Status is in ['pending', 'confirmed', 'assigned', 'in_progress', 'completed']
  // - OR status is 'cancelled' but service execution was already started (timeline had 'in_progress')
  // - OR status is 'cancelled' during the slot window: the elapsed portion before cancellation is occupied
  interface DetailedInterval {
    start: number;
    end: number;
    type: 'break' | 'booking' | 'elapsed';
    reason: string;
  }
  const occupiedIntervals: DetailedInterval[] = [];

  for (const b of allBookings) {
    const bStart = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
    const bDuration =
      b.totalOccupiedMinutes ||
      (b.serviceDurationMinutes ? b.serviceDurationMinutes + (b.travelTimeMinutes || 15) : (b.duration || 45) + (b.travelTimeMinutes || 15));
    const bEnd = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : bStart + bDuration;

    if (b.status !== 'cancelled') {
      // Active booking: occupies [bStart, bEnd]
      occupiedIntervals.push({ start: bStart, end: bEnd, type: 'booking', reason: 'محجوز بالكامل' });
    } else {
      // Cancelled booking safety rules:
      const wasStarted = Array.isArray(b.timeline) && b.timeline.some((e: any) => e.status === 'in_progress');
      if (wasStarted) {
        // Service execution was already in progress: elapsed/occupied time CANNOT be reopened
        occupiedIntervals.push({ start: bStart, end: bEnd, type: 'booking', reason: 'محجوز بالكامل' });
      } else if (b.cancelledAt) {
        const cancelDateStr = getCairoDateFromDate(new Date(b.cancelledAt));
        if (isToday || cancelDateStr === dateStr) {
          // If cancellation happened during the slot window:
          const cancelTimeStr = getCairoTimeFromDate(new Date(b.cancelledAt));
          const cancelMin = timeStringToMinutes(cancelTimeStr);
          if (cancelMin > bStart && cancelMin < bEnd) {
            // Time prior to cancellation is elapsed, remaining [cancelMin, bEnd] is released!
            occupiedIntervals.push({ start: bStart, end: cancelMin, type: 'elapsed', reason: 'وقت منقضي' });
          }
          // If cancelMin <= bStart, cancelled before start -> 0 minutes occupied, completely released!
        }
      }
      // If cancelled prior to start time: completely released (not added to occupiedIntervals)
    }
  }

  // 4.1 Fetch all confirmed/active subscription visits on this date
  const visitQuery: any = { date: dateStr };
  if (serviceId) {
    visitQuery.serviceId = serviceId;
  }
  const allVisits = await SubscriptionVisit.find(visitQuery).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration serviceDurationMinutes travelTimeMinutes totalOccupiedMinutes cancelledAt timeline assignedTechnicianId metadata'
  );

  for (const v of allVisits) {
    const vStart = timeStringToMinutes(v.scheduledStart || v.timeSlotStart || v.time);
    const vDuration =
      v.totalOccupiedMinutes ||
      (v.serviceDurationMinutes ? v.serviceDurationMinutes + (v.travelTimeMinutes || 15) : (v.duration || 45) + (v.travelTimeMinutes || 15));
    const vEnd = v.scheduledEnd ? timeStringToMinutes(v.scheduledEnd) : vStart + vDuration;

    if (v.status !== 'cancelled') {
      occupiedIntervals.push({ start: vStart, end: vEnd, type: 'booking', reason: 'محجوز بالكامل' });
    } else {
      const wasStarted = Array.isArray(v.timeline) && v.timeline.some((e: any) => e.status === 'in_progress');
      if (wasStarted) {
        occupiedIntervals.push({ start: vStart, end: vEnd, type: 'booking', reason: 'محجوز بالكامل' });
      } else if (v.cancelledAt) {
        const cancelDateStr = getCairoDateFromDate(new Date(v.cancelledAt));
        if (isToday || cancelDateStr === dateStr) {
          const cancelTimeStr = getCairoTimeFromDate(new Date(v.cancelledAt));
          const cancelMin = timeStringToMinutes(cancelTimeStr);
          if (cancelMin > vStart && cancelMin < vEnd) {
            occupiedIntervals.push({ start: vStart, end: cancelMin, type: 'elapsed', reason: 'وقت منقضي' });
          }
        }
      }
    }
  }

  // Add working break time as occupied interval if configured
  if (settings.breakStart && settings.breakEnd) {
    const breakStart = timeStringToMinutes(settings.breakStart);
    const breakEnd = timeStringToMinutes(settings.breakEnd);
    if (breakEnd > breakStart) {
      occupiedIntervals.push({ start: breakStart, end: breakEnd, type: 'break', reason: 'استراحة عمل' });
    }
  }

  const workStartMin = timeStringToMinutes(settings.workingHoursStart);
  const workEndMin = timeStringToMinutes(settings.workingHoursEnd);

  // Clamp and filter occupied intervals to working hours
  const validOccupied = occupiedIntervals
    .map((int) => ({
      start: Math.max(workStartMin, int.start),
      end: Math.min(workEndMin, int.end),
      type: int.type,
      reason: int.reason,
    }))
    .filter((int) => int.end > int.start)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping or abutting occupied intervals
  const mergedOccupied: DetailedInterval[] = [];
  for (const int of validOccupied) {
    if (mergedOccupied.length === 0) {
      mergedOccupied.push({ ...int });
    } else {
      const prev = mergedOccupied[mergedOccupied.length - 1];
      if (int.start <= prev.end) {
        prev.end = Math.max(prev.end, int.end);
        if (int.type === 'break' || prev.type === 'break') {
          prev.type = 'break';
          prev.reason = 'استراحة عمل';
        }
      } else {
        mergedOccupied.push({ ...int });
      }
    }
  }

  // 6. Compute Disjoint Free Blocks within working window
  const freeBlocks: { start: number; end: number }[] = [];
  let blockCursor = workStartMin;

  for (const occ of mergedOccupied) {
    if (occ.start > blockCursor) {
      freeBlocks.push({ start: blockCursor, end: occ.start });
    }
    blockCursor = Math.max(blockCursor, occ.end);
  }

  if (blockCursor < workEndMin) {
    freeBlocks.push({ start: blockCursor, end: workEndMin });
  }

  // 7. Continuous Sequential Generation (Model A)
  // Generates every slot across working hours:
  // - Free blocks produce available slots.
  // - Occupied blocks produce unavailable slots (so they are visible and not silently missing).
  const slots: TimeSlotOption[] = [];
  const requiredDuration = timing.totalOccupiedMinutes;

  // 7.1 Available slots from free blocks
  for (const block of freeBlocks) {
    let slotStart = block.start;

    while (slotStart + requiredDuration <= block.end) {
      const slotEnd = slotStart + requiredDuration;

      // Current time filtering: past slots for today must not be offered
      if (isToday && slotStart < earliestAllowedMinutes) {
        slotStart = slotEnd;
        continue;
      }

      const { time24: start24, time12En: start12En } = minutesToDisplayTime(slotStart);
      const { time24: end24, time12En: end12En } = minutesToDisplayTime(slotEnd);

      slots.push({
        time: start12En,
        time24: start24,
        label: start12En,
        labelEn: start12En,
        start: start24,
        end: end24,
        available: true,
        serviceDurationMinutes: timing.serviceDurationMinutes,
        travelTimeMinutes: timing.travelTimeMinutes,
        totalOccupiedMinutes: timing.totalOccupiedMinutes,
        scheduledStart: start24,
        scheduledEnd: end24,
      });

      slotStart = slotEnd;
    }
  }

  // 7.2 Retain occupied slots (marked unavailable instead of silently removed)
  for (const occ of mergedOccupied) {
    if (occ.type === 'elapsed') continue;

    let slotStart = occ.start;
    if (occ.end - occ.start >= requiredDuration) {
      while (slotStart + requiredDuration <= occ.end) {
        const slotEnd = slotStart + requiredDuration;

        if (isToday && slotStart < earliestAllowedMinutes) {
          slotStart = slotEnd;
          continue;
        }

        const { time24: start24, time12En: start12En } = minutesToDisplayTime(slotStart);
        const { time24: end24, time12En: end12En } = minutesToDisplayTime(slotEnd);

        slots.push({
          time: start12En,
          time24: start24,
          label: start12En,
          labelEn: start12En,
          start: start24,
          end: end24,
          available: false,
          reason: occ.reason || 'محجوز بالكامل',
          serviceDurationMinutes: timing.serviceDurationMinutes,
          travelTimeMinutes: timing.travelTimeMinutes,
          totalOccupiedMinutes: timing.totalOccupiedMinutes,
          scheduledStart: start24,
          scheduledEnd: end24,
        });

        slotStart = slotEnd;
      }
    } else {
      // Partial block that collides with slot starting at occ.start
      const slotEnd = slotStart + requiredDuration;
      if (slotEnd <= workEndMin) {
        if (!isToday || slotStart >= earliestAllowedMinutes) {
          const { time24: start24, time12En: start12En } = minutesToDisplayTime(slotStart);
          const { time24: end24, time12En: end12En } = minutesToDisplayTime(slotEnd);

          slots.push({
            time: start12En,
            time24: start24,
            label: start12En,
            labelEn: start12En,
            start: start24,
            end: end24,
            available: false,
            reason: occ.reason || 'محجوز بالكامل',
            serviceDurationMinutes: timing.serviceDurationMinutes,
            travelTimeMinutes: timing.travelTimeMinutes,
            totalOccupiedMinutes: timing.totalOccupiedMinutes,
            scheduledStart: start24,
            scheduledEnd: end24,
          });
        }
      }
    }
  }

  // 7.3 Deduplicate and sort all slots chronologically
  slots.sort((a, b) => timeStringToMinutes(a.start) - timeStringToMinutes(b.start));

  const seenTimes = new Set<string>();
  const finalSlots: TimeSlotOption[] = [];
  for (const s of slots) {
    if (!seenTimes.has(s.time)) {
      seenTimes.add(s.time);
      finalSlots.push(s);
    }
  }

  const hasAnyAvailable = finalSlots.some((s) => s.available);

  return {
    date: dateStr,
    isDayAvailable: hasAnyAvailable,
    dayReason:
      finalSlots.length === 0
        ? 'لا توجد مواعيد متاحة لهذا اليوم'
        : !hasAnyAvailable
        ? 'جميع المواعيد محجوزة بالكامل لهذا اليوم'
        : undefined,
    serviceTiming: timing,
    slots: finalSlots,
  };
}

/**
 * Strict Authority: Server-side validation before saving any booking.
 * Calculates endTime = startTime + serviceDuration + travelDuration on backend.
 * Checks boundary against working hours and validates zero collision with existing active bookings.
 * Throws 409 Conflict if overlap detected.
 */
export async function assertSlotAvailability(params: {
  dateStr: string;
  timeStr: string;
  serviceId: string;
  customDuration?: number;
  excludeBookingId?: string;
  excludeVisitId?: string;
  technicianId?: string;
}): Promise<{
  scheduledStart: string;
  scheduledEnd: string;
  serviceDurationMinutes: number;
  travelTimeMinutes: number;
  totalOccupiedMinutes: number;
}> {
  const { dateStr, timeStr, serviceId, customDuration, excludeBookingId, excludeVisitId, technicianId } = params;

  if (!serviceId) {
    throw new Error('معرف الخدمة مطلوب للتحقق من الموعد');
  }

  const srv = await Service.findOne({ id: serviceId });
  if (!srv || srv.active === false || srv.available === false || srv.isArchived === true) {
    throw new Error('الخدمة المطلوبة غير متاحة حالياً');
  }

  const settings = await getEffectiveBookingSettings();
  const timing = await resolveServiceTiming(serviceId, customDuration, settings.defaultTravelTime);

  // 1. Blocked dates, holidays, working days validation
  if (settings.blockedDates.includes(dateStr)) {
    throw new Error('هذا اليوم مغلق بالكامل ومحجوب للصيانة');
  }
  const holiday = settings.holidays.find((h: any) => h.date === dateStr);
  if (holiday) {
    throw new Error(`عطلة رسمية: ${holiday.name}`);
  }
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay();
  if (!settings.workingDays.includes(dayOfWeek)) {
    throw new Error('هذا اليوم يقع خارج أيام العمل المتاحة للحجز');
  }

  const slotStartMin = timeStringToMinutes(timeStr);
  const slotEndMin = slotStartMin + timing.totalOccupiedMinutes;

  const workStartMin = timeStringToMinutes(settings.workingHoursStart);
  const workEndMin = timeStringToMinutes(settings.workingHoursEnd);

  // 2. Working Hours & Day Boundary Check
  if (slotStartMin < workStartMin || slotEndMin > workEndMin) {
    throw new Error('الوقت المحدد يقع خارج ساعات العمل الرسمية لسيارات الخدمة');
  }

  // 3. Break time check
  if (settings.breakStart && settings.breakEnd) {
    const breakStart = timeStringToMinutes(settings.breakStart);
    const breakEnd = timeStringToMinutes(settings.breakEnd);
    if (doIntervalsOverlap(slotStartMin, slotEndMin, breakStart, breakEnd)) {
      throw new Error('الموعد يتعارض مع فترة الاستراحة الرسمية لسيارات الخدمة');
    }
  }

  // 4. Past time and same-day check if today
  const todayStr = getCurrentCairoDateString();
  const isToday = dateStr === todayStr;
  if (isToday) {
    if (settings.sameDayBooking === false) {
      throw new Error('الحجز في نفس اليوم غير متاح حسب قواعد وسياسة الحجز');
    }
    const currentCairoMin = timeStringToMinutes(getCurrentCairoTimeString());
    const minAllowed = currentCairoMin + (settings.minNoticeHours || 0) * 60;
    if (slotStartMin < minAllowed) {
      throw new Error('لا يمكن حجز موعد في وقت قد مضى');
    }
  }

  // 5. Query active bookings on that date for this service or technician
  const conflictOr: any[] = [{ serviceId }];
  if (technicianId) {
    conflictOr.push({ assignedTechnicianId: technicianId });
  }

  const query: any = {
    date: dateStr,
    $or: conflictOr,
  };
  if (excludeBookingId) {
    query.id = { $ne: excludeBookingId };
  }

  const existingBookings = await Booking.find(query).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration totalOccupiedMinutes travelTimeMinutes serviceId assignedTechnicianId cancelledAt timeline'
  );

  for (const b of existingBookings) {
    if (technicianId && b.assignedTechnicianId && b.assignedTechnicianId !== technicianId) {
      continue;
    }

    const bStart = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
    const bDuration =
      b.totalOccupiedMinutes ||
      (b.serviceDurationMinutes ? b.serviceDurationMinutes + (b.travelTimeMinutes || 15) : (b.duration || 45) + (b.travelTimeMinutes || 15));
    const bEnd = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : bStart + bDuration;

    let isOccupied = false;
    let occStart = bStart;
    let occEnd = bEnd;

    if (b.status !== 'cancelled') {
      isOccupied = true;
    } else {
      // Cancelled booking check:
      const wasStarted = Array.isArray(b.timeline) && b.timeline.some((e: any) => e.status === 'in_progress');
      if (wasStarted) {
        isOccupied = true;
      } else if (isToday && b.cancelledAt) {
        const cancelTimeStr = getCairoTimeFromDate(new Date(b.cancelledAt));
        const cancelMin = timeStringToMinutes(cancelTimeStr);
        if (cancelMin > bStart && cancelMin < bEnd) {
          isOccupied = true;
          occEnd = cancelMin;
        }
      }
    }

    if (isOccupied && doIntervalsOverlap(slotStartMin, slotEndMin, occStart, occEnd)) {
      const conflictErr: any = new Error('الموعد لم يعد متاحًا، يرجى اختيار موعد آخر.');
      conflictErr.statusCode = 409;
      conflictErr.code = 'SLOT_UNAVAILABLE';
      throw conflictErr;
    }
  }

  // 6. Query active subscription visits on that date for this service or technician
  const subVisitQuery: any = {
    date: dateStr,
    $or: conflictOr,
  };
  if (excludeVisitId) {
    subVisitQuery.id = { $ne: excludeVisitId };
  }

  const existingVisits = await SubscriptionVisit.find(subVisitQuery).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration totalOccupiedMinutes travelTimeMinutes serviceId assignedTechnicianId cancelledAt timeline'
  );

  for (const v of existingVisits) {
    if (technicianId && v.assignedTechnicianId && v.assignedTechnicianId !== technicianId) {
      continue;
    }

    const vStart = timeStringToMinutes(v.scheduledStart || v.timeSlotStart || v.time);
    const vDuration =
      v.totalOccupiedMinutes ||
      (v.serviceDurationMinutes ? v.serviceDurationMinutes + (v.travelTimeMinutes || 15) : (v.duration || 45) + (v.travelTimeMinutes || 15));
    const vEnd = v.scheduledEnd ? timeStringToMinutes(v.scheduledEnd) : vStart + vDuration;

    let isOccupied = false;
    let occStart = vStart;
    let occEnd = vEnd;

    if (v.status !== 'cancelled') {
      isOccupied = true;
    } else {
      const wasStarted = Array.isArray(v.timeline) && v.timeline.some((e: any) => e.status === 'in_progress');
      if (wasStarted) {
        isOccupied = true;
      } else if (isToday && v.cancelledAt) {
        const cancelTimeStr = getCairoTimeFromDate(new Date(v.cancelledAt));
        const cancelMin = timeStringToMinutes(cancelTimeStr);
        if (cancelMin > vStart && cancelMin < vEnd) {
          isOccupied = true;
          occEnd = cancelMin;
        }
      }
    }

    if (isOccupied && doIntervalsOverlap(slotStartMin, slotEndMin, occStart, occEnd)) {
      const conflictErr: any = new Error('الموعد لم يعد متاحًا، يرجى اختيار موعد آخر.');
      conflictErr.statusCode = 409;
      conflictErr.code = 'SLOT_UNAVAILABLE';
      throw conflictErr;
    }
  }

  const { time24: scheduledStart } = minutesToDisplayTime(slotStartMin);
  const { time24: scheduledEnd } = minutesToDisplayTime(slotEndMin);

  return {
    scheduledStart,
    scheduledEnd,
    serviceDurationMinutes: timing.serviceDurationMinutes,
    travelTimeMinutes: timing.travelTimeMinutes,
    totalOccupiedMinutes: timing.totalOccupiedMinutes,
  };
}

/**
 * Dynamic Schedule Compression Engine
 * Reclaims the unfulfilled portion of a cancelled slot and pulls subsequent bookings forward safely.
 */
export async function compressScheduleAfterCancellation(
  cancelledBooking: IBooking,
  cancellationTimeStr?: string,
  changedBy = 'system'
): Promise<Array<{ orderId: string; previousStart: string; newStart: string }>> {
  const shiftedBookings: Array<{ orderId: string; previousStart: string; newStart: string }> = [];

  try {
    const settings = await getEffectiveBookingSettings();
    const workEndMin = timeStringToMinutes(settings.workingHoursEnd);

    const scheduledStartMin = timeStringToMinutes(
      cancelledBooking.scheduledStart || cancelledBooking.timeSlotStart || cancelledBooking.time
    );
    const scheduledEndMin =
      timeStringToMinutes(cancelledBooking.scheduledEnd) ||
      scheduledStartMin + (cancelledBooking.totalOccupiedMinutes || 60);

    let effectiveFreeStartMin = scheduledStartMin;
    if (cancellationTimeStr) {
      const cancelMin = timeStringToMinutes(cancellationTimeStr);
      if (cancelMin > scheduledStartMin && cancelMin < scheduledEndMin) {
        effectiveFreeStartMin = cancelMin;
      }
    }

    const subsequentBookings = await Booking.find({
      date: cancelledBooking.date,
      serviceId: cancelledBooking.serviceId,
      status: { $in: ['pending', 'confirmed'] },
      _id: { $ne: cancelledBooking._id },
      id: { $ne: cancelledBooking.id },
    }).sort({ scheduledStart: 1, timeSlotStart: 1 });

    let currentAnchorMin = effectiveFreeStartMin;

    for (const b of subsequentBookings) {
      const bStartMin = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
      const bOccupiedMin = b.totalOccupiedMinutes || (b.duration || 45) + (b.travelTimeMinutes || 15);

      if (bStartMin <= currentAnchorMin) {
        continue;
      }

      const candidateNewStartMin = currentAnchorMin;
      const candidateNewEndMin = candidateNewStartMin + bOccupiedMin;

      if (candidateNewEndMin > workEndMin) {
        break;
      }

      const otherBookings = await Booking.find({
        date: b.date,
        serviceId: b.serviceId,
        status: { $nin: ['cancelled'] },
        _id: { $nin: [b._id, cancelledBooking._id] },
        id: { $nin: [b.id, cancelledBooking.id] },
      });

      let hasCollision = false;
      for (const ob of otherBookings) {
        const obStart = timeStringToMinutes(ob.scheduledStart || ob.timeSlotStart || ob.time);
        const obEnd = obStart + (ob.totalOccupiedMinutes || 60);
        if (doIntervalsOverlap(candidateNewStartMin, candidateNewEndMin, obStart, obEnd)) {
          hasCollision = true;
          break;
        }
      }

      if (!hasCollision) {
        const { time12: newTime12, time24: newTime24 } = minutesToDisplayTime(candidateNewStartMin);
        const { time24: newEnd24 } = minutesToDisplayTime(candidateNewEndMin);
        const previousTime = b.time;

        b.scheduledStart = newTime24;
        b.scheduledEnd = newEnd24;
        b.timeSlotStart = newTime24;
        b.time = `${newTime24} – ${newEnd24}`;
        b.rescheduledFrom = previousTime;

        b.timeline.push({
          status: b.status,
          label: 'إعادة جدولة ديناميكية',
          labelEn: 'Dynamic Rescheduling',
          timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
          completed: true,
          description: `تم تقديم موعد الحجز تلقائياً من (${previousTime}) إلى (${newTime24} – ${newEnd24}) إثر إلغاء حجز سابق.`,
          descriptionEn: `Appointment compressed earlier from ${previousTime} to ${newTime24} – ${newEnd24} due to schedule gap.`,
          changedBy,
        });

        await b.save();

        shiftedBookings.push({
          orderId: b.id,
          previousStart: previousTime,
          newStart: `${newTime24} – ${newEnd24}`,
        });

        await AuditLog.create({
          adminId: 'system-scheduler',
          adminName: changedBy,
          adminRole: 'system',
          action: 'إعادة جدولة وضغط تلقائي للمواعيد',
          module: 'bookings',
          target: b.id,
          details: `تم تقديم موعد الطلب (${b.id}) من ${previousTime} إلى ${newTime24} – ${newEnd24} بعد إلغاء الطلب (${cancelledBooking.id})`,
          metadata: {
            orderId: b.id,
            cancelledOrderId: cancelledBooking.id,
            previousStart: previousTime,
            newStart: `${newTime24} – ${newEnd24}`,
          },
        });

        currentAnchorMin = candidateNewEndMin;
      } else {
        break;
      }
    }
  } catch (err) {
    console.error('[ScheduleCompression] Error compressing schedule:', err);
  }

  return shiftedBookings;
}
