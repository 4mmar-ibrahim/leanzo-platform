'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Home,
  Briefcase,
  CheckCircle2,
  Trash2,
  Edit2,
  Star,
  Loader2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAddressStore } from '@/store/useAddressStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Address } from '@/types';
import { toast } from 'sonner';
import {
  validateEgyptianPhone,
  VALID_EGYPTIAN_PREFIXES,
} from '@/lib/validation/phoneValidation';
import { validateCustomerName } from '@/lib/validation/nameValidation';

export function StepAddress() {
  const { t, locale } = useLocaleStore();
  const {
    addresses,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddressStore();
  const { selectedAddress, setAddress, guestName, guestPhone, setGuestInfo } = useBookingStore();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAr = locale === 'ar';

  const { governorates, fetchLocations, isLoading: isLocationsLoading } = useLocationStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Form State
  const [label, setLabel] = useState('المنزل');
  const [governorateId, setGovernorateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [area, setArea] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [guestPhoneInput, setGuestPhoneInput] = useState(user?.phone || guestPhone || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState(user?.name || guestName || '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGuestNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGuestNameInput(val);

    // Immediate feedback if symbols or digits are entered
    if (/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z\s\-']/.test(val)) {
      setNameError(
        isAr
          ? 'اسم العميل يجب أن يحتوي على أحرف فقط دون أرقام أو رموز خاصة.'
          : 'Customer name must only contain letters without numbers or special symbols.'
      );
    } else if (nameTouched) {
      const res = validateCustomerName(val, isAr);
      setNameError(res.isValid ? null : res.message || null);
    } else {
      setNameError(null);
    }
  };

  const handleGuestNameBlur = () => {
    setNameTouched(true);
    const res = validateCustomerName(guestNameInput, isAr);
    setNameError(res.isValid ? null : res.message || null);
  };

  const handleGuestPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    if (/[^0-9]/.test(rawVal)) {
      setPhoneError('يرجى إدخال أرقام فقط.');
    } else {
      setPhoneError(null);
    }

    const digits = rawVal.replace(/[^0-9]/g, '').slice(0, 11);
    setGuestPhoneInput(digits);

    if (digits.length >= 3) {
      const prefix = digits.slice(0, 3);
      if (!VALID_EGYPTIAN_PREFIXES.includes(prefix as any)) {
        setPhoneError('رقم الهاتف يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015.');
      } else if (digits.length === 11) {
        setPhoneError(null);
      } else if (phoneTouched) {
        setPhoneError('رقم الهاتف يجب أن يتكون من 11 رقمًا.');
      }
    } else if (digits.length === 0) {
      setPhoneError(null);
    } else {
      if (!/[^0-9]/.test(rawVal)) {
        setPhoneError(null);
      }
    }
  };

  const handleGuestPhoneBlur = () => {
    setPhoneTouched(true);
    if (!guestPhoneInput) {
      setPhoneError(null);
      return;
    }
    const val = validateEgyptianPhone(guestPhoneInput);
    if (!val.isValid) {
      setPhoneError(val.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
    } else {
      setPhoneError(null);
    }
  };

  // Synchronize guest phone/name if user logs in
  useEffect(() => {
    if (user?.phone) setGuestPhoneInput(user.phone);
    if (user?.name) {
      setGuestNameInput(user.name);
      setNameError(null);
    }
  }, [user]);

  // Prefill form from existing selectedAddress if available
  useEffect(() => {
    if (selectedAddress) {
      if (selectedAddress.label) setLabel(selectedAddress.label);
      if (selectedAddress.governorateId) setGovernorateId(selectedAddress.governorateId);
      if (selectedAddress.cityId) setCityId(selectedAddress.cityId);
      if (selectedAddress.area) setArea(selectedAddress.area);
      if (selectedAddress.building) setBuilding(selectedAddress.building);
      if (selectedAddress.floor) setFloor(selectedAddress.floor);
      if (selectedAddress.apartment) setApartment(selectedAddress.apartment);
      if (selectedAddress.landmark) setLandmark(selectedAddress.landmark);
      if (selectedAddress.notes || selectedAddress.details) {
        setNotes(selectedAddress.notes || selectedAddress.details || '');
      }
      if (selectedAddress.customerPhone) {
        setGuestPhoneInput(selectedAddress.customerPhone);
      }
    }
  }, [selectedAddress]);

  // Fetch active locations and customer addresses on mount
  useEffect(() => {
    fetchLocations(false);
    fetchAddresses(user?.phone);
  }, [fetchLocations, fetchAddresses, user?.phone]);

  // Filter only active governorates from backend
  const activeGovernorates = useMemo(() => {
    return (governorates || []).filter((g) => g.active !== false);
  }, [governorates]);

  // Selected Governorate object
  const currentGov = useMemo(() => {
    if (!activeGovernorates || activeGovernorates.length === 0) return null;
    return (
      activeGovernorates.find(
        (g) => g.id === governorateId || (g as any)._id === governorateId
      ) || activeGovernorates[0]
    );
  }, [activeGovernorates, governorateId]);

  // Active cities belonging to the selected governorate
  const activeCities = useMemo(() => {
    if (!currentGov) return [];
    return (currentGov.cities || []).filter((c) => c.active !== false);
  }, [currentGov]);

  // Selected City object
  const currentCity = useMemo(() => {
    if (!activeCities || activeCities.length === 0) return null;
    return (
      activeCities.find(
        (c) => c.id === cityId || (c as any)._id === cityId
      ) || activeCities[0]
    );
  }, [activeCities, cityId]);

  // Synchronize defaults whenever activeGovernorates change
  useEffect(() => {
    if (activeGovernorates.length > 0) {
      const govValid = activeGovernorates.some(
        (g) => g.id === governorateId || (g as any)._id === governorateId
      );
      if (!governorateId || !govValid) {
        const firstGov = activeGovernorates[0];
        const firstGovId = firstGov.id || (firstGov as any)._id;
        setGovernorateId(firstGovId);
        const validCity = (firstGov.cities || []).find((c) => c.active !== false);
        setCityId(validCity ? (validCity.id || (validCity as any)._id) : '');
      } else if (currentGov) {
        const cities = (currentGov.cities || []).filter((c) => c.active !== false);
        const cityValid = cities.some(
          (c) => c.id === cityId || (c as any)._id === cityId
        );
        if (!cityId || !cityValid) {
          const firstCity = cities[0];
          setCityId(firstCity ? (firstCity.id || (firstCity as any)._id) : '');
        }
      }
    }
  }, [activeGovernorates, governorateId, cityId, currentGov]);

  // When governorate changes, auto-select first active city of that governorate
  const handleGovernorateChange = (newGovId: string) => {
    setGovernorateId(newGovId);
    const targetGov = activeGovernorates.find(
      (g) => g.id === newGovId || (g as any)._id === newGovId
    );
    const validCity = (targetGov?.cities || []).find((c) => c.active !== false);
    setCityId(validCity ? (validCity.id || (validCity as any)._id) : '');
  };

  // Auto-select first address if returning customer and none is selected
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
      setAddress(defaultAddr);
    }
  }, [addresses, selectedAddress, setAddress]);

  // Reset form
  const resetForm = () => {
    setEditingAddressId(null);
    setLabel('المنزل');
    if (activeGovernorates[0]) {
      const firstGov = activeGovernorates[0];
      setGovernorateId(firstGov.id || (firstGov as any)._id);
      const firstCity = (firstGov.cities || []).find((c) => c.active !== false);
      setCityId(firstCity ? (firstCity.id || (firstCity as any)._id) : '');
    } else {
      setGovernorateId('');
      setCityId('');
    }
    setArea('');
    setBuilding('');
    setFloor('');
    setApartment('');
    setLandmark('');
    setNotes('');
    setNameError(null);
    setNameTouched(false);
    setSaveToProfile(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (addr: Address, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddressId(addr.id || (addr as any)._id);
    setLabel(addr.label || 'المنزل');
    setGovernorateId(addr.governorateId || '');
    setCityId(addr.cityId || '');
    setArea(addr.area || '');
    setBuilding(addr.building || '');
    setFloor(addr.floor || '');
    setApartment(addr.apartment || '');
    setLandmark(addr.landmark || '');
    setNotes(addr.notes || addr.details || '');
    setIsModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentGov || !currentCity) {
      toast.error(isAr ? 'يرجى اختيار المحافظة والمدينة المتاحة' : 'Please select a valid governorate and city');
      return;
    }

    // Customer name validation (mandatory)
    // When unauthenticated, always strictly validate what the guest typed in guestNameInput
    const activeName = (!isAuthenticated ? guestNameInput : (guestNameInput || user?.name || '')).trim();
    const nameVal = validateCustomerName(activeName, isAr);
    if (!nameVal.isValid) {
      setNameTouched(true);
      setNameError(nameVal.message || (isAr ? 'يرجى إدخال اسم العميل' : 'Please enter customer name'));
      toast.error(nameVal.message || (isAr ? 'يرجى إدخال اسم العميل' : 'Please enter customer name'));
      return;
    }
    setNameError(null);
    const effectiveName = activeName;

    if (!area.trim()) {
      toast.error(isAr ? 'يرجى إدخال اسم المنطقة أو الشارع' : 'Please enter the street or area details');
      return;
    }

    if (!user?.phone && guestPhoneInput.trim()) {
      const phoneVal = validateEgyptianPhone(guestPhoneInput.trim());
      if (!phoneVal.isValid) {
        setPhoneTouched(true);
        setPhoneError(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
        toast.error(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const effectivePhone = user?.phone || guestPhoneInput.trim();

      // Check if customer account is deactivated by admin
      if (effectivePhone) {
        try {
          const customerStore = useCustomerStore.getState();
          const matched = customerStore.customers.find((c) => c.phone === effectivePhone);
          if (matched && (matched.status === 'inactive' || matched.status === 'suspended')) {
            toast.error(
              isAr
                ? 'تم تعطيل هذا الحساب من قِبل إدارة كلينزو. يرجى التواصل مع خدمة العملاء.'
                : 'This account has been deactivated by Cleanzo admin. Please contact customer support.'
            );
            setIsSubmitting(false);
            return;
          }
        } catch {
          // Continue
        }
      }

      if (effectivePhone || effectiveName) {
        setGuestInfo(effectiveName, effectivePhone);
      }

      const addressPayload = {
        label: label.trim() || 'المنزل',
        governorateId: currentGov?.id || (currentGov as any)?._id || governorateId,
        governorateNameSnapshot: isAr ? (currentGov?.name || '') : (currentGov?.nameEn || currentGov?.name || ''),
        cityId: currentCity?.id || (currentCity as any)?._id || cityId,
        cityNameSnapshot: isAr ? (currentCity?.name || '') : (currentCity?.nameEn || currentCity?.name || ''),
        governorate: isAr ? (currentGov?.name || '') : (currentGov?.nameEn || currentGov?.name || ''),
        city: isAr ? (currentCity?.name || '') : (currentCity?.nameEn || currentCity?.name || ''),
        area: area.trim(),
        building: building.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        landmark: landmark.trim(),
        notes: notes.trim(),
        details: notes.trim() || landmark.trim(),
        customerPhone: effectivePhone || undefined,
      };

      if (editingAddressId) {
        await updateAddress(editingAddressId, addressPayload);
        const updatedObj: Address = {
          ...addressPayload,
          id: editingAddressId,
        };
        setAddress(updatedObj);
        toast.success(isAr ? 'تم تحديث بيانات العنوان بنجاح' : 'Address updated successfully');
      } else {
        const created = await addAddress({
          ...addressPayload,
          isDefault: addresses.length === 0,
        });
        setAddress(created);
        toast.success(isAr ? 'تم حفظ العنوان بنجاح' : 'Address saved successfully');
      }

      setIsEditingExisting(false);
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'فشل حفظ العنوان' : 'Failed to save address'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذا العنوان؟' : 'Are you sure you want to delete this address?')) {
      await deleteAddress(id);
      if (selectedAddress?.id === id || (selectedAddress as any)?._id === id) {
        const remaining = addresses.filter((a) => a.id !== id && (a as any)._id !== id);
        if (remaining.length > 0) {
          setAddress(remaining[0]);
        }
      }
      toast.success(isAr ? 'تم حذف العنوان' : 'Address deleted');
    }
  };

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await setDefaultAddress(id);
    toast.success(isAr ? 'تم تعيينه كعنوان افتراضي' : 'Set as default address');
  };

  // -------------------------------------------------------------
  // RENDER 1: FIRST-TIME / GUEST CUSTOMER (No Saved Addresses in DB)
  // If selectedAddress already chosen in draft, display confirmed card with edit option
  // Otherwise, show the embedded form.
  // -------------------------------------------------------------
  if (addresses.length === 0 && selectedAddress && !isEditingExisting) {
    return (
      <div className="space-y-6 text-start">
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {isAr ? 'تم تحديد عنوان تقديم الخدمة' : 'Service Address Confirmed'}
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                {isAr
                  ? 'تم حفظ العنوان في مسودة طلبك وسيبقى محفوظاً طوال رحلة الحجز.'
                  : 'Address is saved in your booking draft and will be kept throughout.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditingExisting(true)}
            className="text-xs border-emerald-500 text-emerald-700 dark:text-emerald-300 shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5 ml-1" />
            <span>{isAr ? 'تعديل العنوان' : 'Edit Address'}</span>
          </Button>
        </div>

        {/* Confirmed Address Card */}
        <div className="p-6 rounded-3xl border-2 border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 shadow-md ring-1 ring-sky-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <Home className="w-4 h-4 text-sky-500" />
              {selectedAddress.label || 'المنزل'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-white">
              {isAr ? 'العنوان المعتمد للطلب' : 'Selected for Booking'}
            </span>
          </div>

          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 flex-wrap">
            <span className="text-sky-600 dark:text-sky-400 font-bold">
              {selectedAddress.governorateNameSnapshot || selectedAddress.governorate}
            </span>
            <span className="text-slate-400">›</span>
            <span className="text-slate-700 dark:text-slate-300">
              {selectedAddress.cityNameSnapshot || selectedAddress.city}
            </span>
            <span className="text-slate-400">›</span>
            <span className="text-slate-600 dark:text-slate-400 font-normal">
              {selectedAddress.area}
            </span>
          </div>

          {(selectedAddress.building || selectedAddress.floor || selectedAddress.apartment) && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building className="w-3 h-3 text-slate-400" />
              {[
                selectedAddress.building ? (isAr ? `مبنى ${selectedAddress.building}` : `Bldg ${selectedAddress.building}`) : null,
                selectedAddress.floor ? (isAr ? `طابق ${selectedAddress.floor}` : `Floor ${selectedAddress.floor}`) : null,
                selectedAddress.apartment ? (isAr ? `شقة ${selectedAddress.apartment}` : `Apt ${selectedAddress.apartment}`) : null,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          )}

          {(selectedAddress.landmark || selectedAddress.notes || selectedAddress.details) && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              "{selectedAddress.landmark || selectedAddress.notes || selectedAddress.details}"
            </p>
          )}
        </div>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="space-y-6 text-start">
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-sky-900 dark:text-sky-100">
              {isAr ? 'إضافة عنوان جديد للحجز' : 'Add New Service Address'}
            </h4>
            <p className="text-xs text-sky-700 dark:text-sky-300 mt-0.5">
              {isAr
                ? 'أدخل موقع تقديم الخدمة بدقة وسنقوم بحفظه لراحتك في طلباتك القادمة.'
                : 'Enter your service location details. We will save it for your next bookings.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAddress} noValidate className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isAr ? 'تسمية العنوان (مثل: المنزل، العمل، الشاليه)' : 'Address Label'}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isAr ? 'المنزل' : 'Home'}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                label={isAr ? 'المحافظة' : 'Governorate'}
                value={governorateId}
                onChange={(e) => handleGovernorateChange(e.target.value)}
                disabled={isLocationsLoading}
                required
              >
                {activeGovernorates.length === 0 ? (
                  <option value="">{isAr ? 'جاري تحميل المحافظات...' : 'Loading governorates...'}</option>
                ) : (
                  activeGovernorates.map((gov) => {
                    const gId = gov.id || (gov as any)._id;
                    return (
                      <option key={gId} value={gId}>
                        {isAr ? gov.name : (gov.nameEn || gov.name)}
                      </option>
                    );
                  })
                )}
              </Select>

              <Select
                label={isAr ? 'المدينة / المنطقة' : 'City / Area'}
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                disabled={activeCities.length === 0}
                required
              >
                {activeCities.length === 0 ? (
                  <option value="">{isAr ? 'لا توجد مناطق متاحة' : 'No areas available'}</option>
                ) : (
                  activeCities.map((city) => {
                    const cId = city.id || (city as any)._id;
                    return (
                      <option key={cId} value={cId}>
                        {isAr ? city.name : (city.nameEn || city.name)}
                      </option>
                    );
                  })
                )}
              </Select>
            </div>
          </div>

          {/* Guest Contact Info if unauthenticated */}
          {!isAuthenticated && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <Input
                label={isAr ? 'رقم الهاتف للتواصل (اختياري)' : 'Contact Phone (Optional)'}
                type="tel"
                inputMode="numeric"
                maxLength={11}
                dir="ltr"
                placeholder="01012345678"
                value={guestPhoneInput}
                onChange={handleGuestPhoneChange}
                onBlur={handleGuestPhoneBlur}
                error={phoneError || undefined}
              />
              <Input
                label={isAr ? 'اسم العميل' : 'Customer Name'}
                placeholder={isAr ? 'أحمد عبد الله' : 'Customer Name'}
                value={guestNameInput}
                onChange={handleGuestNameChange}
                onBlur={handleGuestNameBlur}
                error={nameError || undefined}
                required
              />
            </div>
          )}

          <Input
            label={isAr ? 'اسم الشارع / الحي / المنطقة بالتفصيل' : 'Street / Area Details'}
            placeholder={isAr ? 'شارع النصر، متفرع من عباس العقاد' : 'Street name, district'}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label={isAr ? 'رقم العمارة / المبنى' : 'Building'}
              placeholder="14"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            />
            <Input
              label={isAr ? 'الطابق' : 'Floor'}
              placeholder="3"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
            <Input
              label={isAr ? 'رقم الشقة' : 'Apartment'}
              placeholder="7"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isAr ? 'علامة مميزة (اختياري)' : 'Landmark (Optional)'}
              placeholder={isAr ? 'بجوار صيدلية النور' : 'Near landmark'}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
            <Input
              label={isAr ? 'ملاحظات للفني أو حارس العقار' : 'Notes for Technician'}
              placeholder={isAr ? 'يرجى الاتصال عند البوابة' : 'Call on arrival'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full h-12 text-sm font-bold shadow-lg shadow-sky-500/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  {isAr ? 'تأكيد واستخدام هذا العنوان' : 'Confirm & Use Address'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: RETURNING CUSTOMER (With Saved Addresses)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 text-start">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sky-500" />
          <span>{isAr ? 'العناوين المحفوظة' : 'Saved Addresses'}</span>
        </label>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="text-xs border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40"
        >
          <Plus className="w-3.5 h-3.5 ml-1" />
          <span>{isAr ? 'إضافة عنوان جديد' : 'Add New Address'}</span>
        </Button>
      </div>

      {/* Saved Addresses List Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addresses.map((addr) => {
          const addrId = addr.id || (addr as any)._id;
          const isSelected = selectedAddress?.id === addrId || (selectedAddress as any)?._id === addrId;

          return (
            <div
              key={addrId}
              onClick={() => setAddress(addr)}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-3 relative ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 shadow-md ring-1 ring-sky-500/40'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    {addr.label.includes('عمل') || addr.label.toLowerCase().includes('work') ? (
                      <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                    ) : (
                      <Home className="w-3.5 h-3.5 text-sky-500" />
                    )}
                    {addr.label}
                  </span>

                  {addr.isDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {isAr ? 'افتراضي' : 'Default'}
                    </span>
                  )}
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              {/* Geographic Breadcrumb Snapshot */}
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 flex-wrap">
                <span className="text-sky-600 dark:text-sky-400 font-bold">
                  {addr.governorateNameSnapshot || addr.governorate}
                </span>
                <span className="text-slate-400">›</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {addr.cityNameSnapshot || addr.city}
                </span>
                <span className="text-slate-400">›</span>
                <span className="text-slate-600 dark:text-slate-400 font-normal">
                  {addr.area}
                </span>
              </div>

              {(addr.building || addr.floor || addr.apartment) && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3 h-3 text-slate-400" />
                  {[
                    addr.building ? (isAr ? `مبنى ${addr.building}` : `Bldg ${addr.building}`) : null,
                    addr.floor ? (isAr ? `طابق ${addr.floor}` : `Floor ${addr.floor}`) : null,
                    addr.apartment ? (isAr ? `شقة ${addr.apartment}` : `Apt ${addr.apartment}`) : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              )}

              {(addr.landmark || addr.notes || addr.details) && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                  "{addr.landmark || addr.notes || addr.details}"
                </p>
              )}

              {/* Card Action Controls */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={(e) => handleSetDefault(addrId, e)}
                      className="text-[11px] text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
                    >
                      <Star className="w-3 h-3" />
                      <span>{isAr ? 'جعله افتراضياً' : 'Set as Default'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(addr, e)}
                    className="p-1 rounded text-slate-400 hover:text-sky-600 transition-colors"
                    title={isAr ? 'تعديل العنوان' : 'Edit Address'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(addrId, e)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    title={isAr ? 'حذف العنوان' : 'Delete Address'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Address Dialog Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={
          editingAddressId
            ? isAr
              ? 'تعديل بيانات العنوان'
              : 'Edit Address'
            : isAr
            ? 'إضافة عنوان خدمة جديد'
            : 'Add New Service Address'
        }
        description={
          isAr
            ? 'حدد المحافظة والمدينة وتفاصيل الموقع بدقة'
            : 'Select governorate, city and enter detailed address'
        }
      >
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <Input
            label={isAr ? 'تسمية العنوان (مثل: المنزل، العمل، الشاليه)' : 'Address Label'}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={isAr ? 'المحافظة' : 'Governorate'}
              value={governorateId}
              onChange={(e) => handleGovernorateChange(e.target.value)}
              required
            >
              {activeGovernorates.length === 0 ? (
                <option value="">{isAr ? 'جاري تحميل المحافظات...' : 'Loading governorates...'}</option>
              ) : (
                activeGovernorates.map((gov) => {
                  const gId = gov.id || (gov as any)._id;
                  return (
                    <option key={gId} value={gId}>
                      {isAr ? gov.name : (gov.nameEn || gov.name)}
                    </option>
                  );
                })
              )}
            </Select>

            <Select
              label={isAr ? 'المدينة / المنطقة' : 'City / Area'}
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              disabled={activeCities.length === 0}
              required
            >
              {activeCities.length === 0 ? (
                <option value="">{isAr ? 'لا توجد مناطق متاحة' : 'No areas available'}</option>
              ) : (
                activeCities.map((city) => {
                  const cId = city.id || (city as any)._id;
                  return (
                    <option key={cId} value={cId}>
                      {isAr ? city.name : (city.nameEn || city.name)}
                    </option>
                  );
                })
              )}
            </Select>
          </div>

          <Input
            label={isAr ? 'الشارع / الحي بالتفصيل' : 'Street / Area Details'}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={isAr ? 'اسم الشارع والحي' : 'Street name and district'}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label={isAr ? 'المبنى' : 'Building'}
              placeholder="14"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            />
            <Input
              label={isAr ? 'الطابق' : 'Floor'}
              placeholder="3"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
            <Input
              label={isAr ? 'الشقة' : 'Apartment'}
              placeholder="7"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={isAr ? 'علامة مميزة' : 'Landmark'}
              placeholder={isAr ? 'بجوار صيدلية...' : 'Near landmark...'}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
            <Input
              label={isAr ? 'ملاحظات للفني' : 'Notes'}
              placeholder={isAr ? 'ملاحظات إضافية' : 'Extra notes'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || !area.trim()}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingAddressId ? (
                isAr ? 'تحديث العنوان' : 'Update Address'
              ) : (
                isAr ? 'حفظ واختيار' : 'Save & Select'
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
