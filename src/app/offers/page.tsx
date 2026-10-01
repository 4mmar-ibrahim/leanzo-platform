'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Sparkles, Clock, Copy, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useOfferStore, OfferExtended } from '@/store/useOfferStore';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function OffersPage() {
  const router = useRouter();
  const { t, locale, direction } = useLocaleStore();
  const { applyPromoCode, selectServiceById } = useBookingStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const storeOffers = useOfferStore((s) => s.offers);
  const fetchOffers = useOfferStore((s) => s.fetchOffers);
  const isLoading = useOfferStore((s) => s.isLoading);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Dynamic Hero Banners (Promo Banners configured by Admin)
  const heroBanners = useMemo<OfferExtended[]>(() => {
    return (storeOffers || []).filter(
      (o: any) => o.active !== false && !o.isArchived && o.promoCode === 'HERO_BANNER'
    );
  }, [storeOffers]);

  // Regular service offers
  const regularOffersList = useMemo(() => {
    return (storeOffers || []).filter(
      (o: any) => o.active !== false && !o.isArchived && o.promoCode !== 'HERO_BANNER'
    );
  }, [storeOffers]);

  // Scroll to banner by index
  const scrollToBanner = (index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cards = container.children;
    if (cards[index]) {
      const card = cards[index] as HTMLElement;
      container.scrollTo({
        left: card.offsetLeft - (direction === 'rtl' ? container.clientWidth - card.clientWidth : 0),
        behavior: 'smooth',
      });
      setActiveBannerIndex(index);
    }
  };

  const handlePrevBanner = () => {
    const nextIdx = Math.max(0, activeBannerIndex - 1);
    scrollToBanner(nextIdx);
  };

  const handleNextBanner = () => {
    const nextIdx = Math.min(heroBanners.length - 1, activeBannerIndex + 1);
    scrollToBanner(nextIdx);
  };

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = container.clientWidth * 0.88;
    const scrollPos = Math.abs(container.scrollLeft);
    const newIdx = Math.round(scrollPos / cardWidth);
    if (newIdx !== activeBannerIndex && newIdx < heroBanners.length) {
      setActiveBannerIndex(newIdx);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      toast.success(isAr ? `تم نسخ كود الخصم (${code})` : `Copied code (${code})`);
    }
  };

  const handleClaimOffer = (offer: OfferExtended) => {
    applyPromoCode(offer.code);
    if (offer.serviceId) {
      selectServiceById(offer.serviceId);
    }
    toast.success(isAr ? `تم تفعيل كود الخصم (${offer.code})` : `Promo code applied!`);
    router.push('/booking');
  };

  return (
    <div className="py-12 bg-[#F5F8FC] dark:bg-[#041728] min-h-screen space-y-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <SectionHeader
          badge={isAr ? 'عروض حصرية' : 'Exclusive Offers'}
          title={isAr ? 'خصومات وباقات موسمية استثنائية' : 'Seasonal Discounts & Bundle Deals'}
          subtitle={isAr ? 'استفد من أفضل أسعار العناية المتكاملة بسيارتك ومنزلك مع كوبونات حصرية محدودة.' : 'Maximize value with exclusive coupons and bundle promotions for vehicle & home cleaning.'}
        />

        {/* ================= VIP PROMO HERO BANNERS (SIDE-BY-SIDE ON MOBILE) ================= */}
        {heroBanners.length > 0 && (
        <div className="relative">
          {/* Navigation Arrows for multi-banner */}
          {heroBanners.length > 1 && (
            <div className="hidden sm:flex items-center justify-between pointer-events-none absolute inset-y-0 -start-4 -end-4 z-20">
              <button
                type="button"
                onClick={direction === 'rtl' ? handleNextBanner : handlePrevBanner}
                className="pointer-events-auto p-2.5 rounded-full bg-slate-900/70 hover:bg-[#0866C6] text-white backdrop-blur-md border border-white/20 transition-all shadow-xl active:scale-95"
                title={isAr ? 'السابق' : 'Previous'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={direction === 'rtl' ? handlePrevBanner : handleNextBanner}
                className="pointer-events-auto p-2.5 rounded-full bg-slate-900/70 hover:bg-[#0866C6] text-white backdrop-blur-md border border-white/20 transition-all shadow-xl active:scale-95"
                title={isAr ? 'التالي' : 'Next'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Side-by-side horizontal scroll container for mobile & desktop */}
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 pb-3 pt-1 px-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {heroBanners.map((banner, index) => {
              const limit = banner.usageLimit;
              const hasLimit = typeof limit === 'number' && limit > 0;
              const remainingCount = hasLimit ? Math.max(0, limit - (banner.usageCount || 0)) : null;

              return (
                <div
                  key={banner.id || index}
                  className={`rounded-[36px] bg-gradient-to-br from-[#0866C6] via-[#0842A0] to-[#07345C] text-white p-6 sm:p-10 shadow-2xl relative overflow-hidden border-2 border-white/10 shrink-0 snap-center transition-all ${
                    heroBanners.length > 1
                      ? 'w-[90vw] sm:w-[620px] lg:w-full'
                      : 'w-full'
                  }`}
                >
                  {/* Ambient Livery Gradients */}
                  <div className="absolute top-0 end-0 w-96 h-96 bg-[#F0444C]/20 rounded-full blur-[90px] pointer-events-none" />
                  <div className="absolute -bottom-10 start-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 text-start">
                    {/* Left/Start side: Promo Icon & Content */}
                    <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-white/10 backdrop-blur-md text-amber-300 flex items-center justify-center border border-white/20 shrink-0 shadow-lg mt-1 sm:mt-0">
                        <Tag className="w-7 h-7 sm:w-8 sm:h-8 fill-amber-300/20" />
                      </div>
                      <div className="space-y-2 max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-300 text-xs font-black border border-white/20">
                            <Sparkles className="w-3.5 h-3.5 fill-amber-300" />
                            <span>
                              {isAr
                                ? (banner.badge || 'عرض حصري من زو التميمة')
                                : (banner.badgeEn || banner.badge || 'Exclusive Mascot Offer')}
                            </span>
                          </div>
                          {hasLimit && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-300/30">
                              <span>
                                {isAr ? `متبقي لـ ${remainingCount} شخص فقط` : `${remainingCount} spots left`}
                              </span>
                            </span>
                          )}
                        </div>

                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                          {isAr ? banner.title : (banner.titleEn || banner.title)}
                        </h2>
                        <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                          {isAr ? banner.description : (banner.descriptionEn || banner.description)}
                        </p>
                      </div>
                    </div>

                    {/* Right/End side: Interactive Coupon Code Box & Action */}
                    <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3 shrink-0 pt-2 lg:pt-0">
                      <div className="w-full sm:w-auto px-4 sm:px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-dashed border-amber-300/60 flex items-center justify-between gap-4">
                        <div className="text-start">
                          <p className="text-[10px] uppercase tracking-wider text-amber-300 font-black">
                            {isAr ? 'كود الخصم' : 'PROMO CODE'}
                          </p>
                          <p className="text-base sm:text-lg font-mono font-black text-white tracking-widest">
                            {banner.code}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(banner.code)}
                          className="p-2 sm:p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                          title={isAr ? 'نسخ الكود' : 'Copy code'}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      <Button
                        variant="primary"
                        onClick={() => {
                          applyPromoCode(banner.code);
                          if (banner.serviceId) selectServiceById(banner.serviceId);
                          toast.success(isAr ? `تم تفعيل كود الخصم (${banner.code})` : `Promo code applied!`);
                          router.push('/booking');
                        }}
                        className="w-full sm:w-auto bg-[#F0444C] hover:bg-[#c91219] text-white border-0 shadow-lg shadow-red-600/40 font-black px-6 py-3.5 cursor-pointer"
                      >
                        <Tag className="w-4 h-4" />
                        <span>{isAr ? 'احجز واستفد الآن' : 'Book with Discount'}</span>
                        <ArrowIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots Indicator for Mobile & Multi-Banner Navigation */}
          {heroBanners.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {heroBanners.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => scrollToBanner(dotIdx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    activeBannerIndex === dotIdx
                      ? 'w-7 bg-[#0866C6] dark:bg-sky-400'
                      : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to banner ${dotIdx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
        )}

        {/* Offers Grid */}
        {regularOffersList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center max-w-5xl mx-auto">
            {regularOffersList.map((offer) => (
              <div
                key={offer.id}
                className="w-full max-w-[540px] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#072540] shadow-sm hover:shadow-md hover:border-[#0866C6] dark:hover:border-[#0866C6] transition-all flex flex-col justify-between"
              >
                {/* Top Badge & Expiry Bar (Cleanly Outside Image) */}
                <div className="pt-4 px-5 flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
                    {isAr ? offer.badge : offer.badgeEn}
                  </span>

                  {offer.expiresAt && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>{isAr ? `ينتهي: ${offer.expiresAt}` : `Expires: ${offer.expiresAt}`}</span>
                    </div>
                  )}
                </div>

                {/* Clean Circular Offer Image Presentation — No Overlays */}
                <div className="py-3 px-5 flex items-center justify-center">
                  <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 shrink-0">
                    <img
                      src={offer.image}
                      alt={isAr ? offer.title : offer.titleEn}
                      className="w-full h-full object-cover object-center rounded-full transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                </div>

                {/* Compact Offer Content */}
                <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between text-start">
                  <div className="space-y-1">
                    <h3
                      className="font-bold text-[#07345C] dark:text-white leading-snug line-clamp-1"
                      style={{ fontSize: 'clamp(1.15rem, 2vw, 1.35rem)' }}
                    >
                      {isAr ? offer.title : offer.titleEn}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {isAr ? offer.description : offer.descriptionEn}
                    </p>
                  </div>

                  {/* Compact Promo Code Box */}
                  <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#041728]/80 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-tight">
                        {isAr ? 'كود الكوبون' : 'Coupon Code'}
                      </span>
                      <p className="font-mono text-sm sm:text-base font-black text-[#0866C6] dark:text-sky-400 tracking-wider">
                        {offer.code}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(offer.code)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0866C6] hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
                      title={isAr ? 'نسخ الكود' : 'Copy'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Compact Booking CTA Button */}
                  <button
                    type="button"
                    onClick={() => handleClaimOffer(offer)}
                    className="w-full bg-[#0866C6] hover:bg-[#07345C] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#0866C6]/20 hover:shadow-lg transition-all text-sm active:scale-[0.99]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{isAr ? 'احجز واستفد من الخصم فوراً' : 'Book & Claim Discount Now'}</span>
                    <ArrowIcon className="w-4 h-4 shrink-0 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Tag}
            title={isAr ? 'لا توجد عروض حالية' : 'No Active Offers'}
            description={
              isAr
                ? 'تابعنا باستمرار للاستفادة من أقوى الخصومات والعروض الترويجية الحصرية قريباً!'
                : 'Check back soon for exciting limited-time discounts and packages!'
            }
          />
        )}
      </div>
    </div>
  );
}