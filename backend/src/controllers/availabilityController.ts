import { Request, Response } from 'express';
import { getAvailableSlots, assertSlotAvailability } from '../services/availabilityService.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function checkDateAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { date, duration, serviceId } = req.query;
    if (!date || typeof date !== 'string') {
      sendError(res, 'يرجى تحديد التاريخ المراد فحصه (YYYY-MM-DD)', 422);
      return;
    }

    const durationNum = duration ? parseInt(duration as string, 10) : undefined;
    const result = await getAvailableSlots(date, serviceId as string, durationNum);
    sendSuccess(res, result);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function validateSlot(req: Request, res: Response): Promise<void> {
  try {
    const { date, time, duration, serviceId } = req.body;
    if (!date || !time) {
      sendError(res, 'يرجى تحديد التاريخ والوقت المراد التحقق منهما', 422);
      return;
    }

    const durationNum = duration ? parseInt(duration, 10) : undefined;
    const timing = await assertSlotAvailability({
      dateStr: date,
      timeStr: time,
      serviceId: (serviceId as string) || '',
      customDuration: durationNum,
    });

    sendSuccess(res, { valid: true, timing, message: 'الموعد متاح للحجز' });
  } catch (err: any) {
    sendError(res, err.message, 409, 'TIME_SLOT_UNAVAILABLE');
  }
}
