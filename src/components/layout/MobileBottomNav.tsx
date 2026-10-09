'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Sparkles,
  Calendar,
  Tag,
  User,
  Repeat,
  Crown,
  ArrowLeft,
  ArrowRight,
  X,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useBookingStore } from '@/store/useBookingStore';
import { cn } from '@/lib/utils';

interface MobileNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  isActive: boolean;
  badge?: string | number;
  badgeColor?: string;
  isCenterBooking?: boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const orders = useOrderStore((s) => s.orders);
  const mobileSettings = useSettingsStore((s) => s.settings.mobileExperience);
  const isSectionVisible = useCMSStore((s) => s.isSectionVisible);

  // Booking Type Selector Modal state (Service vs Subscription)
  const [showBookingChoiceModal, setShowBookingChoiceModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal when route changes
  useEffect(() => {
    setShowBookingChoiceModal(false);
  }, [pathname]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showBookingChoiceModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showBookingChoiceModal]);

  // Do not render on admin pages or if disabled in settings
  if (pathname?.startsWith('/admin') || mobileSettings?.enableBottomNavigation === false) {
    return null;
  }

  // Active orders count for logged in user badge
  const userOrdersCount = isAuthenticated && user
    ? orders.filter((o) => o.userId === user.id && o.status !== 'completed' && o.status !== 'cancelled').length
    : 0;

  // Symmetrical, perfectly balanced 5-item mobile navigation bar with central action button
  const allNavItems: MobileNavItem[] = [
    {
      id: 'home',
      label: isAr ? 'الرئيسية' : 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      id: 'services',
      label: isAr ? 'الخدمات' : 'Services',
      href: '/services',
      icon: Sparkles,
      isActive: pathname.startsWith('/services'),
    },
    {
      id: 'booking',
      label: isAr ? 'احجز الآن' : 'Book',
      href: '#',
      icon: Calendar,
      isCenterBooking: true,
      isActive: pathname.startsWith('/booking') || pathname.startsWith('/subscriptions'),
    },
    {
      id: 'offers',
      label: isAr ? 'العروض' : 'Offers',
      href: '/offers',
      icon: Tag,
      badge: isAr ? 'خصم' : 'Sale',
      badgeColor: 'bg-gradient-to-r from-[#F0444C] to-[#ea580c] text-white',
      isActive: pathname.startsWith('/offers'),
    },
    {
      id: 'account',
      label: isAr ? 'حسابي' : 'Account',
      href: isAuthenticated ? '/account' : '/login',
      icon: User,
      badge: userOrdersCount > 0 ? userOrdersCount : undefined,
      badgeColor: 'bg-[#0866C6] text-white',
      isActive: pathname.startsWith('/account') || pathname === '/login' || pathname === '/register',
    },
  ];

  const navItems = React.useMemo(() => {
    if (!mounted) return allNavItems;
    return allNavItems.filter((item) => {
      // Home, Account, and Booking are always core accessible navigation
      if (item.id === 'home' || item.id === 'account' || item.id === 'booking') {
        return true;
      }
      return isSectionVisible(item.id);
    });
  }, [allNavItems, mounted, isSectionVisible]);

  const handleSelectOption = (route: string) => {
    setShowBookingChoiceModal(false);
    if (route === '/booking') {
      useBookingStore.getState().startNewBooking();
    }
    router.push(route);
  };

  return (
    <>
      {/* Booking Choice Bottom Sheet / Popup Modal */}
      {showBookingChoiceModal && (
        <div
          dir={direction}
          className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden select-none animate-in fade-in duration-200"
        >
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setShowBookingChoiceModal(false)}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity"
          />

          {/* Bottom Sheet Card */}
          <div
            className={cn(
              'relative z-10 w-full max-w-md mx-auto',
              'bg-white dark:bg-[#07243e] rounded-t-[32px]',
              'border-t border-slate-200/90 dark:border-[#133B61]',
              'shadow-[0_-15px_40px_rgba(0,0,0,0.35)]',
              'p-5 pb-[max(env(safe-area-inset-bottom),20px)]',
              'animate-in slide-in-from-bottom duration-250 ease-out'
            )}
          >
            {/* Top Sheet Drag Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-[#07345C] dark:text-white flex items-center gap-2">
                  <span>{isAr ? 'اختر نوع الحجز' : 'Choose Booking Type'}</span>
                  <Sparkles className="w-4 h-4 text-[#0866C6] dark:text-[#38BDF8]" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAr ? 'حدد ما يناسبك من خيارات كلينزو المميزة' : 'Select your preferred Cleanzo service'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBookingChoiceModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#0d3357] text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#133b61] transition-colors"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Two Distinct Booking Choice Cards */}
            <div className="space-y-3">
              {/* Option 1: Single Service Booking */}
              <button
                type="button"
                onClick={() => handleSelectOption('/booking')}
                className={cn(
                  'w-full p-4 rounded-2xl border text-start transition-all duration-200 cursor-pointer group',
                  'bg-slate-50/80 dark:bg-[#0b2d4c] hover:bg-[#0866C6]/5 dark:hover:bg-[#0e3b64]',
                  'border-slate-200 dark:border-[#133B61] hover:border-[#0866C6]/60 dark:hover:border-[#38BDF8]/60',
                  'shadow-xs hover:shadow-md active:scale-[0.98]'
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0866C6] to-[#0A84FF] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#0866C6]/25 group-hover:scale-105 transition-transform">
                    <Calendar className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#0866C6] dark:group-hover:text-[#38BDF8] transition-colors">
                        {isAr ? 'حجز خدمة فردية' : 'Single Service Booking'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#0866C6]/10 text-[#0866C6] dark:bg-[#0866C6]/20 dark:text-[#38BDF8]">
                        {isAr ? 'حجز فوري' : 'Instant'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-1">
                      {isAr
                        ? 'تنظيف، تلميع أو تعقيم لمرة واحدة بالموعد الذي تحدده'
                        : 'Single car or home detailing on your schedule'}
                    </p>
                  </div>

                  <ArrowIcon className="w-4 h-4 text-slate-400 group-hover:text-[#0866C6] dark:group-hover:text-[#38BDF8] group-hover:translate-x-[-2px] transition-transform shrink-0" />
                </div>
              </button>

              {/* Option 2: Subscription Plans Booking */}
              <button
                type="button"
                onClick={() => handleSelectOption('/subscriptions')}
                className={cn(
                  'w-full p-4 rounded-2xl border text-start transition-all duration-200 cursor-pointer group',
                  'bg-gradient-to-r from-amber-50/60 to-sky-50/60 dark:from-[#132c45] dark:to-[#0f3456]',
                  'border-amber-300/80 dark:border-amber-500/40 hover:border-amber-500',
                  'shadow-xs hover:shadow-md hover:shadow-amber-500/10 active:scale-[0.98]'
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                    <Crown className="w-6 h-6 animate-pulse" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {isAr ? 'باقات الاشتراكات الدورية' : 'Subscription Plans'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                        {isAr ? 'وفر حتى 35% 🔥' : 'Save 35% 🔥'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-1">
                      {isAr
                        ? 'جدول زيارات دوري، رصيد زيارات، وكاش باك فوري مع كل زيارة'
                        : 'Scheduled visits, visit balance, and cashback rewards'}
                    </p>
                  </div>

                  <ArrowIcon className="w-4 h-4 text-amber-500 group-hover:translate-x-[-2px] transition-transform shrink-0" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rock-solid, Glassmorphic Bottom Navigation for Mobile */}
      <nav
        aria-label="Cleanzo Navigation"
        className={cn(
          'lg:hidden fixed bottom-0 inset-x-0 z-40',
          'bg-white/94 dark:bg-[#061e35]/96 backdrop-blur-2xl',
          'border-t border-slate-200/90 dark:border-[#133B61]/80',
          'shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.45)]',
          'pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5'
        )}
      >
        {/* Dynamic Glowing Accent Top Border */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0866C6] via-[#38BDF8] to-transparent opacity-80" />

        <div className="max-w-md mx-auto px-2 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCenter = item.isCenterBooking;

            // Highlighted Elevated Center Booking Button (Opens the 2-in-1 Choice Sheet)
            if (isCenter) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setShowBookingChoiceModal(true)}
                  className="relative -top-3.5 flex flex-col items-center justify-center group active:scale-90 transition-transform duration-200 focus:outline-hidden cursor-pointer"
                >
                  <div
                    className={cn(
                      'w-13 h-13 rounded-2xl flex items-center justify-center text-white',
                      'bg-[#F0444C] hover:bg-[#D9333B]',
                      'shadow-lg shadow-[#F0444C]/35 ring-4 ring-white dark:ring-[#041728]',
                      'animate-glow-pulse group-hover:scale-105 transition-all'
                    )}
                  >
                    <Icon className="w-6 h-6 text-white transition-transform group-hover:rotate-6" />
                  </div>
                  <span className="text-[10px] font-bold mt-1 text-[#F0444C] dark:text-[#FB7185] tracking-tight font-sans">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className="relative flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1.5 rounded-2xl group active:scale-90 transition-transform duration-150 focus:outline-hidden"
              >
                {/* Active Indicator Top Pill with Glow */}
                {item.isActive && (
                  <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-gradient-to-r from-[#0866C6] to-[#38BDF8] shadow-[0_0_8px_rgba(8,102,198,0.8)] animate-in fade-in zoom-in duration-200" />
                )}

                {/* Icon Container with Badge */}
                <div className="relative">
                  <div
                    className={cn(
                      'p-1.5 rounded-xl transition-all duration-200',
                      item.isActive
                        ? 'text-[#0866C6] dark:text-[#3894ec] bg-[#0866C6]/12 dark:bg-[#0866C6]/25 scale-105 shadow-inner'
                        : 'text-slate-600 dark:text-slate-300 group-hover:text-[#07345C] dark:group-hover:text-white'
                    )}
                  >
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </div>

                  {/* Micro Badge for Offers or Account Counter */}
                  {item.badge && (
                    <span
                      className={cn(
                        'absolute -top-1 -end-2 text-[8px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white dark:ring-[#061e35] whitespace-nowrap select-none',
                        item.badgeColor || 'bg-[#F0444C] text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-[10px] font-bold mt-1 tracking-tight truncate max-w-[62px] transition-colors',
                    item.isActive
                      ? 'text-[#0866C6] dark:text-[#3894ec] font-black'
                      : 'text-slate-600 dark:text-slate-300 group-hover:text-[#07345C] dark:group-hover:text-white'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
