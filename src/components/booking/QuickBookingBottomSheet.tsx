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
  ChevronDown,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useAddressStore, isSameAddress } from '@/store/useAddressStore';
import { useBookingStore } from '@/store/useBookingStore';
import { getUpcomingBookingDates, getTimeSlotsForDate, BookingSlot, isSameService, isSameTime, getBookingTimeInterval, isTimeIntervalOverlapping, minutesTo24H, getOrderCategory } from '@/lib/bookingEngine';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { formatTimeTo12Hour } from '@/lib/timeUtils';
import { Service, ServiceCategory, Order, Address, ServicePackage, ServiceAddon } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { validateCustomerName } from '@/lib/validation/nameValidation';
import { calculateItemizedPricing } from '@/lib/pricing';
import { resolveCategoryInfo, normalizeCategory, isSameCategory } from '@/lib/services/categoryUtils';

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
  const categories = useServiceStore((s) => s.categories);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [fetchServices, fetchCategories]);

  const activeCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories
        .filter((c) => c.active !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return [];
  }, [categories]);

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
  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [selectedAddonsList, setSelectedAddonsList] = useState<ServiceAddon[]>([]);

  // Address & Contact info
  const [governorateId, setGovernorateId] = useState<string>('');
  const [cityId, setCityId] = useState<string>('');
  const [area, setArea] = useState(user?.addresses?.[0]?.area || 'الحي الرابع، شارع النخيل');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialCategory) {
        setCategory(initialCategory);
      } else if (activeCategories.length > 0) {
        setCategory((activeCategories[0].slug || activeCategories[0].id) as ServiceCategory);
      }
      setSelectedService(null);
      setSelectedPkg(null);
      setSelectedAddonsList([]);
      setStep(1);

      // Pre-fill customer details and saved address if available
      const savedDefaultAddr = useAddressStore.getState().getDefaultAddress();
      const bookingStore = useBookingStore.getState();
      const existingName = user?.name || bookingStore.guestName || savedDefaultAddr?.customerName || '';
      const existingPhone = user?.phone || bookingStore.guestPhone || savedDefaultAddr?.customerPhone || '';
      const existingArea = savedDefaultAddr?.area || user?.addresses?.[0]?.area || '';

      if (existingName) setCustomerName(existingName);
      if (existingPhone) setCustomerPhone(existingPhone);
      if (existingArea) setArea(existingArea);
      if (savedDefaultAddr?.governorateId) {
        setGovernorateId(savedDefaultAddr.governorateId);
        if (savedDefaultAddr.cityId) {
          setCityId(savedDefaultAddr.cityId);
        }
      }
    }
  }, [isOpen, initialCategory, activeCategories, user]);

  useEffect(() => {
    if (initialServiceId && availableServices.length > 0) {
      const found = availableServices.find((s) => s.id === initialServiceId);
      if (found) {
        setSelectedService(found);
        setCategory(found.category);
      }
    }
  }, [availableServices, initialServiceId]);



  useEffect(() => {
    setSelectedPkg(null);
    setSelectedAddonsList([]);
  }, [selectedService]);

  const quickPricing = useMemo(() => {
    if (!selectedService) {
      return {
        baseOriginalPrice: 0,
        catalogDiscount: 0,
        catalogDiscountPercent: 0,
        baseSellingPrice: 0,
        addonsTotal: 0,
        subtotal: 0,
        totalDiscount: 0,
        finalPrice: 0,
      };
    }
    return calculateItemizedPricing({
      service: {
        id: selectedService.id,
        price: Number(selectedService.price) || 0,
      },
      selectedPackage: selectedPkg
        ? {
            id: selectedPkg.id,
            name: selectedPkg.name,
            price: Number(selectedPkg.price) || 0,
            originalPrice: selectedPkg.originalPrice,
          }
        : null,
      addons: selectedAddonsList.map((a) => ({
        id: a.id,
        name: a.name,
        price: Number(a.price) || 0,
      })),
      coupon: null,
      serviceFee: 0,
    });
  }, [selectedService, selectedPkg, selectedAddonsList]);

  const quickTotalPrice = quickPricing.finalPrice;

  const bookingSettings = useSettingsStore((s) => s.settings.booking);
  const fetchPublicSettings = useSettingsStore((s) => s.fetchPublicSettings);

  useEffect(() => {
    fetchPublicSettings();
  }, [fetchPublicSettings]);

  const dateOptions = useMemo(() => {
    return getUpcomingBookingDates(bookingSettings?.advanceBookingDays || 14, bookingSettings);
  }, [bookingSettings]);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const dateDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (dateOptions.length > 0) {
      const firstAvailable = dateOptions.find((d) => d.isAvailable);
      const isCurrentValid = dateOptions.some((d) => d.dateString === selectedDate && d.isAvailable);
      if ((!selectedDate || !isCurrentValid) && firstAvailable) {
        setSelectedDate(firstAvailable.dateString);
      }
    }
  }, [dateOptions, selectedDate]);

  const selectedDateOpt = useMemo(
    () => dateOptions.find((d) => d.dateString === selectedDate),
    [dateOptions, selectedDate]
  );

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateOpt) {
      return isAr ? 'اختر تاريخ الحجز' : 'Select preferred date';
    }
    const day = isAr ? selectedDateOpt.dayNameAr : selectedDateOpt.dayNameEn;
    const dateFormatted = isAr ? selectedDateOpt.formattedDateAr : selectedDateOpt.formattedDateEn;
    const badge = selectedDateOpt.isToday ? (isAr ? ' (اليوم)' : ' (Today)') : '';
    return `${day}، ${dateFormatted}${badge}`;
  }, [selectedDateOpt, isAr]);

  const [liveSlots, setLiveSlots] = useState<BookingSlot[] | null>(null);

  const serviceDuration = useMemo(() => {
    return Number(selectedService?.serviceDurationMinutes || selectedService?.duration) || 45;
  }, [selectedService]);

  useEffect(() => {
    if (!selectedDate || !selectedService?.id) {
      setLiveSlots(null);
      return;
    }
    let isMounted = true;
    const effectiveCategory = selectedService?.category;

    const fetchLiveSlots = () => {
      cleanzoApi.availability
        .checkDate(selectedDate, selectedService.id, serviceDuration, [selectedService.id], undefined, effectiveCategory)
        .then((res) => {
          if (!isMounted) return;
          if (res && Array.isArray(res.slots)) {
            const formattedSlots: BookingSlot[] = res.slots
              .filter((slot: any) => Boolean(slot.available ?? slot.isAvailable))
              .map((slot: any) => {
                const labelAr = formatTimeTo12Hour(slot.label || slot.time, { locale: 'ar' });
                const labelEn = formatTimeTo12Hour(slot.label || slot.time, { locale: 'en' });
                return {
                  time: labelEn,
                  label: labelAr,
                  labelEn: labelEn,
                  isAvailable: true,
                  reason: undefined,
                  scheduledStart: slot.start || slot.scheduledStart || slot.time24,
                  scheduledEnd: slot.end || slot.scheduledEnd,
                  totalOccupiedMinutes: slot.totalOccupiedMinutes || serviceDuration,
                  serviceDurationMinutes: slot.serviceDurationMinutes || serviceDuration,
                };
              });
            setLiveSlots(formattedSlots);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLiveSlots(null);
          }
        });
    };

    fetchLiveSlots();

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('cleanzo_availability');
        bc.onmessage = (event) => {
          if (event.data?.type === 'BOOKING_CHANGED' || event.data?.type?.startsWith('BOOKING_')) {
            fetchLiveSlots();
          }
        };
      }
    } catch {}

    const handleBookingChanged = () => fetchLiveSlots();
    window.addEventListener('cleanzo:booking-changed', handleBookingChanged);
    window.addEventListener('focus', fetchLiveSlots);

    const pollTimer = setInterval(fetchLiveSlots, 3500);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('cleanzo:booking-changed', handleBookingChanged);
      window.removeEventListener('focus', fetchLiveSlots);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, [selectedDate, selectedService?.id, serviceDuration, selectedService?.category]);

  const timeSlots = useMemo(() => {
    let baseSlots: BookingSlot[] = [];
    const effectiveCategory = selectedService?.category;
    if (liveSlots !== null) {
      baseSlots = [...liveSlots];
    } else {
      baseSlots = getTimeSlotsForDate(
        selectedDate,
        bookingSettings,
        selectedService?.id,
        selectedService?.title,
        orders,
        serviceDuration,
        selectedService?.travelTimeMinutes,
        selectedService?.id ? [selectedService.id] : [],
        effectiveCategory,
        false
      );
    }

    return baseSlots.filter((s) => s.isAvailable);
  }, [selectedDate, liveSlots, bookingSettings, selectedService, orders, serviceDuration]);

  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    if (timeSlots.length > 0) {
      const isCurrentValid = timeSlots.some((s) => (s.time === selectedTime || isSameTime(s.time, selectedTime)) && s.isAvailable);
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



  // Filter services by active category
  const filteredServices = useMemo(() => {
    return availableServices.filter((s) => {
      if (!category) return true;
      if (s.category === category) return true;

      const catInfo = resolveCategoryInfo(s.category, categories, isAr);
      const targetCat = activeCategories.find((c) => c.slug === category || c.id === category);

      return (
        catInfo.slug === category ||
        catInfo.matchedCategory?.id === category ||
        catInfo.matchedCategory?.slug === category ||
        (targetCat && (
          catInfo.slug === targetCat.slug ||
          catInfo.matchedCategory?.id === targetCat.id ||
          s.category === targetCat.id ||
          s.category === targetCat.slug ||
          s.category === targetCat.name
        )) ||
        (category === 'car' && catInfo.isCar) ||
        (category === 'home' && catInfo.isHome)
      );
    });
  }, [availableServices, category, categories, activeCategories, isAr]);

  const isSelectedServiceValid = useMemo(() => {
    if (!selectedService) return false;
    return filteredServices.some((s) => s.id === selectedService.id);
  }, [selectedService, filteredServices]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: Re-fetch live slots to reflect real-time changes immediately (no page refresh needed)
  const refreshLiveSlots = () => {
    if (!selectedDate || !selectedService?.id) return;
    const effectiveCategory = selectedService?.category;
    cleanzoApi.availability
      .checkDate(selectedDate, selectedService.id, serviceDuration, [selectedService.id], undefined, effectiveCategory)
      .then((res) => {
        if (res && Array.isArray(res.slots)) {
          const formattedSlots: BookingSlot[] = res.slots.map((slot: any) => {
            const labelAr = formatTimeTo12Hour(slot.label || slot.time, { locale: 'ar' });
            const labelEn = formatTimeTo12Hour(slot.label || slot.time, { locale: 'en' });
            return {
              time: labelEn,
              label: labelAr,
              labelEn: labelEn,
              isAvailable: Boolean(slot.available),
              reason: slot.reason,
              scheduledStart: slot.start || slot.scheduledStart || slot.time24,
              scheduledEnd: slot.end || slot.scheduledEnd,
              totalOccupiedMinutes: slot.totalOccupiedMinutes || serviceDuration,
              serviceDurationMinutes: slot.serviceDurationMinutes || serviceDuration,
            };
          });
          setLiveSlots(formattedSlots);
        } else {
          setLiveSlots(null);
        }
      })
      .catch(() => {
        setLiveSlots(null);
      });
  };

  const handleConfirmBooking = async () => {
    if (isSubmitting) return;
    if (!selectedService || !isSelectedServiceValid) {
      toast.error(isAr ? 'يرجى اختيار الخدمة المطابقة للقسم المحدد' : 'Please select a valid service for this category');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      toast.error('يرجى إدخال رقم هاتف صحيح للتواصل');
      return;
    }
    const nameVal = validateCustomerName(customerName, isAr);
    if (!nameVal.isValid) {
      toast.error(nameVal.message || (isAr ? 'يرجى إدخال اسم العميل للمتابعة' : 'Please enter customer name to proceed'));
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

    const finalAddress: Address = {
      id: `addr-${Date.now()}`,
      label: isAr ? 'موقع الحجز السريع' : 'Quick Booking Address',
      governorate: currentGov?.name || governorateId || 'المنيا',
      city: currentCity?.name || cityId || 'المنيا الجديدة',
      area: area || currentCity?.name || 'المنيا الجديدة',
      details: notes || undefined,
      governorateId: currentGov?.id || (currentGov as any)?._id || governorateId,
      governorateNameSnapshot: isAr ? (currentGov?.name || '') : (currentGov?.nameEn || currentGov?.name || ''),
      cityId: currentCity?.id || (currentCity as any)?._id || cityId,
      cityNameSnapshot: isAr ? (currentCity?.name || '') : (currentCity?.nameEn || currentCity?.name || ''),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    };

    setIsSubmitting(true);

    try {
      // Send booking to backend API (authoritative server-side validation + category-based slot blocking)
      const createdBooking = await cleanzoApi.bookings.create({
        serviceId: selectedService.id,
        services: [{ serviceId: selectedService.id, packageId: selectedPkg?.id, addonIds: selectedAddonsList.map((a) => a.id) }],
        packageId: selectedPkg?.id,
        addonIds: selectedAddonsList.map((a) => a.id),
        category: selectedService.category,
        date: selectedDate,
        time: selectedTime,
        address: finalAddress,
        notes: notes || undefined,
        guestName: customerName.trim(),
        guestPhone: customerPhone.trim(),
        saveAddress: true,
      });

      if (!createdBooking || !createdBooking.id) {
        throw new Error(isAr ? 'لم يتم استلام تأكيد الحجز من الخادم' : 'Did not receive booking confirmation from server');
      }

      // Save authoritative server booking to local store
      addOrder(createdBooking);

      // Persist address and contact details across subsequent bookings for all services without duplication
      const existingAddresses = useAddressStore.getState().addresses || [];
      const matchedAddress = existingAddresses.find((a) => isSameAddress(a, finalAddress));
      const savedAddrPayload: Address = {
        ...(matchedAddress || finalAddress),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        isDefault: true,
      };
      if (!matchedAddress) {
        useAddressStore.getState().addAddress(savedAddrPayload);
      }
      useBookingStore.getState().setGuestInfo(customerName.trim(), customerPhone.trim());
      useBookingStore.getState().setAddress(savedAddrPayload);

      // Immediately re-fetch live slots so the booked time disappears from the UI without page refresh
      refreshLiveSlots();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cleanzo:booking-changed', { detail: { date: selectedDate } }));
        try {
          const channel = new BroadcastChannel('cleanzo_availability');
          channel.postMessage({ type: 'BOOKING_CREATED', date: selectedDate, category: selectedService?.category });
          channel.close();
        } catch {
          // ignore BroadcastChannel errors
        }
      }

      setConfirmedOrderId(createdBooking.id);
      setStep(4);
      toast.success(isAr ? `تم تسجيل طلبك بنجاح برقم #${createdBooking.id}` : `Booking created successfully #${createdBooking.id}`);
    } catch (err: any) {
      console.error('[QuickBooking Submit Error]:', err);
      toast.error(err?.message || (isAr ? 'فشل إتمام الحجز، يرجى المحاولة مجدداً' : 'Failed to complete booking'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
              {activeCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {activeCategories.map((cat, idx) => {
                    const isSelected =
                      category === cat.slug ||
                      category === cat.id ||
                      (activeCategories.length === 1);
                    const catName = String(isAr ? (cat.name || '') : (cat.nameEn || cat.name || ''));
                    const slug = (cat.slug || '').toLowerCase();
                    const iconStr = (cat.icon || '').toLowerCase();
                    const CatIcon =
                      slug === 'car' || iconStr === 'car' || slug.includes('car') || catName.includes('سيار')
                        ? Car
                        : slug === 'home' || iconStr === 'home' || slug.includes('home') || catName.includes('منزل') || catName.includes('منازل')
                        ? Home
                        : Sparkles;

                    return (
                      <button
                        key={cat.id || cat.slug || idx}
                        type="button"
                        onClick={() => {
                          setCategory((cat.slug || cat.id) as ServiceCategory);
                          setSelectedService(null);
                          setSelectedPkg(null);
                          setSelectedAddonsList([]);
                        }}
                        className={cn(
                          'flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap',
                          isSelected
                            ? 'bg-[#0866C6] text-white shadow-md shadow-[#0866C6]/25'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        )}
                      >
                        <CatIcon className="w-4 h-4" />
                        <span>{catName || (isAr ? 'قسم خدمات' : 'Category')}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Service Cards List */}
              <div className="space-y-2.5">
                {filteredServices.length === 0 && (
                  <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                    {isAr ? 'لا توجد خدمات متاحة حالياً في هذا القسم' : 'No services available in this category'}
                  </div>
                )}
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
                      <div className="flex items-center gap-3 min-w-0 flex-1">
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
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 break-words">
                            {svc.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-tight break-words">
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
              {selectedService && Array.isArray(selectedService.packages) && selectedService.packages.filter((p) => p && p.active !== false).length > 0 && (
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

                    {(selectedService.packages || []).filter((p) => p && p.active !== false).map((pkg) => {
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
              {selectedService && Array.isArray(selectedService.addons) && selectedService.addons.filter((a) => a && a.active !== false).length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">إضافات اختيارية:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(selectedService.addons || []).filter((a) => a && a.active !== false).map((addon) => {
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

              {/* Date Selection Dropdown */}
              <div className="relative space-y-1.5" ref={dateDropdownRef}>
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    <span>{isAr ? 'اختر تاريخ الحجز' : 'Select Date'}</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {isAr ? 'اختر اليوم الأنسب' : 'Choose date'}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsDateOpen((prev) => !prev)}
                  className={cn(
                    "w-full h-11 px-3.5 rounded-xl border flex items-center justify-between transition-all bg-white dark:bg-[#071E34] text-slate-900 dark:text-white font-medium text-xs sm:text-sm cursor-pointer",
                    isDateOpen
                      ? "border-[#0866C6] ring-2 ring-[#0866C6]/20 dark:ring-[#0866C6]/30 shadow-sm"
                      : "border-[#DDE7EC] dark:border-[#133B61] hover:border-[#0866C6]/40 dark:hover:border-[#0866C6]/40"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Calendar className="w-4 h-4 text-[#0866C6] shrink-0" />
                    <span className="truncate font-semibold">{selectedDateLabel}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                      isDateOpen && "rotate-180 text-[#0866C6]"
                    )}
                  />
                </button>

                {isDateOpen && (
                  <div className="absolute z-40 mt-1.5 w-full bg-white dark:bg-[#071E34] border border-[#DDE7EC] dark:border-[#133B61] rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1">
                    {dateOptions.map((opt) => {
                      const isSelected = selectedDate === opt.dateString;
                      const isAvailable = opt.isAvailable;

                      return (
                        <button
                          key={opt.dateString}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => {
                            if (isAvailable) {
                              setSelectedDate(opt.dateString);
                              setIsDateOpen(false);
                            }
                          }}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg flex items-center justify-between text-xs sm:text-sm transition-colors text-start cursor-pointer",
                            !isAvailable
                              ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500"
                              : isSelected
                              ? "bg-[#0866C6]/10 text-[#0866C6] dark:text-[#83AED0] font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold">{isAr ? opt.dayNameAr : opt.dayNameEn}</span>
                            <span className="text-slate-400">·</span>
                            <span>{isAr ? opt.formattedDateAr : opt.formattedDateEn}</span>
                            {opt.isToday && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-[#0866C6] dark:text-sky-300">
                                {isAr ? 'اليوم' : 'Today'}
                              </span>
                            )}
                          </div>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-[#0866C6] shrink-0" />
                          ) : !isAvailable && opt.reason ? (
                            <span className="text-[10px] text-[#F0444C] font-semibold">{opt.reason}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0866C6]" />
                  <span>{isAr ? 'اختر الموعد المناسب' : 'Select Time'}</span>
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
                      const isSelected = selectedTime === slot.time || isSameTime(selectedTime, slot.time);
                      const displayLabel = formatTimeTo12Hour(isAr ? slot.label : slot.labelEn);

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedTime(slot.time)}
                          className={cn(
                            'py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer',
                            isSelected
                              ? 'bg-[#0866C6] text-white border-[#0866C6] shadow-md shadow-[#0866C6]/25 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#0866C6]'
                          )}
                        >
                          <span className="font-mono font-bold" dir="ltr">{displayLabel}</span>
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
                  <span>{isAr ? 'اسم العميل' : 'Customer Name'}</span>
                  <span className="text-[#F0444C] font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={isAr ? 'أدخل اسمك الكريم' : 'Enter customer name'}
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
                    <span>المدينة</span>
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
                {quickPricing.catalogDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>خصم العرض المباشر ({quickPricing.catalogDiscountPercent}%):</span>
                    <span className="font-mono">-{quickPricing.catalogDiscount} ج.م</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                  <span>الإجمالي للدفع عند الاستلام:</span>
                  <span className="text-sky-600 dark:text-sky-400 font-mono">{quickPricing.finalPrice} ج.م</span>
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
                disabled={!isSelectedServiceValid}
                onClick={() => {
                  if (!isSelectedServiceValid) {
                    toast.error(isAr ? 'من فضلك اختر خدمة أولًا للمتابعة.' : 'Please select a service to continue.');
                    return;
                  }
                  setStep(2);
                }}
                className={cn(
                  'flex-1 justify-center rounded-xl text-xs font-bold transition-all',
                  !isSelectedServiceValid &&
                    'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500'
                )}
              >
                <span>{isAr ? 'متابعة: اختيار الموعد' : 'Continue: Select Schedule'}</span>
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
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="flex-1 justify-center rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري تأكيد الحجز...' : 'Confirming booking...'}</span>
                  </>
                ) : (
                  <>
                    <span>تأكيد الحجز الفوري الآن</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
