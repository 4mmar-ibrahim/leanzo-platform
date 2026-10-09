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
import { formatDuration, cn } from '@/lib/utils';
import { Service, ServicePackage, ServiceAddon, ServiceCategory } from '@/types';
import { getServiceDisplayPrice } from '@/lib/pricing';
import { resolveCategoryInfo } from '@/lib/services/categoryUtils';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

export function StepService() {
  const { t, locale } = useLocaleStore();
  const {
    category,
    setCategory,
    selectedServices,
    addService,
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
  const categories = useServiceStore((s) => s.categories);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);

  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalService, setModalService] = useState<Service | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load all categories from API
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Compute active categories with sensible defaults
  const activeCategories = useMemo(() => {
    const list = Array.isArray(categories) && categories.length > 0
      ? categories.filter((c) => c.active !== false)
      : [];

    const existingSlugs = new Set(list.map((c) => c.slug));
    const orphanSlugs = Array.from(new Set((storeServices || []).map((s: any) => s.category))).filter(
      (slug): slug is string => Boolean(slug) && !existingSlugs.has(slug)
    );

    const merged = [...list];
    for (const orphan of orphanSlugs) {
      merged.push({
        id: `cat-${orphan}`,
        slug: orphan,
        name: orphan === 'car' ? (isAr ? 'خدمات السيارات' : 'Car Services') : orphan === 'home' ? (isAr ? 'خدمات المنازل' : 'Home Services') : orphan,
        nameEn: orphan === 'car' ? 'Car Services' : orphan === 'home' ? 'Home Services' : orphan,
        description: '',
        descriptionEn: '',
        icon: 'Sparkles',
        image: '',
        active: true,
        order: 999,
      });
    }

    if (merged.length === 0) {
      return [
        {
          id: 'car',
          slug: 'car',
          name: isAr ? 'خدمات السيارات' : 'Car Services',
          nameEn: 'Car Services',
          description: isAr ? 'غسيل، ديتيلينج، شمع، بخار' : 'Wash, Detailing, Wax, Steam',
          descriptionEn: 'Wash, Detailing, Wax, Steam',
          icon: 'Car',
          image: '',
          active: true,
          order: 1,
        },
        {
          id: 'home',
          slug: 'home',
          name: isAr ? 'خدمات المنازل' : 'Home Services',
          nameEn: 'Home Services',
          description: isAr ? 'تنظيف عميق، كنب، مطابخ، مفروشات' : 'Deep clean, sofas, kitchens',
          descriptionEn: 'Deep clean, sofas, kitchens',
          icon: 'Home',
          image: '',
          active: true,
          order: 2,
        },
      ];
    }

    return merged.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [categories, storeServices, isAr]);

  // If current category is not in activeCategories, select the first available category
  useEffect(() => {
    if (activeCategories.length > 0 && !activeCategories.some((c) => c.slug === category)) {
      setCategory(activeCategories[0].slug as ServiceCategory);
    }
  }, [activeCategories, category, setCategory]);

  const activeCategoryObj = useMemo(() => {
    return activeCategories.find((c) => c.slug === category) || activeCategories[0];
  }, [activeCategories, category]);

  const activeCategoryTitle = useMemo(() => {
    if (!activeCategoryObj) return isAr ? 'الخدمات' : 'Services';
    return isAr ? activeCategoryObj.name : activeCategoryObj.nameEn || activeCategoryObj.name;
  }, [activeCategoryObj, isAr]);

  const getCategoryIconComponent = (cat: typeof activeCategories[0]) => {
    const slug = (cat.slug || '').toLowerCase();
    const iconStr = (cat.icon || '').toLowerCase();
    if (slug === 'car' || iconStr === 'car') return Car;
    if (slug === 'home' || iconStr === 'home') return Home;
    if (iconStr === 'package') return PackageIcon;
    return Sparkles;
  };

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

  const handleCardToggle = (srv: Service) => {
    toggleService(srv);
    // If selecting and this service has packages or addons, open modal immediately
    if (!isServiceSelected(srv.id)) {
      if ((srv.packages && srv.packages.length > 0) || (srv.addons && srv.addons.length > 0)) {
        setModalService(srv);
      }
    }
  };

  const itemizedList = mounted ? getItemizedServicesList() : [];

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

        {/* Dynamic Category Cards Grid */}
        <div
          className={`grid gap-3 sm:gap-4 ${
            activeCategories.length === 1
              ? 'grid-cols-1 max-w-sm mx-auto'
              : activeCategories.length === 2
              ? 'grid-cols-2'
              : activeCategories.length === 3
              ? 'grid-cols-2 sm:grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          {activeCategories.map((cat, idx) => {
            const isSelected = category === cat.slug;
            const CatIcon = getCategoryIconComponent(cat);
            const selectedCount = mounted
              ? selectedServices.filter((item) => item.service.category === cat.slug).length
              : 0;
            const catName = isAr ? cat.name : cat.nameEn || cat.name;
            const catDesc = isAr ? cat.description : cat.descriptionEn || cat.description;

            return (
              <button
                key={cat.id || cat.slug || idx}
                type="button"
                id={`category-${cat.slug}-btn`}
                onClick={() => setCategory(cat.slug as ServiceCategory)}
                className={`p-3.5 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border-2 flex items-center justify-between gap-3.5 transition-all text-start cursor-pointer ${
                  isSelected
                    ? 'border-[#0866C6] bg-sky-50/70 dark:bg-sky-950/40 text-[#07345C] dark:text-sky-200 shadow-md ring-2 ring-[#0866C6]/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#0866C6] text-white shadow-md shadow-[#0866C6]/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <CatIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-black truncate">{catName}</p>
                    {catDesc && (
                      <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                        {catDesc}
                      </p>
                    )}
                  </div>
                </div>
                {selectedCount > 0 && (
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#0866C6] text-white shrink-0">
                    {selectedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Services Tally Bar (Multi-Service Summary) */}
      {mounted && selectedServices.length > 0 && (
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
              {isAr ? `اختر ${activeCategoryTitle} المطلوبة` : `Choose ${activeCategoryTitle}`}
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr
                ? 'انقر على أي خدمة لتحديدها أو إلغاء تحديدها. يمكنك اختيار أكثر من خدمة معاً.'
                : 'Click any service to select or deselect. You can choose multiple services.'}
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            ✨ {activeCategoryTitle}
          </span>
        </div>

        {/* LOADING STATE */}
        {isLoadingCategory && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <Loader2 className="w-8 h-8 text-[#0866C6] animate-spin" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {isAr
                ? `جاري تحميل ${activeCategoryTitle}...`
                : `Loading ${activeCategoryTitle}...`}
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
              {isAr
                ? `لا توجد خدمات متاحة حالياً في قسم ${activeCategoryTitle}`
                : `No services available at this time in ${activeCategoryTitle}`}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isAr
                ? 'يمكنك تجربة اختيار قسم آخر أو التواصل مع الدعم الفني للاستفسار.'
                : 'You may try another category or contact customer support.'}
            </p>
          </div>
        )}

        {/* SERVICES CARDS GRID (2 Columns Square Tiles) */}
        {!isLoadingCategory && !loadError && services.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {services.map((srv) => {
              const isSelected = mounted ? isServiceSelected(srv.id) : false;
              const selectedItem = mounted ? selectedServices.find((i) => i.service.id === srv.id) : null;
              const hasPackages = srv.packages && srv.packages.length > 0;
              const hasAddons = srv.addons && srv.addons.length > 0;

              return (
                <div
                  key={srv.id}
                  id={`service-card-${srv.id}`}
                  className={`col-span-1 rounded-xl sm:rounded-2xl border-2 transition-all flex flex-col justify-between ${
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
                        <PriceDisplay
                          price={Number(srv.price) || 0}
                          originalPrice={srv.originalPrice && srv.originalPrice > srv.price ? srv.originalPrice : undefined}
                          size="sm"
                        />
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

                  {/* Prominent Button for Packages and Addons */}
                  {(hasPackages || hasAddons) && (
                    <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 pt-0 border-t border-sky-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isSelected) {
                            addService(srv);
                          }
                          setModalService(srv);
                        }}
                        className={cn(
                          'w-full mt-2 py-2 px-2.5 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98]',
                          isSelected
                            ? 'bg-[#0866C6] text-white hover:bg-[#0756A6] shadow-sm shadow-[#0866C6]/20'
                            : 'bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200/80 dark:border-sky-800'
                        )}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span className="truncate">
                            {isAr ? 'عرض الباقات و الإضافات' : 'View Packages & Add-ons'}
                          </span>
                        </div>
                        {selectedItem?.selectedPackage ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/20 dark:bg-black/20 font-bold shrink-0 truncate max-w-[80px]">
                            {selectedItem.selectedPackage.name}
                          </span>
                        ) : selectedItem && selectedItem.selectedAddons.length > 0 ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/20 dark:bg-black/20 font-bold shrink-0">
                            +{selectedItem.selectedAddons.length}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bottom Selected Services Itemized List */}
      {mounted && itemizedList.length > 0 && (
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
                      {resolveCategoryInfo(item.category, categories, isAr).name}
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

      {/* 5. Packages & Add-ons Modal Dialog */}
      {modalService && (
        <Dialog
          isOpen={!!modalService}
          onClose={() => setModalService(null)}
          maxWidth="2xl"
          title={isAr ? 'باقات وإضافات الخدمة' : 'Service Packages & Add-ons'}
          description={isAr ? modalService.title : modalService.titleEn}
        >
          {(() => {
            const activeModalItem = selectedServices.find((i) => i.service.id === modalService.id);
            const hasPackages = modalService.packages && modalService.packages.length > 0;
            const hasAddons = modalService.addons && modalService.addons.length > 0;

            const baseOrPkgPrice = activeModalItem?.selectedPackage
              ? activeModalItem.selectedPackage.price
              : modalService.price;
            const addonsSum = (activeModalItem?.selectedAddons || []).reduce(
              (sum, a) => sum + (Number(a.price) || 0),
              0
            );
            const currentItemTotal = baseOrPkgPrice + addonsSum;

            const baseOrPkgDuration = activeModalItem?.selectedPackage?.durationMinutes
              ? Number(activeModalItem.selectedPackage.durationMinutes)
              : Number(modalService.serviceDurationMinutes || modalService.duration || 45);
            const addonsDuration = (activeModalItem?.selectedAddons || []).reduce(
              (sum, a) => sum + (Number(a.durationMinutes) || 0),
              0
            );
            const currentItemDuration = baseOrPkgDuration + addonsDuration;

            return (
              <div className="space-y-6 pt-2 text-start">
                {/* 1. Packages Section */}
                {hasPackages && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <PackageIcon className="w-4 h-4 text-[#0866C6]" />
                        <span>{isAr ? 'اختر باقة الخدمة' : 'Select Package Tier'}</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {isAr ? 'اختر باقة واحدة أو الخدمة الأساسية' : 'Select one or keep base'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Standard Base */}
                      <div
                        onClick={() => selectPackageForService(modalService.id, null)}
                        className={cn(
                          'p-3.5 rounded-xl border-2 flex items-center justify-between gap-2.5 cursor-pointer transition-all',
                          !activeModalItem?.selectedPackage
                            ? 'border-[#0866C6] bg-sky-50/60 dark:bg-sky-950/40 shadow-xs ring-1 ring-[#0866C6]/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                              !activeModalItem?.selectedPackage
                                ? 'border-[#0866C6] bg-[#0866C6] text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            )}
                          >
                            {!activeModalItem?.selectedPackage && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                              {isAr ? 'الخدمة الأساسية' : 'Standard Base'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDuration(modalService.serviceDurationMinutes || modalService.duration, isAr)}
                            </span>
                          </div>
                        </div>
                        <PriceDisplay
                          price={Number(modalService.price) || 0}
                          originalPrice={
                            modalService.originalPrice && modalService.originalPrice > modalService.price
                              ? modalService.originalPrice
                              : undefined
                          }
                          size="sm"
                        />
                      </div>

                      {/* Packages */}
                      {modalService.packages
                        ?.filter((p) => p.active !== false)
                        .map((pkg) => {
                          const isPkgSelected = activeModalItem?.selectedPackage?.id === pkg.id;
                          return (
                            <div
                              key={pkg.id}
                              onClick={() => selectPackageForService(modalService.id, isPkgSelected ? null : pkg)}
                              className={cn(
                                'p-3.5 rounded-xl border-2 flex items-center justify-between gap-2.5 cursor-pointer transition-all',
                                isPkgSelected
                                  ? 'border-[#0866C6] bg-sky-50/60 dark:bg-sky-950/40 shadow-xs ring-1 ring-[#0866C6]/30'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={cn(
                                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                    isPkgSelected
                                      ? 'border-[#0866C6] bg-[#0866C6] text-white'
                                      : 'border-slate-300 dark:border-slate-600'
                                  )}
                                >
                                  {isPkgSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div>
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block truncate">
                                    {isAr ? pkg.name : pkg.nameEn || pkg.name}
                                  </span>
                                  {pkg.durationMinutes && (
                                    <span className="text-[10px] text-slate-400">
                                      {formatDuration(pkg.durationMinutes, isAr)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <PriceDisplay price={pkg.price} originalPrice={pkg.originalPrice} size="sm" />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 2. Addons Section */}
                {hasAddons && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>{isAr ? 'إضافات اختيارية للخدمة' : 'Optional Add-ons'}</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {isAr ? 'يمكنك اختيار أكثر من إضافة' : 'You can select multiple'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {modalService.addons
                        ?.filter((a) => a.active !== false)
                        .map((addon) => {
                          const isChecked = activeModalItem?.selectedAddons.some((a) => a.id === addon.id) || false;

                          return (
                            <div
                              key={addon.id}
                              onClick={() => toggleAddonForService(modalService.id, addon)}
                              className={cn(
                                'p-3 rounded-xl border-2 flex items-center justify-between gap-2.5 cursor-pointer transition-all',
                                isChecked
                                  ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-1 ring-amber-500/30'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={cn(
                                    'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                                    isChecked
                                      ? 'border-amber-500 bg-amber-500 text-white'
                                      : 'border-slate-300 dark:border-slate-600'
                                  )}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
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

                {/* 3. Summary for this service */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs sm:text-sm">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                      {isAr ? 'الإجمالي لهذه الخدمة:' : 'Total for this service:'}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">
                      {formatDuration(currentItemDuration, isAr)}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="text-base sm:text-lg font-black text-[#0866C6] dark:text-sky-400 font-mono">
                      {currentItemTotal} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                </div>

                {/* 4. Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      removeService(modalService.id);
                      setModalService(null);
                    }}
                    className="w-full sm:w-auto text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    {isAr ? 'إلغاء اختيار الخدمة' : 'Deselect service'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setModalService(null)}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-[#0866C6]/20"
                  >
                    <Check className="w-4 h-4 ml-1.5" />
                    <span>{isAr ? 'تأكيد والعودة لاختيار الخدمات' : 'Confirm & Return to Services'}</span>
                  </Button>
                </div>
              </div>
            );
          })()}
        </Dialog>
      )}
    </div>
  );
}
