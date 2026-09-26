'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Search, CheckCircle2, ArrowRight, ArrowLeft, Building2, Sparkles, Navigation } from 'lucide-react';
import { useLocationStore } from '@/store/useLocationStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { Button } from '@/components/ui/Button';

export function CoverageSection() {
  const { governorates, fetchLocations, isLoading } = useLocationStore();
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const [searchQuery, setSearchQuery] = useState('');

  // Always fetch fresh active locations from backend on mount
  useEffect(() => {
    fetchLocations(false);
  }, [fetchLocations]);

  // Only show active governorates
  const activeGovernorates = useMemo(() => {
    return (governorates || []).filter((g) => g.active !== false);
  }, [governorates]);

  // Filter based on search query
  const filteredGovernorates = useMemo(() => {
    if (!searchQuery.trim()) return activeGovernorates;
    const q = searchQuery.trim().toLowerCase();
    return activeGovernorates.filter((g) => {
      const matchGov = (g.name || '').toLowerCase().includes(q) || (g.nameEn || '').toLowerCase().includes(q);
      const matchCity = (g.cities || []).some(
        (c) => c.active !== false && ((c.name || '').toLowerCase().includes(q) || (c.nameEn || '').toLowerCase().includes(q))
      );
      return matchGov || matchCity;
    });
  }, [activeGovernorates, searchQuery]);

  if (activeGovernorates.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section id="coverage-areas" className="py-20 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-[#0B1120] border-t border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black border border-emerald-500/20">
            <Navigation className="w-3.5 h-3.5" />
            <span>{isAr ? 'نطاق التغطية والخدمة الحية' : 'Live Service Coverage'}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {isAr ? 'أينما كنت في مصر.. أسطول كلينزو يصلك لباب بيتك' : 'Wherever You Are in Egypt, Cleanzo Comes to You'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-100 leading-relaxed font-normal">
            {isAr
              ? 'سياراتنا المتنقلة مجهزة بأحدث محطات البخار الإيطالي والألماني لتصلك أينما كان موقعك فور تأكيد حجزك.'
              : 'Our fully equipped mobile detailing units arrive right at your doorstep across all active governorates.'}
          </p>

          {/* Interactive Search Bar */}
          <div className="max-w-md mx-auto pt-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث عن محافظتك أو مدينتك (مثل: القاهرة، الجيزة، أكتوبر...)' : 'Search city or district...'}
                className="w-full ps-10 pe-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Coverage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-start">
          {filteredGovernorates.map((gov) => {
            const activeCities = (gov.cities || []).filter((c) => c.active !== false);

            return (
              <div
                key={gov.id}
                className="group relative rounded-3xl p-6 bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top Governorate Title & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {isAr ? gov.name : (gov.nameEn || gov.name)}
                        </h3>
                        {gov.nameEn && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {gov.nameEn}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isAr ? 'تغطية فورية' : 'Covered'}</span>
                    </span>
                  </div>

                  {/* Cities Pills */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      {isAr ? 'المدن والمناطق المخدومة:' : 'Covered Cities & Zones:'}
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {activeCities.length > 0 ? (
                        activeCities.map((city) => (
                          <span
                            key={city.id}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/60 dark:border-slate-700/60"
                          >
                            {isAr ? city.name : (city.nameEn || city.name)}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">
                          {isAr ? 'كافة أنحاء المحافظة' : 'Entire Governorate'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Booking CTA */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link href={`/booking?gov=${encodeURIComponent(gov.id)}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between rounded-xl font-bold group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all text-xs"
                    >
                      <span>{isAr ? `احجز خدمتك في ${gov.name}` : `Book in ${gov.nameEn || gov.name}`}</span>
                      <ArrowIcon className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredGovernorates.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {isAr ? `لم يتم العثور على منطقة مطابقة لـ "${searchQuery}"` : `No coverage areas matching "${searchQuery}"`}
            </p>
            <p className="text-xs text-slate-400">
              {isAr ? 'تواصل معنا مباشرة عبر واتساب لطلب خدمة خاصة في منطقتك.' : 'Contact us via WhatsApp for custom area requests.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
