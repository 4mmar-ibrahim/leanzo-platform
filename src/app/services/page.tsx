'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, Car, Home, Sparkles, Loader2 } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useServiceStore } from '@/store/useServiceStore';
import { ServiceCategory } from '@/types';
import { ServiceCard } from '@/components/services/ServiceCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { resolveCategoryInfo } from '@/lib/services/categoryUtils';

function ServicesContent() {
  const { t, locale } = useLocaleStore();
  const searchParams = useSearchParams();
  const isAr = locale === 'ar';

  const storeServices = useServiceStore((s) => s.services);
  const categories = useServiceStore((s) => s.categories);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const isLoading = useServiceStore((s) => s.isLoading);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [fetchServices, fetchCategories]);

  const activeServices = useMemo(() => {
    return (storeServices || []).filter(
      (s) => s.available !== false && !(s as any).isArchived
    );
  }, [storeServices]);

  const paramCat = searchParams.get('category') || searchParams.get('cat');
  const initialCat = paramCat && paramCat !== 'all' ? (paramCat as ServiceCategory) : 'all';

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>(initialCat);

  useEffect(() => {
    const p = searchParams.get('category') || searchParams.get('cat');
    if (p && p !== 'all') {
      setSelectedCategory(p as ServiceCategory);
    } else {
      setSelectedCategory('all');
    }
  }, [searchParams]);

  const filteredServices = useMemo(() => {
    return activeServices
      .filter((s) => {
        // Category filter
        if (selectedCategory !== 'all') {
          const catInfo = resolveCategoryInfo(s.category, categories, isAr);
          const isMatch =
            s.category === selectedCategory ||
            catInfo.slug === selectedCategory ||
            (selectedCategory === 'car' && catInfo.isCar) ||
            (selectedCategory === 'home' && catInfo.isHome);
          if (!isMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Default recommended: popular first, then rating
        return (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || b.rating - a.rating;
      });
  }, [activeServices, selectedCategory, categories, isAr]);

  return (
    <div className="py-6 sm:py-12 bg-[#EAF8FC] dark:bg-[#041728] min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-8">
        {/* Header */}
        <SectionHeader
          badge={isAr ? 'دليل الخدمات' : 'Service Catalog'}
          title={t.services.pageTitle}
          subtitle={t.services.pageSubtitle}
        />

        {/* Cleanzo Smart Guide & Category Switcher */}
        <div className="relative p-3.5 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-50/80 via-white to-red-50/50 dark:from-[#041728] dark:via-[#082845] dark:to-[#07345C] border border-[#0866C6]/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-6 overflow-hidden">
          {/* Subtle brand glow */}
          <div className="absolute top-0 end-1/4 w-72 h-72 bg-[#0866C6]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Cleanzo Smart Advisor Header */}
          <div className="flex items-center gap-3 sm:gap-4 z-10 w-full md:w-auto">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0866C6]/15 dark:bg-[#0866C6]/25 text-[#0866C6] dark:text-[#3894ec] flex items-center justify-center shrink-0 shadow-xs border border-[#0866C6]/30">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-start space-y-0.5 sm:space-y-1 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0866C6]/10 dark:bg-[#0866C6]/20 text-[#0866C6] dark:text-[#3894ec] text-[10px] sm:text-[11px] font-black">
                <span>{isAr ? 'دليل كلينزو الذكي' : 'Cleanzo Smart Guide'}</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-[#07345C] dark:text-white">
                {selectedCategory === 'all'
                  ? (isAr ? 'كل الباقات والخدمات' : 'All Service Packages')
                  : (() => {
                      const selCatInfo = resolveCategoryInfo(selectedCategory, categories, isAr);
                      return isAr
                        ? `باقات ${selCatInfo.name} ${selCatInfo.isCar ? '🚗' : selCatInfo.isHome ? '🏡' : '✨'}`
                        : `${selCatInfo.name} Packages`;
                    })()}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 hidden sm:block">
                {isAr
                  ? 'تصفح باقات كلينزو المتخصصة، واطلب الخدمة بضغطة زر مع ضمان الجودة 100%'
                  : 'Explore specialized Cleanzo packages and book with 100% quality guarantee'}
              </p>
            </div>
          </div>

          {/* Category Tabs Switcher (Sleek Horizontal Segmented Control) */}
          <div className="flex items-center justify-center sm:justify-start p-1.5 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#082845] border border-slate-200/80 dark:border-[#133B61] shadow-xs z-10 w-full sm:w-auto gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0866C6] text-white shadow-sm shadow-[#0866C6]/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t.services.all}</span>
            </button>

            {categories.length > 0 ? (
              categories
                .filter((c) => c.active !== false)
                .map((cat) => {
                  const isSelected = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.id || cat.slug}
                      onClick={() => setSelectedCategory(cat.slug as ServiceCategory)}
                      className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0866C6] text-white shadow-sm shadow-[#0866C6]/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {cat.slug === 'car' ? (
                        <Car className="w-3.5 h-3.5 shrink-0" />
                      ) : cat.slug === 'home' ? (
                        <Home className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="whitespace-nowrap">{isAr ? cat.name : (cat.nameEn || cat.name)}</span>
                    </button>
                  );
                })
            ) : (
              <>
                <button
                  onClick={() => setSelectedCategory('car')}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === 'car'
                      ? 'bg-[#0866C6] text-white shadow-sm shadow-[#0866C6]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Car className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{t.services.carOnly}</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('home')}
                  className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === 'home'
                      ? 'bg-[#0866C6] text-white shadow-sm shadow-[#0866C6]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Home className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{t.services.homeOnly}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Services Grid or Empty State */}
        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t.services.noServicesFound}
            description={t.services.noServicesSub}
            actionLabel={isAr ? 'عرض جميع الخدمات' : 'Show All Services'}
            onAction={() => setSelectedCategory('all')}
          />
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-400">جاري التحميل...</div>}>
      <ServicesContent />
    </Suspense>
  );
}
