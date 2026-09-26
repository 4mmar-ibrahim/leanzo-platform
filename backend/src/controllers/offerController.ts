import { Request, Response } from 'express';
import { Offer, IOffer } from '../models/Offer.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Compute the lifecycle status of an offer:
 * - 'disabled': Manually disabled or deleted/archived
 * - 'scheduled': Start date is in the future
 * - 'expired': End date has passed
 * - 'active': Currently running and valid for use
 */
export function computeOfferStatus(offer: {
  active?: boolean;
  isArchived?: boolean;
  startDate?: string;
  expiresAt: string;
}): 'active' | 'scheduled' | 'expired' | 'disabled' {
  if (offer.isArchived || offer.active === false) {
    return 'disabled';
  }

  const today = new Date().toISOString().split('T')[0];

  if (offer.startDate && today < offer.startDate) {
    return 'scheduled';
  }

  if (today > offer.expiresAt) {
    return 'expired';
  }

  return 'active';
}

/**
 * Customer Website API: Get only genuinely active, non-expired, and non-scheduled offers
 */
export async function getPublicOffers(req: Request, res: Response): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const offers = await Offer.find({
      isArchived: { $ne: true },
      active: true,
      expiresAt: { $gte: today },
      $or: [
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: '' },
        { startDate: { $lte: today } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = offers.map((o) => ({
      ...o,
      computedStatus: 'active',
    }));

    sendSuccess(res, enriched, 'تم جلب العروض النشطة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin API: Get all offers with computed lifecycle status and backend filters
 */
export async function getAllOffersAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { status, category, search, includeArchived } = req.query;
    const filter: any = includeArchived === 'true' ? {} : { isArchived: { $ne: true } };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { titleEn: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const rawOffers = await Offer.find(filter).sort({ createdAt: -1 }).lean();

    const enrichedOffers = rawOffers.map((o) => {
      const computed = computeOfferStatus(o as any);
      return {
        ...o,
        status: computed,
        computedStatus: computed,
      };
    });

    const filtered =
      status && status !== 'all'
        ? enrichedOffers.filter((o) => o.computedStatus === status)
        : enrichedOffers;

    sendSuccess(res, filtered, 'تم جلب قائمة العروض بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin API: Create new Promotional Offer
 */
export async function createOffer(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body;
    const offerCode = (data.code || data.promoCode || '').trim().toUpperCase();
    const discountPct = data.discountPercentage !== undefined ? data.discountPercentage : data.discountValue;
    const expiration = data.expiresAt || data.endDate;
    const offerImage = data.image ? data.image.trim() : 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31';

    if (!data.title || !offerCode || discountPct === undefined || !expiration) {
      sendError(res, 'يرجى استكمال البيانات المطلوبة لإنشاء العرض (العنوان، الكود، النسبة، وتاريخ الانتهاء)', 422, 'MISSING_OFFER_FIELDS');
      return;
    }

    // Strict validation against raw Base64
    if (offerImage.startsWith('data:image')) {
      sendError(
        res,
        'لا يُسمح بتخزين صور بصيغة Base64 في قاعدة البيانات. يرجى رفع الصورة عبر زر رفع الصورة المخصص لحفظها في خادم التخزين والحفاظ على مرجع الرابط فقط.',
        422,
        'BASE64_NOT_ALLOWED'
      );
      return;
    }

    const cleanCode = offerCode;

    // Check duplicate code among active offers
    const existingCode = await Offer.findOne({ code: cleanCode, isArchived: false });
    if (existingCode) {
      sendError(res, `كود الخصم (${cleanCode}) مسجل ومستخدم مسبقاً لعرض آخر`, 409, 'DUPLICATE_CODE');
      return;
    }

    const parsedUsageLimit = data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit !== ''
      ? Number(data.usageLimit)
      : null;

    const today = new Date().toISOString().split('T')[0];
    const offerId = data.id || `off-${Date.now()}`;

    const newOffer = await Offer.create({
      ...data,
      id: offerId,
      code: cleanCode,
      discountPercentage: discountPct,
      startDate: data.startDate || today,
      expiresAt: expiration,
      image: offerImage,
      usageLimit: parsedUsageLimit,
      active: data.active !== undefined ? Boolean(data.active) : true,
      isArchived: false,
    });

    const enriched = {
      ...newOffer.toObject(),
      computedStatus: computeOfferStatus(newOffer as any),
    };

    sendSuccess(res, enriched, 'تم إنشاء العرض الترويجي بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin API: Update existing Promotional Offer
 */
export async function updateOffer(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.usageLimit !== undefined) {
      updates.usageLimit = updates.usageLimit === '' || updates.usageLimit === null ? null : Number(updates.usageLimit);
    }

    if (updates.code) {
      updates.code = updates.code.trim().toUpperCase();
      // Check code collision with another offer
      const collision = await Offer.findOne({
        code: updates.code,
        id: { $ne: id },
        isArchived: false,
      });
      if (collision) {
        sendError(res, `كود الخصم (${updates.code}) مستخدم لعرض آخر بالفعل`, 409, 'DUPLICATE_CODE');
        return;
      }
    }

    // Strict validation against raw Base64
    if (updates.image && typeof updates.image === 'string' && updates.image.startsWith('data:image')) {
      sendError(
        res,
        'لا يُسمح بتخزين صور بصيغة Base64 في قاعدة البيانات. يرجى استخدام أداة رفع الصور المعتمدة.',
        422,
        'BASE64_NOT_ALLOWED'
      );
      return;
    }

    const existing = await Offer.findOne({ id });
    if (!existing) {
      sendError(res, 'العرض غير موجود', 404, 'OFFER_NOT_FOUND');
      return;
    }

    (req as any).auditBefore = existing.toObject ? existing.toObject() : existing;

    const updated = await Offer.findOneAndUpdate({ id }, updates, { new: true });
    if (!updated) {
      sendError(res, 'العرض غير موجود', 404, 'OFFER_NOT_FOUND');
      return;
    }

    (req as any).auditAfter = updated.toObject ? updated.toObject() : updated;

    const enriched = {
      ...updated.toObject(),
      computedStatus: computeOfferStatus(updated as any),
    };

    sendSuccess(res, enriched, 'تم تحديث العرض بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin API: Toggle active state of offer
 */
export async function toggleOfferActive(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await Offer.findOne({ id });
    if (!existing) {
      sendError(res, 'العرض غير موجود', 404, 'OFFER_NOT_FOUND');
      return;
    }

    existing.active = !existing.active;
    await existing.save();

    const enriched = {
      ...existing.toObject(),
      computedStatus: computeOfferStatus(existing as any),
    };

    sendSuccess(
      res,
      enriched,
      existing.active ? 'تم تفعيل العرض بنجاح' : 'تم تعطيل العرض بنجاح'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin API: Hard Delete Promotional Offer permanently from database
 */
export async function deleteOffer(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await Offer.findOne({ id });
    if (!existing) {
      sendError(res, 'العرض غير موجود', 404, 'OFFER_NOT_FOUND');
      return;
    }

    (req as any).auditBefore = existing.toObject ? existing.toObject() : existing;

    await Offer.deleteOne({ id });

    (req as any).auditAfter = { deleted: true, id };

    sendSuccess(res, { id, deleted: true }, 'تم حذف العرض نهائياً من قاعدة البيانات بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
