'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Car,
  Home,
  Sparkles,
  Tag,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  MessageCircle,
  Clock,
  ShieldCheck,
  Star,
  CheckCircle2,
  Calendar,
  HelpCircle,
  Flame,
  Search,
  Zap,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useOfferStore } from '@/store/useOfferStore';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { useServiceStore } from '@/store/useServiceStore';
import { QuickBookingBottomSheet } from '@/components/booking/QuickBookingBottomSheet';
import { FloatingBookingButton } from './FloatingBookingButton';
import { FAQAccordion } from '@/components/faq/FAQAccordion';
import { BeforeAfterSlider } from '@/components/gallery/BeforeAfterSlider';
import { useGalleryStore } from '@/store/useGalleryStore';
import { ServiceCategory } from '@/types';
import { useZoStore } from '@/store/useZoStore';
import { resolveActionButtonUrl } from '@/lib/actionButtonUtils';

interface MobileSectionDividerProps {
  icon: React.ElementType;
  title: string;
  actionHref?: string;
  actionLabel?: string;
  dotColor?: string;
  iconColor?: string;
}

function MobileSectionDivider({
  icon: Icon,
  title,
  actionHref,
  actionLabel,
  dotColor = 'bg-[#0866C6]',
  iconColor = 'text-[#0866C6] dark:text-[#3894ec]',
}: MobileSectionDividerProps) {
  const { direction } = useLocaleStore();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="relative flex items-center justify-center pt-4 pb-1 select-none">
      {/* Centered Title Badge in the middle of the page */}
      <div className="relative z-10 flex items-center justify-center gap-2 px-3.5 bg-transparent text-center max-w-[85%]">
        <div className="w-7 h-7 flex items-center justify-center shrink-0">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="text-sm font-black text-[#07345C] dark:text-white tracking-tight truncate">
            {title}
          </h2>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse shrink-0`} />
        </div>
      </div>

      {/* Action link on the end edge (if provided) */}
      {actionHref && actionLabel && (
        <div className="absolute end-0 top-1/2 -translate-y-1/2 z-10 ps-2 bg-transparent">
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0866C6] dark:text-[#3894ec] hover:opacity-80 active:scale-95 transition-all"
          >
            <span>{actionLabel}</span>
            <ArrowIcon className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

export function MobileHomeExperience() {
  const router = useRouter();
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const mobilePlacement = useZoStore((s) => s.settings.pagePlacements?.home_mobile);

  const mobileSettings = useSettingsStore((s) => s.settings.mobileExperience);
  const branding = useSettingsStore((s) => s.settings.branding);
  const storeOffers = useOfferStore((s) => s.offers);
  const fetchOffers = useOfferStore((s) => s.fetchOffers);
  const activeOffers = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (storeOffers || []).filter((o: any) => {
      if (o.active === false || o.isArchived) return false;
      if (o.expiresAt && o.expiresAt < today) return false;
      if (o.startDate && o.startDate > today) return false;
      return true;
    });
  }, [storeOffers]);

  const hero = useCMSStore((s) => s.hero);
  const faqs = useCMSStore((s) => s.faqs);
  const contact = useCMSStore((s) => s.contact);
  const storeReviews = useCMSStore((s) => s.reviews);
  const fetchReviews = useCMSStore((s) => s.fetchReviews);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const isSectionVisible = useCMSStore((s) => s.isSectionVisible);
  const services = useServiceStore((s) => s.services);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const categories = useServiceStore((s) => s.categories);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const galleryItems = useGalleryStore((s) => s.items);
  const fetchGallery = useGalleryStore((s) => s.fetchGallery);

  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('car');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchOffers();
    fetchPublishedContent();
    fetchServices();
    fetchCategories();
    fetchReviews();
    fetchGallery();
  }, [fetchOffers, fetchPublishedContent, fetchServices, fetchCategories, fetchReviews, fetchGallery]);

  const activeCategories = useMemo(() => {
    return (categories || []).filter((c) => c.active !== false);
  }, [categories]);

  const featuredBeforeAfter = useMemo(() => {
    return (galleryItems || []).find((item) => item.beforeImage && item.afterImage && item.visible !== false);
  }, [galleryItems]);

  const displayReviews = useMemo(() => {
    const seen = new Set<string>();
    return (storeReviews || []).filter((r) => {
      if (!r || r.visible === false) return false;
      const key = r.id || `${r.customerName}_${r.comment}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [storeReviews]);

  const openBookingForCategory = (cat?: string) => {
    const targetCat = (cat || 'car') as ServiceCategory;
    if (mobileSettings?.enableQuickBooking === false) {
      router.push(`/booking?category=${encodeURIComponent(targetCat)}`);
    } else {
      setActiveCategory(targetCat);
      setBookingSheetOpen(true);
    }
  };

  const previewFaqs = faqs.filter((f) => f.visible !== false).slice(0, 4);

  if (!mounted) {
    return (
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 space-y-4 pb-24">
        <div className="h-28 rounded-3xl bg-sky-50/50 dark:bg-slate-800/40 border-2 border-sky-100/50 dark:border-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-32 rounded-3xl bg-sky-50/50 dark:bg-slate-800/40 border-2 border-sky-100/50 dark:border-slate-800 animate-pulse" />
          <div className="h-32 rounded-3xl bg-sky-50/50 dark:bg-slate-800/40 border-2 border-sky-100/50 dark:border-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  const showWelcome = mobileSettings?.showWelcomeCard !== false && isSectionVisible('hero');
  const showServices = mobileSettings?.showServices !== false && isSectionVisible('services') && activeCategories.length > 0;
  const showOffers = isSectionVisible('offers') && mobileSettings?.showOffers !== false && activeOffers.length > 0;
  const showGallery = isSectionVisible('gallery') && mobileSettings?.showGallery !== false && !!featuredBeforeAfter;
  const showFAQ = isSectionVisible('faq') && mobileSettings?.showFAQ !== false && previewFaqs.length > 0;
  const showContact = mobileSettings?.showContact !== false;
  const showReviews = mobileSettings?.showReviews !== false && isSectionVisible('reviews') && displayReviews.length > 0;
  const showFloatingBtn = mobileSettings?.showFloatingBookingButton !== false;

  return (
    <div suppressHydrationWarning className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 space-y-5 pb-32">
      {/* ======================= TOP APP HEADER & GREETING ======================= */}
      {showWelcome && (
        <section className="space-y-2">
          <div className="py-2 px-1 text-center flex flex-col items-center justify-center bg-transparent border-0 shadow-none">
            <div className="space-y-2 w-full flex flex-col items-center text-center">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0866C6]/10 text-[#0866C6] dark:text-[#3894ec] text-[11px] font-black">
                  <Sparkles className="w-3 h-3" />
                  <span>CLEANZO</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isAr ? 'أسطول جاهز 🚐' : 'Fleet Ready'}</span>
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-black text-[#07345C] dark:text-white tracking-tight leading-snug">
                  {isAr ? 'أهلاً بك في كلينزو 👋' : 'Welcome to Cleanzo 👋'}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-[#0866C6] dark:text-[#3894ec] mt-2.5 sm:mt-3">
                  {isAr ? 'اختر الخدمة واحجز في ثوانٍ' : 'Choose a service & book in seconds'}
                </p>
              </div>

              {/* Dynamic Action Buttons for Mobile */}
              {hero?.actionButtons && hero.actionButtons.filter((b) => b.enabled !== false).length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 mt-1 w-full">
                  {hero.actionButtons
                    .filter((b) => b.enabled !== false)
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((btn, idx) => {
                      const resolvedUrl = resolveActionButtonUrl(btn, { activeCategory });
                      if (!resolvedUrl) return null;
                      const label = (isAr ? btn.label : btn.labelEn || btn.label) || 'إجراء';
                      const isExternal = resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://');
                      const isSection = resolvedUrl.startsWith('#');
                      const variant = btn.variant || (idx === 0 ? 'primary' : 'secondary');

                      const btnClass =
                        variant === 'primary'
                          ? 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#0866C6] text-white shadow-xs inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all'
                          : variant === 'outline'
                          ? 'px-3 py-1.5 rounded-xl text-xs font-bold border border-[#0866C6] text-[#0866C6] dark:text-[#3894ec] inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all'
                          : 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all';

                      if (isExternal) {
                        return (
                          <a
                            key={btn.id || idx}
                            href={resolvedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={btnClass}
                          >
                            <span>{label}</span>
                            <ArrowIcon className="w-3 h-3" />
                          </a>
                        );
                      }

                      if (isSection) {
                        return (
                          <a
                            key={btn.id || idx}
                            href={resolvedUrl}
                            className={btnClass}
                            onClick={(e) => {
                              const target = document.querySelector(resolvedUrl);
                              if (target) {
                                e.preventDefault();
                                target.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                          >
                            <span>{label}</span>
                            <ArrowIcon className="w-3 h-3" />
                          </a>
                        );
                      }

                      return (
                        <Link key={btn.id || idx} href={resolvedUrl} className={btnClass}>
                          <span>{label}</span>
                          <ArrowIcon className="w-3 h-3" />
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ======================= TWO DOMINANT PRIMARY CHOICES ======================= */}
      {showServices && (
        <section className="space-y-3">
          <MobileSectionDivider
            icon={Sparkles}
            title={isAr ? 'خدمات كلينزو المتخصصة' : 'Cleanzo Core Services'}
          />
          {/* Side-by-side rounded oval service cards */}
          <div
            className={`grid gap-2.5 sm:gap-4 ${
              activeCategories.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2'
            }`}
          >
            {activeCategories.length > 0 ? (
              activeCategories.map((cat, idx) => {
                const isCar = cat.slug === 'car';
                const isHome = cat.slug === 'home';
                const imageSrc =
                  cat.image ||
                  branding?.heroImages?.[cat.slug as 'car' | 'home'] ||
                  (isCar ? '/brand/zo/cleanzo-van-hero.png' : '');

                const linkHref = isCar ? '/services/car' : isHome ? '/services/home' : `/services?category=${cat.slug}`;

                const badgeText = isCar
                  ? isAr
                    ? 'متنقل 🚐'
                    : 'Mobile'
                  : isHome
                  ? isAr
                    ? 'بخار 140° 🧼'
                    : '140° Steam'
                  : isAr
                  ? 'احترافي ✨'
                  : 'Pro ✨';

                const badgeBg = isCar ? 'bg-[#F0444C]' : isHome ? 'bg-[#0866C6]' : 'bg-emerald-600';

                const titleText = isAr ? cat.name : cat.nameEn || cat.name;
                const subtitleText = (isAr ? cat.description : cat.descriptionEn || cat.description) || '';

                return (
                  <div
                    key={cat.id || cat.slug || idx}
                    className="p-1 sm:p-2 bg-transparent border-0 shadow-none flex flex-col justify-between items-center text-center group"
                  >
                    {/* Clean Circular Image Presentation — 100% Round, No Borders, No Background Boxes */}
                    <div
                      onClick={() => openBookingForCategory(cat.slug || cat.id || 'car')}
                      className="pt-1 pb-2 px-1 flex items-center justify-center cursor-pointer"
                    >
                      <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-transparent">
                        {imageSrc ? (
                          <CleanzoImage
                            src={imageSrc}
                            alt={titleText}
                            fit="cover"
                            position="center"
                            containerClassName="rounded-full !bg-transparent"
                            className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-sky-500/10 text-[#0866C6] dark:text-[#3894ec] rounded-full">
                            {isCar ? <Car className="w-10 h-10" /> : isHome ? <Home className="w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clean Title & Subtitle Outside the Image — Pure text, no background box */}
                    <div
                      onClick={() => openBookingForCategory(cat.slug || cat.id || 'car')}
                      className="text-center px-1 pb-2 cursor-pointer"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {titleText}
                      </h3>
                      {subtitleText && (
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-0.5">
                          {subtitleText}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="w-full px-1 pt-1">
                      <button
                        type="button"
                        onClick={() => openBookingForCategory(cat.slug || cat.id || 'car')}
                        style={{ backgroundColor: 'var(--cleanzo-blue)' }}
                        className="w-full py-2.5 px-3 rounded-full text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition-transform whitespace-nowrap"
                      >
                        <span>{isAr ? 'حجز سريع' : 'Quick Booking'}</span>
                        <ArrowIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
        </section>
      )}

      {/* ======================= OFFERS ======================= */}
      {showOffers && (
        <section className="space-y-3 text-start">
          <MobileSectionDivider
            icon={Flame}
            title={isAr ? 'العروض والباقات الحصرية' : 'Exclusive Offers'}
            actionHref="/offers"
            actionLabel={isAr ? 'عرض الكل' : 'View All'}
            dotColor="bg-[#F0444C]"
            iconColor="text-[#F0444C]"
          />

          <div className="grid grid-cols-1 gap-2.5">
            {activeOffers.slice(0, 2).map((offer) => (
              <div
                key={offer.id}
                className="p-3.5 rounded-xl bg-white dark:bg-[#082845] border border-slate-200/90 dark:border-[#133B61] shadow-2xs flex items-center justify-between gap-3 text-start"
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#F0444C] text-white">
                    {offer.badge}
                  </span>
                  <h4 className="text-xs font-bold text-[#07345C] dark:text-white truncate">
                    {isAr ? offer.title : offer.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    كود الخصم: <span className="font-mono font-bold text-[#0866C6]">{offer.code}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openBookingForCategory(offer.category || 'car')}
                  className="px-3 py-1.5 rounded-lg bg-[#0866C6] hover:bg-[#06529E] active:scale-95 text-white text-xs font-bold shrink-0 shadow-2xs transition-all"
                >
                  احجز بالعرض
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ======================= RECENT WORKS (BEFORE & AFTER) ======================= */}
      {showGallery && featuredBeforeAfter && (
        <section className="space-y-3 text-start">
          <MobileSectionDivider
            icon={Sparkles}
            title={isAr ? 'أعمالنا قبل وبعد' : 'Before & After Work'}
            actionHref="/gallery"
            actionLabel={isAr ? 'شاهد المعرض' : 'View Gallery'}
          />

          <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800">
            <BeforeAfterSlider
              beforeImage={featuredBeforeAfter.beforeImage}
              afterImage={featuredBeforeAfter.afterImage}
              title={isAr ? featuredBeforeAfter.title : featuredBeforeAfter.titleEn}
            />
          </div>
        </section>
      )}

      {/* ======================= FAQ PREVIEW ======================= */}
      {showFAQ && (
        <section className="space-y-3 text-start">
          <MobileSectionDivider
            icon={HelpCircle}
            title={isAr ? 'الأسئلة الشائعة والإجابات' : 'Frequently Asked Questions'}
            actionHref="/faq"
            actionLabel={isAr ? 'المزيد' : 'More'}
          />

          <FAQAccordion items={previewFaqs} />
        </section>
      )}

      {/* ======================= CONTACT / SUPPORT ======================= */}
      {showContact && (
        <section className="space-y-3 text-start">
          <MobileSectionDivider
            icon={PhoneCall}
            title={isAr ? 'المساعدة والدعم الفوري' : 'Help & Customer Support'}
            dotColor="bg-emerald-500"
            iconColor="text-emerald-500"
          />

          <div className="p-4 rounded-2xl bg-white dark:bg-[#082845] border border-slate-200/90 dark:border-[#133B61] shadow-xs space-y-2.5 text-start">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {isAr
                ? 'فريق خدمة عملاء كلينزو متاح على مدار الساعة للإجابة على استفساراتكم وحجز المواعيد الفورية.'
                : 'Cleanzo customer team is available 24/7 for your inquiries and instant bookings.'}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/${contact?.whatsapp?.replace(/[^0-9]/g, '') || '201012345678'}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
              >
                <MessageCircle className="w-4 h-4" />
                <span>واتساب</span>
              </a>

              <a
                href={`tel:${contact?.phone || '+201012345678'}`}
                className="py-2.5 px-3 rounded-xl bg-[#0866C6] hover:bg-[#06529E] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
              >
                <PhoneCall className="w-4 h-4" />
                <span>اتصال هاتفي</span>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ======================= CUSTOMER REVIEWS ======================= */}
      {showReviews && displayReviews.length > 0 && (
        <section className="space-y-3 text-start">
          <MobileSectionDivider
            icon={Star}
            title={isAr ? 'آراء وتقييمات العملاء' : 'Customer Reviews'}
            actionHref="/reviews"
            actionLabel={isAr ? 'جميع التقييمات' : 'All Reviews'}
            dotColor="bg-amber-500"
            iconColor="text-amber-500 fill-amber-500"
          />

          <div className="space-y-2">
            {displayReviews.slice(0, 3).map((review) => (
              <div
                key={review.id}
                className="p-3 rounded-xl bg-white dark:bg-[#082845] border border-slate-200/90 dark:border-[#133B61] shadow-2xs space-y-1.5 text-start"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {review.avatar ? (
                      <img src={review.avatar} alt={review.customerName} className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#0866C6]/10 dark:bg-[#0866C6]/20 text-[#0866C6] dark:text-[#3894ec] font-black text-xs flex items-center justify-center">
                        {review.customerName?.charAt(0) || 'C'}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-xs text-[#07345C] dark:text-white block">{review.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{isAr ? review.serviceName : (review.serviceNameEn || review.serviceName)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: review.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  "{review.comment}"
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Booking Bottom Sheet */}
      <QuickBookingBottomSheet
        isOpen={bookingSheetOpen}
        onClose={() => setBookingSheetOpen(false)}
        initialCategory={activeCategory}
      />
    </div>
  );
}
