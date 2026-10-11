import { Request, Response } from 'express';
import { getAvailableSlots, assertSlotAvailability } from '../services/availabilityService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function checkDateAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { date, duration, serviceId, serviceIds, excludeBookingId, category, includeUnavailable } = req.query;
    if (!date || typeof date !== 'string') {
      sendError(res, 'يرجى تحديد التاريخ المراد فحصه (YYYY-MM-DD)', 422);
      return;
    }

    const durationNum = duration ? parseInt(duration as string, 10) : undefined;
    const parsedServiceIds = typeof serviceIds === 'string'
      ? serviceIds.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(serviceIds)
      ? (serviceIds as string[])
      : undefined;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const isIncludeUnavailable = includeUnavailable === 'true';
    const result = await getAvailableSlots(
      date,
      serviceId as string,
      durationNum,
      parsedServiceIds,
      excludeBookingId as string | undefined,
      category as string | undefined,
      isIncludeUnavailable
    );

    // Ensure unavailable slots are stripped out unless specifically requested
    if (!isIncludeUnavailable || req.query.availableOnly === 'true') {
      result.slots = result.slots.filter((s) => s.available);
    }

    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function validateSlot(req: Request, res: Response): Promise<void> {
  try {
    const { date, time, duration, serviceId, serviceIds, category } = req.body;
    if (!date || !time) {
      sendError(res, 'يرجى تحديد التاريخ والوقت المراد التحقق منهما', 422);
      return;
    }

    const durationNum = duration ? parseInt(duration, 10) : undefined;
    const parsedServiceIds = typeof serviceIds === 'string'
      ? serviceIds.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(serviceIds)
      ? (serviceIds as string[])
      : undefined;

    const timing = await assertSlotAvailability({
      dateStr: date,
      timeStr: time,
      serviceId: (serviceId as string) || (parsedServiceIds?.[0] || ''),
      serviceIds: parsedServiceIds,
      category: category as string | undefined,
      customDuration: durationNum,
    });

    sendSuccess(res, { valid: true, timing, message: 'الموعد متاح للحجز' });
  } catch (err: any) {
    sendError(res, err.message, 409, 'TIME_SLOT_UNAVAILABLE');
  }
}
