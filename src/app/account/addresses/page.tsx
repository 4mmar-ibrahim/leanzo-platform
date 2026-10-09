'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Plus, Edit2, Trash2, CheckCircle2, Home } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAddressStore } from '@/store/useAddressStore';
import { useLocationStore } from '@/store/useLocationStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Address } from '@/types';
import { toast } from 'sonner';

export default function AccountAddressesPage() {
  const { t, locale } = useLocaleStore();
  const { addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, fetchAddresses } = useAddressStore();
  const { governorates, fetchLocations } = useLocationStore();
  const isAr = locale === 'ar';

  useEffect(() => {
    fetchLocations(false);
    fetchAddresses();
  }, [fetchLocations, fetchAddresses]);

  const activeGovernorates = useMemo(() => {
    return (governorates || []).filter((g) => g.active !== false);
  }, [governorates]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Form states
  const [label, setLabel] = useState('المنزل');
  const [governorateId, setGovernorateId] = useState('');
  const selectedGov = useMemo(() => {
    if (!activeGovernorates || activeGovernorates.length === 0) return null;
    return (
      activeGovernorates.find((g) => g.id === governorateId || (g as any)._id === governorateId) ||
      activeGovernorates[0]
    );
  }, [activeGovernorates, governorateId]);

  const activeCities = useMemo(() => {
    if (!selectedGov) return [];
    return (selectedGov.cities || []).filter((c) => c.active !== false);
  }, [selectedGov]);

  const [cityId, setCityId] = useState('');
  const selectedCity = useMemo(() => {
    if (!activeCities || activeCities.length === 0) return null;
    return (
      activeCities.find((c) => c.id === cityId || (c as any)._id === cityId) ||
      activeCities[0]
    );
  }, [activeCities, cityId]);

  const [area, setArea] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [details, setDetails] = useState('');

  const openAddModal = () => {
    setEditingAddress(null);
    setLabel(isAr ? 'المنزل' : 'Home');
    const firstGov = activeGovernorates[0];
    const firstGovId = firstGov?.id || (firstGov as any)?._id || '';
    setGovernorateId(firstGovId);
    const firstCity = (firstGov?.cities || []).find((c) => c.active !== false);
    setCityId(firstCity?.id || (firstCity as any)?._id || '');
    setArea('');
    setBuilding('');
    setFloor('');
    setApartment('');
    setDetails('');
    setIsModalOpen(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setLabel(addr.label);
    setArea(addr.area);
    setBuilding(addr.building || '');
    setFloor(addr.floor || '');
    setApartment(addr.apartment || '');
    setDetails(addr.details || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAddress) {
      updateAddress(editingAddress.id, {
        label,
        area,
        building,
        floor,
        apartment,
        details,
      });
      toast.success(isAr ? 'تم تحديث العنوان بنجاح' : 'Address updated successfully');
    } else {
      if (!selectedGov || !selectedCity) {
        toast.error(isAr ? 'يرجى اختيار المحافظة والمدينة' : 'Please select governorate and city');
        return;
      }
      addAddress({
        label,
        governorateId: selectedGov.id,
        governorateNameSnapshot: isAr ? selectedGov.name : selectedGov.nameEn || selectedGov.name,
        cityId: selectedCity.id,
        cityNameSnapshot: isAr ? selectedCity.name : selectedCity.nameEn || selectedCity.name,
        governorate: isAr ? selectedGov.name : selectedGov.nameEn || selectedGov.name,
        city: isAr ? selectedCity.name : selectedCity.nameEn || selectedCity.name,
        area,
        building,
        floor,
        apartment,
        details,
      });
      toast.success(isAr ? 'تمت إضافة العنوان بنجاح' : 'Address added successfully');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteAddress(id);
    toast.success(isAr ? 'تم حذف العنوان' : 'Address deleted');
  };

  const handleSetDefault = (id: string) => {
    setDefaultAddress(id);
    toast.success(isAr ? 'تم تعيين العنوان كافتراضي' : 'Default address set');
  };

  return (
    <div className="space-y-6 text-start">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.account.savedAddresses}
          </h2>
          <p className="text-xs text-slate-500">
            {isAr ? 'عناوينك المسجلة لزيارات الخدمة المنزلية والعناية بالسيارة' : 'Saved locations for home and mobile services'}
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus className="w-3.5 h-3.5" />
          <span>{t.booking.addNewAddress}</span>
        </Button>
      </div>

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 transition-all space-y-4 relative ${
              addr.isDefault
                ? 'border-sky-500 shadow-md ring-1 ring-sky-500/30'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {addr.label}
                </h3>
              </div>

              {addr.isDefault && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white">
                  {isAr ? 'العنوان الافتراضي' : 'Default'}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                {addr.governorate} — {addr.city}
              </p>
              <p>{addr.area}</p>
              {(addr.building || addr.apartment) && (
                <p className="text-[11px] text-slate-400">
                  {[addr.building, addr.floor, addr.apartment].filter(Boolean).join(' • ')}
                </p>
              )}
              {addr.details && (
                <p className="text-[11px] text-slate-400 italic">
                  "{addr.details}"
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              {!addr.isDefault ? (
                <button
                  type="button"
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-sky-600 dark:text-sky-400 font-bold hover:underline"
                >
                  {isAr ? 'تعيين كافتراضي' : 'Set as default'}
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(addr)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress ? (isAr ? 'تعديل العنوان' : 'Edit Address') : (isAr ? 'إضافة عنوان جديد' : 'Add Address')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={isAr ? 'تسمية العنوان' : 'Label'}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />

          {!editingAddress && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={isAr ? 'المحافظة' : 'Governorate'}
                value={governorateId}
                onChange={(e) => {
                  const newGovId = e.target.value;
                  setGovernorateId(newGovId);
                  const targetGov = activeGovernorates.find((g) => g.id === newGovId || (g as any)._id === newGovId);
                  const firstCity = (targetGov?.cities || []).find((c) => c.active !== false);
                  setCityId(firstCity?.id || (firstCity as any)?._id || '');
                }}
              >
                {activeGovernorates.length === 0 ? (
                  <option value="">{isAr ? 'جاري التحميل...' : 'Loading...'}</option>
                ) : (
                  activeGovernorates.map((gov) => {
                    const gId = gov.id || (gov as any)._id;
                    return (
                      <option key={gId} value={gId}>
                        {isAr ? gov.name : gov.nameEn || gov.name}
                      </option>
                    );
                  })
                )}
              </Select>

              <Select
                label={isAr ? 'المدينة' : 'City'}
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                disabled={activeCities.length === 0}
              >
                {activeCities.length === 0 ? (
                  <option value="">{isAr ? 'لا توجد مناطق متاحة' : 'No areas available'}</option>
                ) : (
                  activeCities.map((city) => {
                    const cId = city.id || (city as any)._id;
                    return (
                      <option key={cId} value={cId}>
                        {isAr ? city.name : city.nameEn || city.name}
                      </option>
                    );
                  })
                )}
              </Select>
            </div>
          )}

          <Input
            label={isAr ? 'المنطقة / الشارع' : 'Area / Street'}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label={isAr ? 'العمارة' : 'Building'}
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            />
            <Input
              label={isAr ? 'الدور' : 'Floor'}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
            <Input
              label={isAr ? 'الشقة' : 'Apartment'}
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
            />
          </div>

          <Input
            label={isAr ? 'تفاصيل إضافية' : 'Details'}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {t.common.save}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
