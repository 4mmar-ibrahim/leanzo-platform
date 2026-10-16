'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  Check,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useAddressStore, isSameAddress } from '@/store/useAddressStore';
import { useBookingStore } from '@/store/useBookingStore';
import { getUpcomingBookingDates, getTimeSlotsForDate, BookingSlot, isSameTime } from '@/lib/bookingEngine';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { formatTimeTo12Hour } from '@/lib/timeUtils';
import { Service, ServiceCategory, Address, ServicePackage, ServiceAddon } from '@/types';
import { Button } from '@/components/ui/Button';
import { AuthModalPrompt } from '@/components/booking/AuthModalPrompt';
import { cn, formatDuration, getServiceTotalMinutes } from '@/lib/utils';
import { toast } from 'sonner';
import { validateCustomerName, sanitizeNameString } from '@/lib/validation/nameValidation';
import { validateEgyptianPhone, normalizePhoneInput } from '@/lib/validation/phoneValidation';
import { calculateItemizedPricing } from '@/lib/pricing';
import { resolveCategoryInfo } from '@/lib/services/categoryUtils';
import { autoTranslate } from '@/lib/i18n/autoTranslate';

/**
 * Format a time range with a single AM/PM (ص/م) suffix when both start and end fall in the same period
 * Example:
 * 09:00 to 09:45 -> "9:00 – 9:45 ص"
 * 11:15 to 12:00 -> "11:15 ص – 12:00 م"
 * Single time: 09:00 -> "9:00 ص"
 */
function formatCleanInterval(startStr: string, endStr: string, isAr: boolean): string {
  if (!startStr) return '';
  const parseHM = (str: string) => {
    const raw = String(str).trim();
    if (raw.includes(':')) {
      const parts = raw.replace(/[^0-9:]/g, '').split(':');
      let h = parseInt(parts[0] || '0', 10);
      const m = parseInt(parts[1] || '0', 10);
      const upper = raw.toUpperCase();
      const isPM = upper.includes('PM') || upper.includes('مساء') || upper.includes('م');
      const isAM = upper.includes('AM') || upper.includes('صباح') || upper.includes('ص');
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return { h, m };
    }
    return null;
  };

  const startHM = parseHM(startStr);
  const endHM = endStr ? parseHM(endStr) : null;

  if (!startHM) {
    return formatTimeTo12Hour(startStr, { locale: isAr ? 'ar' : 'en' });
  }

  const sH = startHM.h;
  const sM = startHM.m;
  const sPeriod = sH >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const sH12 = sH % 12 === 0 ? 12 : sH % 12;
  const sMinFormatted = sM.toString().padStart(2, '0');

  // If no end time, or end is the same as start, return single formatted time
  if (!endHM || (startHM.h === endHM.h && startHM.m === endHM.m)) {
    return `${sH12}:${sMinFormatted} ${sPeriod}`;
  }

  const eH = endHM.h;
  const eM = endHM.m;
  const ePeriod = eH >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const eH12 = eH % 12 === 0 ? 12 : eH % 12;
  const eMinFormatted = eM.toString().padStart(2, '0');

  if (sPeriod === ePeriod) {
    return `\u200E${sH12}:${sMinFormatted}\u200E – \u200E${eH12}:${eMinFormatted} ${ePeriod}\u200E`;
  } else {
    return `\u200E${sH12}:${sMinFormatted} ${sPeriod}\u200E – \u200E${eH12}:${eMinFormatted} ${ePeriod}\u200E`;
  }
}

/**
 * Unified slot formatter for consistent API availability handling
 */
function parseLiveSlots(slots: any[], duration: number): BookingSlot[] {
  return (slots || [])
    .filter((slot: any) => Boolean(slot.available ?? slot.isAvailable))
    .map((slot: any) => {
      const rawStart = slot.start || slot.scheduledStart || slot.time24 || (slot.time ? slot.time.split(/[-–—]/)[0].trim() : '09:00');
      const rawEnd = slot.end || slot.scheduledEnd || (slot.time ? slot.time.split(/[-–—]/)[1]?.trim() : '');
      const rawTime = slot.time || (rawEnd ? `${rawStart} – ${rawEnd}` : rawStart);
      const labelAr = formatCleanInterval(rawStart, rawEnd, true);
      const labelEn = formatCleanInterval(rawStart, rawEnd, false);
      return {
        time: rawTime,
        label: labelAr,
        labelEn: labelEn,
        isAvailable: true,
        reason: undefined,
        scheduledStart: rawStart,
        scheduledEnd: rawEnd,
        totalOccupiedMinutes: slot.totalOccupiedMinutes || duration,
        serviceDurationMinutes: slot.serviceDurationMinutes || duration,
      };
    });
}

function getSlotDisplayLabel(slot: BookingSlot, isAr: boolean): string {
  const rawStart = slot.scheduledStart || (slot as any).start || (slot.time ? slot.time.split(/[-–—]/)[0].trim() : '');
  const rawEnd = slot.scheduledEnd || (slot as any).end || (slot.time ? slot.time.split(/[-–—]/)[1]?.trim() : '');
  if (rawStart && rawEnd) {
    return formatCleanInterval(rawStart, rawEnd, isAr);
  }
  return formatTimeTo12Hour(isAr ? (slot.label || slot.time) : (slot.labelEn || slot.time), { locale: isAr ? 'ar' : 'en' });
}

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
  const { user, isAuthenticated } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Booking Flow Steps: 1: Service, 2: Date & Time, 3: Address & Phone, 4: Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form selections
  const [category, setCategory] = useState<ServiceCategory>(initialCategory);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [selectedAddonsList, setSelectedAddonsList] = useState<ServiceAddon[]>([]);

  // Address & Contact info
  const prevIsOpenRef = useRef(false);
  const socialSettings = useSettingsStore((s) => s.settings.social);
  const cmsContact = useCMSStore((s) => s.contact);
  const cmsSocial = useCMSStore((s) => s.social);
  const [governorateId, setGovernorateId] = useState<string>('');
  const [cityId, setCityId] = useState<string>('');
  const [label, setLabel] = useState<string>(user?.addresses?.[0]?.label || (isAr ? 'المنزل' : 'Home'));
  const [area, setArea] = useState(user?.addresses?.[0]?.area || '');
  const [building, setBuilding] = useState<string>(user?.addresses?.[0]?.building || '');
  const [floor, setFloor] = useState<string>(user?.addresses?.[0]?.floor || '');
  const [apartment, setApartment] = useState<string>(user?.addresses?.[0]?.apartment || '');
  const [landmark, setLandmark] = useState<string>(user?.addresses?.[0]?.landmark || '');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [confirmedOrderId, setConfirmedOrderId] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState<boolean>(false);

  // Date and Time selection states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const pendingBookingRef = useRef<{ address: any; name: string; phone: string } | null>(null);

  useEffect(() => {
    // Only initialize and reset form when the bottom sheet transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      if (initialCategory) {
        setCategory(initialCategory);
      } else if (activeCategories.length > 0) {
        setCategory((activeCategories[0].slug || activeCategories[0].id) as ServiceCategory);
      }

      if (initialServiceId && availableServices.length > 0) {
        const found = availableServices.find((s) => s.id === initialServiceId);
        if (found) {
          setSelectedService(found);
          setCategory(found.category);
        } else {
          setSelectedService(null);
        }
      } else {
        setSelectedService(null);
      }

      setSelectedPkg(null);
      setSelectedAddonsList([]);
      setSelectedTime('');
      setIsDateOpen(false);
      setIsTimeOpen(false);
      setNameError(null);
      setNameTouched(false);
      setPhoneError(null);
      setPhoneTouched(false);
      setStep(1);

      // Pre-fill customer details and saved address if available
      const savedDefaultAddr = useAddressStore.getState().getDefaultAddress();
      const bookingStore = useBookingStore.getState();
      const existingName = user?.name || bookingStore.guestName || savedDefaultAddr?.customerName || '';
      const existingPhone = user?.phone || bookingStore.guestPhone || savedDefaultAddr?.customerPhone || '';
      const existingArea = savedDefaultAddr?.area || user?.addresses?.[0]?.area || '';
      const existingLabel = savedDefaultAddr?.label || user?.addresses?.[0]?.label || 'المنزل';
      const existingBuilding = savedDefaultAddr?.building || user?.addresses?.[0]?.building || '';
      const existingFloor = savedDefaultAddr?.floor || user?.addresses?.[0]?.floor || '';
      const existingApartment = savedDefaultAddr?.apartment || user?.addresses?.[0]?.apartment || '';
      const existingLandmark = savedDefaultAddr?.landmark || user?.addresses?.[0]?.landmark || '';
      const existingNotes = savedDefaultAddr?.notes || '';

      if (existingName) setCustomerName(existingName);
      if (existingPhone) setCustomerPhone(normalizePhoneInput(existingPhone));
      if (existingArea) setArea(existingArea);
      setLabel(existingLabel);
      setBuilding(existingBuilding);
      setFloor(existingFloor);
      setApartment(existingApartment);
      setLandmark(existingLandmark);
      if (existingNotes) setNotes(existingNotes);

      if (savedDefaultAddr?.governorateId) {
        setGovernorateId(savedDefaultAddr.governorateId);
        if (savedDefaultAddr.cityId) {
          setCityId(savedDefaultAddr.cityId);
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialCategory, initialServiceId, activeCategories, availableServices, user]);

  useEffect(() => {
    if (isOpen && initialServiceId && !selectedService && availableServices.length > 0) {
      const found = availableServices.find((s) => s.id === initialServiceId);
      if (found) {
        setSelectedService(found);
        setCategory(found.category);
      }
    }
  }, [isOpen, availableServices, initialServiceId, selectedService]);

  useEffect(() => {
    setSelectedPkg(null);
    setSelectedAddonsList([]);
  }, [selectedService]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setCustomerName(rawVal);

    const clean = sanitizeNameString(rawVal);
    if (!clean) {
      if (nameTouched) {
        setNameError(isAr ? 'يرجى إدخال اسم العميل.' : 'Please enter customer name.');
      } else {
        setNameError(null);
      }
      return;
    }

    const res = validateCustomerName(rawVal, isAr);
    if (!res.isValid) {
      setNameError(res.message || null);
    } else {
      setNameError(null);
    }
  };

  const handleNameBlur = () => {
    setNameTouched(true);
    const clean = sanitizeNameString(customerName);
    if (!clean) {
      setNameError(isAr ? 'يرجى إدخال اسم العميل.' : 'Please enter customer name.');
      return;
    }
    const res = validateCustomerName(customerName, isAr);
    setNameError(res.isValid ? null : res.message || null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizePhoneInput(e.target.value);
    setCustomerPhone(normalized);

    if (!normalized) {
      if (phoneTouched) {
        setPhoneError(isAr ? 'يرجى إدخال رقم الهاتف للتواصل.' : 'Please enter contact phone number.');
      } else {
        setPhoneError(null);
      }
      return;
    }

    const val = validateEgyptianPhone(normalized);
    if (!val.isValid && normalized.length === 11) {
      setPhoneError(val.message || (isAr ? 'رقم الهاتف غير صحيح.' : 'Invalid phone number.'));
    } else if (!val.isValid && phoneTouched && normalized.length > 0) {
      setPhoneError(val.message || null);
    } else {
      setPhoneError(null);
    }
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    const cleanPhone = customerPhone.trim();
    if (!cleanPhone) {
      setPhoneError(isAr ? 'يرجى إدخال رقم الهاتف للتواصل.' : 'Please enter contact phone number.');
      return;
    }
    const val = validateEgyptianPhone(cleanPhone);
    setPhoneError(val.isValid ? null : val.message || (isAr ? 'رقم الهاتف غير صحيح.' : 'Invalid phone number.'));
  };

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeOpen(false);
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
    if (!selectedService) return 45;
    const baseDur = selectedPkg
      ? Number(selectedPkg.durationMinutes) || 45
      : Number(selectedService.serviceDurationMinutes || selectedService.duration) || 45;
    const addonsDur = selectedAddonsList.reduce(
      (sum, a) => sum + (Number(a.durationMinutes) || 0),
      0
    );
    const travelDur = Number(selectedService.travelTimeMinutes || 0);
    return baseDur + addonsDur + travelDur;
  }, [selectedService, selectedPkg, selectedAddonsList]);

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
            const formattedSlots = parseLiveSlots(res.slots, serviceDuration);
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

  useEffect(() => {
    if (timeSlots.length > 0) {
      const isCurrentValid = timeSlots.some((s) => (s.time === selectedTime || isSameTime(s.time, selectedTime)) && s.isAvailable);
      if (!isCurrentValid) {
        const firstAvailable = timeSlots.find((s) => s.isAvailable);
        if (firstAvailable) {
          setSelectedTime(firstAvailable.time);
        } else {
          setSelectedTime('');
        }
      }
    } else {
      setSelectedTime('');
    }
  }, [timeSlots, selectedTime]);

  const selectedSlotObj = useMemo(() => {
    if (!selectedTime) return null;
    return timeSlots.find(
      (s) => s.time === selectedTime || isSameTime(s.time, selectedTime)
    );
  }, [timeSlots, selectedTime]);

  const timeButtonLabel = useMemo(() => {
    if (!selectedSlotObj) {
      return timeSlots.length === 0
        ? (isAr ? 'لا توجد مواعيد متاحة لهذا اليوم' : 'No available slots')
        : (isAr ? 'اختر توقيت الحجز المناسب' : 'Select Time Slot');
    }
    return getSlotDisplayLabel(selectedSlotObj, isAr);
  }, [selectedSlotObj, timeSlots.length, isAr]);

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
          const formattedSlots = parseLiveSlots(res.slots, serviceDuration);
          setLiveSlots(formattedSlots);
        } else {
          setLiveSlots(null);
        }
      })
      .catch(() => {
        setLiveSlots(null);
      });
  };

  const submitBookingPayload = async (
    targetAddress: Address,
    cleanName: string,
    cleanPhoneNum: string
  ) => {
    if (!selectedService) return;
    setIsSubmitting(true);

    try {
      // Send booking to backend API (authoritative server-side validation + category-based slot blocking)
      const createdBooking = await cleanzoApi.bookings.create({
        serviceId: selectedService.id,
        services: [{ serviceId: selectedService.id, packageId: selectedPkg?.id, addonIds: selectedAddonsList.map((a) => a.id) }],
        packageId: selectedPkg?.id,
        addonIds: selectedAddonsList.map((a) => a.id),
        totalOccupiedMinutes: serviceDuration,
        category: selectedService.category,
        date: selectedDate,
        time: selectedTime,
        address: targetAddress,
        notes: notes || undefined,
        guestName: cleanName,
        guestPhone: cleanPhoneNum,
        saveAddress: true,
      });

      if (!createdBooking || !createdBooking.id) {
        throw new Error(isAr ? 'لم يتم استلام تأكيد الحجز من الخادم' : 'Did not receive booking confirmation from server');
      }

      // Save authoritative server booking to local store
      addOrder(createdBooking);

      // Persist address and contact details across subsequent bookings for all services without duplication
      const existingAddresses = useAddressStore.getState().addresses || [];
      const matchedAddress = existingAddresses.find((a) => isSameAddress(a, targetAddress));
      const savedAddrPayload: Address = {
        ...(matchedAddress || targetAddress),
        customerName: cleanName,
        customerPhone: cleanPhoneNum,
        isDefault: true,
      };
      if (!matchedAddress) {
        useAddressStore.getState().addAddress(savedAddrPayload);
      }
      useBookingStore.getState().setGuestInfo(cleanName, cleanPhoneNum);
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

  const handleConfirmBooking = async () => {
    if (isSubmitting) return;
    if (!selectedService || !isSelectedServiceValid) {
      toast.error(isAr ? 'يرجى اختيار الخدمة المطابقة للقسم المحدد' : 'Please select a valid service for this category');
      return;
    }

    const cleanPhone = customerPhone.trim();
    if (!cleanPhone) {
      setPhoneError(isAr ? 'يرجى إدخال رقم الهاتف للتواصل.' : 'Please enter contact phone number.');
      toast.error(isAr ? 'يرجى إدخال رقم الهاتف للتواصل.' : 'Please enter contact phone number.');
      return;
    }
    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.message || (isAr ? 'يرجى إدخال رقم هاتف مصري صحيح.' : 'Please enter a valid Egyptian phone number.'));
      toast.error(phoneVal.message || (isAr ? 'يرجى إدخال رقم هاتف مصري صحيح.' : 'Please enter a valid Egyptian phone number.'));
      return;
    }
    setPhoneError(null);

    const cleanCustomerName = sanitizeNameString(customerName);
    const nameVal = validateCustomerName(cleanCustomerName, isAr);
    if (!nameVal.isValid) {
      setNameError(nameVal.message || null);
      toast.error(nameVal.message || (isAr ? 'يرجى إدخال اسم العميل للمتابعة' : 'Please enter customer name to proceed'));
      return;
    }
    setNameError(null);

    if (!area.trim()) {
      toast.error(isAr ? 'يرجى إدخال الحي أو الشارع أو العنوان التفصيلي' : 'Please enter your street or area address');
      return;
    }

    // Check if customer account is deactivated by admin
    try {
      const customerStore = useCustomerStore.getState();
      const matched = customerStore.customers.find((c) => c.phone === cleanPhone);
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
      label: label.trim() || (isAr ? 'المنزل' : 'Home'),
      governorate: currentGov?.name || governorateId || 'المنيا',
      city: currentCity?.name || cityId || 'المنيا الجديدة',
      area: area.trim(),
      building: building.trim(),
      floor: floor.trim(),
      apartment: apartment.trim(),
      landmark: landmark.trim(),
      notes: notes.trim(),
      details: notes.trim() || landmark.trim(),
      governorateId: currentGov?.id || (currentGov as any)?._id || governorateId,
      governorateNameSnapshot: isAr ? (currentGov?.name || '') : (currentGov?.nameEn || currentGov?.name || ''),
      cityId: currentCity?.id || (currentCity as any)?._id || cityId,
      cityNameSnapshot: isAr ? (currentCity?.name || '') : (currentCity?.nameEn || currentCity?.name || ''),
      customerName: cleanCustomerName,
      customerPhone: cleanPhone,
    };

    // Stash pending booking context for post-auth execution
    pendingBookingRef.current = {
      address: finalAddress,
      name: cleanCustomerName,
      phone: cleanPhone,
    };

    // Strict Account Requirement: If not logged in, prompt authentication first
    const isCurrentAuth = useAuthStore.getState().isAuthenticated;
    if (!isCurrentAuth) {
      useBookingStore.getState().setGuestInfo(cleanCustomerName, cleanPhone);
      setIsAuthModalOpen(true);
      return;
    }

    await submitBookingPayload(finalAddress, cleanCustomerName, cleanPhone);
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    if (pendingBookingRef.current) {
      const { address, name, phone } = pendingBookingRef.current;
      const currentUser = useAuthStore.getState().user;
      const effectiveName = currentUser?.name || name;
      const effectivePhone = currentUser?.phone || phone;
      submitBookingPayload(address, effectiveName, effectivePhone);
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
                {step === 4 
                  ? (isAr ? 'تم تأكيد الحجز بنجاح 🎉' : 'Booking Confirmed Successfully 🎉') 
                  : (isAr ? 'حجز فوري مباشر (< 20 ثانية)' : 'Instant Direct Booking (< 20s)')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {step === 1 && (isAr ? 'الخطوة 1: اختر الخدمة' : 'Step 1: Choose Service')}
                {step === 2 && (isAr ? 'الخطوة 2: حدد التاريخ والوقت' : 'Step 2: Select Date & Time')}
                {step === 3 && (isAr ? 'الخطوة 3: بيانات الموقع والتأكيد' : 'Step 3: Location & Confirmation')}
                {step === 4 && (isAr ? `رقم الطلب #${confirmedOrderId}` : `Order ID #${confirmedOrderId}`)}
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
                            {isAr ? svc.title : (svc.titleEn || autoTranslate(svc.title, 'en') || svc.title)}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-tight break-words">
                            {isAr ? svc.shortDescription : (svc.shortDescriptionEn || autoTranslate(svc.shortDescription, 'en') || svc.shortDescription)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(getServiceTotalMinutes(svc), isAr)}
                            </span>
                            {svc.popular && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500 text-white">
                                {isAr ? 'الأكثر طلباً' : 'Popular'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        <p className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400">
                          {svc.price} {isAr ? 'ج.م' : 'EGP'}
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
                      {isAr ? 'الباقات البديلة (اختياري):' : 'Alternative Packages (Optional):'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isAr ? 'تستبدل السعر الأساسي' : 'Replaces base price'}
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
                           <span>{isAr ? 'بدون باقة (الخدمة الأساسية)' : 'Without Package (Base Service)'}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{isAr ? 'الافتراضي' : 'Default'}</span>
                        </div>
                      </div>
                      <span className="font-mono">{selectedService.price} {isAr ? 'ج.م' : 'EGP'}</span>
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
                            <div className="flex flex-col">
                              <span>{isAr ? pkg.name : (pkg.nameEn || autoTranslate(pkg.name, 'en') || pkg.name)}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {formatDuration(
                                  (Number(pkg.durationMinutes) || 45) + Number(selectedService.travelTimeMinutes || 0),
                                  isAr
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono">{pkg.price} {isAr ? 'ج.م' : 'EGP'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons Selection */}
              {selectedService && Array.isArray(selectedService.addons) && selectedService.addons.filter((a) => a && a.active !== false).length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">{isAr ? 'إضافات اختيارية:' : 'Optional Add-ons:'}</span>
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
                            <span>{isAr ? addon.name : (addon.nameEn || autoTranslate(addon.name, 'en') || addon.name)}</span>
                          </div>
                          <span className="font-mono">+{addon.price} {isAr ? 'ج.م' : 'EGP'}</span>
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
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">{isAr ? 'الخدمة المختارة:' : 'Selected Service:'}</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {isAr ? selectedService?.title : (selectedService?.titleEn || selectedService?.title)}
                    {selectedPkg && ` (${isAr ? selectedPkg.name : (selectedPkg.nameEn || selectedPkg.name)})`}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(serviceDuration, isAr)}</span>
                  </div>
                </div>
                <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                  {quickTotalPrice} {isAr ? 'ج.م' : 'EGP'}
                </span>
              </div>

              {/* Date Selection Dropdown */}
              <div className={cn("relative space-y-1.5", isDateOpen ? "z-30" : "z-20")} ref={dateDropdownRef}>
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
                  onClick={() => {
                    setIsDateOpen((prev) => !prev);
                    setIsTimeOpen(false);
                  }}
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

              {/* Time Selection Dropdown */}
              <div className={cn("relative space-y-1.5", isTimeOpen ? "z-30" : "z-10")} ref={timeDropdownRef}>
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#0866C6]" />
                    <span>{isAr ? 'توقيت الحجز (الموعد)' : 'Booking Time'}</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#0866C6] dark:text-[#38BDF8]">
                    {timeSlots.length} {isAr ? 'موعد متاح' : 'available'}
                  </span>
                </label>

                <button
                  type="button"
                  disabled={timeSlots.length === 0}
                  onClick={() => {
                    setIsTimeOpen((prev) => !prev);
                    setIsDateOpen(false);
                  }}
                  className={cn(
                    "w-full h-11 px-3.5 rounded-xl border flex items-center justify-between transition-all bg-white dark:bg-[#071E34] text-slate-900 dark:text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    isTimeOpen
                      ? "border-[#0866C6] ring-2 ring-[#0866C6]/20 dark:ring-[#0866C6]/30 shadow-sm"
                      : "border-[#DDE7EC] dark:border-[#133B61] hover:border-[#0866C6]/40 dark:hover:border-[#0866C6]/40"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Clock className="w-4 h-4 text-[#0866C6] shrink-0" />
                    <span className="truncate font-bold font-mono" dir="ltr">
                      {timeButtonLabel}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                      isTimeOpen && "rotate-180 text-[#0866C6]"
                    )}
                  />
                </button>

                {isTimeOpen && (
                  <div className="absolute z-40 mt-1.5 w-full bg-white dark:bg-[#071E34] border border-[#DDE7EC] dark:border-[#133B61] rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1">
                    {timeSlots.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {isAr ? 'لا توجد مواعيد متاحة لهذا اليوم' : 'No available slots for this date'}
                      </div>
                    ) : (
                      timeSlots.map((slot) => {
                        const isSelected =
                          selectedTime === slot.time || isSameTime(selectedTime, slot.time);
                        const label = getSlotDisplayLabel(slot, isAr);

                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => {
                              setSelectedTime(slot.time);
                              setIsTimeOpen(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2.5 rounded-lg flex items-center justify-between text-xs sm:text-sm transition-colors text-start cursor-pointer",
                              isSelected
                                ? "bg-[#0866C6] text-white font-bold"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                            )}
                          >
                            <span className="font-mono font-bold tracking-tight" dir="ltr">
                              {label}
                            </span>
                            {isSelected ? (
                              <Check className="w-4 h-4 text-white shrink-0" />
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== STEP 3: ADDRESS & CONFIRMATION ===================== */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in text-xs">
              {!isAuthenticated && (
                <div className="p-3 rounded-2xl bg-[#0866C6]/5 dark:bg-[#0866C6]/15 border border-[#0866C6]/20 flex items-center gap-2.5 text-[11px] text-[#0866C6] dark:text-sky-300">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#0866C6]" />
                  <span className="leading-relaxed">
                    {isAr
                      ? 'لراحتك وتتبع الفني مباشرة واستلام ضمان الخدمة، سيتم تأكيد طلبك عبر حسابك في كلينزو.'
                      : 'To track your technician live and receive your service warranty, your order will be confirmed through your Cleanzo account.'}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0866C6]" />
                    <span>{isAr ? 'رقم الهاتف للتواصل' : 'Contact Phone'}</span>
                    <span className="text-[#F0444C] font-bold">*</span>
                  </span>
                  {customerPhone.trim().length === 11 && !phoneError && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {isAr ? 'الرقم صالح' : 'Valid'}
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  placeholder="01xxxxxxxxx"
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white text-xs font-mono transition-colors",
                    phoneError
                      ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
                      : "border-slate-200 dark:border-slate-700 focus:border-[#0866C6]"
                  )}
                  dir="ltr"
                />
                {phoneError && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0866C6]" />
                    <span>{isAr ? 'اسم العميل' : 'Customer Name'}</span>
                    <span className="text-[#F0444C] font-bold">*</span>
                  </span>
                  {customerName.trim().length >= 2 && !nameError && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {isAr ? 'الاسم صالح' : 'Valid'}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  placeholder={isAr ? 'أدخل اسمك الكريم (عربي أو إنجليزي)' : 'Enter customer name (Arabic or English)'}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white text-xs transition-colors",
                    nameError
                      ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
                      : "border-slate-200 dark:border-slate-700 focus:border-[#0866C6]"
                  )}
                />
                {nameError && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-500" />
                    <span>{isAr ? 'المحافظة' : 'Governorate'}</span>
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
                    <span>{isAr ? 'المدينة' : 'City'}</span>
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

              {/* Row: تسمية العنوان و اسم الشارع / الحي */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1 space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>{isAr ? 'تسمية العنوان' : 'Address Label'}</span>
                    <span className="text-[#F0444C] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={isAr ? 'المنزل' : 'Home'}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>{isAr ? 'الشارع / الحي' : 'Street / District'}</span>
                    <span className="text-[#F0444C] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder={isAr ? 'شارع النصر، متفرع من عباس العقاد' : 'Street name, district'}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Row: رقم المبنى و الطابق و الشقة */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 text-center block">
                    {isAr ? 'رقم المبنى' : 'Building'}
                  </label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="14"
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 text-center block">
                    {isAr ? 'الطابق' : 'Floor'}
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="3"
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 text-center block">
                    {isAr ? 'رقم الشقة' : 'Apartment'}
                  </label>
                  <input
                    type="text"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    placeholder="7"
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs text-center"
                  />
                </div>
              </div>

              {/* علامة مميزة (اختياري) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'علامة مميزة (اختياري)' : 'Landmark (Optional)'}
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={isAr ? 'بجوار صيدلية أو معلم معروف...' : 'Near landmark...'}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* ملاحظات إضافية */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (Optional)'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? 'موديل أو لون السيارة، أو تفاصيل خاصة...' : 'Car model/color, or special instructions...'}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Order Final Summary Receipt */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'الخدمة:' : 'Service:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isAr ? selectedService?.title : (selectedService?.titleEn || selectedService?.title)}
                  </span>
                </div>
                {selectedPkg ? (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{isAr ? 'الباقة المختارة:' : 'Selected Package:'}</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {isAr ? selectedPkg.name : (selectedPkg.nameEn || selectedPkg.name)} ({selectedPkg.price} {isAr ? 'ج.م' : 'EGP'})
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{isAr ? 'الباقة:' : 'Package:'}</span>
                    <span className="font-medium text-slate-500">
                      {isAr
                        ? `بدون باقة (السعر الأساسي: ${selectedService?.price} ج.م)`
                        : `Without package (Base price: ${selectedService?.price} EGP)`}
                    </span>
                  </div>
                )}
                {selectedAddonsList.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                    {selectedAddonsList.map((addon) => (
                      <div key={addon.id} className="flex justify-between text-amber-700 dark:text-amber-400 text-[11px]">
                        <span>+ {isAr ? addon.name : (addon.nameEn || addon.name)}:</span>
                        <span className="font-mono font-bold">+{addon.price} {isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'الموعد:' : 'Appointment:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedDate} — {selectedSlotObj ? (isAr ? selectedSlotObj.label : selectedSlotObj.labelEn) : selectedTime}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'رسوم الانتقال والمعدات:' : 'Travel & Equipment:'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{isAr ? 'مجاناً (عرض اليوم)' : 'Free (Today\'s Offer)'}</span>
                </div>
                {quickPricing.catalogDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>{isAr ? `خصم العرض المباشر (${quickPricing.catalogDiscountPercent}%):` : `Direct Offer Discount (${quickPricing.catalogDiscountPercent}%):`}</span>
                    <span className="font-mono">-{quickPricing.catalogDiscount} {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                  <span>{isAr ? 'الإجمالي للدفع عند الاستلام:' : 'Total Due upon Service:'}</span>
                  <span className="text-sky-600 dark:text-sky-400 font-mono">{quickPricing.finalPrice} {isAr ? 'ج.م' : 'EGP'}</span>
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
                  {isAr ? 'تم استلام طلب الحجز بنجاح!' : 'Booking Request Received Successfully!'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {isAr
                    ? `سيتواصل معك فني كلينزو للتأكيد والانطلاق في الموعد المحدد: ${selectedDate} (${selectedSlotObj ? selectedSlotObj.label : selectedTime}).`
                    : `The Cleanzo specialist will contact you to confirm and arrive on time: ${selectedDate} (${selectedSlotObj ? selectedSlotObj.labelEn : selectedTime}).`}
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-start">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAr ? 'رقم الحجز:' : 'Booking ID:'}</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">#{confirmedOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAr ? 'الخدمة:' : 'Service:'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? selectedService?.title : (selectedService?.titleEn || selectedService?.title)}
                    {selectedPkg && ` (${isAr ? selectedPkg.name : (selectedPkg.nameEn || selectedPkg.name)})`}
                  </span>
                </div>
                {selectedAddonsList.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? 'الإضافات:' : 'Add-ons:'}</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {selectedAddonsList.map((a) => (isAr ? a.name : (a.nameEn || a.name))).join(' + ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAr ? 'المبلغ المطلوب:' : 'Amount Due:'}</span>
                  <span className="font-bold text-emerald-600 font-mono">{quickTotalPrice} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 w-full pt-2">
                {(() => {
                  const rawWa =
                    cmsContact?.whatsapp ||
                    cmsSocial?.whatsapp ||
                    cmsSocial?.items?.find((i) => i.platform === 'whatsapp')?.url ||
                    socialSettings?.whatsapp ||
                    socialSettings?.items?.find((i) => i.platform === 'whatsapp')?.url ||
                    '201012345678';
                  const cleanWa = rawWa.replace(/[^0-9]/g, '') || '201012345678';
                  const timeText = selectedSlotObj ? (isAr ? selectedSlotObj.label : selectedSlotObj.labelEn) : selectedTime;
                  const pkgText = selectedPkg ? ` (${isAr ? selectedPkg.name : (selectedPkg.nameEn || selectedPkg.name)})` : '';
                  const svcTitle = isAr ? (selectedService?.title || '') : (selectedService?.titleEn || selectedService?.title || '');
                  const waText = encodeURIComponent(
                    isAr
                      ? `مرحباً كلينزو، أود متابعة طلبي رقم #${confirmedOrderId} لخدمة ${svcTitle}${pkgText} في موعد ${selectedDate} (${timeText}).`
                      : `Hello Cleanzo, I would like to confirm my order #${confirmedOrderId} for ${svcTitle}${pkgText} on ${selectedDate} (${timeText}).`
                  );
                  return (
                    <a
                      href={`https://wa.me/${cleanWa}?text=${waText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{isAr ? 'تأكيد عبر واتساب مع الدعم' : 'Confirm via WhatsApp with Support'}</span>
                    </a>
                  );
                })()}

                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إغلاق ومتابعة التصفح' : 'Close and Continue Browsing'}
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
                {isAr ? 'السابق' : 'Back'}
              </button>
            ) : (
              <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                {selectedService ? `${quickTotalPrice} ${isAr ? 'ج.م' : 'EGP'}` : ''}
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
                disabled={!selectedDate || !selectedTime || timeSlots.length === 0}
                onClick={() => {
                  if (!selectedDate || !selectedTime || timeSlots.length === 0) {
                    toast.error(isAr ? 'يرجى اختيار تاريخ ووقت الحجز للمتابعة' : 'Please select date and time to continue');
                    return;
                  }
                  setStep(3);
                }}
                className={cn(
                  'flex-1 justify-center rounded-xl text-xs font-bold transition-all',
                  (!selectedDate || !selectedTime || timeSlots.length === 0) &&
                    'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500'
                )}
              >
                <span>{isAr ? 'متابعة: بيانات الموقع' : 'Continue: Location details'}</span>
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
                    <span>{isAr ? 'تأكيد الحجز الفوري الآن' : 'Confirm Instant Booking Now'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Guest Auth Prompt Modal */}
      <AuthModalPrompt
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
