'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Car,
  Home,
  Clock,
  Package as PackageIcon,
  Check,
  Sparkles,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FolderX,
  X,
  ChevronDown,
  ChevronUp,
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
    selectedServices,
    toggleService,
    removeService,
    isServiceSelected,
    selectPackageForService,
    toggleAddonForService,
    clearServices,
    getItemizedServicesList,
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
  const [expandedCustomizerId, setExpandedCustomizerId] = useState<string | null>(null);

  // Fetch services for active browsing category tab
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

  // Filter available services for currently active category tab
  const services = useMemo(() => {
    return (storeServices || []).filter(
      (s) =>
        s.category === category &&
        s.available !== false &&
        !(s as any).isArchived &&
        (s as any).active !== false
    );
  }, [storeServices, category]);

  // Count selected services per category
  const carSelectedCount = useMemo(
    () => selectedServices.filter((item) => item.service.category === 'car').length,
    [selectedServices]
  );
  const homeSelectedCount = useMemo(
    () => selectedServices.filter((item) => item.service.category === 'home').length,
    [selectedServices]
  );

  const handleCardToggle = (srv: Service) => {
    toggleService(srv);
    // If selecting, expand this service's customizer if it has packages or addons
    if (!isServiceSelected(srv.id)) {
      if ((srv.packages && srv.packages.length > 0) || (srv.addons && srv.addons.length > 0)) {
        setExpandedCustomizerId(srv.id);
      }
    } else if (expandedCustomizerId === srv.id) {
      setExpandedCustomizerId(null);
    }
  };

  const itemizedList = getItemizedServicesList();

  return (
    <div className="space-y-8 text-start">
      {/* 1. Category Selection Tabs (Catalog Filter) */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>{t.booking.selectCategory}</span>
          <span className="text-[11px] font-normal text-sky-600 dark:text-sky-400">
            {isAr
              ? 'يمكنك اختيار أكثر من خدمة من أقسام مختلفة في نفس الحجز'
              : 'You can choose multiple services across categories in one booking'}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            id="category-car-btn"
            onClick={() => setCategory('car')}
            className={`p-3.5 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-between gap-3.5 transition-all text-start cursor-pointer ${
              category === 'car'
                ? 'border-[#0866C6] bg-sky-50/70 dark:bg-sky-950/40 text-[#07345C] dark:text-sky-200 shadow-md ring-2 ring-[#0866C6]/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
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
            </div>
            {carSelectedCount > 0 && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#0866C6] text-white shrink-0">
                {carSelectedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="category-home-btn"
            onClick={() => setCategory('home')}
            className={`p-3.5 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-between gap-3.5 transition-all text-start cursor-pointer ${
              category === 'home'
                ? 'border-[#07345C] bg-sky-50/70 dark:bg-[#07345C]/30 text-[#07345C] dark:text-sky-200 shadow-md ring-2 ring-[#07345C]/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
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
            </div>
            {homeSelectedCount > 0 && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#07345C] text-white shrink-0">
                {homeSelectedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Selected Services Tally Bar (Multi-Service Summary) */}
      {selectedServices.length > 0 && (
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-50 via-white to-sky-50 dark:from-sky-950/40 dark:via-slate-900 dark:to-sky-950/20 border-2 border-[#0866C6]/30 dark:border-sky-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#0866C6] dark:text-sky-400">
                {isAr ? `الخدمات المختارة (${selectedServices.length})` : `Selected Services (${selectedServices.length})`}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>
                  {isAr ? 'المدة:' : 'Duration:'} <strong>{getTotalDuration()} {isAr ? 'د' : 'min'}</strong>
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={clearServices}
              className="text-[10px] sm:text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" />
              <span>{isAr ? 'إلغاء الكل' : 'Clear all'}</span>
            </button>
          </div>

          {/* Chips list */}
          <div className="flex flex-wrap gap-1.5">
            {selectedServices.map((item) => {
              const srv = item.service;
              const pkg = item.selectedPackage;
              const addonsCount = item.selectedAddons.length;
              return (
                <div
                  key={srv.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 shadow-2xs text-[11px]"
                >
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isAr ? srv.title : srv.titleEn}
                  </span>
                  {pkg && (
                    <span className="text-[10px] font-semibold text-[#0866C6] dark:text-sky-300">
                      ({isAr ? pkg.name : pkg.nameEn || pkg.name})
                    </span>
                  )}
                  {addonsCount > 0 && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      (+{addonsCount})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeService(srv.id);
                    }}
                    className="w-3.5 h-3.5 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-slate-700 dark:hover:bg-rose-900 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    title={isAr ? 'إزالة' : 'Remove'}
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Subtotal preview */}
          <div className="pt-1.5 border-t border-sky-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px] sm:text-xs">{isAr ? 'إجمالي الخدمات المختارة:' : 'Subtotal:'}</span>
            <span className="text-xs sm:text-sm font-black text-[#0866C6] dark:text-sky-400 font-mono">
              {getFinalPrice()} {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Service Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <label className="text-sm sm:text-base font-black text-slate-900 dark:text-white block">
              {category === 'car'
                ? isAr
                  ? 'اختر خدمات السيارات المطلوبة'
                  : 'Choose Car Services'
                : isAr
                ? 'اختر خدمات المنازل المطلوبة'
                : 'Choose Home Services'}
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr
                ? 'انقر على أي خدمة لتحديدها أو إلغاء تحديدها. يمكنك اختيار أكثر من خدمة معاً.'
                : 'Click any service to select or deselect. You can choose multiple services.'}
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {category === 'car'
              ? isAr
                ? '🚗 خدمات السيارات'
                : '🚗 Car Services'
              : isAr
              ? '🏡 خدمات المنازل'
              : '🏡 Home Services'}
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

        {/* SERVICES CARDS GRID (2 Columns Square Tiles) */}
        {!isLoadingCategory && !loadError && services.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {services.map((srv) => {
              const isSelected = isServiceSelected(srv.id);
              const selectedItem = selectedServices.find((i) => i.service.id === srv.id);
              const hasPackages = srv.packages && srv.packages.length > 0;
              const hasAddons = srv.addons && srv.addons.length > 0;
              const isCustomizerOpen = expandedCustomizerId === srv.id;

              return (
                <div
                  key={srv.id}
                  id={`service-card-${srv.id}`}
                  className={`${
                    isCustomizerOpen ? 'col-span-2' : 'col-span-1'
                  } rounded-xl sm:rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#0866C6] bg-sky-50/40 dark:bg-sky-950/20 shadow-xs ring-1 ring-[#0866C6]/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Card Main Body */}
                  <div
                    onClick={() => handleCardToggle(srv)}
                    className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between gap-2 cursor-pointer text-start"
                  >
                    <div>
                      {/* Top Row: Checkbox + Popular badge */}
                      <div className="flex items-center justify-between gap-1 pb-1">
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'border-[#0866C6] bg-[#0866C6] text-white shadow-2xs'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {srv.popular && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white shrink-0">
                            {isAr ? 'الأكثر طلباً' : 'Popular'}
                          </span>
                        )}
                      </div>

                      {/* Service Title */}
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug pt-0.5">
                        {isAr ? srv.title : srv.titleEn}
                      </h4>

                      {/* Duration */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1">
                        <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate">{formatDuration(srv.serviceDurationMinutes || srv.duration, isAr)}</span>
                      </div>

                      {/* Short Description */}
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 pt-1 leading-tight">
                        {isAr ? srv.shortDescription : srv.shortDescriptionEn}
                      </p>
                    </div>

                    {/* Bottom: Price + Selection Action */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <PriceDisplay price={Number(srv.price) || 0} size="sm" />
                      </div>

                      <div
                        className={`text-[10px] sm:text-[11px] font-bold py-1 px-1.5 rounded-lg text-center transition-colors w-full ${
                          isSelected
                            ? 'bg-[#0866C6] text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isSelected ? (isAr ? 'مختارة ✓' : 'Selected ✓') : (isAr ? 'انقر للاختيار' : 'Select')}
                      </div>
                    </div>
                  </div>

                  {/* Options (Packages & Addons) Expandable Panel for this service */}
                  {isSelected && (hasPackages || hasAddons) && (
                    <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 pt-0 border-t border-sky-100 dark:border-slate-800">
                      <div className="pt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCustomizerId(isCustomizerOpen ? null : srv.id);
                          }}
                          className="text-[10px] sm:text-xs font-bold text-[#0866C6] dark:text-sky-400 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>
                            {isAr ? 'تخصيص الباقة' : 'Customize'}
                          </span>
                          {isCustomizerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {selectedItem?.selectedPackage && (
                          <span className="text-[9px] sm:text-[10px] font-bold text-sky-700 dark:text-sky-300 truncate max-w-[90px]">
                            {selectedItem.selectedPackage.name}
                          </span>
                        )}
                      </div>

                      {isCustomizerOpen && (
                        <div className="mt-4 space-y-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 animate-fadeIn">
                          {/* Packages */}
                          {hasPackages && (
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <PackageIcon className="w-3.5 h-3.5 text-[#0866C6]" />
                                <span>{isAr ? 'اختر باقة الخدمة (اختياري)' : 'Choose Package Tier (Optional)'}</span>
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {/* Default base tier */}
                                <div
                                  onClick={() => selectPackageForService(srv.id, null)}
                                  className={`p-3 rounded-xl border-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                    !selectedItem?.selectedPackage
                                      ? 'border-[#0866C6] bg-white dark:bg-slate-800 shadow-xs'
                                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                        !selectedItem?.selectedPackage
                                          ? 'border-[#0866C6] bg-[#0866C6] text-white'
                                          : 'border-slate-300 dark:border-slate-600'
                                      }`}
                                    >
                                      {!selectedItem?.selectedPackage && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      {isAr ? 'الخدمة الأساسية' : 'Standard Base'}
                                    </span>
                                  </div>
                                  <PriceDisplay price={Number(srv.price) || 0} size="sm" />
                                </div>

                                {srv.packages?.filter((p) => p.active !== false).map((pkg) => {
                                  const isPkgSelected = selectedItem?.selectedPackage?.id === pkg.id;
                                  return (
                                    <div
                                      key={pkg.id}
                                      onClick={() => selectPackageForService(srv.id, isPkgSelected ? null : pkg)}
                                      className={`p-3 rounded-xl border-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                        isPkgSelected
                                          ? 'border-[#0866C6] bg-white dark:bg-slate-800 shadow-xs'
                                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isPkgSelected
                                              ? 'border-[#0866C6] bg-[#0866C6] text-white'
                                              : 'border-slate-300 dark:border-slate-600'
                                          }`}
                                        >
                                          {isPkgSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                          {isAr ? pkg.name : pkg.nameEn || pkg.name}
                                        </span>
                                      </div>
                                      <PriceDisplay price={pkg.price} originalPrice={pkg.originalPrice} size="sm" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Addons */}
                          {hasAddons && (
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>{isAr ? 'إضافات اختيارية لهذه الخدمة' : 'Optional Add-ons for this service'}</span>
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {srv.addons?.filter((a) => a.active !== false).map((addon) => {
                                  const isChecked = selectedItem?.selectedAddons.some((a) => a.id === addon.id) || false;

                                  return (
                                    <div
                                      key={addon.id}
                                      onClick={() => toggleAddonForService(srv.id, addon)}
                                      className={`p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                        isChecked
                                          ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20'
                                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                            isChecked
                                              ? 'border-amber-500 bg-amber-500 text-white'
                                              : 'border-slate-300 dark:border-slate-600'
                                          }`}
                                        >
                                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                          {isAr ? addon.name : addon.nameEn || addon.name}
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono shrink-0">
                                        +{addon.price} {isAr ? 'ج.م' : 'EGP'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bottom Selected Services Itemized List */}
      {itemizedList.length > 0 && (
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 text-xs shadow-2xs animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#0866C6] dark:text-sky-400">
              {isAr ? `ملخص الخدمات المختارة (${itemizedList.length})` : `Selected Services (${itemizedList.length})`}
            </span>
            <span className="text-slate-500 font-medium text-[11px]">
              {isAr ? 'إجمالي المدة:' : 'Duration:'}{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {getTotalDuration()} {isAr ? 'د' : 'min'}
              </strong>
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {itemizedList.map((item) => (
              <div key={item.serviceId} className="py-1.5 flex items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {isAr ? item.title : item.titleEn}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.category === 'car' ? (isAr ? 'سيارات' : 'Car') : (isAr ? 'منازل' : 'Home')}
                    </span>
                  </div>
                  {item.selectedPackage && (
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">
                      {isAr ? `باقة: ${item.selectedPackage.name}` : `Package: ${item.selectedPackage.name}`}
                    </p>
                  )}
                  {item.selectedAddons.length > 0 && (
                    <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">
                      +{item.selectedAddons.length} {isAr ? 'إضافات' : 'add-ons'}
                    </p>
                  )}
                </div>

                <div className="text-end shrink-0">
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                    {item.itemSubtotal} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                  <span className="block text-[9px] text-slate-400">
                    {item.durationMinutes} {isAr ? 'دقيقة' : 'min'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white text-xs">
              {isAr ? 'المجموع المستحق للخدمات' : 'Total Payable'}
            </span>
            <span className="text-sm sm:text-base font-black text-[#0866C6] dark:text-sky-400 font-mono">
              {getFinalPrice()} {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
