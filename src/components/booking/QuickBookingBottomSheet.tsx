'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Car,
  Home,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { getUpcomingBookingDates, getTimeSlotsForDate, isSameService, isSameTime } from '@/lib/bookingEngine';
import { Service, ServiceCategory, Order, Address, ServicePackage, ServiceAddon } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickBookingBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: ServiceCategory;
  initialServiceId?: string;
}

export function QuickBookingBottomSheet({
  isOpen,
  onClose,
  initialCategory = 'car',
  initialServiceId,
}: QuickBookingBottomSheetProps) {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const storeServices = useServiceStore((s) => s.services);
  const fetchServices = useServiceStore((s) => s.fetchServices);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const availableServices = useMemo(() => {
    return (storeServices || []).filter((s) => s.available !== false && !(s as any).isArchived);
  }, [storeServices]);

  const addOrder = useOrderStore((s) => s.addOrder);
  const orders = useOrderStore((s) => s.orders) || [];
  const { isAuthenticated, user } = useAuthStore();

  // Booking Flow Steps: 1: Service, 2: Date & Time, 3: Address & Phone, 4: Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form selections
  const [category, setCategory] = useState<ServiceCategory>(initialCategory);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    if (initialServiceId && availableServices.length > 0) {
      const found = availableServices.find((s) => s.id === initialServiceId);
      if (found) {
        setSelectedService(found);
        setCategory(found.category);
      }
    }
  }, [availableServices, initialServiceId]);

  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [selectedAddonsList, setSelectedAddonsList] = useState<ServiceAddon[]>([]);

  useEffect(() => {
    setSelectedPkg(null);
    setSelectedAddonsList([]);
  }, [selectedService]);

  const quickBasePrice = selectedPkg ? Number(selectedPkg.price) : Number(selectedService?.price || 0);
  const quickAddonsTotal = selectedAddonsList.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const quickTotalPrice = quickBasePrice + quickAddonsTotal;

  const bookingSettings = useSettingsStore((s) => s.settings.booking);
  const fetchPublicSettings = useSettingsStore((s) => s.fetchPublicSettings);

  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  const dateOptions = useMemo(() => {
    return getUpcomingBookingDates(bookingSettings?.advanceBookingDays || 14, bookingSettings);
  }, [bookingSettings]);

  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (dateOptions.length > 0) {
      const firstAvailable = dateOptions.find((d) => d.isAvailable);
      const isCurrentValid = dateOptions.some((d) => d.dateString === selectedDate && d.isAvailable);
      if ((!selectedDate || !isCurrentValid) && firstAvailable) {
        setSelectedDate(firstAvailable.dateString);
      }
    }
  }, [dateOptions, selectedDate]);

  const timeSlots = useMemo(() => {
    return getTimeSlotsForDate(
      selectedDate,
      bookingSettings,
      selectedService?.id,
      selectedService?.title,
      orders,
      selectedService?.serviceDurationMinutes || selectedService?.duration,
      selectedService?.travelTimeMinutes
    );
  }, [selectedDate, bookingSettings, selectedService, orders]);

  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    if (timeSlots.length > 0) {
      const isCurrentValid = timeSlots.some((s) => s.time === selectedTime && s.isAvailable);
      if (!isCurrentValid) {
        const firstAvailable = timeSlots.find((s) => s.isAvailable);
        if (firstAvailable) {
          setSelectedTime(firstAvailable.time);
        }
      }
    }
  }, [timeSlots, selectedTime]);

  // Locations from store
  const { governorates, fetchLocations } = useLocationStore();

  useEffect(() => {
    fetchLocations(false);
  }, [fetchLocations]);

  const activeGovernorates = useMemo(() => {
    return (governorates || []).filter((g) => g.active !== false);
  }, [governorates]);

  // Address & Contact info
  const [governorateId, setGovernorateId] = useState<string>('');
  const [cityId, setCityId] = useState<string>('');

  const currentGov = useMemo(() => {
    if (!activeGovernorates || activeGovernorates.length === 0) return null;
    return (
      activeGovernorates.find((g) => g.id === governorateId || (g as any)._id === governorateId) ||
      activeGovernorates[0]
    );
  }, [activeGovernorates, governorateId]);

  const activeCities = useMemo(() => {
    if (!currentGov) return [];
    return (currentGov.cities || []).filter((c) => c.active !== false);
  }, [currentGov]);

  const currentCity = useMemo(() => {
    if (!activeCities || activeCities.length === 0) return null;
    return (
      activeCities.find((c) => c.id === cityId || (c as any)._id === cityId) ||
      activeCities[0]
    );
  }, [activeCities, cityId]);

  useEffect(() => {
    if (activeGovernorates.length > 0) {
      const govValid = activeGovernorates.some(
        (g) => g.id === governorateId || (g as any)._id === governorateId
      );
      if (!governorateId || !govValid) {
        const firstGov = activeGovernorates[0];
        const firstGovId = firstGov.id || (firstGov as any)._id;
        setGovernorateId(firstGovId);
        const firstCity = (firstGov.cities || []).find((c) => c.active !== false);
        setCityId(firstCity ? (firstCity.id || (firstCity as any)._id) : '');
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

  const handleGovChange = (newGovId: string) => {
    setGovernorateId(newGovId);
    const targetGov = activeGovernorates.find(
      (g) => g.id === newGovId || (g as any)._id === newGovId
    );
    const validCity = (targetGov?.cities || []).find((c) => c.active !== false);
    setCityId(validCity ? (validCity.id || (validCity as any)._id) : '');
  };

  const [area, setArea] = useState(user?.addresses?.[0]?.area || 'الحي الرابع، شارع النخيل');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');

  // Confirmed Order Result
  const [confirmedOrderId, setConfirmedOrderId] = useState<string>('');

  if (!isOpen) return null;

  // Filter services by active category
  const filteredServices = availableServices.filter((s) => s.category === category);

  const handleConfirmBooking = () => {
    if (!selectedService || selectedService.category !== category) {
      toast.error(isAr ? 'يرجى اختيار الخدمة المطابقة للقسم المحدد' : 'Please select a valid service for this category');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      toast.error('يرجى إدخال رقم هاتف صحيح للتواصل');
      return;
    }

    // Check if customer account is deactivated by admin
    try {
      const customerStore = useCustomerStore.getState();
      const matched = customerStore.customers.find((c) => c.phone === customerPhone.trim());
      if (matched && (matched.status === 'inactive' || matched.status === 'suspended')) {
        toast.error(
          isAr
            ? 'تم تعطيل هذا الحساب من قِبل إدارة كلينزو. يرجى التواصل مع خدمة العملاء.'
            : 'This account has been deactivated by Cleanzo admin. Please contact customer support.'
        );
        return;
      }
    } catch {
      // Continue
    }

    // Check if slot is already booked for the exact same service
    const existingOrders = useOrderStore.getState().orders || [];
    const isAlreadyBooked = existingOrders.some((o) => {
      if (o.status === 'cancelled') return false;
      if (o.date !== selectedDate) return false;
      if (!isSameService(o, selectedService.id, selectedService.title)) return false;
      return isSameTime(o.time, selectedTime);
    });

    if (isAlreadyBooked) {
      toast.error(
        isAr
          ? `عذراً، موعد (${selectedTime}) محجوز بالفعل لهذه الخدمة. يرجى اختيار موعد آخر.`
          : `Selected time (${selectedTime}) is already booked for this service. Please choose another time.`
      );
      return;
    }

    const orderId = `CLZ-${Date.now().toString().slice(-6)}`;
    const finalAddress: Address = {
      id: `addr-${Date.now()}`,
      label: isAr ? 'موقع الحجز السريع' : 'Quick Booking Address',
      governorate: currentGov?.name || governorateId || 'المنيا',
      city: currentCity?.name || cityId || 'المنيا الجديدة',
      area: area || currentCity?.name || 'المنيا الجديدة',
      details: notes || undefined,
    };

    const newOrder: Order = {
      id: orderId,
      userId: user?.id || 'guest-user',
      serviceId: selectedService.id,
      service: selectedService,
      category: selectedService.category,
      date: selectedDate,
      time: selectedTime,
      address: finalAddress,
      basePrice: quickTotalPrice,
      packageId: selectedPkg?.id,
      packageSnapshot: selectedPkg
        ? {
            id: selectedPkg.id,
            name: selectedPkg.name,
            nameEn: selectedPkg.nameEn,
            price: selectedPkg.price,
            originalPrice: selectedPkg.originalPrice,
            durationMinutes: selectedPkg.durationMinutes,
          }
        : undefined,
      addons: selectedAddonsList.map((a) => ({
        id: a.id,
        name: a.name,
        nameEn: a.nameEn,
        price: a.price,
        durationMinutes: a.durationMinutes,
      })),
      discount: 0,
      serviceFee: 0,
      finalPrice: quickTotalPrice,
      currency: isAr ? 'ج.م' : 'EGP',
      status: 'pending',
      timeline: [
        {
          status: 'pending',
          label: isAr ? 'طلب حجز سريع جديد' : 'New Quick Booking Request',
          labelEn: 'New Quick Booking Request',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          completed: true,
          description: isAr ? 'تم استلام طلب الحجز السريع بنجاح من الصفحة الرئيسية للموبايل.' : 'Quick order received.',
        },
      ],
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);
    setConfirmedOrderId(orderId);
    setStep(4);
    toast.success('تم إرسال طلب الحجز بنجاح!');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet Modal */}
      <div
        className={cn(
          'relative z-10 w-full max-h-[92vh] flex flex-col',
          'bg-white dark:bg-[#091120] rounded-t-[32px] shadow-2xl border-t border-slate-200 dark:border-slate-800',
          'animate-in slide-in-from-bottom duration-300'
        )}
      >
        {/* Handle Bar */}
        <div className="pt-3 pb-1 flex items-center justify-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0866C6] text-white flex items-center justify-center shadow-md shadow-[#0866C6]/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {step === 4 ? 'تم تأكيد الحجز بنجاح 🎉' : 'حجز فوري مباشر (< 20 ثانية)'}
              </h2>
              <p className="text-[10px] text-slate-400">
                {step === 1 && 'الخطوة 1: اختر الخدمة'}
                {step === 2 && 'الخطوة 2: حدد التاريخ والوقت'}
                {step === 3 && 'الخطوة 3: بيانات الموقع والتأكيد'}
                {step === 4 && `رقم الطلب #${confirmedOrderId}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sheet Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ===================== STEP 1: CHOOSE SERVICE ===================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              {/* Category Segmented Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCategory('car');
                    setSelectedService(null);
                    setSelectedPkg(null);
                    setSelectedAddonsList([]);
                  }}
                  className={cn(
                    'py-2 px-3 rounded-full text-xs font-black flex items-center justify-center gap-2 transition-all',
                    category === 'car'
                      ? 'bg-[#0866C6] text-white shadow-md shadow-[#0866C6]/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Car className="w-4 h-4" />
                  <span>خدمات السيارات</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCategory('home');
                    setSelectedService(null);
                    setSelectedPkg(null);
                    setSelectedAddonsList([]);
                  }}
                  className={cn(
                    'py-2 px-3 rounded-full text-xs font-black flex items-center justify-center gap-2 transition-all',
                    category === 'home'
                      ? 'bg-[#07345C] text-white shadow-md shadow-[#07345C]/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Home className="w-4 h-4" />
                  <span>خدمات المنازل</span>
                </button>
              </div>

              {/* Service Cards List */}
              <div className="space-y-2.5">
                {filteredServices.map((svc) => {
                  const isSelected = selectedService?.id === svc.id;
                  return (
                    <div
                      key={svc.id}
                      onClick={() => setSelectedService(svc)}
                      className={cn(
                        'p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3',
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-sky-500/30'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {svc.image ? (
                          <img
                            src={svc.image}
                            alt={svc.title}
                            className="w-14 h-14 rounded-full object-cover shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                            <Sparkles className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-white">
                            {svc.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {svc.shortDescription}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {svc.duration} دقيقة
                            </span>
                            {svc.popular && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500 text-white">
                                الأكثر طلباً
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        <p className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400">
                          {svc.price} ج.م
                        </p>
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full border-2 inline-flex items-center justify-center mt-1 transition-colors',
                            isSelected
                              ? 'border-sky-500 bg-sky-500 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          )}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-sky-500" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Package Selection */}
              {selectedService && selectedService.packages && selectedService.packages.filter((p) => p.active !== false).length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">
                      الباقات البديلة (اختياري):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      تستبدل السعر الأساسي
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Option 0: Base Service (No Package) */}
                    <div
                      onClick={() => setSelectedPkg(null)}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all',
                        selectedPkg === null
                          ? 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-sky-200 font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('w-3.5 h-3.5 rounded-full border flex items-center justify-center', selectedPkg === null ? 'border-sky-500 bg-sky-500' : 'border-slate-400')}>
                          {selectedPkg === null && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex flex-col">
                          <span>بدون باقة (الخدمة الأساسية)</span>
                          <span className="text-[10px] text-slate-400 font-normal">الافتراضي</span>
                        </div>
                      </div>
                      <span className="font-mono">{selectedService.price} ج.م</span>
                    </div>

                    {selectedService.packages.filter((p) => p.active !== false).map((pkg) => {
                      const isChosen = selectedPkg?.id === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPkg(isChosen ? null : pkg)}
                          className={cn(
                            'p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all',
                            isChosen
                              ? 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-sky-200 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn('w-3.5 h-3.5 rounded-full border flex items-center justify-center', isChosen ? 'border-sky-500 bg-sky-500' : 'border-slate-400')}>
                              {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span>{pkg.name}</span>
                          </div>
                          <span className="font-mono">{pkg.price} ج.م</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons Selection */}
              {selectedService && selectedService.addons && selectedService.addons.filter((a) => a.active !== false).length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">إضافات اختيارية:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedService.addons.filter((a) => a.active !== false).map((addon) => {
                      const isAdded = selectedAddonsList.some((a) => a.id === addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() =>
                            setSelectedAddonsList((prev) =>
                              isAdded ? prev.filter((a) => a.id !== addon.id) : [...prev, addon]
                            )
                          }
                          className={cn(
                            'p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between',
                            isAdded
                              ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn('w-3.5 h-3.5 rounded-sm border flex items-center justify-center', isAdded ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-400')}>
                              {isAdded && <CheckCircle2 className="w-2.5 h-2.5" />}
                            </div>
                            <span>{addon.name}</span>
                          </div>
                          <span className="font-mono">+{addon.price} ج.م</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== STEP 2: CHOOSE DATE & TIME ===================== */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              {/* Selected Service Pill */}
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">الخدمة المختارة:</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedService?.title}</p>
                </div>
                <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                  {selectedService?.price} ج.م
                </span>
              </div>

              {/* Date Selection Horizontal Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  <span>اختر تاريخ الحجز</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                  {dateOptions.map((opt) => {
                    const isSelected = selectedDate === opt.dateString;
                    const isAvailable = opt.isAvailable;
                    return (
                      <button
                        key={opt.dateString}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => isAvailable && setSelectedDate(opt.dateString)}
                        className={cn(
                          'p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center',
                          !isAvailable
                            ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 opacity-50 cursor-not-allowed text-slate-400'
                            : isSelected
                            ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25 scale-[1.03]'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-300'
                        )}
                      >
                        <span className="text-[11px] font-extrabold">{isAr ? opt.dayNameAr : opt.dayNameEn}</span>
                        <span className="text-[10px] opacity-80 mt-0.5">{isAr ? opt.formattedDateAr : opt.formattedDateEn}</span>
                        {!isAvailable && opt.reason && (
                          <span className="text-[9px] text-rose-500 truncate max-w-[70px] mt-0.5">{opt.reason}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0866C6]" />
                  <span>اختر الموعد المناسب</span>
                </label>
                {timeSlots.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {isAr ? 'لا توجد مواعيد متاحة لهذا اليوم' : 'No available slots for this date'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      const isAvailable = slot.isAvailable;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => isAvailable && setSelectedTime(slot.time)}
                          className={cn(
                            'py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5',
                            !isAvailable
                              ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/40 opacity-50 cursor-not-allowed text-slate-400'
                              : isSelected
                              ? 'bg-[#0866C6] text-white border-[#0866C6] shadow-md shadow-[#0866C6]/25 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#0866C6]'
                          )}
                        >
                          <span className="font-mono">{isAr ? slot.label : slot.labelEn}</span>
                          {!isAvailable && slot.reason && (
                            <span className="text-[9px] text-rose-500 font-normal mt-0.5">{slot.reason}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== STEP 3: ADDRESS & CONFIRMATION ===================== */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#0866C6]" />
                  <span>رقم الهاتف للتواصل *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0866C6]" />
                  <span>اسم العميل</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="أدخل اسمك الكريم"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-500" />
                    <span>المحافظة</span>
                  </label>
                  <select
                    value={governorateId}
                    onChange={(e) => handleGovChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium"
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
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>المدينة / المنطقة</span>
                  </label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    disabled={activeCities.length === 0}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium"
                  >
                    {activeCities.length === 0 ? (
                      <option value="">{isAr ? 'لا توجد مناطق متاحة' : 'No areas available'}</option>
                    ) : (
                      activeCities.map((c) => {
                        const cId = c.id || (c as any)._id;
                        return (
                          <option key={cId} value={cId}>
                            {isAr ? c.name : c.nameEn || c.name}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">الحي / الشارع / العنوان التفصيلي</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="مثال: الحي الرابع، شارع النخيل، عمارة 5"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="موديل السيارة، أو علامة مميزة للمنزل..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Order Final Summary Receipt */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>الخدمة:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedService?.title}</span>
                </div>
                {selectedPkg ? (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>الباقة المختارة:</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {selectedPkg.name} ({selectedPkg.price} ج.م)
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>الباقة:</span>
                    <span className="font-medium text-slate-500">
                      بدون باقة (السعر الأساسي: {selectedService?.price} ج.م)
                    </span>
                  </div>
                )}
                {selectedAddonsList.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                    {selectedAddonsList.map((addon) => (
                      <div key={addon.id} className="flex justify-between text-amber-700 dark:text-amber-400 text-[11px]">
                        <span>+ {addon.name}:</span>
                        <span className="font-mono font-bold">+{addon.price} ج.م</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>الموعد:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedDate} — {selectedTime}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>رسوم الانتقال والمعدات:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">مجاناً (عرض اليوم)</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                  <span>الإجمالي للدفع عند الاستلام:</span>
                  <span className="text-sky-600 dark:text-sky-400">{quickTotalPrice} ج.م</span>
                </div>
              </div>
            </div>
          )}

          {/* ===================== STEP 4: SUCCESS CONFIRMATION ===================== */}
          {step === 4 && (
            <div className="py-6 flex flex-col items-center text-center space-y-5 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  تم استلام طلب الحجز بنجاح!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  سيتواصل معك فني كلينزو للتأكيد والانطلاق في الموعد المحدد: {selectedDate} ({selectedTime}).
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-start">
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم الحجز:</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">#{confirmedOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الخدمة:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedService?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المبلغ المطلوب:</span>
                  <span className="font-bold text-emerald-600">{selectedService?.price} ج.م</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 w-full pt-2">
                <a
                  href={`https://wa.me/201012345678?text=${encodeURIComponent(`مرحباً كلينزو، أود متابعة طلبي رقم #${confirmedOrderId} لخدمة ${selectedService?.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تأكيد عبر واتساب مع الدعم</span>
                </a>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إغلاق ومتابعة التصفح
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sheet Footer Controls (Next / Back Buttons) */}
        {step < 4 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-[#091120]/80 backdrop-blur-md flex items-center justify-between gap-3 pb-[max(env(safe-area-inset-bottom),16px)]">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                السابق
              </button>
            ) : (
              <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                {selectedService?.price} ج.م
              </span>
            )}

            {step === 1 && (
              <Button
                variant="primary"
                size="md"
                disabled={!selectedService || selectedService.category !== category}
                onClick={() => {
                  if (!selectedService || selectedService.category !== category) {
                    toast.error(isAr ? 'من فضلك اختر خدمة أولًا للمتابعة.' : 'Please select a service to continue.');
                    return;
                  }
                  setStep(2);
                }}
                className={cn(
                  'flex-1 justify-center rounded-xl text-xs font-bold transition-all',
                  (!selectedService || selectedService.category !== category) &&
                    'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500'
                )}
              >
                <span>متابعة: اختيار الموعد</span>
                <ArrowIcon className="w-4 h-4" />
              </Button>
            )}

            {step === 2 && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep(3)}
                className="flex-1 justify-center rounded-xl text-xs font-bold"
              >
                <span>متابعة: بيانات الموقع</span>
                <ArrowIcon className="w-4 h-4" />
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmBooking}
                className="flex-1 justify-center rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25"
              >
                <span>تأكيد الحجز الفوري الآن</span>
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
