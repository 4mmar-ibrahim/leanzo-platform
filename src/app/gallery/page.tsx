'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Car,
  Home,
  X,
  Eye,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Camera,
  Layers,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useGalleryStore } from '@/store/useGalleryStore';
import { useZoStore } from '@/store/useZoStore';
import { GalleryItem, ServiceCategory } from '@/types';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Dialog } from '@/components/ui/Dialog';
import { BeforeAfterSlider } from '@/components/gallery/BeforeAfterSlider';
import { cn } from '@/lib/utils';
import { CleanzoImage } from '@/components/common/CleanzoImage';

export default function GalleryPage() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const storeItems = useGalleryStore((s) => s.items);
  const fetchGallery = useGalleryStore((s) => s.fetchGallery);
  const currentGallery = storeItems || [];
  const speak = useZoStore((s) => s.speak);
  const galleryPlacement = useZoStore((s) => s.settings.pagePlacements?.gallery);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const [activeFilter, setActiveFilter] = useState<'all' | 'car' | 'home'>('all');
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [mobileSlideIndex, setMobileSlideIndex] = useState(0);

  // Zo contextual greeting on gallery visit
  useEffect(() => {
    speak('تعالى شوف شغلنا قبل وبعد 📸 النتائج بتتكلم!', 'cleaning', 'taking_photo', 5000);
  }, [speak]);

  const filteredItems = currentGallery.filter((item) => {
    if (item.visible === false) return false;
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  // Featured hero item and supporting items for asymmetric layout
  const featuredItem = filteredItems.find((i) => i.featured || i.displayMode === 'featured_hero') || filteredItems[0];
  const supportingItems = filteredItems.filter((i) => i.id !== featuredItem?.id).slice(0, 2);
  const railItems = filteredItems.filter((i) => i.id !== featuredItem?.id && !supportingItems.some((s) => s.id === i.id));



  const totalMobileSlides = filteredItems.length;
  const currentMobileItem = filteredItems[mobileSlideIndex] || filteredItems[0];

  const handleNextMobile = () => {
    setMobileSlideIndex((prev) => (prev + 1) % totalMobileSlides);
  };

  const handlePrevMobile = () => {
    setMobileSlideIndex((prev) => (prev - 1 + totalMobileSlides) % totalMobileSlides);
  };

  return (
    <div className="py-10 lg:py-16 bg-[#EAF8FC] dark:bg-[#041728] min-h-screen space-y-14 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Section Header with Zo Mascot Banner */}
        <div className="relative">
          <SectionHeader
            badge={isAr ? 'نتائج واقعية موثقة' : 'Real Certified Results'}
            title={isAr ? 'معرض أعمال وإنجازات كلينزو' : 'Cleanzo Portfolio & Transformations'}
            subtitle={isAr ? 'شاهد نتائج خدماتنا المتخصصة قبل وبعد، ولمسات العناية الدقيقة التي يقدمها فنيونا المحترفون.' : 'Explore real transformations achieved by our certified technicians with precision.'}
          />
        </div>

        {/* Gallery Content or Empty State */}
        {filteredItems.length === 0 ? (
          <div className="py-24 text-center space-y-4 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800 my-8">
            <div className="w-16 h-16 rounded-2xl bg-[#0866C6]/10 text-[#0866C6] flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto px-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {isAr ? 'لا توجد أعمال معروضة حالياً' : 'No Showcase Items Available'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تم تفريغ معرض الأعمال أو لم تتم إضافة أعمال بعد. يمكنك إضافة أعمال وصور تحول جديدة من لوحة الإدارة.'
                  : 'The portfolio is currently empty. You can add new transformations from the admin panel.'}
              </p>
            </div>
          </div>
        ) : (
          <>


        {/* Filter Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              'px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2',
              activeFilter === 'all'
                ? 'bg-[#0866C6] text-white shadow-lg shadow-[#0866C6]/30'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#0866C6]'
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isAr ? 'جميع الأعمال' : 'All Works'}</span>
          </button>

          <button
            onClick={() => setActiveFilter('car')}
            className={cn(
              'px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2',
              activeFilter === 'car'
                ? 'bg-[#0866C6] text-white shadow-lg shadow-[#0866C6]/30'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#0866C6]'
            )}
          >
            <Car className="w-4 h-4" />
            <span>{isAr ? 'أعمال السيارات' : 'Car Detailing'}</span>
          </button>

          <button
            onClick={() => setActiveFilter('home')}
            className={cn(
              'px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2',
              activeFilter === 'home'
                ? 'bg-[#0866C6] text-white shadow-lg shadow-[#0866C6]/30'
                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#0866C6]'
            )}
          >
            <Home className="w-4 h-4" />
            <span>{isAr ? 'أعمال المنازل' : 'Home Cleaning'}</span>
          </button>
        </div>

        {/* ================= MOBILE HORIZONTAL SWIPE GALLERY (< 1024px) ================= */}
        <div className="block lg:hidden space-y-4">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-500 dark:text-slate-400">
              {isAr ? 'تصفح الأعمال:' : 'Browsing:'}
            </span>
            <span className="font-mono px-3 py-1 rounded-full bg-[#0866C6]/10 dark:bg-[#082845] text-[#0866C6] border border-[#0866C6]/30 font-bold">
              {String(mobileSlideIndex + 1).padStart(2, '0')} / {String(totalMobileSlides).padStart(2, '0')}
            </span>
          </div>

          {/* Current Mobile Slide Card */}
          {currentMobileItem && (
            <div
              onClick={() => setLightboxItem(currentMobileItem)}
              className="w-full rounded-3xl p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-lg cursor-pointer space-y-4"
            >
              {/* Category Pill Outside Image */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-[#0866C6] dark:text-sky-400">
                  {currentMobileItem.category === 'car' ? '🚗 سيارات' : '🏡 منازل'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isAr ? 'اضغط للتكبير' : 'Click to zoom'}
                </span>
              </div>

              {/* Clean Circular Image Presentation */}
              <div className="py-2 flex items-center justify-center">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 shrink-0">
                  <CleanzoImage
                    src={currentMobileItem.image}
                    alt={currentMobileItem.title}
                    fit="cover"
                    position="center"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>

              {/* Title & Description Below Image */}
              <div className="text-start space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isAr ? currentMobileItem.title : currentMobileItem.titleEn}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {isAr ? currentMobileItem.description : currentMobileItem.descriptionEn}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrevMobile}
              className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white flex items-center gap-1 text-xs font-bold shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
              <span>{isAr ? 'السابق' : 'Previous'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              {filteredItems.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    idx === mobileSlideIndex
                      ? 'w-6 bg-[#0866C6]'
                      : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                  )}
                />
              ))}
            </div>

            <button
              onClick={handleNextMobile}
              className="p-3 rounded-2xl bg-[#0866C6] text-white flex items-center gap-1 text-xs font-bold shadow-md"
            >
              <span>{isAr ? 'التالي' : 'Next'}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= DESKTOP ASYMMETRIC EDITORIAL GALLERY (>= 1024px) ================= */}
        <div className="hidden lg:block space-y-8">
          {/* Asymmetric Composition: 1 Large Hero + 2 Layered Supporting */}
          <div className="grid grid-cols-12 gap-6 items-stretch">
            {/* 1 Large Featured Hero (Col span 7) */}
            {featuredItem && (
              <div
                onClick={() => setLightboxItem(featuredItem)}
                className="col-span-7 group rounded-[32px] p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#0866C6] text-white text-xs font-black shadow-xs">
                    {featuredItem.category === 'car' ? '🚗 عمل مميز' : '🏡 عمل مميز'}
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/60 dark:border-slate-700">
                    {isAr ? 'فائقة الدقة' : 'High Precision'}
                  </span>
                </div>

                {/* Clean Circular Featured Image */}
                <div className="py-6 flex items-center justify-center">
                  <div className="relative w-56 h-56 lg:w-64 lg:h-64 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                    <img
                      src={featuredItem.image}
                      alt={featuredItem.title}
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>

                {/* Bottom Details Below Image */}
                <div className="text-start space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">
                    {isAr ? featuredItem.title : featuredItem.titleEn}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
                    {isAr ? featuredItem.description : featuredItem.descriptionEn}
                  </p>
                </div>
              </div>
            )}

            {/* 2 Supporting Images (Col span 5) */}
            <div className="col-span-5 flex flex-col gap-6">
              {supportingItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setLightboxItem(item)}
                  className="flex-1 group rounded-[28px] p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl cursor-pointer transition-all duration-300 flex items-center gap-5"
                >
                  {/* Clean Circular Supporting Image */}
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 shrink-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Supporting Details */}
                  <div className="flex-1 min-w-0 text-start space-y-2">
                    <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.category === 'car' ? 'سيارات' : 'منازل'}
                    </span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                      {isAr ? item.title : item.titleEn}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {isAr ? item.description : item.descriptionEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Horizontal Image Rail for Remaining Works */}
          {railItems.length > 0 && (
            <div className="space-y-4 text-start">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#0866C6]" />
                  <span>{isAr ? 'المزيد من إنجازات وتطبيقات كلينزو' : 'More Cleanzo Transformations'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-bold">
                  {isAr ? 'اسحب أفقياً للاستعراض' : 'Scroll horizontally'}
                </span>
              </div>

              <div className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar">
                {railItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setLightboxItem(item)}
                    className="snap-start shrink-0 w-60 sm:w-64 group rounded-[26px] p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-[#0866C6] text-white">
                        {item.category === 'car' ? '🚗' : '🏡'}
                      </span>
                    </div>

                    <div className="py-2 flex items-center justify-center">
                      <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 shrink-0">
                        <CleanzoImage
                          src={item.image}
                          alt={item.title}
                          fit="cover"
                          position="center"
                          className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    </div>

                    <div className="text-start pt-1 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {isAr ? item.title : item.titleEn}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    )}
  </div>

      {/* Lightbox Dialog */}
      {lightboxItem && (
        <Dialog
          isOpen={!!lightboxItem}
          onClose={() => setLightboxItem(null)}
          title={isAr ? lightboxItem.title : lightboxItem.titleEn}
        >
          <div className="space-y-4">
            {lightboxItem.beforeImage && lightboxItem.afterImage ? (
              <BeforeAfterSlider
                beforeImage={lightboxItem.beforeImage}
                afterImage={lightboxItem.afterImage}
                title={isAr ? lightboxItem.title : lightboxItem.titleEn}
              />
            ) : (
              <div className="relative rounded-2xl overflow-hidden h-80 sm:h-96">
                <img
                  src={lightboxItem.image}
                  alt={lightboxItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-start">
              {isAr ? lightboxItem.description : lightboxItem.descriptionEn}
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
