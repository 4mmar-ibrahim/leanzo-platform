import { Booking, IBooking } from '../models/Booking.js';
import { SubscriptionVisit } from '../models/SubscriptionVisit.js';
import { Service } from '../models/Service.js';
import { ServiceCategory } from '../models/ServiceCategory.js';
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
 * Returns day-of-week index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * in Africa/Cairo timezone for a given date string ("YYYY-MM-DD") or Date.
 * Prevents UTC day-of-week shifting.
 */
export function getCairoDayOfWeek(dateInput: string | Date): number {
  try {
    let dt: Date;
    if (typeof dateInput === 'string') {
      const parts = dateInput.split('-').map(Number);
      if (parts.length === 3) {
        // Noon UTC is guaranteed to fall on the exact same calendar day in Africa/Cairo (UTC+2 / UTC+3)
        dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
      } else {
        dt = new Date(dateInput);
      }
    } else {
      dt = dateInput;
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      weekday: 'short',
    });
    const weekday = formatter.format(dt);
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return dayMap[weekday] !== undefined ? dayMap[weekday] : dt.getDay();
  } catch {
    if (typeof dateInput === 'string') {
      const parts = dateInput.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    }
    return dateInput.getDay();
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
 * Converts minutes from midnight to "HH:mm" 24-hour string.
 */
export function minutesToTimeString(totalMinutes: number): string {
  return minutesToDisplayTime(totalMinutes).time24;
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
    breakStart: b.enableBreak === true && b.breakStart && !(b.breakStart === '14:00' && b.breakEnd === '15:00') ? b.breakStart : undefined,
    breakEnd: b.enableBreak === true && b.breakEnd && !(b.breakStart === '14:00' && b.breakEnd === '15:00') ? b.breakEnd : undefined,
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
 * Formula: totalOccupiedMinutes = serviceDurationMinutes ONLY.
 * Service duration accounts for the complete scheduled appointment.
 * NO arbitrary buffer is added.
 */
export async function resolveServiceTiming(
  serviceId?: string,
  customDuration?: number,
  fallbackTravel = 0
): Promise<{ serviceDurationMinutes: number; travelTimeMinutes: number; totalOccupiedMinutes: number }> {
  if (serviceId) {
    const service = await Service.findOne({ id: serviceId });
    if (service) {
      const srvDur = Number(service.serviceDurationMinutes) || Number(service.duration) || 30;
      const srvTravel = Number(service.travelTimeMinutes) || 0;
      const totalOccupied = service.totalOccupiedMinutes || (srvDur + srvTravel);

      const effectiveOccupied =
        customDuration !== undefined && customDuration !== null && customDuration > 0
          ? customDuration
          : totalOccupied;

      // When customDuration is provided (e.g. 105 min calculated from packages/addons or composite services),
      // serviceDurationMinutes must be the actual work duration (effectiveOccupied - srvTravel),
      // preventing the 105 min collapse down to the base service duration (75 min)!
      const calculatedServiceDur =
        customDuration !== undefined && customDuration !== null && customDuration > 0
          ? Math.max(1, effectiveOccupied - srvTravel)
          : srvDur;

      return {
        serviceDurationMinutes: calculatedServiceDur,
        travelTimeMinutes: srvTravel,
        totalOccupiedMinutes: effectiveOccupied,
      };
    }
  }

  const duration = customDuration !== undefined && customDuration > 0 ? customDuration : 45;
  return {
    serviceDurationMinutes: duration,
    travelTimeMinutes: 0,
    totalOccupiedMinutes: duration,
  };
}

/**
 * In-memory concurrency lock to serialize simultaneous booking submissions per (date, category/resource, plate).
 * Supports multiple keys atomically (sorted to avoid deadlocks).
 */
const bookingResourceLocks = new Map<string, Promise<void>>();

export async function withBookingLock<T>(
  lockKeysInput: string | string[],
  task: () => Promise<T>
): Promise<T> {
  const keys = (Array.isArray(lockKeysInput) ? lockKeysInput : [lockKeysInput])
    .filter(Boolean)
    .map(String);
  const uniqueKeys = Array.from(new Set(keys)).sort();

  if (uniqueKeys.length === 0) {
    return await task();
  }

  // Wait for all locks in deterministic order
  for (const key of uniqueKeys) {
    while (bookingResourceLocks.has(key)) {
      await bookingResourceLocks.get(key);
    }
  }

  const releaseCallbacks: Array<() => void> = [];
  for (const key of uniqueKeys) {
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    bookingResourceLocks.set(key, lockPromise);
    releaseCallbacks.push(releaseLock!);
  }

  try {
    return await task();
  } finally {
    for (let i = 0; i < uniqueKeys.length; i++) {
      bookingResourceLocks.delete(uniqueKeys[i]);
      releaseCallbacks[i]();
    }
  }
}

/**
 * Extracts all operational intervals occupied by a booking or subscription visit
 * for a specific resourceCategory ('car' | 'home').
 *
 * For single-service bookings:
 *   If booking belongs to resourceCategory, occupies [bStart, bEnd).
 *
 * For composite (multi-service) bookings:
 *   Sub-services execute sequentially in order.
 *   Each sub-service occupies its respective resource category during its specific time window.
 */
export function extractBookingResourceIntervals(
  record: any,
  targetCategory: string,
  serviceToCatMap: Map<string, string>
): Array<{ start: number; end: number; reason: string }> {
  const results: Array<{ start: number; end: number; reason: string }> = [];

  let bStart = timeStringToMinutes(record.scheduledStart || record.timeSlotStart);
  let bEnd = record.scheduledEnd ? timeStringToMinutes(record.scheduledEnd) : 0;

  const rawTimeStr = String(record.time || '').trim();
  if ((!bStart || !bEnd) && (rawTimeStr.includes('–') || rawTimeStr.includes('-') || rawTimeStr.includes('—'))) {
    const parts = rawTimeStr.split(/[-–—]/).map((p: string) => p.trim());
    if (parts.length >= 2) {
      const min1 = timeStringToMinutes(parts[0]);
      const min2 = timeStringToMinutes(parts[1]);
      if (min1 > 0 && min2 > 0) {
        if (!bStart) bStart = Math.min(min1, min2);
        if (!bEnd) bEnd = Math.max(min1, min2);
      }
    }
  }

  if (!bStart) {
    bStart = timeStringToMinutes(record.time);
  }

  const bDuration =
    record.totalOccupiedMinutes ||
    record.packageSnapshot?.durationMinutes ||
    record.serviceSnapshot?.packageSnapshot?.durationMinutes ||
    (record.serviceDurationMinutes
      ? record.serviceDurationMinutes + (record.travelTimeMinutes || 0)
      : record.duration) ||
    45;

  if (!bEnd || bEnd <= bStart) {
    bEnd = bStart + bDuration;
  }

  let meta = record.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch {}
  }
  let snap = record.serviceSnapshot;
  if (typeof snap === 'string') {
    try { snap = JSON.parse(snap); } catch {}
  }

  // Check if this record is a composite/multi-service order
  const subServices: any[] =
    (Array.isArray(meta?.services) && meta.services.length > 0
      ? meta.services
      : Array.isArray(snap?.services) && snap.services.length > 0
      ? snap.services
      : null) as any[];

  if (subServices && subServices.length > 1) {
    // Sequential execution schedule for composite order
    let cursor = bStart;
    for (const item of subServices) {
      const itemCat =
        normalizeCategory(item.category) ||
        (item.serviceId ? serviceToCatMap.get(item.serviceId) : undefined) ||
        (item.id ? serviceToCatMap.get(item.id) : undefined) ||
        normalizeCategory(record.category) ||
        'car';
      const itemDuration = Number(item.duration) || Math.floor(bDuration / subServices.length) || 30;
      const itemStart = cursor;
      const itemEnd = cursor + itemDuration;
      cursor = itemEnd;

      if (itemCat === targetCategory) {
        results.push({
          start: itemStart,
          end: itemEnd,
          reason: `محجوز بالكامل (${item.title || 'خدمة ضمن طلب مركب'})`,
        });
      }
    }
    return results;
  }

  // Single service booking
  const recordCat =
    (record.serviceId && serviceToCatMap.get(record.serviceId)) ||
    (record.category ? normalizeCategory(record.category) : undefined) ||
    (snap?.category ? normalizeCategory(snap.category) : undefined) ||
    'car';

  if (recordCat === targetCategory) {
    results.push({
      start: bStart,
      end: bEnd,
      reason: 'محجوز بالكامل',
    });
  }

  return results;
}

/**
 * Normalizes vehicle license plates canonically:
 * - Maps Eastern Arabic numerals (٠-٩) to standard ASCII numerals (0-9).
 * - Unifies Arabic character variants (أ/إ/آ -> ا, ة -> ه, ى -> ي).
 * - Strips all spaces, hyphens, slashes, and punctuation.
 * - Converts to lower case.
 */
export function canonicalizePlateNumber(plate?: string | null): string {
  if (!plate) return '';
  const easternToArabicMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  let clean = String(plate).trim().toLowerCase();
  clean = clean.replace(/[٠-٩]/g, (ch) => easternToArabicMap[ch] || ch);
  clean = clean
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\s\-_.\/\\|]+/g, '');
  return clean;
}

/**
 * Checks if a specific vehicle (by plate number) is already booked on the specified date and interval.
 */
export async function assertVehicleNotBooked(
  dateStr: string,
  startMin: number,
  endMin: number,
  plateNumber?: string,
  excludeBookingId?: string,
  excludeVisitId?: string
): Promise<void> {
  if (!plateNumber || !plateNumber.trim()) return;
  const cleanPlate = canonicalizePlateNumber(plateNumber);
  if (!cleanPlate) return;

  // 1. Check existing bookings
  const existingBookings = await Booking.find({
    date: dateStr,
    status: { $nin: ['cancelled'] },
    ...(excludeBookingId ? { id: { $ne: excludeBookingId } } : {}),
  }).select('id scheduledStart scheduledEnd time duration vehicleDetails metadata');

  for (const b of existingBookings) {
    let meta = b.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch {}
    }
    const bPlate =
      b.vehicleDetails?.plateNumber ||
      meta?.vehicleDetails?.plateNumber ||
      meta?.plateNumber ||
      (b as any).vehiclePlate ||
      meta?.vehiclePlate;
    if (!bPlate) continue;
    const cleanBPlate = canonicalizePlateNumber(bPlate);
    if (cleanBPlate === cleanPlate) {
      const bStart = timeStringToMinutes(b.scheduledStart || b.time);
      const bDuration = b.duration || 45;
      const bEnd = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : bStart + bDuration;
      if (doIntervalsOverlap(startMin, endMin, bStart, bEnd)) {
        const err: any = new Error(
          `السيارة ذات اللوحة (${plateNumber}) لديها حجز بالفعل في هذا الموعد (${minutesToDisplayTime(bStart).time24} – ${minutesToDisplayTime(bEnd).time24}). لا يمكن حجز موعدين لنفس السيارة في نفس الوقت.`
        );
        err.statusCode = 409;
        err.code = 'VEHICLE_DOUBLE_BOOKING';
        throw err;
      }
    }
  }

  // 2. Check existing subscription visits
  const existingVisits = await SubscriptionVisit.find({
    date: dateStr,
    status: { $nin: ['cancelled'] },
    ...(excludeVisitId ? { id: { $ne: excludeVisitId } } : {}),
  }).select('id scheduledStart scheduledEnd time duration vehicleDetails metadata subscriptionId');

  for (const v of existingVisits) {
    let meta = v.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch {}
    }
    const vPlate =
      v.vehicleDetails?.plateNumber ||
      meta?.vehicleDetails?.plateNumber ||
      meta?.plateNumber ||
      (v as any).vehiclePlate ||
      meta?.vehiclePlate;
    if (!vPlate) continue;
    const cleanVPlate = canonicalizePlateNumber(vPlate);
    if (cleanVPlate === cleanPlate) {
      const vStart = timeStringToMinutes(v.scheduledStart || v.time);
      const vDuration = v.duration || 45;
      const vEnd = v.scheduledEnd ? timeStringToMinutes(v.scheduledEnd) : vStart + vDuration;
      if (doIntervalsOverlap(startMin, endMin, vStart, vEnd)) {
        const err: any = new Error(
          `السيارة ذات اللوحة (${plateNumber}) مسجل لها زيارة اشتراك في هذا الموعد (${minutesToDisplayTime(vStart).time24} – ${minutesToDisplayTime(vEnd).time24}). لا يمكن حجز زيارتين لنفس السيارة في نفس الوقت.`
        );
        err.statusCode = 409;
        err.code = 'VEHICLE_DOUBLE_BOOKING';
        throw err;
      }
    }
  }
}

/**
 * Computes the nearest available slots on a day if a requested slot is unavailable.
 */
export async function findNearestAvailableSlots(
  dateStr: string,
  serviceId?: string,
  category?: string,
  customDuration?: number,
  targetMin?: number
): Promise<string[]> {
  try {
    const avail = await getAvailableSlots(dateStr, serviceId, customDuration, undefined, undefined, category, false);
    const availableSlots = avail.slots.filter((s) => s.available);
    if (availableSlots.length === 0) return [];

    if (targetMin !== undefined) {
      availableSlots.sort((a, b) => {
        const diffA = Math.abs(timeStringToMinutes(a.start) - targetMin);
        const diffB = Math.abs(timeStringToMinutes(b.start) - targetMin);
        return diffA - diffB;
      });
    }
    return availableSlots.slice(0, 3).map((s) => s.time);
  } catch {
    return [];
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

let cachedCategories: any[] = [];
let lastCategoryFetch = 0;

export async function getDynamicCategories(): Promise<any[]> {
  const now = Date.now();
  if (now - lastCategoryFetch > 30000 || cachedCategories.length === 0) {
    try {
      cachedCategories = await ServiceCategory.find({});
      lastCategoryFetch = now;
    } catch {
      // Keep cached
    }
  }
  return cachedCategories;
}

export function normalizeCategory(cat?: string | null): string {
  if (!cat) return '';
  const raw = String(cat).trim().toLowerCase();
  if (
    raw === 'car' ||
    raw === 'cars' ||
    raw.includes('car') ||
    raw.includes('سيار') ||
    raw === 'cat-mv2vgjo7'
  ) return 'car';
  if (
    raw === 'mixed' ||
    raw === 'mix' ||
    raw.includes('mixed') ||
    raw.includes('مختلط')
  ) return 'mixed';
  if (
    raw === 'home' ||
    raw === 'homes' ||
    raw.includes('home') ||
    raw.includes('منزل') ||
    raw.includes('منازل') ||
    raw.includes('سجاد') ||
    raw === 'cat-mv2fyqvp' ||
    raw === 'cat-mv2vh6ty'
  ) return 'home';
  return raw;
}

export function getCategoryDisplayName(category?: string | null, isAr: boolean = true): string {
  const norm = normalizeCategory(category);
  if (norm === 'car') return isAr ? 'سيارات' : 'Cars';
  if (norm === 'home') return isAr ? 'منازل' : 'Homes';
  if (norm === 'mixed') return isAr ? 'مختلط' : 'Mixed';
  return isAr ? (category || 'عام') : (category || 'General');
}

export function computeOrderCategory(order: any): 'car' | 'home' | 'mixed' | string {
  if (!order) return 'car';

  const rawCat = normalizeCategory(order.category);
  if (rawCat === 'mixed') return 'mixed';

  const subServices: any[] =
    (Array.isArray(order.serviceSnapshot?.services) && order.serviceSnapshot.services.length > 0
      ? order.serviceSnapshot.services
      : Array.isArray(order.metadata?.services) && order.metadata.services.length > 0
      ? order.metadata.services
      : Array.isArray(order.selectedServices) && order.selectedServices.length > 0
      ? order.selectedServices
      : Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : null) as any[];

  if (subServices && subServices.length > 0) {
    const cats = new Set<string>();
    for (const s of subServices) {
      const c = normalizeCategory(s.category || s.service?.category);
      if (c === 'car' || c === 'home') cats.add(c);
      else if (c === 'mixed') return 'mixed';
    }
    if (cats.has('car') && cats.has('home')) {
      return 'mixed';
    }
    if (cats.size === 1) {
      return cats.values().next().value || 'car';
    }
  }

  return rawCat || normalizeCategory(order.serviceSnapshot?.category) || 'car';
}


export async function mapCategoryCanonical(cat?: string | null): Promise<string> {
  if (!cat) return '';
  const norm = normalizeCategory(cat);
  if (norm === 'car' || norm === 'home') return norm;

  const categories = await getDynamicCategories();
  const matched = categories.find((c: any) => c.id === cat || c.slug === cat);
  if (matched) {
    const text = `${matched.name || ''} ${matched.nameEn || ''} ${matched.slug || ''}`.toLowerCase();
    if (text.includes('سيار') || text.includes('car')) return 'car';
    if (text.includes('منزل') || text.includes('منازل') || text.includes('home')) return 'home';
    return matched.slug || matched.id || norm;
  }
  return norm;
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
    if (s?.category) return await mapCategoryCanonical(s.category);
  }
  if (Array.isArray(serviceIds) && serviceIds.length > 0) {
    for (const sId of serviceIds) {
      if (sId) {
        const s = await Service.findOne({ id: sId });
        if (s?.category) return await mapCategoryCanonical(s.category);
      }
    }
  }
  if (category && category !== 'all' && typeof category === 'string' && category.trim()) {
    const mapped = await mapCategoryCanonical(category.trim());
    if (mapped) return mapped;
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
  category?: string,
  includeUnavailable: boolean = false
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
    if (srv && (srv.active === false || srv.available === false || srv.isArchived === true)) {
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

  // 2. Check day of week in Africa/Cairo timezone
  const dayOfWeek = getCairoDayOfWeek(dateStr);
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

  // 4.1 Build service to canonical category map for fast lookup
  const allServices = await Service.find({});
  const serviceToCatMap = new Map<string, string>();
  for (const s of allServices) {
    if (s.id && s.category) {
      serviceToCatMap.set(s.id, await mapCategoryCanonical(s.category));
    }
  }

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

    if (b.status === 'cancelled') {
      const wasStarted = Array.isArray(b.timeline) && b.timeline.some((e: any) => e.status === 'in_progress');
      if (wasStarted) {
        let bStart = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
        let bEnd = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : bStart + (b.duration || 45);
        occupiedIntervals.push({ start: bStart, end: bEnd, type: 'booking', reason: 'محجوز بالكامل' });
      } else if (b.cancelledAt) {
        const cancelDateStr = getCairoDateFromDate(new Date(b.cancelledAt));
        if (isToday || cancelDateStr === dateStr) {
          const cancelTimeStr = getCairoTimeFromDate(new Date(b.cancelledAt));
          const cancelMin = timeStringToMinutes(cancelTimeStr);
          let bStart = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
          let bEnd = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : bStart + (b.duration || 45);
          if (cancelMin > bStart && cancelMin < bEnd) {
            occupiedIntervals.push({ start: bStart, end: cancelMin, type: 'elapsed', reason: 'وقت منقضي' });
          }
        }
      }
      continue;
    }

    // Active booking: extract intervals matching targetCategory (handles both single & composite orders)
    if (targetCategory) {
      const intervals = extractBookingResourceIntervals(b, targetCategory, serviceToCatMap);
      for (const inv of intervals) {
        occupiedIntervals.push({ start: inv.start, end: inv.end, type: 'booking', reason: inv.reason });
      }
    } else if (requestedServiceIds.length > 0) {
      const bServices = getBookingServiceIds(b);
      const matches = requestedServiceIds.some((sId) => bServices.includes(sId));
      if (matches) {
        let bStart = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
        let bEnd = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : bStart + (b.duration || 45);
        occupiedIntervals.push({ start: bStart, end: bEnd, type: 'booking', reason: 'محجوز بالكامل' });
      }
    }
  }

  // 5.1 Fetch all confirmed/active subscription visits on this date
  const allVisits = await SubscriptionVisit.find({ date: dateStr }).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration serviceDurationMinutes travelTimeMinutes totalOccupiedMinutes cancelledAt timeline assignedTechnicianId serviceId serviceSnapshot category metadata'
  );

  for (const v of allVisits) {
    if (v.status === 'cancelled') {
      const wasStarted = Array.isArray(v.timeline) && v.timeline.some((e: any) => e.status === 'in_progress');
      if (wasStarted) {
        let vStart = timeStringToMinutes(v.scheduledStart || v.timeSlotStart || v.time);
        let vEnd = v.scheduledEnd ? timeStringToMinutes(v.scheduledEnd) : vStart + (v.duration || 45);
        occupiedIntervals.push({ start: vStart, end: vEnd, type: 'booking', reason: 'محجوز بالكامل' });
      }
      continue;
    }

    if (targetCategory) {
      const intervals = extractBookingResourceIntervals(v, targetCategory, serviceToCatMap);
      for (const inv of intervals) {
        occupiedIntervals.push({ start: inv.start, end: inv.end, type: 'booking', reason: inv.reason });
      }
    } else if (requestedServiceIds.length > 0) {
      const vServices = getBookingServiceIds(v);
      const matches = requestedServiceIds.some((sId) => vServices.includes(sId));
      if (matches) {
        let vStart = timeStringToMinutes(v.scheduledStart || v.timeSlotStart || v.time);
        let vEnd = v.scheduledEnd ? timeStringToMinutes(v.scheduledEnd) : vStart + (v.duration || 45);
        occupiedIntervals.push({ start: vStart, end: vEnd, type: 'booking', reason: 'محجوز بالكامل' });
      }
    }
  }

  // Add working break time as occupied interval if configured
  if (settings.breakStart && settings.breakEnd && !(settings.breakStart === '14:00' && settings.breakEnd === '15:00')) {
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

  // A. Generate sequential continuous slots within each free block
  // Slots start at block.start and step sequentially by requiredDuration
  // Example for 45 min: 09:00 -> 09:45 -> 10:30 -> 11:15...
  for (const block of freeBlocks) {
    let slotCursor = snapTo15Minutes(block.start);
    // If today and prior slots elapsed, skip to the next upcoming sequential slot
    if (isToday && earliestAllowedMinutes > slotCursor) {
      while (slotCursor < earliestAllowedMinutes && slotCursor + requiredDuration <= block.end) {
        slotCursor += requiredDuration;
      }
    }
    while (slotCursor + requiredDuration <= block.end) {
      candidateStarts.add(slotCursor);
      slotCursor += requiredDuration;
    }
  }

  // B. Include active booking and break intervals ONLY if includeUnavailable is true (e.g. for admin inspection)
  if (includeUnavailable) {
    for (const occ of mergedOccupied) {
      if (occ.type === 'booking' || occ.type === 'break') {
        candidateStarts.add(snapTo15Minutes(occ.start));
      }
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
    if (slotStart + timing.totalOccupiedMinutes > completionLimit) {
      continue;
    }

    // Past time filtering for today
    if (isToday && slotStart < earliestAllowedMinutes) {
      continue;
    }

    // Check break time overlap
    let isBreakConflict = false;
    let breakReason: string | undefined;
    if (settings.breakStart && settings.breakEnd && !(settings.breakStart === '14:00' && settings.breakEnd === '15:00')) {
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

    // Strict customer availability rule: Booked / colliding slots must NOT appear at all!
    if (!isAvailable && !includeUnavailable) {
      continue;
    }

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
  vehiclePlate?: string;
  compositeServices?: Array<{ serviceId: string; category?: string; duration?: number; title?: string }>;
}): Promise<{
  scheduledStart: string;
  scheduledEnd: string;
  serviceDurationMinutes: number;
  travelTimeMinutes: number;
  totalOccupiedMinutes: number;
  suggestedSlots?: string[];
}> {
  const { dateStr, timeStr, serviceId, serviceIds, category, customDuration, excludeBookingId, excludeVisitId, technicianId, vehiclePlate, compositeServices } = params;

  const targetCategory = await resolveTargetCategory(category, serviceId, serviceIds);

  if (serviceId) {
    const srv = await Service.findOne({ id: serviceId });
    if (srv && (srv.active === false || srv.available === false || srv.isArchived === true)) {
      throw new Error('الخدمة المطلوبة غير متاحة حالياً');
    }
  }

  const settings = await getEffectiveBookingSettings();
  const timing = await resolveServiceTiming(serviceId, customDuration, settings.defaultTravelTime);

  // 1. Blocked dates, holidays, working days validation
  if (settings.blockedDates.includes(dateStr)) {
    const err: any = new Error('هذا اليوم مغلق بالكامل ومحجوب للصيانة');
    err.code = 'BLOCKED_DATE';
    err.status = 422;
    err.statusCode = 422;
    throw err;
  }
  const holiday = settings.holidays.find((h: any) => h.date === dateStr);
  if (holiday) {
    const err: any = new Error(`عطلة رسمية: ${holiday.name}`);
    err.code = 'OFFICIAL_HOLIDAY';
    err.status = 422;
    err.statusCode = 422;
    throw err;
  }
  const dayOfWeek = getCairoDayOfWeek(dateStr);
  if (!settings.workingDays.includes(dayOfWeek)) {
    const err: any = new Error('هذا اليوم يقع خارج أيام العمل المتاحة للحجز');
    err.code = 'OUTSIDE_WORKING_DAYS';
    err.status = 422;
    err.statusCode = 422;
    throw err;
  }

  // 1.5. Validate requested slot interval sufficiency
  // If timeStr specifies an explicit range (e.g. "10:00 – 10:45" or "14:00 - 14:45"),
  // verify that the interval is not shorter than the required duration!
  let explicitIntervalMinutes: number | null = null;
  if (timeStr.includes('–') || timeStr.includes('-') || timeStr.includes('—')) {
    const parts = timeStr.split(/[-–—]/).map((p) => p.trim());
    if (parts.length >= 2) {
      const min1 = timeStringToMinutes(parts[0]);
      const min2 = timeStringToMinutes(parts[1]);
      if (min1 > 0 && min2 > 0) {
        const span = Math.abs(min2 - min1);
        if (span > 0) {
          explicitIntervalMinutes = span;
        }
      }
    }
  }

  if (explicitIntervalMinutes !== null && explicitIntervalMinutes < timing.totalOccupiedMinutes) {
    const err: any = new Error(
      `الفترة الزمنية المختارة (${explicitIntervalMinutes} دقيقة) أقصر من المدة الفعلية المطلوبة للخدمة (${timing.totalOccupiedMinutes} دقيقة)`
    );
    err.code = 'DURATION_INSUFFICIENT';
    err.status = 422;
    err.statusCode = 422;
    err.details = {
      requestedSpanMinutes: explicitIntervalMinutes,
      requiredDurationMinutes: timing.totalOccupiedMinutes,
    };
    throw err;
  }

  // Snap the requested time to the nearest clean 15-minute boundary
  const rawStartMin = timeStringToMinutes(timeStr);
  const slotStartMin = snapTo15Minutes(rawStartMin);
  const slotEndMin = slotStartMin + timing.totalOccupiedMinutes;

  const workStartMin = timeStringToMinutes(settings.workingHoursStart);
  const workEndMin = timeStringToMinutes(settings.workingHoursEnd);

  // 2. Working Hours & Day Boundary Check (allow 1440 for 23:59 end-of-day)
  if (slotStartMin < workStartMin) {
    const startStr = minutesToTimeString(slotStartMin);
    const err: any = new Error(
      `الموعد المحدد (${startStr}) يقع قبل بداية ساعات العمل الرسمية (${settings.workingHoursStart})`
    );
    err.code = 'TIME_BEFORE_WORK_HOURS';
    err.status = 409;
    err.statusCode = 409;
    throw err;
  }

  const completionLimit = workEndMin === 1439 ? 1440 : workEndMin;
  if ((slotStartMin + timing.totalOccupiedMinutes) > completionLimit) {
    const endStr = minutesToTimeString(slotStartMin + timing.totalOccupiedMinutes);
    const err: any = new Error(
      `الموعد المحدد ينتهي (${endStr}) بعد نهاية ساعات العمل الرسمية (${settings.workingHoursEnd})`
    );
    err.code = 'TIME_EXCEEDS_WORK_HOURS';
    err.status = 409;
    err.statusCode = 409;
    throw err;
  }

  // 3. Break time check
  if (settings.breakStart && settings.breakEnd && !(settings.breakStart === '14:00' && settings.breakEnd === '15:00')) {
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

  // 5. Vehicle plate collision check (Customer vehicle is an exclusive operational resource)
  if (vehiclePlate) {
    await assertVehicleNotBooked(
      dateStr,
      slotStartMin,
      slotEndMin,
      vehiclePlate,
      excludeBookingId,
      excludeVisitId
    );
  }

  // 6. Query all bookings & subscription visits on that date
  const query: any = { date: dateStr };
  if (excludeBookingId) {
    query.id = { $ne: excludeBookingId };
  }

  const existingBookings = await Booking.find(query).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration totalOccupiedMinutes travelTimeMinutes serviceId serviceSnapshot category assignedTechnicianId cancelledAt timeline metadata vehicleDetails'
  );

  const subVisitQuery: any = { date: dateStr };
  if (excludeVisitId) {
    subVisitQuery.id = { $ne: excludeVisitId };
  }

  const existingVisits = await SubscriptionVisit.find(subVisitQuery).select(
    'id status scheduledStart scheduledEnd timeSlotStart time duration totalOccupiedMinutes travelTimeMinutes serviceId serviceSnapshot category assignedTechnicianId cancelledAt timeline metadata vehicleDetails'
  );

  const allServicesForAssert = await Service.find({});
  const assertServiceCatMap = new Map<string, string>();
  for (const s of allServicesForAssert) {
    if (s.id && s.category) {
      assertServiceCatMap.set(s.id, await mapCategoryCanonical(s.category));
    }
  }

  // 7. Check collisions
  if (Array.isArray(compositeServices) && compositeServices.length > 1) {
    // Composite order: Validate sequential execution chain
    let cursor = slotStartMin;
    for (const item of compositeServices) {
      const itemDuration = Number(item.duration) || 30;
      const itemStart = cursor;
      const itemEnd = cursor + itemDuration;
      cursor = itemEnd;

      const itemCategory =
        normalizeCategory(item.category) ||
        (item.serviceId ? assertServiceCatMap.get(item.serviceId) : undefined) ||
        targetCategory ||
        'car';

      // Check against bookings
      for (const b of existingBookings) {
        if (b.status === 'cancelled') continue;
        if (excludeBookingId && (b.id === excludeBookingId || String(b._id) === excludeBookingId || (b as any).bookingNumber === excludeBookingId)) continue;
        const occupieds = extractBookingResourceIntervals(b, itemCategory, assertServiceCatMap);
        for (const occ of occupieds) {
          if (doIntervalsOverlap(itemStart, itemEnd, occ.start, occ.end)) {
            const nearest = await findNearestAvailableSlots(dateStr, serviceId, targetCategory, timing.totalOccupiedMinutes, slotStartMin);
            const suggestionText = nearest.length > 0 ? ` أقرب المواعيد المتاحة لهذا اليوم: ${nearest.join(' ، ')}.` : '';
            const conflictErr: any = new Error(
              `الموعد المطلوب يتعارض مع حجز قائم لخدمة (${item.title || item.serviceId || 'خدمة ضمن الطلب'}) في الفترة (${minutesToDisplayTime(occ.start).time24} – ${minutesToDisplayTime(occ.end).time24}).${suggestionText}`
            );
            conflictErr.statusCode = 409;
            conflictErr.code = 'SLOT_UNAVAILABLE';
            conflictErr.suggestedSlots = nearest;
            throw conflictErr;
          }
        }
      }

      // Check against subscription visits
      for (const v of existingVisits) {
        if (v.status === 'cancelled') continue;
        if (excludeVisitId && (v.id === excludeVisitId || String(v._id) === excludeVisitId)) continue;
        const occupieds = extractBookingResourceIntervals(v, itemCategory, assertServiceCatMap);
        for (const occ of occupieds) {
          if (doIntervalsOverlap(itemStart, itemEnd, occ.start, occ.end)) {
            const nearest = await findNearestAvailableSlots(dateStr, serviceId, targetCategory, timing.totalOccupiedMinutes, slotStartMin);
            const suggestionText = nearest.length > 0 ? ` أقرب المواعيد المتاحة لهذا اليوم: ${nearest.join(' ، ')}.` : '';
            const conflictErr: any = new Error(
              `الموعد المطلوب يتعارض مع زيارة اشتراك قائمة لخدمة (${item.title || item.serviceId || 'خدمة ضمن الطلب'}) في الفترة (${minutesToDisplayTime(occ.start).time24} – ${minutesToDisplayTime(occ.end).time24}).${suggestionText}`
            );
            conflictErr.statusCode = 409;
            conflictErr.code = 'SLOT_UNAVAILABLE';
            conflictErr.suggestedSlots = nearest;
            throw conflictErr;
          }
        }
      }
    }
  } else {
    // Single service / homogeneous category
    for (const b of existingBookings) {
      if (b.status === 'cancelled') continue;
      if (excludeBookingId && (b.id === excludeBookingId || String(b._id) === excludeBookingId || (b as any).bookingNumber === excludeBookingId)) continue;

      const isSameTechnician = Boolean(technicianId && b.assignedTechnicianId && b.assignedTechnicianId === technicianId);
      if (isSameTechnician) {
        let bStart = timeStringToMinutes(b.scheduledStart || b.time);
        let bEnd = b.scheduledEnd ? timeStringToMinutes(b.scheduledEnd) : bStart + (b.duration || 45);
        if (doIntervalsOverlap(slotStartMin, slotEndMin, bStart, bEnd)) {
          const nearest = await findNearestAvailableSlots(dateStr, serviceId, targetCategory, timing.totalOccupiedMinutes, slotStartMin);
          const suggestionText = nearest.length > 0 ? ` أقرب المواعيد المتاحة لهذا اليوم: ${nearest.join(' ، ')}.` : '';
          const conflictErr: any = new Error(`الفني المطلوب لديه حجز آخر في هذا الموعد (${minutesToDisplayTime(bStart).time24} – ${minutesToDisplayTime(bEnd).time24}).${suggestionText}`);
          conflictErr.statusCode = 409;
          conflictErr.code = 'TECHNICIAN_UNAVAILABLE';
          conflictErr.suggestedSlots = nearest;
          throw conflictErr;
        }
      }

      if (targetCategory) {
        const occupieds = extractBookingResourceIntervals(b, targetCategory, assertServiceCatMap);
        for (const occ of occupieds) {
          if (doIntervalsOverlap(slotStartMin, slotEndMin, occ.start, occ.end)) {
            const nearest = await findNearestAvailableSlots(dateStr, serviceId, targetCategory, timing.totalOccupiedMinutes, slotStartMin);
            const suggestionText = nearest.length > 0 ? ` أقرب المواعيد المتاحة لهذا اليوم: ${nearest.join(' ، ')}.` : '';
            const conflictErr: any = new Error(
              `الموعد المحدد (${minutesToDisplayTime(slotStartMin).time24} – ${minutesToDisplayTime(slotEndMin).time24}) لم يعد متاحاً لوجود تعارض في الموارد التشغيلية (${occ.reason}).${suggestionText}`
            );
            conflictErr.statusCode = 409;
            conflictErr.code = 'SLOT_UNAVAILABLE';
            conflictErr.suggestedSlots = nearest;
            throw conflictErr;
          }
        }
      }
    }

    for (const v of existingVisits) {
      if (v.status === 'cancelled') continue;
      if (excludeVisitId && (v.id === excludeVisitId || String(v._id) === excludeVisitId)) continue;

      const isSameTechnician = Boolean(technicianId && v.assignedTechnicianId && v.assignedTechnicianId === technicianId);
      if (isSameTechnician) {
        let vStart = timeStringToMinutes(v.scheduledStart || v.time);
        let vEnd = v.scheduledEnd ? timeStringToMinutes(v.scheduledEnd) : vStart + (v.duration || 45);
        if (doIntervalsOverlap(slotStartMin, slotEndMin, vStart, vEnd)) {
          const nearest = await findNearestAvailableSlots(dateStr, serviceId, targetCategory, timing.totalOccupiedMinutes, slotStartMin);
          const suggestionText = nearest.length > 0 ? ` أقرب المواعيد المتاحة لهذا اليوم: ${nearest.join(' ، ')}.` : '';
          const conflictErr: any = new Error(`الفني المطلوب لديه زيارة اشتراك في هذا الموعد (${minutesToDisplayTime(vStart).time24} – ${minutesToDisplayTime(vEnd).time24}).${suggestionText}`);
          conflictErr.statusCode = 409;
          conflictErr.code = 'TECHNICIAN_UNAVAILABLE';
          conflictErr.suggestedSlots = nearest;
          throw conflictErr;
        }
      }

      if (targetCategory) {
        const occupieds = extractBookingResourceIntervals(v, targetCategory, assertServiceCatMap);
        for (const occ of occupieds) {
          if (doIntervalsOverlap(slotStartMin, slotEndMin, occ.start, occ.end)) {
            const nearest = await findNearestAvailableSlots(dateStr, serviceId, targetCategory, timing.totalOccupiedMinutes, slotStartMin);
            const suggestionText = nearest.length > 0 ? ` أقرب المواعيد المتاحة لهذا اليوم: ${nearest.join(' ، ')}.` : '';
            const conflictErr: any = new Error(
              `الموعد المحدد (${minutesToDisplayTime(slotStartMin).time24} – ${minutesToDisplayTime(slotEndMin).time24}) لم يعد متاحاً لوجود تعارض مع زيارة اشتراك (${occ.reason}).${suggestionText}`
            );
            conflictErr.statusCode = 409;
            conflictErr.code = 'SLOT_UNAVAILABLE';
            conflictErr.suggestedSlots = nearest;
            throw conflictErr;
          }
        }
      }
    }
  }

  const { time24: scheduledStart } = minutesToDisplayTime(slotStartMin);
  const { time24: scheduledEnd } = minutesToDisplayTime(slotEndMin);

  return {
    scheduledStart,
    scheduledEnd,
    serviceDurationMinutes: timing.serviceDurationMinutes,
    travelTimeMinutes: timing.travelTimeMinutes || 0,
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
