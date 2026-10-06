'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Car,
  Home,
  CheckCircle2,
  Clock,
  Package as PackageIcon,
  PlusCircle,
  Check,
  Sparkles,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FolderX,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useServiceStore } from '@/store/useServiceStore';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { formatDuration } from '@/lib/utils';
import { Service, ServicePackage, ServiceAddon, ServiceCategory } from '@/types';
import { getServiceDisplayPrice } from '@/lib/pricing';

export function StepService() {
  const { t, locale } = useLocaleStore();
  const {
    category,
    setCategory,
    selectedService,
    selectService,
    selectedPackage,
    selectPackage,
    selectedAddons,
    toggleAddon,
    getBasePrice,
    getOriginalPrice,
    getCatalogSavings,
    getDiscountAmount,
    getFinalPrice,
    getTotalDuration,
  } = useBookingStore();
  const isAr = locale === 'ar';

  const storeServices = useServiceStore((s) => s.services);
  const fetchServices = useServiceStore((s) => s.fetchServices);

  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Strict Category Isolation: Fetch services exclusively for the active category from the backend
  const loadServicesForCategory = useCallback(
    async (cat: ServiceCategory) => {
      setIsLoadingCategory(true);
      setLoadError(null);
      try {
        await fetchServices(cat);
      } catch (err: any) {
        setLoadError(err?.message || (isAr ? 'فشل تحميل قائمة الخدمات' : 'Failed to load services'));
      } finally {
        setIsLoadingCategory(false);
      }
    },
    [fetchServices, isAr]
  );

  useEffect(() => {
    loadServicesForCategory(category);
  }, [category, loadServicesForCategory]);

  // Filter services by active category and availability
  const services = useMemo(() => {
    return (storeServices || []).filter(
      (s) =>
        s.category === category &&
        s.available !== false &&
        !(s as any).isArchived &&
        (s as any).active !== false
    );
  }, [storeServices, category]);

  // Synchronize selection: If a service is selected but does not match the active category or is no longer present, deselect it!
  // NEVER auto-select a default service: user choice is 100% required.
  useEffect(() => {
    if (selectedService) {
      if (selectedService.category !== category) {
        useBookingStore.setState({
          selectedService: null,
          selectedPackage: null,
          selectedAddons: [],
          appliedCoupon: null,
          promoCode: '',
        });
        return;
      }
      if (!isLoadingCategory && services.length > 0) {
        const stillExists = services.find((s) => s.id === selectedService.id);
        if (!stillExists) {
          useBookingStore.setState({
            selectedService: null,
            selectedPackage: null,
            selectedAddons: [],
            appliedCoupon: null,
            promoCode: '',
          });
        } else if (
          stillExists !== selectedService &&
          (!selectedService.packages || !selectedService.addons)
        ) {
          if (stillExists.packages || stillExists.addons) {
            selectService(stillExists);
          }
        }
      }
    }
  }, [selectedService, services, isLoadingCategory, category, selectService]);

  const availablePackages: ServicePackage[] = useMemo(() => {
    if (!selectedService || !selectedService.packages) return [];
    return selectedService.packages.filter((p) => p.active !== false);
  }, [selectedService]);

  const availableAddons: ServiceAddon[] = useMemo(() => {
    if (!selectedService || !selectedService.addons) return [];
    return selectedService.addons.filter((a) => a.active !== false);
  }, [selectedService]);

  const handleCardClick = (srv: Service) => {
    if (selectedService?.id === srv.id) {
      // Allow toggle/deselect
      useBookingStore.setState({
        selectedService: null,
        selectedPackage: null,
        selectedAddons: [],
        appliedCoupon: null,
        promoCode: '',
      });
    } else {
      selectService(srv);
    }
  };

  return (
    <div className="space-y-8 text-start">
      {/* 1. Category Selection Tabs */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>{t.booking.selectCategory}</span>
          <span className="text-[11px] font-normal text-slate-500">
            {isAr ? 'اختر قسماً واحداً للحجز' : 'Choose one category for booking'}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            id="category-car-btn"
            onClick={() => setCategory('car')}
            className={`p-3.5 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border-2 flex items-center gap-3.5 transition-all text-start cursor-pointer ${
              category === 'car'
                ? 'border-[#0866C6] bg-sky-50/70 dark:bg-sky-950/40 text-[#07345C] dark:text-sky-200 shadow-md ring-2 ring-[#0866C6]/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                category === 'car'
                  ? 'bg-[#0866C6] text-white shadow-md shadow-[#0866C6]/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Car className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black truncate">{t.nav.carServices}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                {isAr ? 'غسيل، ديتيلينج، شمع، بخار' : 'Wash, Detailing, Wax, Steam'}
              </p>
            </div>
          </button>

          <button
            type="button"
            id="category-home-btn"
            onClick={() => setCategory('home')}
            className={`p-3.5 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border-2 flex items-center gap-3.5 transition-all text-start cursor-pointer ${
              category === 'home'
                ? 'border-[#07345C] bg-sky-50/70 dark:bg-[#07345C]/30 text-[#07345C] dark:text-sky-200 shadow-md ring-2 ring-[#07345C]/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                category === 'home'
                  ? 'bg-[#07345C] text-white shadow-md shadow-[#07345C]/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black truncate">{t.nav.homeServices}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                {isAr ? 'تنظيف عميق، كنب، مطابخ، مفروشات' : 'Deep clean, sofas, kitchens'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Service Selection Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <label className="text-sm sm:text-base font-black text-slate-900 dark:text-white block">
              {category === 'car'
                ? isAr
                  ? 'اختر خدمة السيارات المطلوبة'
                  : 'Choose Your Car Service'
                : isAr
                ? 'اختر خدمة المنازل المطلوبة'
                : 'Choose Your Home Service'}
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr
                ? 'اختيار خدمة واحدة إجباري للمتابعة إلى الخطوة التالية'
                : 'Selecting a service is required to proceed'}
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {category === 'car'
              ? isAr
                ? '🚗 خدمات السيارات فقط'
                : '🚗 Car Services Only'
              : isAr
              ? '🏡 خدمات المنازل فقط'
              : '🏡 Home Services Only'}
          </span>
        </div>

        {/* LOADING STATE */}
        {isLoadingCategory && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <Loader2 className="w-8 h-8 text-[#0866C6] animate-spin" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {isAr
                ? `جاري تحميل خدمات ${category === 'car' ? 'السيارات' : 'المنازل'}...`
                : `Loading ${category === 'car' ? 'car' : 'home'} services...`}
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoadingCategory && loadError && (
          <div className="p-5 rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-start">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-800 dark:text-red-300">
                  {isAr ? 'تعذر تحميل الخدمات لهذا القسم' : 'Unable to load services'}
                </p>
                <p className="text-[11px] text-red-600 dark:text-red-400">{loadError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadServicesForCategory(category)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoadingCategory && !loadError && services.length === 0 && (
          <div className="py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <FolderX className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {category === 'car'
                ? isAr
                  ? 'لا توجد خدمات متاحة حالياً في قسم السيارات'
                  : 'No car services available at this time'
                : isAr
                ? 'لا توجد خدمات متاحة حالياً في قسم المنازل'
                : 'No home services available at this time'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isAr
                ? 'يمكنك تجربة اختيار القسم الآخر أو التواصل مع الدعم الفني للاستفسار.'
                : 'You may try the other category or contact customer support.'}
            </p>
          </div>
        )}

        {/* SERVICES CARDS LIST */}
        {!isLoadingCategory && !loadError && services.length > 0 && (
          <div className="space-y-3">
            {services.map((srv) => {
              const isSelected = selectedService?.id === srv.id;

              return (
                <div
                  key={srv.id}
                  id={`service-card-${srv.id}`}
                  onClick={() => handleCardClick(srv)}
                  className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#0866C6] bg-sky-50/60 dark:bg-sky-950/30 shadow-lg ring-2 ring-[#0866C6]/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Custom Selection Radio/Check */}
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 sm:mt-0 transition-all ${
                        isSelected
                          ? 'border-[#0866C6] bg-[#0866C6] text-white shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {Boolean(srv.image?.trim()) && (
                      <img
                        src={srv.image}
                        alt={isAr ? srv.title : srv.titleEn}
                        className="w-16 h-16 rounded-full object-cover shrink-0 hidden sm:block border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden"
                      />
                    )}

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {isAr ? srv.title : srv.titleEn}
                        </h4>
                        {srv.popular && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white">
                            {isAr ? 'الأكثر طلباً' : 'Popular'}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0866C6] text-white">
                            {isAr ? 'تم الاختيار ✓' : 'Selected ✓'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {isAr ? srv.shortDescription : srv.shortDescriptionEn}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5">
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        <span>{formatDuration(srv.duration, isAr)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-end shrink-0 ps-9 sm:ps-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                    {(() => {
                      const sp = getServiceDisplayPrice(srv);
                      return <PriceDisplay price={sp.sellingPrice} originalPrice={sp.hasDiscount ? sp.originalPrice : undefined} size="md" />;
                    })()}
                    <span
                      className={`text-[11px] font-bold mt-1 ${
                        isSelected ? 'text-[#0866C6] dark:text-sky-400' : 'text-slate-400'
                      }`}
                    >
                      {isSelected
                        ? isAr
                          ? 'مختارة'
                          : 'Selected'
                        : isAr
                        ? 'انقر للاختيار'
                        : 'Click to select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Packages Section (Strictly tied to selectedService, OPTIONAL ALTERNATIVES) */}
      {selectedService && availablePackages.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PackageIcon className="w-4 h-4 text-[#0866C6]" />
              <span>{isAr ? 'الباقات (اختياري)' : 'Packages (Optional)'}</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {isAr ? '(اختياري - السعر الأساسي مفعل تلقائياً، أو اختر باقة بديلة)' : '(Optional - base price is active by default, or pick an alternative tier)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* OPTION 0: DEFAULT BASE SERVICE (بدون باقة) */}
            <div
              onClick={() => selectPackage(null)}
              className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                !selectedPackage
                  ? 'border-[#0866C6] bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-[#0866C6]/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      !selectedPackage
                        ? 'border-[#0866C6] bg-[#0866C6] text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {!selectedPackage && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{isAr ? 'بدون باقة (الخدمة الأساسية)' : 'Standard Service (No Package)'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                        {isAr ? 'الافتراضي' : 'Default'}
                      </span>
                    </h5>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 ps-7 line-clamp-2">
                {isAr
                  ? `حجز ${selectedService.title} بالسعر الأساسي دون إضافة باقات.`
                  : `Book ${selectedService.titleEn || selectedService.title} at standard base price.`}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 ps-7">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>
                    {selectedService.serviceDurationMinutes || selectedService.duration} {isAr ? 'دقيقة' : 'min'}
                  </span>
                </span>

                {(() => {
                  const sp = getServiceDisplayPrice(selectedService);
                  return <PriceDisplay price={sp.sellingPrice} originalPrice={sp.hasDiscount ? sp.originalPrice : undefined} size="sm" />;
                })()}
              </div>
            </div>

            {/* OPTIONAL PACKAGES */}
            {availablePackages.map((pkg) => {
              const isPkgSelected = selectedPackage?.id === pkg.id;
              const hasDiscount = pkg.originalPrice && pkg.originalPrice > pkg.price;
              const savings = hasDiscount ? pkg.originalPrice! - pkg.price : 0;

              return (
                <div
                  key={pkg.id}
                  onClick={() => {
                    if (isPkgSelected) {
                      selectPackage(null);
                    } else {
                      selectPackage(pkg);
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 cursor-pointer transition-all ${
                    isPkgSelected
                      ? 'border-[#0866C6] bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-[#0866C6]/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isPkgSelected
                            ? 'border-[#0866C6] bg-[#0866C6] text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isPkgSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {isAr ? pkg.name : pkg.nameEn || pkg.name}
                      </h5>
                    </div>

                    {hasDiscount && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500 text-white shrink-0">
                        {isAr ? `وفر ${savings} ج.م` : `Save ${savings} EGP`}
                      </span>
                    )}
                  </div>

                  {pkg.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 ps-7 line-clamp-2">
                      {isAr ? pkg.description : pkg.descriptionEn || pkg.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 ps-7">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      <span>
                        {pkg.durationMinutes || selectedService.duration} {isAr ? 'دقيقة' : 'min'}
                      </span>
                    </span>

                    <PriceDisplay price={pkg.price} originalPrice={pkg.originalPrice} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Add-ons Section (Strictly tied to selectedService) */}
      {selectedService && availableAddons.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'إضافات اختيارية لتجربة عناية فائقة' : 'Optional Add-ons'}</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {isAr ? '(اختياري - يمكنك اختيار أكثر من إضافة)' : '(Optional - select multiple)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableAddons.map((addon) => {
              const isChecked = selectedAddons.some((a) => a.id === addon.id);

              return (
                <div
                  key={addon.id}
                  onClick={() => toggleAddon(addon)}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isChecked
                      ? 'border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {isAr ? addon.name : addon.nameEn || addon.name}
                      </p>
                      {addon.durationMinutes > 0 && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>
                            +{addon.durationMinutes} {isAr ? 'دقيقة إضافية' : 'extra min'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-black text-slate-900 dark:text-white shrink-0 font-mono">
                    +{addon.price} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Selected Items Live Preview Card */}
      {selectedService && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs animate-fadeIn">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0866C6] dark:text-sky-400">
              {isAr ? 'ملخص الخدمة المحددة' : 'Selected Service Summary'}
            </span>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black">{isAr ? selectedService.title : selectedService.titleEn}</span>
              {selectedPackage ? (
                <span className="text-[#0866C6] dark:text-sky-400 font-bold">
                  • {isAr ? `الباقة: ${selectedPackage.name}` : `Package: ${selectedPackage.nameEn || selectedPackage.name}`}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  • {isAr ? 'بدون باقة (السعر الأساسي)' : 'Standard (No Package)'}
                </span>
              )}
              {selectedAddons.length > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  (+{selectedAddons.length} {isAr ? 'إضافات' : 'add-ons'})
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>
                {isAr ? 'إجمالي مدة التنفيذ:' : 'Total Duration:'}{' '}
                <strong>
                  {getTotalDuration()} {isAr ? 'دقيقة' : 'minutes'}
                </strong>
              </span>
            </p>
          </div>

          <div className="sm:text-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-400 block">{isAr ? 'المجموع المستحق للخدمة' : 'Payable Subtotal'}</span>
            <div className="flex items-center sm:justify-end gap-2 flex-wrap">
              {getOriginalPrice() > getFinalPrice() && (
                <span className="text-xs text-slate-400 line-through font-mono">
                  {getOriginalPrice()} {isAr ? 'ج.م' : 'EGP'}
                </span>
              )}
              <span className="text-base sm:text-lg font-black text-[#0866C6] dark:text-sky-400 font-mono">
                {getFinalPrice()} {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
            {getCatalogSavings() > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                {isAr
                  ? `وفّرت ${getCatalogSavings()} ج.م (${selectedPackage?.originalPrice ? Math.round((getCatalogSavings() / Number(selectedPackage.originalPrice)) * 100) : selectedService?.discount || 15}%)`
                  : `Saved ${getCatalogSavings()} EGP`}
              </span>
            )}
            {getDiscountAmount() > getCatalogSavings() && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                {isAr ? `خصم الكوبون: -${getDiscountAmount() - getCatalogSavings()} ج.م` : `Coupon Discount: -${getDiscountAmount() - getCatalogSavings()} EGP`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
