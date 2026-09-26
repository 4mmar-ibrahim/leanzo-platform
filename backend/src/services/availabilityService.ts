import { Booking, IBooking } from '../models/Booking.js';
import { Service } from '../models/Service.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { AuditLog } from '../models/AuditLog.js';

export interface TimeSlotOption {
  time: string; // e.g. "10:00 AM"
  time24: string; // e.g. "10:00"
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
 * Converts "10:00", "10:00 AM", "02:30 PM" to minutes from midnight (0..1439)
 */
export function timeStringToMinutes(timeStr: string): number {
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

/**
 * Converts minutes from midnight back to 12-hour and 24-hour formats
 */
export function minutesToDisplayTime(totalMinutes: number): { time12: string; time24: string } {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  const hours24Str = hours.toString().padStart(2, '0');
  const minsStr = mins.toString().padStart(2, '0');
  const time24 = `${hours24Str}:${minsStr}`;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const time12 = `${hours12.toString().padStart(2, '0')}:${minsStr} ${period}`;

  return { time12, time24 };
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
    minNoticeHours: Number(b.minNoticeHours) || 1,
    sameDayBooking: b.sameDayBooking !== undefined ? Boolean(b.sameDayBooking) : true,
    blockedDates: Array.isArray(b.blockedDates) ? b.blockedDates : [],
    holidays: Array.isArray(b.holidays) ? b.holidays : [],
  };
}

/**
 * Resolves the service's duration, travel time, and total occupancy.
 * Formula: totalOccupancy = serviceDurationMinutes + travelTimeMinutes
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

  const duration = customDuration || 45;
  return {
    serviceDurationMinutes: duration,
    travelTimeMinutes: fallbackTravel,
    totalOccupiedMinutes: duration + fallbackTravel,
  };
}

/**
 * Availability Engine: Generates real availability for any given date and service
 * Scopes conflict detection to the same serviceId (or same technician).
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
  const earliestAllowedMinutes = currentMinutesNow + settings.minNoticeHours * 60;

  // 4. Fetch active bookings on this date for the SAME service (or assigned technician)
  const bookingQuery: any = {
    date: dateStr,
    status: { $nin: ['cancelled'] },
  };

  if (serviceId) {
    bookingQuery.serviceId = serviceId;
  }

  const existingBookings = await Booking.find(bookingQuery).select(
    'serviceId time timeSlotStart scheduledStart scheduledEnd duration serviceDurationMinutes travelTimeMinutes totalOccupiedMinutes assignedTechnicianId'
  );

  // Map to minute intervals
  const existingIntervals = existingBookings.map((b) => {
    const startM = timeStringToMinutes(b.scheduledStart || b.timeSlotStart || b.time);
    const durM = b.totalOccupiedMinutes || (b.duration || 45) + (b.travelTimeMinutes || 15);
    return {
      start: startM,
      end: startM + durM,
      serviceId: b.serviceId,
      technicianId: b.assignedTechnicianId,
    };
  });

  // 5. Generate Candidate Slots
  const workStartMin = timeStringToMinutes(settings.workingHoursStart);
  const workEndMin = timeStringToMinutes(settings.workingHoursEnd);
  const slots: TimeSlotOption[] = [];

  for (
    let slotMin = workStartMin;
    slotMin + timing.totalOccupiedMinutes <= workEndMin;
    slotMin += settings.slotInterval
  ) {
    const { time12, time24 } = minutesToDisplayTime(slotMin);
    const candidateEnd = slotMin + timing.totalOccupiedMinutes;
    const { time24: scheduledEnd24 } = minutesToDisplayTime(candidateEnd);

    // Check past time if today
    if (isToday && slotMin < earliestAllowedMinutes) {
      slots.push({
        time: time12,
        time24,
        available: false,
        reason: 'تجاوز وقت الحجز المسبق المطلوب',
        serviceDurationMinutes: timing.serviceDurationMinutes,
        travelTimeMinutes: timing.travelTimeMinutes,
        totalOccupiedMinutes: timing.totalOccupiedMinutes,
        scheduledStart: time24,
        scheduledEnd: scheduledEnd24,
      });
      continue;
    }

    // Check break time
    if (settings.breakStart && settings.breakEnd) {
      const breakStartMin = timeStringToMinutes(settings.breakStart);
      const breakEndMin = timeStringToMinutes(settings.breakEnd);
      if (doIntervalsOverlap(slotMin, candidateEnd, breakStartMin, breakEndMin)) {
        slots.push({
          time: time12,
          time24,
          available: false,
          reason: 'فترة استراحة العمل الرسمية',
          serviceDurationMinutes: timing.serviceDurationMinutes,
          travelTimeMinutes: timing.travelTimeMinutes,
          totalOccupiedMinutes: timing.totalOccupiedMinutes,
          scheduledStart: time24,
          scheduledEnd: scheduledEnd24,
        });
        continue;
      }
    }

    // Check overlap with existing bookings of the SAME service
    let overlapCount = 0;
    for (const interval of existingIntervals) {
      const isSameService = !serviceId || interval.serviceId === serviceId;
      if (isSameService && doIntervalsOverlap(slotMin, candidateEnd, interval.start, interval.end)) {
        overlapCount++;
      }
    }

    const maxAllowed = settings.maxBookingsPerSlot || 1;
    if (overlapCount >= maxAllowed) {
      slots.push({
        time: time12,
        time24,
        available: false,
        reason: 'هذا الموعد مكتمل بالكامل لهذه الخدمة',
        serviceDurationMinutes: timing.serviceDurationMinutes,
        travelTimeMinutes: timing.travelTimeMinutes,
        totalOccupiedMinutes: timing.totalOccupiedMinutes,
        scheduledStart: time24,
        scheduledEnd: scheduledEnd24,
      });
    } else {
      slots.push({
        time: time12,
        time24,
        available: true,
        serviceDurationMinutes: timing.serviceDurationMinutes,
        travelTimeMinutes: timing.travelTimeMinutes,
        totalOccupiedMinutes: timing.totalOccupiedMinutes,
        scheduledStart: time24,
        scheduledEnd: scheduledEnd24,
      });
    }
  }

  return {
    date: dateStr,
    isDayAvailable: slots.some((s) => s.available),
    serviceTiming: timing,
    slots,
  };
}

/**
 * Strict Authority: Server-side validation before saving any booking
 * Throws 409 Conflict if overlap detected for the same service.
 */
export async function assertSlotAvailability(params: {
  dateStr: string;
  timeStr: string;
  serviceId: string;
  customDuration?: number;
  excludeBookingId?: string;
  technicianId?: string;
}): Promise<{
  scheduledStart: string;
  scheduledEnd: string;
  serviceDurationMinutes: number;
  travelTimeMinutes: number;
  totalOccupiedMinutes: number;
}> {
  const { dateStr, timeStr, serviceId, customDuration, excludeBookingId, technicianId } = params;
  const settings = await getEffectiveBookingSettings();
  const timing = await resolveServiceTiming(serviceId, customDuration);

  // 0. Blocked dates, holidays and working days validation
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

  // 1. Working Hours & Day Boundary Check
  if (slotStartMin < workStartMin || slotEndMin > workEndMin) {
    throw new Error('الوقت المحدد يقع خارج ساعات العمل الرسمية لسيارات الخدمة');
  }

  // 2. Past time and same-day check if today
  const todayStr = getCurrentCairoDateString();
  if (dateStr === todayStr) {
    if (settings.sameDayBooking === false) {
      throw new Error('الحجز في نفس اليوم غير متاح حسب قواعد وسياسة الحجز');
    }
    const currentCairoMin = timeStringToMinutes(getCurrentCairoTimeString());
    if (slotStartMin < currentCairoMin) {
      throw new Error('لا يمكن حجز موعد في وقت قد مضى');
    }
  }

  // 3. Query active bookings on that date:
  const conflictOr: any[] = [{ serviceId }];
  if (technicianId) {
    conflictOr.push({ assignedTechnicianId: technicianId });
  }

  const query: any = {
    date: dateStr,
    $or: conflictOr,
    status: { $nin: ['cancelled'] },
  };
  if (excludeBookingId) {
    query.id = { $ne: excludeBookingId };
  }

  const existingBookings = await Booking.find(query).select(
    'id scheduledStart scheduledEnd timeSlotStart duration totalOccupiedMinutes travelTimeMinutes serviceId assignedTechnicianId'
  );

  let overlapCount = 0;
  for (const b of existingBookings) {
    if (technicianId) {
      if (b.assignedTechnicianId && b.assignedTechnicianId !== technicianId) {
        continue;
      }
    }

    const bStartMin = timeStringToMinutes(b.scheduledStart || b.timeSlotStart);
    const bEndMin =
      b.totalOccupiedMinutes !== undefined
        ? bStartMin + b.totalOccupiedMinutes
        : timeStringToMinutes(b.scheduledEnd) || bStartMin + (b.duration || 60);

    if (doIntervalsOverlap(slotStartMin, slotEndMin, bStartMin, bEndMin)) {
      overlapCount++;
    }
  }

  const maxAllowed = settings.maxBookingsPerSlot || 1;
  if (overlapCount >= maxAllowed) {
    throw new Error('هذا الموعد محجوز بالفعل لهذه الخدمة، يرجى اختيار موعد آخر.');
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
      cancelledBooking.scheduledStart || cancelledBooking.timeSlotStart
    );
    const scheduledEndMin =
      timeStringToMinutes(cancelledBooking.scheduledEnd) ||
      scheduledStartMin + (cancelledBooking.totalOccupiedMinutes || 60);

    // Determine the effective point from which the schedule is freed:
    let effectiveFreeStartMin = scheduledStartMin;
    if (cancellationTimeStr) {
      const cancelMin = timeStringToMinutes(cancellationTimeStr);
      if (cancelMin > scheduledStartMin && cancelMin < scheduledEndMin) {
        effectiveFreeStartMin = cancelMin;
      }
    }

    // Find subsequent active bookings for the same service on that day
    const subsequentBookings = await Booking.find({
      date: cancelledBooking.date,
      serviceId: cancelledBooking.serviceId,
      status: { $in: ['pending', 'confirmed'] }, // Only pending or confirmed (NEVER completed, past, or cancelled)
      _id: { $ne: cancelledBooking._id },
      id: { $ne: cancelledBooking.id },
    }).sort({ scheduledStart: 1, timeSlotStart: 1 });

    let currentAnchorMin = effectiveFreeStartMin;

    for (const b of subsequentBookings) {
      const bStartMin = timeStringToMinutes(b.scheduledStart || b.timeSlotStart);
      const bOccupiedMin = b.totalOccupiedMinutes || (b.duration || 45) + (b.travelTimeMinutes || 15);

      // Only consider bookings scheduled AFTER our currentAnchorMin
      if (bStartMin <= currentAnchorMin) {
        continue;
      }

      const candidateNewStartMin = currentAnchorMin;
      const candidateNewEndMin = candidateNewStartMin + bOccupiedMin;

      // Check safety: within working hours
      if (candidateNewEndMin > workEndMin) {
        break; // Cannot fit
      }

      // Check safety: must not conflict with any other existing booking
      // Exclude both self and the cancelled booking being vacated
      const otherBookings = await Booking.find({
        date: b.date,
        serviceId: b.serviceId,
        status: { $nin: ['cancelled'] },
        _id: { $nin: [b._id, cancelledBooking._id] },
        id: { $nin: [b.id, cancelledBooking.id] },
      });

      let hasCollision = false;
      for (const ob of otherBookings) {
        const obStart = timeStringToMinutes(ob.scheduledStart || ob.timeSlotStart);
        const obEnd = obStart + (ob.totalOccupiedMinutes || 60);
        if (doIntervalsOverlap(candidateNewStartMin, candidateNewEndMin, obStart, obEnd)) {
          hasCollision = true;
          break;
        }
      }

      if (!hasCollision) {
        // Shift this booking forward!
        const { time12: newTime12, time24: newTime24 } = minutesToDisplayTime(candidateNewStartMin);
        const { time24: newEnd24 } = minutesToDisplayTime(candidateNewEndMin);
        const previousTime = b.time;

        b.scheduledStart = newTime24;
        b.scheduledEnd = newEnd24;
        b.timeSlotStart = newTime24;
        b.time = newTime12;
        b.rescheduledFrom = previousTime;

        b.timeline.push({
          status: b.status,
          label: 'إعادة جدولة ديناميكية',
          labelEn: 'Dynamic Rescheduling',
          timestamp: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
          completed: true,
          description: `تم تقديم موعد الحجز تلقائياً من (${previousTime}) إلى (${newTime12}) إثر إلغاء حجز سابق.`,
          descriptionEn: `Appointment compressed earlier from ${previousTime} to ${newTime12} due to schedule gap.`,
          changedBy,
        });

        await b.save();

        shiftedBookings.push({
          orderId: b.id,
          previousStart: previousTime,
          newStart: newTime12,
        });

        // Log to Audit Trail
        await AuditLog.create({
          adminId: 'system-scheduler',
          adminName: changedBy,
          adminRole: 'system',
          action: 'إعادة جدولة وضغط تلقائي للمواعيد',
          module: 'bookings',
          target: b.id,
          details: `تم تقديم موعد الطلب (${b.id}) من ${previousTime} إلى ${newTime12} بعد إلغاء الطلب (${cancelledBooking.id})`,
          metadata: {
            orderId: b.id,
            cancelledOrderId: cancelledBooking.id,
            previousStart: previousTime,
            newStart: newTime12,
          },
        });

        // Advance anchor to end of this newly shifted booking
        currentAnchorMin = candidateNewEndMin;
      } else {
        // Stop sequential shifting if a collision or immovable booking is hit
        break;
      }
    }
  } catch (err) {
    console.error('[ScheduleCompression] Error compressing schedule:', err);
  }

  return shiftedBookings;
}
