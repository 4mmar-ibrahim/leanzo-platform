import { Request, Response } from 'express';
import { LocationGovernorate } from '../models/Location.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

function getGovQuery(id: any) {
  const strId = Array.isArray(id) ? String(id[0] || '') : String(id || '');
  return { id: strId };
}

// Public: Get all active governorates with their active cities
export async function getPublicLocations(req: Request, res: Response): Promise<void> {
  try {
    const locations = await LocationGovernorate.find({ active: true }).sort({ order: 1, name: 1 });
    const filtered = locations.map((gov) => ({
      id: gov.id || (gov as any)._id,
      name: gov.name,
      nameEn: gov.nameEn,
      active: gov.active !== false,
      order: gov.order,
      cities: (gov.cities || [])
        .filter((c) => c.active !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((c) => ({
          id: c.id || (c as any)._id,
          name: c.name,
          nameEn: c.nameEn,
          active: c.active !== false,
          order: c.order,
          areas: (c.areas || []).filter((a) => a.active !== false),
        })),
    }));
    sendSuccess(res, filtered);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Public: Get cities for a specific active governorate
export async function getCitiesByGovernorate(req: Request, res: Response): Promise<void> {
  try {
    const { governorateId } = req.params;
    const gov = await LocationGovernorate.findOne({ ...getGovQuery(governorateId), active: true });
    if (!gov) {
      sendError(res, 'المحافظة غير موجودة أو غير مفعلة', 404);
      return;
    }

    const activeCities = (gov.cities || [])
      .filter((c) => c.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((c) => ({
        id: c.id || (c as any)._id,
        name: c.name,
        nameEn: c.nameEn,
        active: c.active !== false,
        order: c.order,
      }));

    sendSuccess(res, activeCities);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Get all governorates and all cities (both active and inactive)
export async function getAllLocationsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const locations = await LocationGovernorate.find().sort({ order: 1, createdAt: 1 });
    sendSuccess(res, locations);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Create new governorate
export async function createGovernorate(req: Request, res: Response): Promise<void> {
  try {
    const { id, name, nameEn, cities, order } = req.body;
    if (!name || !nameEn) {
      sendError(res, 'يرجى إدخال اسم المحافظة بالعربية والإنجليزية', 422);
      return;
    }

    const cleanedId = (id || nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
    const govId = cleanedId || `gov-${Date.now().toString().slice(-6)}`;
    const existing = await LocationGovernorate.findOne(getGovQuery(govId));
    if (existing) {
      sendError(res, 'هذه المحافظة مسجلة مسبقاً بنفس المعرف', 409);
      return;
    }

    const effectiveCities = Array.isArray(cities) ? cities : [];

    const newGov = await LocationGovernorate.create({
      id: govId,
      name,
      nameEn,
      cities: effectiveCities,
      active: true,
      order: order || 0,
    });

    sendSuccess(res, newGov, 'تم إنشاء المحافظة بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Update governorate details
export async function updateGovernorate(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, nameEn, active, order } = req.body;

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (nameEn !== undefined) updateFields.nameEn = nameEn;
    if (active !== undefined) updateFields.active = Boolean(active);
    if (order !== undefined) updateFields.order = Number(order);

    const updated = await LocationGovernorate.findOneAndUpdate(getGovQuery(id), { $set: updateFields }, { new: true });
    if (!updated) {
      sendError(res, 'المحافظة غير موجودة', 404);
      return;
    }
    sendSuccess(res, updated, 'تم تحديث المحافظة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Toggle governorate active status
export async function toggleGovernorateActive(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const gov = await LocationGovernorate.findOne(getGovQuery(id));
    if (!gov) {
      sendError(res, 'المحافظة غير موجودة', 404);
      return;
    }

    gov.active = !gov.active;
    await gov.save();

    sendSuccess(res, gov, gov.active ? 'تم تفعيل المحافظة بنجاح' : 'تم تعطيل المحافظة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Delete governorate
export async function deleteGovernorate(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await LocationGovernorate.findOneAndDelete(getGovQuery(id));
    if (!deleted) {
      sendError(res, 'المحافظة غير موجودة', 404);
      return;
    }
    sendSuccess(res, null, 'تم حذف المحافظة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Add a city under a governorate
export async function addCityToGovernorate(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { cityId, name, nameEn, order } = req.body;

    if (!name) {
      sendError(res, 'يرجى إدخال اسم المنطقة/المدينة', 422);
      return;
    }

    const gov = await LocationGovernorate.findOne(getGovQuery(id));
    if (!gov) {
      sendError(res, 'المحافظة غير موجودة', 404);
      return;
    }

    const effectiveNameEn = nameEn || name;
    const cleanedCityId = (cityId || effectiveNameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
    const generatedCityId = cleanedCityId || `city-${Date.now().toString().slice(-6)}`;
    const cityExists = (gov.cities || []).some(
      (c) => c.id === generatedCityId || (c as any)._id?.toString() === generatedCityId
    );
    if (cityExists) {
      sendError(res, 'هذه المدينة مسجلة مسبقاً داخل هذه المحافظة', 409);
      return;
    }

    const newCity = {
      id: generatedCityId,
      name,
      nameEn: effectiveNameEn,
      active: true,
      order: order !== undefined ? Number(order) : (gov.cities ? gov.cities.length : 0),
      areas: [],
    };

    gov.cities.push(newCity);
    await gov.save();

    sendSuccess(res, gov, 'تمت إضافة المدينة بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Update a city under a governorate
export async function updateCityInGovernorate(req: Request, res: Response): Promise<void> {
  try {
    const { id, cityId } = req.params;
    const { name, nameEn, active, order } = req.body;

    const gov = await LocationGovernorate.findOne(getGovQuery(id));
    if (!gov) {
      sendError(res, 'المحافظة غير موجودة', 404);
      return;
    }

    const city = gov.cities.find((c) => c.id === cityId || (c as any)._id?.toString() === cityId);
    if (!city) {
      sendError(res, 'المدينة غير موجودة داخل هذه المحافظة', 404);
      return;
    }

    if (name !== undefined) city.name = name;
    if (nameEn !== undefined) city.nameEn = nameEn;
    if (active !== undefined) city.active = Boolean(active);
    if (order !== undefined) city.order = Number(order);

    gov.markModified('cities');
    await gov.save();

    sendSuccess(res, gov, 'تم تحديث بيانات المدينة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Toggle city active status
export async function toggleCityActive(req: Request, res: Response): Promise<void> {
  try {
    const { id, cityId } = req.params;

    const gov = await LocationGovernorate.findOne(getGovQuery(id));
    if (!gov) {
      sendError(res, 'المحافظة غير موجودة', 404);
      return;
    }

    const city = gov.cities.find((c) => c.id === cityId || (c as any)._id?.toString() === cityId);
    if (!city) {
      sendError(res, 'المدينة غير موجودة', 404);
      return;
    }

    city.active = !city.active;
    gov.markModified('cities');
    await gov.save();

    sendSuccess(res, gov, city.active ? 'تم تفعيل المدينة بنجاح' : 'تم تعطيل المدينة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// Admin: Delete city from governorate
export async function deleteCityFromGovernorate(req: Request, res: Response): Promise<void> {
  try {
    const { id, cityId } = req.params;

    const gov = await LocationGovernorate.findOne(getGovQuery(id));
    if (!gov) {
      sendError(res, 'المحافظة غير موجودة', 404);
      return;
    }

    gov.cities = gov.cities.filter((c) => c.id !== cityId && (c as any)._id?.toString() !== cityId);
    gov.markModified('cities');
    await gov.save();

    sendSuccess(res, gov, 'تم حذف المدينة بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
