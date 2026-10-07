import { Request, Response } from 'express';
import { Service } from '../models/Service.js';
import { Offer } from '../models/Offer.js';
import { ServiceCategory } from '../models/ServiceCategory.js';
import { ServicePackage } from '../models/ServicePackage.js';
import { ServiceAddon } from '../models/ServiceAddon.js';
import { Booking } from '../models/Booking.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export async function getPublicServices(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;
    const filter: any = { isArchived: { $ne: true }, available: true, active: { $ne: false } };
    if (category && typeof category === 'string' && category !== 'all') {
      filter.category = category.trim();
    }

    const services = await Service.find(filter).sort({ order: 1, createdAt: 1 });
    const serviceIds = services.map((s: any) => s.id);

    const [allPackages, allAddons] = await Promise.all([
      ServicePackage.find({ serviceId: { in: serviceIds }, active: true }).sort({ order: 1, createdAt: 1 }),
      ServiceAddon.find({ serviceId: { in: serviceIds }, active: true }).sort({ order: 1, createdAt: 1 }),
    ]);

    const servicesWithRelations = services.map((s: any) => {
      const sObj = s.toObject ? s.toObject() : { ...s };
      sObj.packages = allPackages.filter((p: any) => p.serviceId === s.id);
      sObj.addons = allAddons.filter((a: any) => a.serviceId === s.id);
      return sObj;
    });

    sendSuccess(res, servicesWithRelations);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getServiceById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { category } = req.query;
    const filter: any = { id, isArchived: { $ne: true } };
    if (category && typeof category === 'string' && category !== 'all') {
      filter.category = category.trim();
    }

    const service = await Service.findOne(filter);
    if (!service) {
      sendError(res, 'الخدمة غير موجودة أو تم حذفها أو لا تنتمي لهذا القسم', 404, 'SERVICE_NOT_FOUND');
      return;
    }

    const [packages, addons] = await Promise.all([
      ServicePackage.find({ serviceId: service.id, active: true }).sort({ order: 1, createdAt: 1 }),
      ServiceAddon.find({ serviceId: service.id, active: true }).sort({ order: 1, createdAt: 1 }),
    ]);

    const serviceObj = service.toObject ? service.toObject() : { ...service };
    serviceObj.packages = packages;
    serviceObj.addons = addons;

    sendSuccess(res, serviceObj);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAllServicesAdmin(req: Request, res: Response): Promise<void> {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const { category } = req.query;
    const filter: any = includeArchived ? {} : { isArchived: { $ne: true } };
    if (category && typeof category === 'string' && category !== 'all') {
      filter.category = category.trim();
    }
    const services = await Service.find(filter).sort({ order: 1, createdAt: 1 });
    const serviceIds = services.map((s: any) => s.id);

    const [allPackages, allAddons] = await Promise.all([
      ServicePackage.find({ serviceId: { in: serviceIds } }).sort({ order: 1, createdAt: 1 }),
      ServiceAddon.find({ serviceId: { in: serviceIds } }).sort({ order: 1, createdAt: 1 }),
    ]);

    const servicesWithRelations = services.map((s: any) => {
      const sObj = s.toObject ? s.toObject() : { ...s };
      sObj.packages = allPackages.filter((p: any) => p.serviceId === s.id);
      sObj.addons = allAddons.filter((a: any) => a.serviceId === s.id);
      return sObj;
    });

    sendSuccess(res, servicesWithRelations);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// In-memory idempotency cache and concurrent request mutex
const idempotencyCache = new Map<string, { service: any; timestamp: number }>();
const inFlightCreations = new Map<string, Promise<any>>();

// Periodically clean up expired idempotency cache entries (5-minute TTL)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of idempotencyCache.entries()) {
    if (now - val.timestamp > 5 * 60 * 1000) {
      idempotencyCache.delete(key);
    }
  }
}, 10 * 60 * 1000).unref?.();

export async function createService(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body;
    const {
      packages: incomingPackages,
      addons: incomingAddons,
      idempotencyKey: bodyIdempotencyKey,
      ...serviceData
    } = data;
    delete (serviceData as any).idempotencyKey;

    const servicePrice = serviceData.price !== undefined ? serviceData.price : serviceData.basePrice;
    if (!serviceData.title || !serviceData.category || servicePrice === undefined) {
      sendError(res, 'يرجى استكمال البيانات الأساسية للخدمة (العنوان، التصنيف، السعر)', 422);
      return;
    }
    serviceData.price = Number(servicePrice);
    serviceData.category = String(serviceData.category).trim();
    const normalizedTitle = String(serviceData.title).trim();

    // 1. Idempotency Key check
    const idempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      bodyIdempotencyKey ||
      data.idempotencyKey;

    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey)!;
      sendSuccess(res, cached.service, 'تم استرجاع الخدمة المنشأة بنجاح (idempotent)', 200);
      return;
    }

    // 2. In-flight request deduplication lock (checked and set synchronously before any await)
    const lockKey = idempotencyKey || `${serviceData.category}:${normalizedTitle.toLowerCase()}`;
    if (inFlightCreations.has(lockKey)) {
      try {
        const inFlightResult = await inFlightCreations.get(lockKey);
        sendSuccess(res, inFlightResult, 'تم إنشاء الخدمة بنجاح (deduplicated)', 200);
        return;
      } catch (err: any) {
        // If in-flight failed, proceed to try creation
      }
    }

    // Wrap the entire check and creation in creationPromise and register in map synchronously
    const creationPromise = (async () => {
      // 3. Short debounce window check (10 seconds) for identical title & category
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const existingRecent = await Service.findOne({
        category: serviceData.category,
        title: normalizedTitle,
        createdAt: { $gte: tenSecondsAgo },
        isArchived: { $ne: true },
      });

      if (existingRecent) {
        const [existingPackages, existingAddons] = await Promise.all([
          ServicePackage.find({ serviceId: existingRecent.id, active: true }).sort({ order: 1, createdAt: 1 }),
          ServiceAddon.find({ serviceId: existingRecent.id, active: true }).sort({ order: 1, createdAt: 1 }),
        ]);
        const resObj = existingRecent.toObject ? existingRecent.toObject() : { ...existingRecent };
        resObj.packages = existingPackages;
        resObj.addons = existingAddons;
        if (idempotencyKey) {
          idempotencyCache.set(idempotencyKey, { service: resObj, timestamp: Date.now() });
        }
        return resObj;
      }

      const count = await Service.countDocuments();
      const serviceId = serviceData.id || `srv-${Date.now()}`;

      // Check if serviceId already exists (e.g. client provided id)
      const existingById = await Service.findOne({ id: serviceId });
      if (existingById) {
        const [existingPackages, existingAddons] = await Promise.all([
          ServicePackage.find({ serviceId: existingById.id }).sort({ order: 1, createdAt: 1 }),
          ServiceAddon.find({ serviceId: existingById.id }).sort({ order: 1, createdAt: 1 }),
        ]);
        const resObj = existingById.toObject ? existingById.toObject() : { ...existingById };
        resObj.packages = existingPackages;
        resObj.addons = existingAddons;
        return resObj;
      }

      const defaultServiceImage =
        serviceData.category === 'home'
          ? 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80';

      const newService = await Service.create({
        ...serviceData,
        title: normalizedTitle,
        id: serviceId,
        image: serviceData.image || defaultServiceImage,
        order: serviceData.order ?? count,
        isArchived: false,
        originalPrice: null,
        discount: 0,
      });

      const createdPackages: any[] = [];
      if (Array.isArray(incomingPackages) && incomingPackages.length > 0) {
        for (let i = 0; i < incomingPackages.length; i++) {
          const p = incomingPackages[i];
          if (p.name && p.price !== undefined) {
            const isPkgActive = p.active !== undefined ? Boolean(p.active) : (p.isActive !== undefined ? Boolean(p.isActive) : true);
            const cp = await ServicePackage.create({
              serviceId,
              name: String(p.name).trim(),
              nameEn: p.nameEn ? String(p.nameEn).trim() : '',
              description: p.description ? String(p.description).trim() : '',
              descriptionEn: p.descriptionEn ? String(p.descriptionEn).trim() : '',
              price: Number(p.price) || 0,
              originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
              durationMinutes: Math.max(1, Number(p.durationMinutes) || 45),
              active: isPkgActive,
              order: p.order !== undefined ? Number(p.order) : i,
            });
            createdPackages.push(cp);
          }
        }
      }

      const createdAddons: any[] = [];
      if (Array.isArray(incomingAddons) && incomingAddons.length > 0) {
        for (let i = 0; i < incomingAddons.length; i++) {
          const a = incomingAddons[i];
          if (a.name && a.price !== undefined) {
            const isAddonActive = a.active !== undefined ? Boolean(a.active) : (a.isActive !== undefined ? Boolean(a.isActive) : true);
            const ca = await ServiceAddon.create({
              serviceId,
              name: String(a.name).trim(),
              nameEn: a.nameEn ? String(a.nameEn).trim() : '',
              description: a.description ? String(a.description).trim() : '',
              descriptionEn: a.descriptionEn ? String(a.descriptionEn).trim() : '',
              price: Number(a.price) || 0,
              durationMinutes: Math.max(0, Number(a.durationMinutes) || 15),
              active: isAddonActive,
              order: a.order !== undefined ? Number(a.order) : i,
            });
            createdAddons.push(ca);
          }
        }
      }

      const resObj = newService.toObject ? newService.toObject() : { ...newService };
      resObj.packages = createdPackages;
      resObj.addons = createdAddons;

      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, { service: resObj, timestamp: Date.now() });
      }

      return resObj;
    })();

    inFlightCreations.set(lockKey, creationPromise);
    try {
      const result = await creationPromise;
      sendSuccess(res, result, 'تم إنشاء الخدمة بنجاح مع باقاتها وإضافاتها', 201);
    } finally {
      inFlightCreations.delete(lockKey);
    }
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateService(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { packages: incomingPackages, addons: incomingAddons, ...serviceUpdates } = req.body;

    serviceUpdates.originalPrice = null;
    serviceUpdates.discount = 0;

    if (serviceUpdates.category) {
      serviceUpdates.category = String(serviceUpdates.category).trim();
    }

    const existing = await Service.findOne({ id });
    if (!existing) {
      sendError(res, 'الخدمة غير موجودة', 404);
      return;
    }
    (req as any).auditBefore = existing.toObject ? existing.toObject() : existing;

    const service = await Service.findOneAndUpdate({ id }, serviceUpdates, { new: true });
    if (!service) {
      sendError(res, 'الخدمة غير موجودة', 404);
      return;
    }
    (req as any).auditAfter = service.toObject ? service.toObject() : service;

    sendSuccess(res, service, 'تم تحديث الخدمة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function deleteService(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await Service.findOne({ id });
    if (!existing) {
      sendError(res, 'الخدمة غير موجودة', 404);
      return;
    }
    (req as any).auditBefore = existing.toObject ? existing.toObject() : existing;

    // 1. Delete all packages belonging to this service
    await ServicePackage.deleteMany({ serviceId: id });

    // 2. Delete all add-ons belonging to this service
    await ServiceAddon.deleteMany({ serviceId: id });

    // 3. Unlink any offers pointing directly to this service
    await Offer.updateMany(
      { serviceId: id },
      { serviceId: '', active: false }
    );

    // 4. Hard delete the service itself from PostgreSQL database
    await Service.deleteOne({ id });

    (req as any).auditAfter = { deleted: true, id };

    sendSuccess(res, { id, deleted: true }, 'تم حذف الخدمة وجميع باقاتها وإضافاتها نهائياً بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// ==========================================
// PACKAGE CRUD (ADMIN & PUBLIC)
// ==========================================

export async function getServicePackages(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const filter: any = { serviceId: id };
    if (req.query.activeOnly === 'true') {
      filter.active = true;
    }
    const packages = await ServicePackage.find(filter).sort({ order: 1, createdAt: 1 });
    sendSuccess(res, packages);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function createServicePackage(req: Request, res: Response): Promise<void> {
  try {
    const { id: serviceId } = req.params;
    const { name, nameEn, description, descriptionEn, price, originalPrice, durationMinutes, active, order } = req.body;

    if (!name || price === undefined || price === null) {
      sendError(res, 'اسم الباقة وسعرها مطلوبان', 422);
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      sendError(res, 'سعر الباقة يجب أن يكون رقماً موجباً', 422);
      return;
    }

    const service = await Service.findOne({ id: serviceId, isArchived: { $ne: true } });
    if (!service) {
      sendError(res, 'الخدمة التابعة لهذه الباقة غير موجودة', 404);
      return;
    }

    const count = await ServicePackage.countDocuments({ serviceId });
    const numOriginal = originalPrice !== undefined && originalPrice !== null ? Number(originalPrice) : undefined;
    const numDuration = durationMinutes !== undefined && durationMinutes !== null ? Math.max(1, Number(durationMinutes)) : 45;

    const isPkgActive = active !== undefined ? Boolean(active) : (req.body.isActive !== undefined ? Boolean(req.body.isActive) : true);

    const newPackage = await ServicePackage.create({
      serviceId,
      name: String(name).trim(),
      nameEn: nameEn ? String(nameEn).trim() : '',
      description: description ? String(description).trim() : '',
      descriptionEn: descriptionEn ? String(descriptionEn).trim() : '',
      price: numPrice,
      originalPrice: numOriginal,
      durationMinutes: numDuration,
      active: isPkgActive,
      order: order !== undefined ? Number(order) : count,
    });

    (req as any).auditAfter = newPackage.toObject ? newPackage.toObject() : newPackage;

    sendSuccess(res, newPackage, 'تم إنشاء باقة الخدمة بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateServicePackage(req: Request, res: Response): Promise<void> {
  try {
    const packageId = req.params.packageId || req.params.id;
    const serviceId = req.params.packageId ? req.params.id : undefined;
    const updates = req.body;

    const query: any = { id: packageId };
    if (serviceId) {
      query.serviceId = serviceId;
    }

    const existing = await ServicePackage.findOne(query);
    if (!existing) {
      sendError(res, 'الباقة غير موجودة أو لا تنتمي لهذه الخدمة', 404);
      return;
    }

    (req as any).auditBefore = existing.toObject ? existing.toObject() : existing;

    const sanitizedUpdates: any = {};
    if (updates.name !== undefined) sanitizedUpdates.name = String(updates.name).trim();
    if (updates.nameEn !== undefined) sanitizedUpdates.nameEn = String(updates.nameEn).trim();
    if (updates.description !== undefined) sanitizedUpdates.description = String(updates.description).trim();
    if (updates.descriptionEn !== undefined) sanitizedUpdates.descriptionEn = String(updates.descriptionEn).trim();
    if (updates.price !== undefined) {
      const p = Number(updates.price);
      if (isNaN(p) || p < 0) {
        sendError(res, 'سعر الباقة يجب أن يكون رقماً موجباً', 422);
        return;
      }
      sanitizedUpdates.price = p;
    }
    if (updates.originalPrice !== undefined) {
      sanitizedUpdates.originalPrice = updates.originalPrice ? Number(updates.originalPrice) : null;
    }
    if (updates.durationMinutes !== undefined) {
      sanitizedUpdates.durationMinutes = Math.max(1, Number(updates.durationMinutes) || 45);
    }
    if (updates.active !== undefined || updates.isActive !== undefined) {
      sanitizedUpdates.active = Boolean(updates.active !== undefined ? updates.active : updates.isActive);
    }
    if (updates.order !== undefined) sanitizedUpdates.order = Number(updates.order);

    const updated = await ServicePackage.findOneAndUpdate(
      { id: packageId },
      sanitizedUpdates,
      { new: true }
    );

    (req as any).auditAfter = updated.toObject ? updated.toObject() : updated;

    sendSuccess(res, updated, 'تم تحديث بيانات الباقة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function deleteServicePackage(req: Request, res: Response): Promise<void> {
  try {
    const packageId = req.params.packageId || req.params.id;
    const serviceId = req.params.packageId ? req.params.id : undefined;

    const query: any = { id: packageId };
    if (serviceId) {
      query.serviceId = serviceId;
    }

    const existing = await ServicePackage.findOne(query);
    if (!existing) {
      sendError(res, 'الباقة غير موجودة أو لا تنتمي لهذه الخدمة', 404);
      return;
    }

    (req as any).auditBefore = existing.toObject ? existing.toObject() : existing;

    // Referential Protection: If bookings reference this package, soft-deactivate instead of hard delete
    const isReferencedInBooking = await Booking.findOne({ packageId: existing.id });
    if (isReferencedInBooking) {
      existing.active = false;
      await existing.save();
      (req as any).auditAfter = { deactivated: true, id: packageId };
      sendSuccess(res, { id: packageId, deactivated: true }, 'تم إيقاف تفعيل الباقة لوجود حجوزات سابقة مرتبطة بها');
      return;
    }

    // Hard delete the package permanently from PostgreSQL database
    await ServicePackage.deleteOne({ id: packageId });
    (req as any).auditAfter = { deleted: true, id: packageId };
    sendSuccess(res, { id: packageId, deleted: true }, 'تم حذف الباقة نهائياً بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// ==========================================
// ADD-ON CRUD (ADMIN & PUBLIC)
// ==========================================

export async function getServiceAddons(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const filter: any = { serviceId: id };
    if (req.query.activeOnly === 'true') {
      filter.active = true;
    }
    const addons = await ServiceAddon.find(filter).sort({ order: 1, createdAt: 1 });
    sendSuccess(res, addons);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function createServiceAddon(req: Request, res: Response): Promise<void> {
  try {
    const { id: serviceId } = req.params;
    const { name, nameEn, description, descriptionEn, price, durationMinutes, active, order } = req.body;

    if (!name || price === undefined || price === null) {
      sendError(res, 'اسم الإضافة وسعرها مطلوبان', 422);
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      sendError(res, 'سعر الإضافة يجب أن يكون رقماً موجباً', 422);
      return;
    }

    const service = await Service.findOne({ id: serviceId, isArchived: { $ne: true } });
    if (!service) {
      sendError(res, 'الخدمة التابعة لهذه الإضافة غير موجودة', 404);
      return;
    }

    const count = await ServiceAddon.countDocuments({ serviceId });
    const numDuration = durationMinutes !== undefined && durationMinutes !== null ? Math.max(0, Number(durationMinutes)) : 15;

    const isAddonActive = active !== undefined ? Boolean(active) : (req.body.isActive !== undefined ? Boolean(req.body.isActive) : true);

    const newAddon = await ServiceAddon.create({
      serviceId,
      name: String(name).trim(),
      nameEn: nameEn ? String(nameEn).trim() : '',
      description: description ? String(description).trim() : '',
      descriptionEn: descriptionEn ? String(descriptionEn).trim() : '',
      price: numPrice,
      durationMinutes: numDuration,
      active: isAddonActive,
      order: order !== undefined ? Number(order) : count,
    });

    (req as any).auditAfter = newAddon.toObject ? newAddon.toObject() : newAddon;

    sendSuccess(res, newAddon, 'تم إنشاء الإضافة بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateServiceAddon(req: Request, res: Response): Promise<void> {
  try {
    const addonId = req.params.addonId || req.params.id;
    const serviceId = req.params.addonId ? req.params.id : undefined;
    const updates = req.body;

    const query: any = { id: addonId };
    if (serviceId) {
      query.serviceId = serviceId;
    }

    const existing = await ServiceAddon.findOne(query);
    if (!existing) {
      sendError(res, 'الإضافة غير موجودة أو لا تنتمي لهذه الخدمة', 404);
      return;
    }

    (req as any).auditBefore = existing.toObject ? existing.toObject() : existing;

    const sanitizedUpdates: any = {};
    if (updates.name !== undefined) sanitizedUpdates.name = String(updates.name).trim();
    if (updates.nameEn !== undefined) sanitizedUpdates.nameEn = String(updates.nameEn).trim();
    if (updates.description !== undefined) sanitizedUpdates.description = String(updates.description).trim();
    if (updates.descriptionEn !== undefined) sanitizedUpdates.descriptionEn = String(updates.descriptionEn).trim();
    if (updates.price !== undefined) {
      const p = Number(updates.price);
      if (isNaN(p) || p < 0) {
        sendError(res, 'سعر الإضافة يجب أن يكون رقماً موجباً', 422);
        return;
      }
      sanitizedUpdates.price = p;
    }
    if (updates.durationMinutes !== undefined) {
      sanitizedUpdates.durationMinutes = Math.max(0, Number(updates.durationMinutes) || 0);
    }
    if (updates.active !== undefined || updates.isActive !== undefined) {
      sanitizedUpdates.active = Boolean(updates.active !== undefined ? updates.active : updates.isActive);
    }
    if (updates.order !== undefined) sanitizedUpdates.order = Number(updates.order);

    const updated = await ServiceAddon.findOneAndUpdate(
      { id: addonId },
      sanitizedUpdates,
      { new: true }
    );

    (req as any).auditAfter = updated.toObject ? updated.toObject() : updated;

    sendSuccess(res, updated, 'تم تحديث بيانات الإضافة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function deleteServiceAddon(req: Request, res: Response): Promise<void> {
  try {
    const addonId = req.params.addonId || req.params.id;
    const serviceId = req.params.addonId ? req.params.id : undefined;

    const query: any = { id: addonId };
    if (serviceId) {
      query.serviceId = serviceId;
    }

    const existing = await ServiceAddon.findOne(query);
    if (!existing) {
      sendError(res, 'الإضافة غير موجودة أو لا تنتمي لهذه الخدمة', 404);
      return;
    }

    (req as any).auditBefore = existing.toObject ? existing.toObject() : existing;

    // Referential Protection: If bookings reference this addon, soft-deactivate instead of hard delete
    const allBookings = await Booking.find({ status: { $ne: 'cancelled' } });
    const isReferencedInBooking = allBookings.some((b: any) => {
      if (!b.addons) return false;
      let addonList = b.addons;
      if (typeof addonList === 'string') {
        try { addonList = JSON.parse(addonList); } catch { addonList = []; }
      }
      return Array.isArray(addonList) && addonList.some((a: any) => a.id === existing.id || a._id === existing.id);
    });

    if (isReferencedInBooking) {
      existing.active = false;
      await existing.save();
      (req as any).auditAfter = { deactivated: true, id: addonId };
      sendSuccess(res, { id: addonId, deactivated: true }, 'تم إيقاف تفعيل الإضافة لوجود حجوزات سابقة مرتبطة بها');
      return;
    }

    // Hard delete the addon permanently from PostgreSQL database
    await ServiceAddon.deleteOne({ id: addonId });
    (req as any).auditAfter = { deleted: true, id: addonId };
    sendSuccess(res, { id: addonId, deleted: true }, 'تم حذف الإضافة نهائياً بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// ==========================================
// CATEGORIES
// ==========================================

export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await ServiceCategory.find().sort({ order: 1 });
    sendSuccess(res, categories || []);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const data = { ...req.body };
    if (!data.name || !data.slug) {
      sendError(res, 'اسم التصنيف والمعرف البرمجي (Slug) مطلوبان', 400);
      return;
    }

    const normalizedSlug = data.slug.toLowerCase().trim().replace(/\s+/g, '-');
    data.slug = normalizedSlug;
    if (!data.id) {
      data.id = normalizedSlug;
    }
    if (!data.nameEn) {
      data.nameEn = data.name;
    }

    // Check if category with same id or slug already exists
    const existing = await ServiceCategory.findOne({
      $or: [{ id: data.id }, { slug: data.slug }],
    });
    if (existing) {
      sendError(res, 'يوجد تصنيف آخر بالفعل بنفس المعرف البرمجي (Slug) أو المعرف', 409);
      return;
    }

    const newCat = await ServiceCategory.create(data);
    sendSuccess(res, newCat, 'تم إنشاء التصنيف بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.slug) {
      updateData.slug = updateData.slug.toLowerCase().trim().replace(/\s+/g, '-');
    }
    if (!updateData.nameEn && updateData.name) {
      updateData.nameEn = updateData.name;
    }

    const updated = await ServiceCategory.findOneAndUpdate(
      { $or: [{ id }, { slug: id }] },
      updateData,
      { new: true }
    );
    if (!updated) {
      sendError(res, 'التصنيف غير موجود', 404);
      return;
    }
    sendSuccess(res, updated, 'تم تحديث التصنيف بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const cat = await ServiceCategory.findOneAndDelete({ $or: [{ id }, { slug: id }] });
    if (!cat) {
      sendError(res, 'التصنيف غير موجود', 404);
      return;
    }
    sendSuccess(res, { id, deleted: true }, 'تم حذف تصنيف الخدمة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
