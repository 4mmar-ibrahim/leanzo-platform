'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Car,
  Home,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  Award,
  Sparkles,
  Tag,
  Star,
  Check,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useZoStore } from '@/store/useZoStore';
import { Button } from '@/components/ui/Button';
import { normalizeMediaUrl } from '@/lib/utils';
import { resolveActionButtonUrl } from '@/lib/actionButtonUtils';

export function HeroSection() {
  const { locale, direction } = useLocaleStore();
  const { setCategory } = useBookingStore();
  const heroContent = useCMSStore((s) => s.hero);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const branding = useSettingsStore((s) => s.settings.branding);
  const speak = useZoStore((s) => s.speak);
  const heroPlacement = useZoStore((s) => s.settings.pagePlacements?.home_hero);
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  React.useEffect(() => {
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  const [activeCategory, setActiveCategory] = useState<'car' | 'home'>('car');

  const handleCategorySwitch = (cat: 'car' | 'home') => {
    setActiveCategory(cat);
    setCategory(cat);

    // Contextual Zo reaction
    if (cat === 'car') {
      speak('اختيار ممتاز 😎 نشوف عربيتك محتاجة إيه؟', 'confident', 'sunglasses', 4500);
    } else {
      speak('ولا يهمك... هنرجع البيت يلمع ✨', 'happy', 'sitting', 4500);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#EAF8FC] dark:bg-[#041728] text-[#162631] dark:text-[#F6F8FA] pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-[#DDE7EC] dark:border-[#133B61] transition-colors duration-300 font-sans">
      {/* Subtle clean atmospheric lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F6F8FA]/60 via-transparent to-transparent dark:from-slate-900/40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          {/* ================= RIGHT SIDE: BRAND HEADLINE & CONTROLS ================= */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-7 text-start order-1">

            {/* Brand Eyebrow with Mini Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#EAF8FC] dark:bg-[#072540] border border-[#0866C6]/20 dark:border-[#0866C6]/40 text-xs font-bold text-[#0866C6] dark:text-[#38BDF8] shadow-2xs font-sans">
              <span className="w-2 h-2 rounded-full bg-[#0866C6] dark:bg-[#38BDF8] animate-pulse" />
              <span>
                {heroContent.badge ||
                  (isAr ? 'CLEANZO • خدمات تنظيف احترافية' : 'CLEANZO • Professional Cleaning Services')}
              </span>
            </div>

            {/* Powerful Dynamic Headline with Cleanzo Blue Highlight */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black text-[#07345C] dark:text-white tracking-tight leading-[1.15]">
                {isAr ? (
                  heroContent.headline ? (
                    heroContent.headline.includes('وبمساحتك') ? (
                      <>
                        <span className="text-[#07345C] dark:text-white">{heroContent.headline.replace('وبمساحتك', '').trim()}</span>{' '}
                        <span className="text-[#0866C6] dark:text-[#38BDF8] block sm:inline">
                          وبمساحتك
                        </span>
                      </>
                    ) : (
                      <span className="text-[#07345C] dark:text-white">{heroContent.headline}</span>
                    )
                  ) : (
                    <>
                      <span className="text-[#07345C] dark:text-white">نظافة تليق بسيارتك</span>{' '}
                      <span className="text-[#0866C6] dark:text-[#38BDF8] block sm:inline">
                        وبمساحتك
                      </span>
                    </>
                  )
                ) : (
                  <span className="text-[#07345C] dark:text-white">{heroContent.headlineEn || 'Cleanliness Befitting Your Car & Space'}</span>
                )}
              </h1>
            </div>

            {/* Clean Value Proposition */}
            <p className="text-base sm:text-lg text-[#60717C] dark:text-[#94A7BF] font-normal leading-relaxed max-w-[500px]">
              {isAr
                ? (heroContent.description || 'خدمات غسيل وتلميع متنقلة للسيارات وتنظيف عميق بالبخار للمنازل بأحدث المعدات الألمانية والمواد الآمنة حتى باب بيتك.')
                : (heroContent.descriptionEn || heroContent.description || 'Mobile car detailing and deep home steam sanitation with professional German equipment right at your doorstep.')}
            </p>

            {/* Service Category Switcher: Cleanzo Brand Tokens */}
            <div className="space-y-2 w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#60717C] dark:text-[#94A7BF]">
                {isAr ? 'اختر فئة الخدمة المطلوبة' : 'Choose Your Service'}
              </span>

              <div className="flex sm:inline-flex w-full sm:w-auto p-1.5 rounded-full bg-[#F6F8FA] dark:bg-[#072540] border border-[#DDE7EC] dark:border-[#133B61] shadow-2xs gap-1">
                <button
                  type="button"
                  onClick={() => handleCategorySwitch('car')}
                  style={{ backgroundColor: activeCategory === 'car' ? 'var(--cleanzo-blue)' : undefined }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 sm:gap-2.5 px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                    activeCategory === 'car'
                      ? 'text-white shadow-md'
                      : 'text-slate-700 dark:text-white hover:text-[#0866C6] dark:hover:text-[#38BDF8]'
                  }`}
                >
                  <Car className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{isAr ? 'خدمات السيارات 🚗' : 'Car Services'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategorySwitch('home')}
                  style={{ backgroundColor: activeCategory === 'home' ? 'var(--cleanzo-blue)' : undefined }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 sm:gap-2.5 px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                    activeCategory === 'home'
                      ? 'text-white shadow-md'
                      : 'text-slate-700 dark:text-white hover:text-[#0866C6] dark:hover:text-[#38BDF8]'
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{isAr ? 'خدمات المنازل 🏡' : 'Home Care'}</span>
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2 w-full flex-wrap">
              {heroContent.actionButtons && Array.isArray(heroContent.actionButtons) && heroContent.actionButtons.length > 0 ? (
                heroContent.actionButtons
                  .filter((b) => b.enabled !== false)
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((btn, idx) => {
                    const resolvedUrl = resolveActionButtonUrl(btn, { activeCategory });
                    if (!resolvedUrl) return null; // Prevent broken links, '#' or 'undefined'

                    const label = (isAr ? btn.label : btn.labelEn || btn.label) || 'إجراء';
                    const isExternal =
                      btn.destinationType === 'external' ||
                      resolvedUrl.startsWith('http://') ||
                      resolvedUrl.startsWith('https://');
                    const isSection = resolvedUrl.startsWith('#');

                    const variant = btn.variant || (idx === 0 ? 'primary' : 'secondary');

                    const commonClasses =
                      variant === 'primary'
                        ? 'w-full sm:w-auto px-7 py-3.5 rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 text-white bg-[#0866C6] hover:bg-[#06529E] active:bg-[#054382] shadow-md shadow-[#0866C6]/25 hover:shadow-xl hover:shadow-[#0866C6]/30 active:scale-[0.98] transition-all text-center font-sans'
                        : variant === 'outline'
                        ? 'w-full sm:w-auto px-6 py-3.5 border-2 border-[#0866C6] bg-transparent hover:bg-[#EAF8FC] dark:hover:bg-[#082845] text-[#0866C6] dark:text-[#38BDF8] rounded-full font-bold text-sm flex items-center justify-center transition-all shadow-2xs text-center font-sans'
                        : 'w-full sm:w-auto px-6 py-3.5 border border-[#DDE7EC] dark:border-[#133B61] bg-white dark:bg-[#072540] hover:bg-[#EAF8FC] dark:hover:bg-[#082845] text-[#07345C] dark:text-white rounded-full font-semibold text-sm flex items-center justify-center transition-all shadow-2xs text-center font-sans';

                    const style = variant === 'primary' ? { backgroundColor: 'var(--cleanzo-blue)' } : undefined;

                    if (isExternal) {
                      return (
                        <a
                          key={btn.id || idx}
                          href={resolvedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={style}
                          className={commonClasses}
                        >
                          <span>{label}</span>
                          <ArrowIcon className="w-4 h-4 shrink-0" />
                        </a>
                      );
                    }

                    if (isSection) {
                      return (
                        <a
                          key={btn.id || idx}
                          href={resolvedUrl}
                          style={style}
                          className={commonClasses}
                          onClick={(e) => {
                            const targetEl = document.querySelector(resolvedUrl);
                            if (targetEl) {
                              e.preventDefault();
                              targetEl.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        >
                          <span>{label}</span>
                          <ArrowIcon className="w-4 h-4 shrink-0" />
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={btn.id || idx}
                        href={resolvedUrl}
                        style={style}
                        className={commonClasses}
                      >
                        <span>{label}</span>
                        {variant === 'primary' && <ArrowIcon className="w-4 h-4 shrink-0" />}
                      </Link>
                    );
                  })
              ) : (
                <>
                  <Link
                    href={heroContent.primaryCtaLink || `/booking?category=${activeCategory}`}
                    style={{ backgroundColor: 'var(--cleanzo-blue)' }}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-full font-black text-sm sm:text-base flex items-center justify-center gap-2.5 text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all text-center"
                  >
                    <span>
                      {heroContent.primaryCtaText ||
                        (isAr ? (branding?.ctaText || 'احجز خدمتك الآن') : (branding?.ctaTextEn || 'Book Your Service Now'))}
                    </span>
                    <ArrowIcon className="w-4 h-4 shrink-0" />
                  </Link>

                  <Link
                    href={heroContent.secondaryCtaLink || (activeCategory === 'car' ? '/services/car' : '/services/home')}
                    className="w-full sm:w-auto px-6 py-3.5 border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 hover:bg-[#0866C6]/5 dark:hover:bg-slate-800 text-[#07345C] dark:text-white rounded-full font-bold text-sm flex items-center justify-center transition-all shadow-2xs text-center"
                  >
                    <span>{heroContent.secondaryCtaText || (isAr ? 'استكشف الخدمات' : 'Explore Services')}</span>
                  </Link>
                </>
              )}
            </div>

            {/* Special Promo Badge */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-white pt-1">
              <span className="w-5 h-5 rounded-md bg-[#0866C6]/10 dark:bg-[#0866C6]/25 text-[#0866C6] dark:text-[#38BDF8] flex items-center justify-center shrink-0 border border-[#0866C6]/20 dark:border-[#38BDF8]/30">
                <Tag className="w-3.5 h-3.5" />
              </span>
              <span>
                {heroContent.announcement ||
                  (isAr ? 'خصم يصل إلى 25% على باقات الموسم الممتازة' : 'Up to 25% OFF on premium seasonal packages')}
              </span>
            </div>

            {/* Trust Badges Row */}
            <div className="pt-5 border-t border-slate-200 dark:border-[#133B61] flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#07345C] dark:text-white">
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#082845] text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-[#133B61] flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>{isAr ? 'ضمان كلينزو 100%' : '100% Guaranteed'}</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-extrabold text-[#07345C] dark:text-white">
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#082845] text-slate-700 dark:text-white border border-slate-200 dark:border-[#133B61] flex items-center justify-center">
                  <Clock className="w-3 h-3" />
                </span>
                <span>{isAr ? 'دقة بالمواعيد' : 'Punctual'}</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-extrabold text-[#07345C] dark:text-white">
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#082845] text-slate-700 dark:text-white border border-slate-200 dark:border-[#133B61] flex items-center justify-center">
                  <Award className="w-3 h-3" />
                </span>
                <span>{isAr ? 'معدات إيطالية معتمدة' : 'Italian Steam Rigs'}</span>
              </div>
            </div>

          </div>

          {/* ================= LEFT SIDE: CLEANZO VEHICLE LIVERY & ZO SHOWCASE ================= */}
          <div className="lg:col-span-6 relative order-2">
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none space-y-4">

              {/* Main Cinematic Visual Frame */}
              <div className="relative h-[380px] sm:h-[450px] w-full rounded-[32px] overflow-hidden bg-slate-900 border-2 border-slate-200 dark:border-[#133B61] shadow-2xl transition-all duration-500 group">
                
                {/* Visual Image */}
                <img
                  src={
                    activeCategory === 'car'
                      ? (normalizeMediaUrl(branding?.heroImages?.car) || heroContent.carImage || heroContent.image || '/brand/zo/cleanzo-van-hero.png')
                      : (normalizeMediaUrl(branding?.heroImages?.home) || heroContent.homeImage || heroContent.image || '/brand/zo/cleanzo-van-hero.png')
                  }
                  alt={activeCategory === 'car' ? 'Cleanzo Mobile Car Detailing' : 'Cleanzo Home Steam Cleaning'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Subtle vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#041728]/95 via-transparent to-black/20" />



                {/* Bottom Bar: Rating & On-time promise */}
                <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between gap-3">
                  <div className="px-3.5 py-2 rounded-2xl bg-[#082845]/90 backdrop-blur-md border border-white/10 text-white flex items-center gap-2.5 shadow-lg">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="text-start">
                      <p className="text-xs font-black text-white">5.0 / 4.9</p>
                      <p className="text-[10px] text-slate-400">
                        {isAr ? '+2,500 تقييم موثق' : '+2,500 Verified Reviews'}
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-2xl bg-[#082845]/90 backdrop-blur-md border border-white/10 text-white text-xs font-bold shadow-lg hidden sm:flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0866C6]" />
                    <span>{isAr ? 'في موعدك المحدد' : 'On-Time Schedule'}</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
