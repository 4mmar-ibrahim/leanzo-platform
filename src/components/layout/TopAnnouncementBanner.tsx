'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { autoTranslate } from '@/lib/i18n/autoTranslate';

export function TopAnnouncementBanner() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const bannerSettings = useSettingsStore((s) => s.settings.branding?.topBanner);
  const mobileSettings = useSettingsStore((s) => s.settings.mobileExperience);
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  // Check persistent dismissal from sessionStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('cleanzo_top_banner_dismissed') === 'true') {
        setDismissed(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('cleanzo_top_banner_dismissed', 'true');
      }
    } catch {}
  };

  if (dismissed || !bannerSettings?.enabled || pathname?.startsWith('/admin')) return null;

  const getBannerBackground = () => {
    if (!bannerSettings?.bgColor) return 'linear-gradient(90deg, #07345C 0%, #0866C6 100%)';
    const bg = bannerSettings.bgColor.trim();
    if (bg.startsWith('#') || bg.startsWith('rgb')) return bg;
    if (bg.includes('linear-gradient') || bg.includes('radial-gradient')) return bg;
    // Safe brand gradient fallback for Tailwind gradient tokens
    return 'linear-gradient(90deg, #07345C 0%, #0866C6 100%)';
  };

  const bannerText = (isAr ? bannerSettings.text : (bannerSettings.textEn || autoTranslate(bannerSettings.text, 'en'))) || '';
  const badgeText = bannerSettings.discountBadge
    ? (isAr ? bannerSettings.discountBadge : autoTranslate(bannerSettings.discountBadge, 'en'))
    : (isAr ? 'خصم 20%' : '20% OFF');

  return (
    <aside
      aria-label="Top Announcement Banner"
      style={{
        background: getBannerBackground(),
      }}
      className={`relative z-50 text-white py-1.5 sm:py-2 px-2.5 sm:px-4 text-[11px] sm:text-xs font-bold border-b border-black/15 dark:border-[#133B61] shadow-xs transition-all ${
        mobileSettings?.showBannerOnMobile === false ? 'hidden lg:block' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Discount Badge on the start side */}
        <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] sm:text-[11px] font-black tracking-wider uppercase shrink-0 animate-pulse select-none whitespace-nowrap">
          {badgeText}
        </span>

        {/* Continuous Smooth Marquee Ticker moving to the RIGHT infinitely */}
        <Link
          href={bannerSettings.link || '/booking'}
          className="flex-1 overflow-hidden relative block min-w-0 select-none py-0.5 group"
          title={bannerText}
        >
          <div
            dir="ltr"
            className="flex w-max animate-cleanzo-marquee-right group-hover:[animation-play-state:paused] active:[animation-play-state:paused]"
          >
            {/* Cycle 1 */}
            <div className="flex items-center shrink-0">
              {[0, 1, 2, 3].map((idx) => (
                <div key={`c1-${idx}`} className="inline-flex items-center shrink-0 px-3 sm:px-4" dir={direction}>
                  <span className="text-white/95 group-hover:text-white font-bold whitespace-nowrap transition-colors">
                    {bannerText}
                  </span>
                  <span className="text-white/40 text-[10px] ms-3 sm:ms-4 select-none">✦</span>
                </div>
              ))}
            </div>

            {/* Cycle 2 (Exact identical clone for continuous smooth loop with zero gaps) */}
            <div className="flex items-center shrink-0" aria-hidden="true">
              {[0, 1, 2, 3].map((idx) => (
                <div key={`c2-${idx}`} className="inline-flex items-center shrink-0 px-3 sm:px-4" dir={direction}>
                  <span className="text-white/95 group-hover:text-white font-bold whitespace-nowrap transition-colors">
                    {bannerText}
                  </span>
                  <span className="text-white/40 text-[10px] ms-3 sm:ms-4 select-none">✦</span>
                </div>
              ))}
            </div>
          </div>
        </Link>

        {/* Action Link Button */}
        <Link
          href={bannerSettings.link || '/booking'}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] sm:text-xs font-black transition-all shrink-0 active:scale-95 whitespace-nowrap"
        >
          <span>{isAr ? 'احجز الآن' : 'Claim Offer'}</span>
          <ArrowIcon className="w-3 h-3" />
        </Link>

        {/* Dismiss / Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0 cursor-pointer"
          aria-label={isAr ? 'إغلاق أو إخفاء الشريط' : 'Close banner'}
          title={isAr ? 'إغلاق الشريط' : 'Close banner'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Professional Brand Horizon Divider Line */}
      <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#38BDF8]/70 dark:via-sky-400 to-transparent pointer-events-none" />
    </aside>
  );
}
