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

  const timePart = clean.replace(/(AM|PM|مساءً|صباحاً|مساء|صباح|ظهراً|عصراً|[صم])/gi, '').trim();
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
 * Snaps a time in minutes to the next clean 15-minute boundary.
 * Examples: 607 (10:07) -> 615 (10:15), 540 (9:00) -> 540, 541 -> 555 (9:15)
 * This ensures all displayed/accepted times are :00, :15, :30, or :45.
 */
export function snapTo15Minutes(minutes: number): number {
  return Math.ceil(minutes / 15) * 15;
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
    defaultTravelTime: b.bufferTime !== undefined ? Number(b.bufferTime) : 0,
    bufferTime: b.bufferTime !== undefined ? Number(b.bufferTime) : 0,
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
 * Formula: totalOccupiedMinutes = serviceDurationMinutes (travel time is NOT added)
 * Travel time is preserved as metadata but does NOT inflate the slot duration.
 * NO roundings to 30 or 60 minutes - minute-level precision is strictly preserved.
 */
export async function resolveServiceTiming(
  serviceId?: string,
  customDuration?: number,
  fallbackTravel = 0
): Promise<{ serviceDurationMinutes: number; travelTimeMinutes: number; totalOccupiedMinutes: number }> {
  if (serviceId) {
    const service = await Service.findOne({ id: serviceId });
    if (service) {
      const travelTimeMinutes =
        service.travelTimeMinutes !== undefined && service.travelTimeMinutes !== null
          ? Number(service.travelTimeMinutes)
          : fallbackTravel;

      const baseServiceDuration = service.serviceDurationMinutes || service.duration || 45;

      const serviceDurationMinutes =
        customDuration !== undefined && customDuration !== null && customDuration > 0
          ? customDuration
          : baseServiceDuration;

      // totalOccupiedMinutes = serviceDurationMinutes ONLY (no travel time inflation)
      const totalOccupiedMinutes = serviceDurationMinutes;

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
    totalOccupiedMinutes: duration,
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
 * Extracts all service IDs associated with a booking or visit (primary + multi-service snapshots/metadata).
 */
export function getBookingServiceIds(b: any): string[] {
  const ids = new Set<string>();
  if (b.serviceId) ids.add(String(b.serviceId));
  if (b.service?.id) ids.add(String(b.service.id));
  if (b.serviceSnapshot?.id) ids.add(String(b.serviceSnapshot.id));

  // Multi-service items in metadata
  if (Array.isArray(b.metadata?.services)) {
    for (const s of b.metadata.services) {
      if (s.serviceId) ids.add(String(s.serviceId));
      if (s.id) ids.add(String(s.id));
    }
  }
  if (Array.isArray(b.metadata?.serviceIds)) {
    for (const id of b.metadata.serviceIds) {
      if (id) ids.add(String(id));
    }
  }

  // Multi-service items in serviceSnapshot
  if (Array.isArray(b.serviceSnapshot?.services)) {
    for (const s of b.serviceSnapshot.services) {
      if (s.serviceId) ids.add(String(s.serviceId));
      if (s.id) ids.add(String(s.id));
    }
  }

  return Array.from(ids);
}

export function normalizeCategory(cat?: string | null): string {
  if (!cat) return '';
  const raw = String(cat).trim().toLowerCase();
  if (raw === 'car' || raw === 'cars' || raw.includes('car') || raw.includes('سيار')) return 'car';
  if (
    raw === 'home' ||
    raw === 'homes' ||
    raw.includes('home') ||
    raw.includes('منزل') ||
    raw.includes('منازل') ||
    raw.includes('سجاد') ||
    raw === 'cat-mv2fyqvp'
  ) return 'home';
  return raw;
}

/**
 * Resolves the primary service category ('car' | 'home') for category-based scheduling.
 * Prioritizes service's own database definition over generic query parameter.
 */
export async function resolveTargetCategory(
  category?: string,
  serviceId?: string,
  serviceIds?: string[]
): Promise<string | undefined> {
  if (serviceId) {
    const s = await Service.findOne({ id: serviceId });
    if (s?.category) return normalizeCategory(s.category);
  }
  if (Array.isArray(serviceIds) && serviceIds.length > 0) {
    for (const sId of serviceIds) {
      if (sId) {
        const s = await Service.findOne({ id: sId });
        if (s?.category) return normalizeCategory(s.category);
      }
    }
  }
  if (category && category !== 'all' && typeof category === 'string' && category.trim()) {
    const norm = normalizeCategory(category.trim());
    if (norm) return norm;
  }
  return undefined;
}

/**
 * Extracts category from a booking or visit record.
 */
export function getRecordCategory(record: any): string | undefined {
  if (!record) return undefined;
  if (record.category && record.category !== 'all') return normalizeCategory(record.category);
  if (record.serviceSnapshot?.category) return normalizeCategory(record.serviceSnapshot.category);
  if (record.service?.category) return normalizeCategory(record.service.category);
  if (Array.isArray(record.metadata?.services) && record.metadata.services[0]?.category) {
    return normalizeCategory(record.metadata.services[0].category);
  }
  return undefined;
}

/**
 * Availability Engine (Category-Based Centralized Dynamic Scheduling)
 * Core Principles:
 * 1. Unified Schedule per Category: All services in the same category ('car' | 'home') share ONE schedule.
 * 2. Complete Category Independence: Bookings in 'car' do NOT block 'home', and vice versa.
 * 3. Exact Interval Matching: existingStart < requestedEnd && existingEnd > requestedStart.
 * 4. Boundary Awareness: Previous booking boundaries (e.g. 9:45 end) are available start times.
 * 5. Dynamic Duration: Exact service duration + sum of addons duration.
 */
export async function getAvailableSlots(
  dateStr: string,
  serviceId?: string,
  customDuration?: number,
  serviceIds?: string[],
  excludeBookingId?: string,
  category?: string
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

  // 4. Resolve target category for unified scheduling
  const targetCategory = await resolveTargetCategory(category, serviceId, serviceIds);

  // 5. Fetch all bookings on this date
  const allBookings = await Booking.find({ date: dateStr }).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration serviceDurationMinutes travelTimeMinutes totalOccupiedMinutes cancelledAt timeline assignedTechnicianId serviceId serviceSnapshot category metadata'
  );

  const requestedServiceIds = Array.isArray(serviceIds) && serviceIds.length > 0
    ? serviceIds.filter(Boolean)
    : serviceId ? [serviceId] : [];

  // Build occupied intervals for this category
  interface DetailedInterval {
    start: number;
    end: number;
    type: 'break' | 'booking' | 'elapsed';
    reason: string;
  }
  const occupiedIntervals: DetailedInterval[] = [];

  for (const b of allBookings) {
    if (excludeBookingId && (b.id === excludeBookingId || String(b._id) === excludeBookingId)) {
      continue;
    }

    // Category-Based Scheduling Filter:
    // All services within targetCategory share the same schedule.
    // Services in other categories have an independent schedule and do NOT block this category.
    if (targetCategory) {
      let bCat = getRecordCategory(b);
      if (!bCat && b.serviceId && typeof b.serviceId === 'string') {
        const s = await Service.findOne({ id: b.serviceId });
        if (s?.category) bCat = normalizeCategory(s.category);
      }
      if (!bCat || bCat !== targetCategory) {
        continue; // Different or non-matching category -> independent schedule, DO NOT BLOCK!
      }
    } else if (requestedServiceIds.length > 0) {
      const bServices = getBookingServiceIds(b);
      const matches = requestedServiceIds.some((sId) => bServices.includes(sId));
      if (!matches) {
        continue;
      }
    }

    const bStart = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
    // Use service duration only - do NOT add travel time to occupied interval
    const bDuration = b.serviceDurationMinutes || b.duration || 45;
    const bEnd = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : bStart + bDuration;

    if (b.status !== 'cancelled') {
      // Active booking: occupies [bStart, bEnd]
      occupiedIntervals.push({ start: bStart, end: bEnd, type: 'booking', reason: 'محجوز بالكامل' });
    } else {
      // Cancelled booking safety rules:
      const wasStarted = Array.isArray(b.timeline) && b.timeline.some((e: any) => e.status === 'in_progress');
      if (wasStarted) {
        // Service execution was already in progress: elapsed time cannot be reopened
        occupiedIntervals.push({ start: bStart, end: bEnd, type: 'booking', reason: 'محجوز بالكامل' });
      } else if (b.cancelledAt) {
        const cancelDateStr = getCairoDateFromDate(new Date(b.cancelledAt));
        if (isToday || cancelDateStr === dateStr) {
          const cancelTimeStr = getCairoTimeFromDate(new Date(b.cancelledAt));
          const cancelMin = timeStringToMinutes(cancelTimeStr);
          if (cancelMin > bStart && cancelMin < bEnd) {
            occupiedIntervals.push({ start: bStart, end: cancelMin, type: 'elapsed', reason: 'وقت منقضي' });
          }
        }
      }
    }
  }

  // 5.1 Fetch all confirmed/active subscription visits on this date
  const allVisits = await SubscriptionVisit.find({ date: dateStr }).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration serviceDurationMinutes travelTimeMinutes totalOccupiedMinutes cancelledAt timeline assignedTechnicianId serviceId serviceSnapshot category metadata'
  );

  for (const v of allVisits) {
    if (targetCategory) {
      let vCat = getRecordCategory(v);
      if (!vCat && v.serviceId && typeof v.serviceId === 'string') {
        const s = await Service.findOne({ id: v.serviceId });
        if (s?.category) vCat = normalizeCategory(s.category);
      }
      if (!vCat || vCat !== targetCategory) {
        continue;
      }
    } else if (requestedServiceIds.length > 0) {
      const vServices = getBookingServiceIds(v);
      const matches = requestedServiceIds.some((sId) => vServices.includes(sId));
      if (!matches) {
        continue;
      }
    }

    const vStart = timeStringToMinutes(v.scheduledStart || v.timeSlotStart || v.time);
    // Use service duration only - do NOT add travel time to occupied interval
    const vDuration = v.serviceDurationMinutes || v.duration || 45;
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

  // Compute Disjoint Free Blocks within working window
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

  // 6. Dynamic Sequential Continuous Slot Generation (15-Minute Clean Grid)
  // - All slot start times are snapped to clean 15-minute boundaries (:00, :15, :30, :45).
  // - Each free block is partitioned sequentially by timing.totalOccupiedMinutes,
  //   but each next slot snaps to the nearest 15-min boundary at or after the previous slot's end.
  // - Bookings or breaks (occupied intervals) are included and marked unavailable.
  const requiredDuration = timing.totalOccupiedMinutes;
  const candidateStarts = new Set<number>();

  // A. Generate sequential slots within each free block (snapped to 15-min grid)
  for (const block of freeBlocks) {
    // Snap the free block start to the next clean 15-min boundary
    let slotCursor = snapTo15Minutes(block.start);
    while (slotCursor + requiredDuration <= block.end) {
      candidateStarts.add(slotCursor);
      // Next slot starts at the next 15-min boundary at or after current slot ends
      const rawNext = slotCursor + requiredDuration;
      slotCursor = snapTo15Minutes(rawNext);
    }

    // For today: if prior sequential slots in this free block have already elapsed,
    // also generate slots starting from the next clean 15-min boundary after earliestAllowedMinutes
    if (isToday && earliestAllowedMinutes > block.start && earliestAllowedMinutes < block.end) {
      const alignedTodayStart = snapTo15Minutes(earliestAllowedMinutes);
      let todayCursor = alignedTodayStart;
      while (todayCursor >= block.start && todayCursor + requiredDuration <= block.end) {
        candidateStarts.add(todayCursor);
        const rawNext = todayCursor + requiredDuration;
        todayCursor = snapTo15Minutes(rawNext);
      }
    }
  }

  // B. Include active booking and break intervals so they are retained and marked unavailable
  for (const occ of mergedOccupied) {
    if (occ.type === 'booking' || occ.type === 'break') {
      candidateStarts.add(snapTo15Minutes(occ.start));
    }
  }

  const sortedStarts = Array.from(candidateStarts).sort((a, b) => a - b);
  const slots: TimeSlotOption[] = [];

  for (const slotStart of sortedStarts) {
    // Strict 15-minute grid check: start must be multiple of 15 (:00, :15, :30, :45)
    if (slotStart % 15 !== 0) {
      continue;
    }

    const slotEnd = slotStart + requiredDuration;

    // Check service completion before end of working hours (allow 1440 for 23:59 end-of-day)
    const completionLimit = workEndMin === 1439 ? 1440 : workEndMin;
    if (slotStart + timing.serviceDurationMinutes > completionLimit) {
      continue;
    }

    // Past time filtering for today
    if (isToday && slotStart < earliestAllowedMinutes) {
      continue;
    }

    // Check break time overlap
    let isBreakConflict = false;
    let breakReason: string | undefined;
    if (settings.breakStart && settings.breakEnd) {
      const bStart = timeStringToMinutes(settings.breakStart);
      const bEnd = timeStringToMinutes(settings.breakEnd);
      if (doIntervalsOverlap(slotStart, slotEnd, bStart, bEnd)) {
        isBreakConflict = true;
        breakReason = 'استراحة عمل';
      }
    }

    // Check collision against occupied intervals in this category
    // Overlap condition: slotStart < occ.end && slotEnd > occ.start
    const collidingOcc = mergedOccupied.find((occ) => doIntervalsOverlap(slotStart, slotEnd, occ.start, occ.end));

    const isAvailable = !isBreakConflict && !collidingOcc;
    const reason = isBreakConflict ? breakReason : collidingOcc ? (collidingOcc.reason || 'محجوز بالكامل') : undefined;

    const { time24: start24 } = minutesToDisplayTime(slotStart);
    const { time24: end24 } = minutesToDisplayTime(Math.min(workEndMin, slotEnd));
    const intervalLabel = `${start24} – ${end24}`;

    slots.push({
      time: intervalLabel,
      time24: start24,
      label: intervalLabel,
      labelEn: intervalLabel,
      start: start24,
      end: end24,
      available: isAvailable,
      reason,
      serviceDurationMinutes: timing.serviceDurationMinutes,
      travelTimeMinutes: timing.travelTimeMinutes,
      totalOccupiedMinutes: timing.totalOccupiedMinutes,
      scheduledStart: start24,
      scheduledEnd: end24,
    });
  }

  // Deduplicate and sort all slots chronologically
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
 * Checks boundary against working hours and validates zero collision with existing active bookings in the category.
 * Throws 409 Conflict if overlap detected.
 */
export async function assertSlotAvailability(params: {
  dateStr: string;
  timeStr: string;
  serviceId?: string;
  serviceIds?: string[];
  category?: string;
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
  const { dateStr, timeStr, serviceId, serviceIds, category, customDuration, excludeBookingId, excludeVisitId, technicianId } = params;

  const targetCategory = await resolveTargetCategory(category, serviceId, serviceIds);

  if (serviceId) {
    const srv = await Service.findOne({ id: serviceId });
    if (!srv || srv.active === false || srv.available === false || srv.isArchived === true) {
      throw new Error('الخدمة المطلوبة غير متاحة حالياً');
    }
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

  // Snap the requested time to the nearest clean 15-minute boundary
  const rawStartMin = timeStringToMinutes(timeStr);
  const slotStartMin = snapTo15Minutes(rawStartMin);
  const slotEndMin = slotStartMin + timing.totalOccupiedMinutes;

  const workStartMin = timeStringToMinutes(settings.workingHoursStart);
  const workEndMin = timeStringToMinutes(settings.workingHoursEnd);

  // 2. Working Hours & Day Boundary Check (allow 1440 for 23:59 end-of-day)
  const completionLimit = workEndMin === 1439 ? 1440 : workEndMin;
  if (slotStartMin < workStartMin || (slotStartMin + timing.serviceDurationMinutes) > completionLimit) {
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
      throw new Error(
        settings.minNoticeHours > 0
          ? `لا يمكن الحجز قبل مضي الحد الأدنى للإشعار المسبق (${settings.minNoticeHours} ساعة)`
          : 'لا يمكن حجز موعد في وقت قد مضى'
      );
    }
  }

  // 5. Query active bookings on that date (Category-Based Collision Validation)
  const query: any = { date: dateStr };
  if (excludeBookingId) {
    query.id = { $ne: excludeBookingId };
  }

  const existingBookings = await Booking.find(query).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration totalOccupiedMinutes travelTimeMinutes serviceId serviceSnapshot category assignedTechnicianId cancelledAt timeline metadata'
  );

  const targetServiceIds = Array.isArray(serviceIds) && serviceIds.length > 0
    ? serviceIds.filter(Boolean)
    : serviceId ? [serviceId] : [];

  for (const b of existingBookings) {
    if (technicianId && b.assignedTechnicianId && b.assignedTechnicianId !== technicianId) {
      continue;
    }

    // Technician Conflict Check: A single technician cannot be in two places at once,
    // regardless of whether services are in different categories.
    const isSameTechnician = Boolean(technicianId && b.assignedTechnicianId && b.assignedTechnicianId === technicianId);

    if (!isSameTechnician) {
      // Category-Based Collision Check:
      // Only bookings belonging to the same category block this appointment.
      if (targetCategory) {
        let bCat = getRecordCategory(b);
        if (!bCat && b.serviceId && typeof b.serviceId === 'string') {
          const s = await Service.findOne({ id: b.serviceId });
          if (s?.category) bCat = normalizeCategory(s.category);
        }
        if (!bCat || bCat !== targetCategory) {
          continue; // Different category -> independent schedule!
        }
      } else if (targetServiceIds.length > 0) {
        const bServices = getBookingServiceIds(b);
        const serviceMatch = targetServiceIds.some((sId) => bServices.includes(sId));
        if (!serviceMatch) {
          continue;
        }
      }
    }

    const bStart = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
    // Use service duration only - do NOT add travel time to occupied interval
    const bDuration = b.serviceDurationMinutes || b.duration || 45;
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

  // 6. Query active subscription visits on that date (Category-Based Collision Validation)
  const subVisitQuery: any = { date: dateStr };
  if (excludeVisitId) {
    subVisitQuery.id = { $ne: excludeVisitId };
  }

  const existingVisits = await SubscriptionVisit.find(subVisitQuery).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration totalOccupiedMinutes travelTimeMinutes serviceId serviceSnapshot category assignedTechnicianId cancelledAt timeline metadata'
  );

  for (const v of existingVisits) {
    if (technicianId && v.assignedTechnicianId && v.assignedTechnicianId !== technicianId) {
      continue;
    }

    const isSameTechnician = Boolean(technicianId && v.assignedTechnicianId && v.assignedTechnicianId === technicianId);

    if (!isSameTechnician) {
      if (targetCategory) {
        const vCat = getRecordCategory(v);
        if (vCat && vCat !== targetCategory) {
          continue;
        }
      } else if (targetServiceIds.length > 0) {
        const vServices = getBookingServiceIds(v);
        const serviceMatch = targetServiceIds.some((sId) => vServices.includes(sId));
        if (!serviceMatch) {
          continue;
        }
      }
    }

    const vStart = timeStringToMinutes(v.scheduledStart || v.timeSlotStart || v.time);
    // Use service duration only - do NOT add travel time to occupied interval
    const vDuration = v.serviceDurationMinutes || v.duration || 45;
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
 * Dynamic Schedule Cancellation Release Handler.
 * When a booking is cancelled, its interval is released for future bookings in the category.
 * Strict Constraint: Confirmed bookings of other customers are NEVER shifted automatically.
 */
export async function compressScheduleAfterCancellation(
  cancelledBooking: IBooking,
  cancellationTimeStr?: string,
  changedBy = 'system'
): Promise<Array<{ orderId: string; previousStart: string; newStart: string }>> {
  // Release slot without automatically moving or modifying other customers' confirmed appointments
  return [];
}
