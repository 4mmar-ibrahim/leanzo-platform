'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocaleStore } from '@/store/useLocaleStore';

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

  const bannerText = (isAr ? bannerSettings.text : bannerSettings.textEn) || '';

  return (
    <aside
      aria-label="Top Announcement Banner"
      style={{
        background: getBannerBackground(),
      }}
      className={`relative z-50 text-white py-2 px-3 text-[11px] sm:text-xs font-bold border-b border-black/15 dark:border-[#133B61] shadow-xs transition-all ${
        mobileSettings?.showBannerOnMobile === false ? 'hidden lg:block' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Mobile View: Continuous Smooth Marquee Ticker (text moves so nothing is truncated) */}
        <div className="flex-1 flex sm:hidden items-center gap-2 overflow-hidden min-w-0">
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black tracking-wider uppercase shrink-0 animate-pulse">
            {bannerSettings.discountBadge || (isAr ? 'خصم خاص' : 'Special')}
          </span>

          <Link
            href={bannerSettings.link || '/booking'}
            className="flex-1 overflow-hidden relative block min-w-0 select-none py-0.5"
            title={bannerText}
          >
            {/* Seamless gapless ticker track */}
            <div
              dir="ltr"
              className="flex w-max animate-cleanzo-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused]"
            >
              {/* Cycle 1 */}
              <div className="flex items-center shrink-0">
                {[0, 1, 2].map((idx) => (
                  <div key={`c1-${idx}`} className="inline-flex items-center shrink-0 px-2" dir={direction}>
                    <span className="text-white/95 font-bold whitespace-nowrap">{bannerText}</span>
                    <span className="text-white/40 text-[10px] ms-2 select-none">✦</span>
                  </div>
                ))}
              </div>

              {/* Cycle 2 (Exact identical clone for continuous smooth loop with zero gaps) */}
              <div className="flex items-center shrink-0" aria-hidden="true">
                {[0, 1, 2].map((idx) => (
                  <div key={`c2-${idx}`} className="inline-flex items-center shrink-0 px-2" dir={direction}>
                    <span className="text-white/95 font-bold whitespace-nowrap">{bannerText}</span>
                    <span className="text-white/40 text-[10px] ms-2 select-none">✦</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop View (sm and up): Clean centered display with Action Button */}
        <div className="hidden sm:flex flex-1 items-center justify-center gap-2 text-center overflow-hidden">
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black tracking-wider uppercase shrink-0 animate-pulse">
            {bannerSettings.discountBadge || (isAr ? 'عرض خاص' : 'Special')}
          </span>
          <span className="text-white/95 truncate">
            {bannerText}
          </span>
          <Link
            href={bannerSettings.link || '/booking'}
            className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-white transition-colors shrink-0"
          >
            <span>{isAr ? 'احجز الآن' : 'Claim Offer'}</span>
            <ArrowIcon className="w-3 h-3" />
          </Link>
        </div>

        {/* Dismiss / Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
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
