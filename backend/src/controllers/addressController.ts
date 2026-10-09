import { Response } from 'express';
import { CustomerAddress } from '../models/CustomerAddress.js';
import { LocationGovernorate } from '../models/Location.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// Helper to validate governorate and city
export async function validateLocationPair(governorateId: string, cityId: string) {
  const gov = await LocationGovernorate.findOne({ id: governorateId, active: true });
  if (!gov) {
    return { valid: false, error: 'المحافظة المختارة غير متاحة أو تم تعطيلها مؤقتاً' };
  }

  const city = (gov.cities || []).find((c) => c.id === cityId && c.active);
  if (!city) {
    return { valid: false, error: 'المنطقة أو المدينة المختارة غير متوفرة ضمن هذه المحافظة أو تم تعطيلها' };
  }

  return {
    valid: true,
    governorateName: gov.name,
    cityName: city.name,
  };
}

// GET /api/addresses - Get saved addresses for the authenticated user
export async function getCustomerAddresses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const phone = req.user?.phone || req.customer?.phone;

    if (!userId && !phone) {
      sendError(res, 'يرجى تسجيل الدخول لعرض عناوينك', 401, 'UNAUTHORIZED');
      return;
    }

    const addresses = await CustomerAddress.find({
      $or: [
        ...(userId ? [{ customerId: userId }] : []),
        ...(phone ? [{ customerPhone: phone }] : []),
      ],
    }).sort({ isDefault: -1, updatedAt: -1 });

    // Deduplicate addresses and clean up duplicate documents in database
    const uniqueAddresses: any[] = [];
    const duplicateIdsToDelete: any[] = [];
    const normalize = (val?: string) => (val || '').trim().toLowerCase();

    for (const addr of addresses) {
      const match = uniqueAddresses.find((existing) => {
        const sameGov =
          normalize(existing.governorateId) === normalize(addr.governorateId) ||
          normalize(existing.governorateNameSnapshot) === normalize(addr.governorateNameSnapshot);
        const sameCity =
          normalize(existing.cityId) === normalize(addr.cityId) ||
          normalize(existing.cityNameSnapshot) === normalize(addr.cityNameSnapshot);
        const sameArea = normalize(existing.area) === normalize(addr.area);
        const sameBuilding = normalize(existing.building) === normalize(addr.building);
        const sameFloor = normalize(existing.floor) === normalize(addr.floor);
        const sameApartment = normalize(existing.apartment) === normalize(addr.apartment);

        return sameGov && sameCity && sameArea && sameBuilding && sameFloor && sameApartment;
      });

      if (!match) {
        uniqueAddresses.push(addr);
      } else {
        if (addr.isDefault && !match.isDefault) {
          match.isDefault = true;
        }
        duplicateIdsToDelete.push(addr._id);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      CustomerAddress.deleteMany({ _id: { $in: duplicateIdsToDelete } }).catch((err) =>
        console.error('Failed to cleanup duplicate addresses in background:', err)
      );
    }

    if (uniqueAddresses.length > 0 && !uniqueAddresses.some((a) => a.isDefault)) {
      uniqueAddresses[0].isDefault = true;
    }

    sendSuccess(res, uniqueAddresses);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// POST /api/addresses - Create a new customer address
export async function createCustomerAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?._id;
    const userPhone = req.user?.phone || req.customer?.phone;

    if (!userId && !userPhone) {
      sendError(res, 'يرجى تسجيل الدخول لحفظ العنوان', 401, 'UNAUTHORIZED');
      return;
    }

    const {
      label,
      governorateId,
      cityId,
      area,
      building,
      floor,
      apartment,
      landmark,
      notes,
      isDefault,
    } = req.body;

    if (!governorateId || !cityId || !area) {
      sendError(res, 'يرجى تحديد المحافظة، المدينة، والشارع/المنطقة بالتفصيل', 422);
      return;
    }

    const locationCheck = await validateLocationPair(governorateId, cityId);
    if (!locationCheck.valid) {
      sendError(res, locationCheck.error!, 422, 'LOCATION_INVALID');
      return;
    }

    // Check if an address with identical physical details already exists for this customer
    const existingAddress = await CustomerAddress.findOne({
      $or: [
        ...(userId ? [{ customerId: userId }] : []),
        ...(userPhone ? [{ customerPhone: userPhone }] : []),
      ],
      governorateId,
      cityId,
      area: (area || '').trim(),
      building: (building || '').trim(),
      floor: (floor || '').trim(),
      apartment: (apartment || '').trim(),
    });

    if (existingAddress) {
      // Address already exists! Update details instead of creating a duplicate
      if (label) existingAddress.label = label;
      if (landmark !== undefined) existingAddress.landmark = landmark;
      if (notes !== undefined) existingAddress.notes = notes;

      const shouldBeDefault = Boolean(isDefault);
      if (shouldBeDefault) {
        await CustomerAddress.updateMany(
          {
            $or: [
              ...(userId ? [{ customerId: userId }] : []),
              ...(userPhone ? [{ customerPhone: userPhone }] : []),
            ],
            _id: { $ne: existingAddress._id },
          },
          { $set: { isDefault: false } }
        );
        existingAddress.isDefault = true;
      }

      await existingAddress.save();
      sendSuccess(res, existingAddress, 'تم تحديث العنوان المحفوظ بنجاح', 200);
      return;
    }

    // Check if this is the customer's first address
    const existingCount = await CustomerAddress.countDocuments(
      userId ? { customerId: userId } : { customerPhone: userPhone }
    );

    const shouldBeDefault = Boolean(isDefault) || existingCount === 0;

    // If making default, unset other defaults
    if (shouldBeDefault) {
      await CustomerAddress.updateMany(
        userId ? { customerId: userId } : { customerPhone: userPhone },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = await CustomerAddress.create({
      customerId: userId || undefined,
      customerPhone: userPhone,
      label: label || 'المنزل',
      governorateId,
      governorateNameSnapshot: locationCheck.governorateName!,
      cityId,
      cityNameSnapshot: locationCheck.cityName!,
      area: (area || '').trim(),
      building: (building || '').trim(),
      floor: (floor || '').trim(),
      apartment: (apartment || '').trim(),
      landmark: (landmark || '').trim(),
      notes: (notes || '').trim(),
      isDefault: shouldBeDefault,
    });

    sendSuccess(res, newAddress, 'تم حفظ العنوان بنجاح', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// PATCH /api/addresses/:id - Update an existing address (Protected with IDOR Check)
export async function updateCustomerAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userPhone = req.user?.phone || req.customer?.phone;

    const address = await CustomerAddress.findById(id);
    if (!address) {
      sendError(res, 'العنوان غير موجود', 404);
      return;
    }

    // Security / IDOR Check: Ensure address belongs to current user
    const isOwner =
      (userId && address.customerId && address.customerId.toString() === userId.toString()) ||
      (userPhone && address.customerPhone === userPhone);

    if (!isOwner) {
      sendError(res, 'غير مصرح لك بتعديل هذا العنوان', 403, 'FORBIDDEN_IDOR');
      return;
    }

    const {
      label,
      governorateId,
      cityId,
      area,
      building,
      floor,
      apartment,
      landmark,
      notes,
      isDefault,
    } = req.body;

    // If location changed, re-validate governorate & city hierarchy
    const targetGovId = governorateId || address.governorateId;
    const targetCityId = cityId || address.cityId;

    if (governorateId || cityId) {
      const locationCheck = await validateLocationPair(targetGovId, targetCityId);
      if (!locationCheck.valid) {
        sendError(res, locationCheck.error!, 422, 'LOCATION_INVALID');
        return;
      }
      address.governorateId = targetGovId;
      address.governorateNameSnapshot = locationCheck.governorateName!;
      address.cityId = targetCityId;
      address.cityNameSnapshot = locationCheck.cityName!;
    }

    if (label !== undefined) address.label = label;
    if (area !== undefined) address.area = area;
    if (building !== undefined) address.building = building;
    if (floor !== undefined) address.floor = floor;
    if (apartment !== undefined) address.apartment = apartment;
    if (landmark !== undefined) address.landmark = landmark;
    if (notes !== undefined) address.notes = notes;

    if (isDefault === true) {
      await CustomerAddress.updateMany(
        userId ? { customerId: userId } : { customerPhone: userPhone },
        { $set: { isDefault: false } }
      );
      address.isDefault = true;
    } else if (isDefault === false) {
      address.isDefault = false;
    }

    await address.save();
    sendSuccess(res, address, 'تم تحديث العنوان بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// PATCH /api/addresses/:id/default - Set address as default (Protected with IDOR Check)
export async function setDefaultAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userPhone = req.user?.phone || req.customer?.phone;

    const address = await CustomerAddress.findById(id);
    if (!address) {
      sendError(res, 'العنوان غير موجود', 404);
      return;
    }

    const isOwner =
      (userId && address.customerId && address.customerId.toString() === userId.toString()) ||
      (userPhone && address.customerPhone === userPhone);

    if (!isOwner) {
      sendError(res, 'غير مصرح لك بتعديل هذا العنوان', 403, 'FORBIDDEN_IDOR');
      return;
    }

    await CustomerAddress.updateMany(
      userId ? { customerId: userId } : { customerPhone: userPhone },
      { $set: { isDefault: false } }
    );

    address.isDefault = true;
    await address.save();

    sendSuccess(res, address, 'تم تعيين العنوان كعنوان افتراضي');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

// DELETE /api/addresses/:id - Delete an address (Protected with IDOR Check)
export async function deleteCustomerAddress(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userPhone = req.user?.phone || req.customer?.phone;

    const address = await CustomerAddress.findById(id);
    if (!address) {
      sendError(res, 'العنوان غير موجود', 404);
      return;
    }

    const isOwner =
      (userId && address.customerId && address.customerId.toString() === userId.toString()) ||
      (userPhone && address.customerPhone === userPhone);

    if (!isOwner) {
      sendError(res, 'غير مصرح لك بحذف هذا العنوان', 403, 'FORBIDDEN_IDOR');
      return;
    }

    const wasDefault = address.isDefault;
    await CustomerAddress.findByIdAndDelete(id);

    // If this was default and customer has remaining addresses, designate the latest one as default
    if (wasDefault) {
      const nextAddress = await CustomerAddress.findOne(
        userId ? { customerId: userId } : { customerPhone: userPhone }
      ).sort({ updatedAt: -1 });

      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    sendSuccess(res, null, 'تم حذف العنوان بنجاح');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
