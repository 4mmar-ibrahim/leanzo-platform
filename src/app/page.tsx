'use client';

import React from 'react';
import Link from 'next/link';
import {
  Car,
  Home,
  Sparkles,
  ShieldCheck,
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Flame,
  CalendarCheck,
  MapPin,
  Smile,
  BadgeCheck,
  User,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useOfferStore } from '@/store/useOfferStore';
import { useCMSStore } from '@/store/useCMSStore';
import { ServiceCard } from '@/components/services/ServiceCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { Button } from '@/components/ui/Button';
import { HeroSection } from '@/components/home/HeroSection';
import dynamic from 'next/dynamic';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CoverageSection } from '@/components/home/CoverageSection';

const MobileHomeExperience = dynamic(
  () => import('@/components/home/MobileHomeExperience').then((mod) => mod.MobileHomeExperience),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 space-y-4 pb-24">
        <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
          <div className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { t, locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const mobileSettings = useSettingsStore((s) => s.settings.mobileExperience);
  const branding = useSettingsStore((s) => s.settings.branding);
  const enableMobileLayout = mobileSettings?.enableMobileLayout ?? true;
  const showHeroOnMobile = mobileSettings?.showHeroOnMobile ?? false;

  const storeServices = useServiceStore((s) => s.services);
  const categories = useServiceStore((s) => s.categories);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const fetchOffers = useOfferStore((s) => s.fetchOffers);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const sections = useCMSStore((s) => s.sections);
  const isSectionVisible = useCMSStore((s) => s.isSectionVisible);
  const storeReviews = useCMSStore((s) => s.reviews);
  const fetchReviews = useCMSStore((s) => s.fetchReviews);

  React.useEffect(() => {
    fetchServices();
    fetchCategories();
    fetchOffers();
    fetchPublishedContent();
    fetchReviews();
  }, [fetchServices, fetchCategories, fetchOffers, fetchPublishedContent, fetchReviews]);

  const activeCategories = React.useMemo(() => {
    return (categories || []).filter((c) => c.active !== false);
  }, [categories]);

  const checkSectionVisible = React.useCallback(
    (key: string) => {
      if (!mounted) return true; // Server and initial client render match identically
      return isSectionVisible(key);
    },
    [mounted, isSectionVisible, sections]
  );

  const displayReviews = React.useMemo(() => {
    const seen = new Set<string>();
    return (storeReviews || []).filter((r) => {
      if (!r || r.visible === false) return false;
      const key = r.id || `${r.customerName}_${r.comment}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [storeReviews]);

  const currentServices = React.useMemo(() => {
    return (storeServices || []).filter(
      (s) => s.available !== false && !(s as any).isArchived
    );
  }, [storeServices]);

  const popularServices = currentServices.filter((s) => s.popular);

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ======================= MOBILE-FIRST APP EXPERIENCE (< 1024px) ======================= */}
      {enableMobileLayout && (
        <div className="block lg:hidden">
          {showHeroOnMobile && checkSectionVisible('hero') && <HeroSection />}
          <MobileHomeExperience />
        </div>
      )}

      {/* ======================= DESKTOP MARKETING EXPERIENCE (>= 1024px) ======================= */}
      <div className={enableMobileLayout ? 'hidden lg:block' : 'block'}>
        {/* ======================= REDESIGNED HERO SECTION ======================= */}
        {checkSectionVisible('hero') && <HeroSection />}

      {/* ======================= SECTION TRANSITION: SERVICES FOCUS ======================= */}
      {checkSectionVisible('services') && activeCategories.length > 0 && (
      <section id="services-selection" className="py-20 bg-white dark:bg-[#082845] border-y border-slate-200/80 dark:border-[#133B61]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <SectionHeader
            title={isAr ? 'اختر الخدمة المناسبة لك' : 'Choose The Right Service For You'}
            subtitle={isAr ? 'تصفح باقات العناية المتكاملة للسيارات والمنازل واحجز موعدك بسهولة' : 'Browse comprehensive packages for your car and home, and book your appointment easily'}
          />

          {/* DYNAMIC FOCUSED SERVICE CARDS */}
          <div
            className={
              activeCategories.length === 1
                ? 'max-w-xl mx-auto'
                : activeCategories.length === 2
                ? 'grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8'
                : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'
            }
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
                    ? 'متنقل بالكامل 🚐'
                    : '100% Mobile Fleet'
                  : isHome
                  ? isAr
                    ? 'بخار فندقي 140° 🧼'
                    : 'Hotel Steam 140°'
                  : isAr
                  ? 'خدمة متخصصة ✨'
                  : 'Specialized Service ✨';

                const badgeBg = isCar ? 'bg-[#F0444C]' : isHome ? 'bg-[#0866C6]' : 'bg-emerald-600';

                const categoryLabel = isAr
                  ? isCar
                    ? '🚗 خدمات السيارات'
                    : isHome
                    ? '🏠 خدمات المنازل'
                    : `✨ ${cat.name}`
                  : isCar
                  ? '🚗 Car Services'
                  : isHome
                  ? '🏠 Home Services'
                  : `✨ ${cat.nameEn || cat.name}`;

                const titleText = isAr ? cat.name : cat.nameEn || cat.name;

                const descText = (isAr ? cat.description : cat.descriptionEn || cat.description) ||
                  (isAr ? 'باقات عناية واحترافية متكاملة بأحدث التقنيات.' : 'Comprehensive professional care packages.');

                const btnText = isAr
                  ? isCar
                    ? 'استكشف باقات السيارات'
                    : isHome
                    ? 'استكشف باقات المنازل'
                    : `استكشف باقات ${cat.name}`
                  : isCar
                  ? 'Explore Car Packages'
                  : isHome
                  ? 'Explore Home Packages'
                  : `Explore ${cat.nameEn || cat.name}`;

                return (
                  <div
                    key={cat.id || cat.slug || idx}
                    className="group relative rounded-[36px] lg:rounded-[44px] overflow-hidden border-2 border-[#0866C6]/20 dark:border-[#133B61] bg-white dark:bg-[#082845] shadow-lg hover:shadow-2xl hover:border-[#0866C6] transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Clean Circular Category Image Presentation — No Overlays */}
                    <div className="pt-8 pb-3 px-6 flex items-center justify-center">
                      <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-4 border-slate-100 dark:border-[#133B61] shadow-xl bg-slate-100 dark:bg-slate-900 shrink-0">
                        <CleanzoImage
                          src={imageSrc}
                          alt={titleText}
                          fit="cover"
                          position="center"
                          className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-700"
                        />
                      </div>
                    </div>

                    {/* Title & Category Label Outside Image */}
                    <div className="px-6 text-center space-y-1">
                      <span className="text-xs font-black uppercase tracking-wider text-[#0866C6] dark:text-[#3894ec]">
                        {categoryLabel}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{titleText}</h3>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between text-start">
                      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-100 leading-relaxed font-normal">
                        {descText}
                      </p>

                      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
                        <Link href={linkHref}>
                          <Button
                            variant={isCar ? 'primary' : 'outline'}
                            size="lg"
                            className="w-full justify-center rounded-full font-black shadow-md py-3.5"
                            style={!isCar ? { borderColor: 'var(--cleanzo-blue)', color: 'var(--cleanzo-blue)' } : undefined}
                          >
                            <span>{btnText}</span>
                            <ArrowIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
        </div>
      </section>
      )}

      {/* ======================= POPULAR SERVICES SECTION ======================= */}
      {checkSectionVisible('services') && popularServices.length > 0 && (
      <section className="py-20 bg-slate-50 dark:bg-[#0B1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <SectionHeader
              align="start"
              badge={isAr ? 'الخيارات المفضلة' : 'Top Rated'}
              title={t.home.popularServices}
              subtitle={t.home.popularServicesSub}
            />
            <Link href="/services">
              <Button variant="outline" size="md">
                <span>{t.services.all}</span>
                <ArrowIcon className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularServices.map((service) => (
              <ServiceCard key={service.id} service={service} featured={true} />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ======================= HOW IT WORKS ======================= */}
      {checkSectionVisible('how_it_works') && (
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <SectionHeader
            badge={isAr ? 'بساطة وسرعة' : 'Easy 4 Steps'}
            title={t.home.howItWorks}
            subtitle={t.home.howItWorksSub}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {[
              { num: '01', title: t.home.step1Title, desc: t.home.step1Desc, icon: Sparkles, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50' },
              { num: '02', title: t.home.step2Title, desc: t.home.step2Desc, icon: CalendarCheck, color: 'text-[#0866C6] bg-sky-50 dark:bg-[#07345C]/30' },
              { num: '03', title: t.home.step3Title, desc: t.home.step3Desc, icon: MapPin, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
              { num: '04', title: t.home.step4Title, desc: t.home.step4Desc, icon: Smile, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' },
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="relative p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 text-start hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${step.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-slate-300 dark:text-slate-700">
                      {step.num}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ======================= STATS BAR ======================= */}
      {checkSectionVisible('stats') && (
      <section className="py-14 bg-gradient-to-r from-[#07345C] via-[#0866C6] to-[#07345C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x md:divide-white/20">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black tracking-tight">+2,500</p>
              <p className="text-xs sm:text-sm font-medium text-sky-100">{isAr ? 'خدمة مكتملة بنجاح' : 'Completed Bookings'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black tracking-tight">+1,800</p>
              <p className="text-xs sm:text-sm font-medium text-sky-100">{isAr ? 'عميل دائم وسعيد' : 'Satisfied Clients'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black tracking-tight">+15</p>
              <p className="text-xs sm:text-sm font-medium text-sky-100">{isAr ? 'خدمة تخصصية معتمدة' : 'Specialized Services'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black tracking-tight">4.9 / 5</p>
              <p className="text-xs sm:text-sm font-medium text-sky-100">{isAr ? 'متوسط تقييم العملاء' : 'Average Client Rating'}</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ======================= WHY CHOOSE CLEANZO ======================= */}
      {checkSectionVisible('whyUs') && (
      <section className="py-20 bg-white dark:bg-[#082845]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <SectionHeader
            badge={isAr ? 'قيمنا ومعاييرنا' : 'Why Cleanzo'}
            title={t.home.whyCleanzo}
            subtitle={t.home.whyCleanzoSub}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: isAr ? 'فريق عمل محترف ومعتمد' : 'Certified Specialists',
                desc: isAr ? 'يخضع جميع الفنيين لتدريب صارم وفحص أمني لضمان أعلى مستويات الأمان والجودة.' : 'Rigorous vetting and intensive training ensure utmost safety and perfection in every visit.',
                icon: BadgeCheck,
                color: 'text-[#0866C6]',
              },
              {
                title: isAr ? 'مواعيد دقيقة بدون تأخير' : 'Guaranteed Punctuality',
                desc: isAr ? 'نلتزم بالموعد الذي تختاره بالدقيقة، مع تتبع حالة الطلب وتحديثات مستمرة.' : 'On-time arrival guarantee with real-time status notifications for zero hassle.',
                icon: Clock,
                color: 'text-[#0866C6]',
              },
              {
                title: isAr ? 'أسعار شفافة بدون مصاريف خفية' : 'Transparent Pricing',
                desc: isAr ? 'السعر الذي تراه في الموقع هو السعر النهائي دون أي مفاجآت أو تكاليف إضافية.' : 'Clear upfront pricing with no hidden equipment fees or surprise charges.',
                icon: ShieldCheck,
                color: 'text-amber-500',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-8 rounded-3xl border border-slate-200/90 dark:border-[#133B61] bg-white dark:bg-[#072540] shadow-xs hover:shadow-md hover:border-[#0866C6]/30 transition-all duration-300 space-y-4 text-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-[#0A2E50] border border-sky-100 dark:border-[#163E66] flex items-center justify-center shadow-2xs">
                    <Icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-[#07345C] dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ======================= COVERAGE AREAS & SERVICE ZONES ======================= */}
      <CoverageSection />

      {/* ======================= TESTIMONIALS ======================= */}
      {checkSectionVisible('reviews') && displayReviews.length > 0 && (
      <section className="py-20 bg-[#F5F8FC] dark:bg-[#041728] border-t border-slate-200/80 dark:border-[#133B61]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <SectionHeader
            badge={isAr ? 'تجارب حقيقية' : 'Testimonials'}
            title={t.home.testimonialsTitle}
            subtitle={t.home.testimonialsSub}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-6 rounded-2xl border border-slate-200/90 dark:border-[#133B61] bg-white dark:bg-[#072540] space-y-4 text-start shadow-xs hover:border-[#0866C6]/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {rev.avatar ? (
                      <img
                        src={rev.avatar}
                        alt={rev.customerName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#0866C6] text-white font-black flex items-center justify-center text-sm shadow-xs border border-white/20 shrink-0">
                        {rev.customerName ? rev.customerName.trim().charAt(0) : <User className="w-5 h-5" />}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-[#07345C] dark:text-white">
                        {isAr ? rev.customerName : rev.customerNameEn || rev.customerName}
                      </h4>
                      <p className="text-[11px] text-[#0866C6] dark:text-[#38BDF8] font-semibold">
                        {isAr ? rev.serviceName : rev.serviceNameEn || rev.serviceName}
                      </p>
                    </div>
                  </div>

                  {/* Rating Stars (Optional) */}
                  {rev.rating !== undefined && rev.rating > 0 ? (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-[#0866C6] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/60">
                      {isAr ? 'تجربة موثقة' : 'Verified'}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                  "{isAr ? rev.comment : rev.commentEn || rev.comment}"
                </p>

                {/* Attached screenshot / image if available */}
                {rev.image && (
                  <div className="pt-2">
                    <img
                      src={rev.image}
                      alt="مرفق الرأي"
                      className="max-h-48 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  {rev.verified !== false ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {isAr ? 'حجز مؤكد' : 'Verified Booking'}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span>{rev.date || (isAr ? 'مؤخراً' : 'Recent')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ======================= FINAL CONVERSION CTA ======================= */}
      {checkSectionVisible('cta') && (
      <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-tr from-[#07345C] via-[#0866C6] to-[#07345C] p-8 sm:p-14 text-center text-white shadow-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'احجز في دقيقتين فقط' : 'Book in 2 minutes'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {t.home.ctaTitle}
            </h2>

            <p className="text-sm sm:text-base text-sky-100 max-w-xl mx-auto leading-relaxed">
              {t.home.ctaSub}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/booking">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl"
                >
                  <span>{t.nav.bookNow}</span>
                  <ArrowIcon className="w-5 h-5 text-sky-600" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/40 text-white hover:bg-white/10"
                >
                  <span>{t.nav.contact}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      )}
      </div>
    </div>
  );
}
