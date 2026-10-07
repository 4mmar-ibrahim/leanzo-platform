'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, Car, Home, Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useServiceStore } from '@/store/useServiceStore';
import { ServiceCategory } from '@/types';
import { ServiceCard } from '@/components/services/ServiceCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(1500);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating'>('recommended');

  const filteredServices = useMemo(() => {
    return activeServices
      .filter((s) => {
        // Category filter
        if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;

        // Search query filter (matches Arabic or English title/desc)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitleAr = s.title.toLowerCase().includes(q);
          const matchTitleEn = s.titleEn.toLowerCase().includes(q);
          const matchDescAr = s.shortDescription.toLowerCase().includes(q);
          const matchDescEn = s.shortDescriptionEn.toLowerCase().includes(q);
          if (!matchTitleAr && !matchTitleEn && !matchDescAr && !matchDescEn) return false;
        }

        // Price filter
        if (s.price > maxPrice) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        // Default recommended: popular first, then rating
        return (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || b.rating - a.rating;
      });
  }, [activeServices, selectedCategory, searchQuery, maxPrice, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setMaxPrice(1500);
    setSortBy('recommended');
  };

  return (
    <div className="py-6 sm:py-12 bg-[#F8FAFD] dark:bg-[#041728] min-h-screen">
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
                  : selectedCategory === 'car'
                  ? (isAr ? 'باقات العناية بالسيارات 🚗' : 'Car Care Packages 🚗')
                  : (isAr ? 'باقات العناية بالمنزل 🏡' : 'Home Care Packages 🏡')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 hidden sm:block">
                {isAr
                  ? 'تصفح باقات كلينزو المتخصصة، واطلب الخدمة بضغطة زر مع ضمان الجودة 100%'
                  : 'Explore specialized Cleanzo packages and book with 100% quality guarantee'}
              </p>
            </div>
          </div>

          {/* Category Tabs Switcher (Sleek Horizontal Segmented Control) */}
          <div className="grid grid-cols-3 sm:flex items-center p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#082845] border border-slate-200/80 dark:border-[#133B61] shadow-xs z-10 w-full sm:w-auto gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
                selectedCategory === 'all'
                  ? 'bg-[#0866C6] text-white shadow-sm shadow-[#0866C6]/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.services.all}</span>
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
                      className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
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
                      <span className="truncate">{isAr ? cat.name : (cat.nameEn || cat.name)}</span>
                    </button>
                  );
                })
            ) : (
              <>
                <button
                  onClick={() => setSelectedCategory('car')}
                  className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
                    selectedCategory === 'car'
                      ? 'bg-[#0866C6] text-white shadow-sm shadow-[#0866C6]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Car className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.services.carOnly}</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('home')}
                  className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
                    selectedCategory === 'home'
                      ? 'bg-[#0866C6] text-white shadow-sm shadow-[#0866C6]/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Home className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.services.homeOnly}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search, Filter & Sort Bar */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.services.searchPlaceholder}
                className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Price Filter Slider */}
            <div className="md:col-span-3 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>{isAr ? 'أقصى سعر' : 'Max Price'}</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold">{maxPrice} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              <input
                type="range"
                min="200"
                max="1500"
                step="50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />
            </div>

            {/* Sort Select */}
            <div className="md:col-span-3 flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-11"
                  options={[
                    { value: 'recommended', label: t.services.sortRecommended },
                    { value: 'price-asc', label: t.services.sortPriceLow },
                    { value: 'price-desc', label: t.services.sortPriceHigh },
                    { value: 'rating', label: t.services.sortRating },
                  ]}
                />
              </div>

              {(searchQuery || selectedCategory !== 'all' || maxPrice < 1500 || sortBy !== 'recommended') && (
                <button
                  onClick={resetFilters}
                  title={isAr ? 'إعادة ضبط' : 'Reset'}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <span>
            {isAr
              ? `تم العثور على ${filteredServices.length} خدمة متطابقة`
              : `Found ${filteredServices.length} matching services`}
          </span>
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
            actionLabel={isAr ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
            onAction={resetFilters}
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
