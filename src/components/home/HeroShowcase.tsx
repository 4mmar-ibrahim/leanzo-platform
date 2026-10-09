'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Car,
  Home,
  Sparkles,
  ShieldCheck,
  Star,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Flame,
  Zap,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';

export function HeroShowcase() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const [activeTab, setActiveTab] = useState<'both' | 'car' | 'home'>('both');
  const [hoveredCard, setHoveredCard] = useState<'car' | 'home' | null>(null);

  return (
    <div className="relative w-full max-w-xl mx-auto space-y-4 select-none">
      {/* Interactive Mode Pills */}
      <div className="flex items-center justify-center sm:justify-start gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-[#072540]/80 backdrop-blur-md border border-[#DDE7EC] dark:border-[#133B61] shadow-xs w-fit mx-auto sm:mx-0 font-sans">
        <button
          type="button"
          onClick={() => setActiveTab('both')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'both'
              ? 'bg-gradient-to-r from-[#0866C6] to-[#07345C] text-white shadow-md shadow-[#0866C6]/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAr ? 'السيارات والمنازل' : 'Car & Home'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('car')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'car'
              ? 'bg-[#0866C6] text-white shadow-md shadow-[#0866C6]/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Car className="w-3.5 h-3.5 text-sky-400" />
          <span>{isAr ? 'خدمات السيارات' : 'Cars'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'home'
              ? 'bg-[#07345C] text-white shadow-md shadow-[#07345C]/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-[#83AED0]" />
          <span>{isAr ? 'خدمات المنازل' : 'Homes'}</span>
        </button>
      </div>

      {/* Showcase Visual Area */}
      <div className="relative min-h-[440px] sm:min-h-[480px] w-full flex items-center justify-center">
        {/* Glow ambient backgrounds */}
        <div className="absolute -top-10 -start-10 w-64 h-64 bg-[#0866C6]/15 dark:bg-[#0866C6]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -end-10 w-64 h-64 bg-[#07345C]/15 dark:bg-[#07345C]/20 rounded-full blur-3xl pointer-events-none" />

        {/* ================= CARD 1: CAR SERVICES ================= */}
        <div
          onMouseEnter={() => setHoveredCard('car')}
          onMouseLeave={() => setHoveredCard(null)}
          className={`transition-all duration-500 ease-out ${
            activeTab === 'both'
              ? hoveredCard === 'car'
                ? 'z-30 scale-[1.02] shadow-2xl ring-2 ring-sky-500'
                : 'z-20 w-[90%] sm:w-[84%] -translate-y-6 sm:-translate-y-8 start-0'
              : activeTab === 'car'
              ? 'z-30 w-full scale-100'
              : 'hidden'
          } rounded-3xl overflow-hidden border-2 border-white/80 dark:border-slate-800 bg-slate-900 shadow-xl group`}
        >
          <div className="relative h-56 sm:h-64 w-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1000&q=80"
              alt="Car Wash Cleanzo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Category Tag Header */}
            <div className="absolute top-3.5 start-3.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-sky-500 text-white shadow-md">
                <Car className="w-3.5 h-3.5" />
                <span>{isAr ? 'خدمات السيارات' : 'Car Services'}</span>
              </span>
            </div>

            {/* Price & Rating Bottom Pill */}
            <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="font-bold">4.98</span>
                <span className="text-slate-400 text-[10px]">({isAr ? '1,240 تقييم' : '1,240 reviews'})</span>
              </div>

              <div className="bg-sky-500/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white font-black text-xs shadow-md">
                {isAr ? 'يبدأ من 150 ج.م' : 'From 150 EGP'}
              </div>
            </div>
          </div>

          {/* Quick interactive strip */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
              <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
              <span className="truncate">{isAr ? 'تلميع ساطع، تعطير فاخر، حماية الطلاء' : 'Gloss polish, luxury scent, paint shield'}</span>
            </div>
            <Link
              href="/services/car"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline shrink-0 flex items-center gap-1"
            >
              <span>{isAr ? 'استكشف' : 'Explore'}</span>
              <ArrowIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ================= CARD 2: HOME SERVICES ================= */}
        <div
          onMouseEnter={() => setHoveredCard('home')}
          onMouseLeave={() => setHoveredCard(null)}
          className={`transition-all duration-500 ease-out ${
            activeTab === 'both'
              ? hoveredCard === 'home'
                ? 'z-30 scale-[1.02] shadow-2xl ring-2 ring-[#07345C]'
                : 'z-25 w-[92%] sm:w-[86%] translate-y-16 sm:translate-y-20 end-0'
              : activeTab === 'home'
              ? 'z-30 w-full scale-100'
              : 'hidden'
          } rounded-3xl overflow-hidden border-2 border-white/80 dark:border-slate-800 bg-slate-900 shadow-2xl group`}
        >
          <div className="relative h-56 sm:h-64 w-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=80"
              alt="Home Cleaning Cleanzo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Category Tag Header */}
            <div className="absolute top-3.5 start-3.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-[#07345C] text-white shadow-md">
                <Home className="w-3.5 h-3.5" />
                <span>{isAr ? 'خدمات المنازل' : 'Home Services'}</span>
              </span>
            </div>

            {/* Price & Rating Bottom Pill */}
            <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="font-bold">4.96</span>
                <span className="text-slate-400 text-[10px]">({isAr ? '680 تقييم' : '680 reviews'})</span>
              </div>

              <div className="bg-[#07345C]/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white font-black text-xs shadow-md">
                {isAr ? 'يبدأ من 380 ج.م' : 'From 380 EGP'}
              </div>
            </div>
          </div>

          {/* Quick interactive strip */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
              <CheckCircle2 className="w-4 h-4 text-[#0866C6] shrink-0" />
              <span className="truncate">{isAr ? 'تعقيم شامل، غسيل كنب بالبخار، إذابة دهون' : 'Sanitization, sofa steam, kitchen degrease'}</span>
            </div>
            <Link
              href="/services/home"
              className="text-xs font-bold text-[#0866C6] dark:text-[#83AED0] hover:underline shrink-0 flex items-center gap-1"
            >
              <span>{isAr ? 'استكشف' : 'Explore'}</span>
              <ArrowIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Floating Trust Badge: 25% Discount */}
        <div className="absolute -top-3 -end-2 z-40 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 animate-bounce-subtle pointer-events-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-white font-black text-xs shadow-md">
            %
          </div>
          <div className="text-start">
            <p className="text-[11px] font-black text-slate-900 dark:text-white">
              {isAr ? 'خصم 25% فوري' : '25% Instant OFF'}
            </p>
            <p className="text-[9px] text-slate-400">
              {isAr ? 'كود: VIPCAR25 أو HOME20' : 'Code: VIPCAR25'}
            </p>
          </div>
        </div>

        {/* Floating Trust Badge: Satisfaction Guarantee */}
        <div className="absolute -bottom-2 -start-2 z-40 bg-white dark:bg-slate-900 px-3 py-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 pointer-events-none">
          <div className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-[#07345C]/30 text-[#0866C6] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-start">
            <p className="text-[10px] font-black text-slate-900 dark:text-white">
              {isAr ? 'ضمان رضا 100%' : '100% Guaranteed'}
            </p>
            <p className="text-[9px] text-slate-400">
              {isAr ? 'لا تدفع إلا بعد المعاينة' : 'Pay after inspection'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
