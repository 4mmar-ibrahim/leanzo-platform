'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Sparkles,
  Calendar,
  Tag,
  User,
  X,
  HelpCircle,
  Image as ImageIcon,
  Info,
  PhoneCall,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCMSStore } from '@/store/useCMSStore';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { cn } from '@/lib/utils';

interface MobileNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  isActive: boolean;
  badge?: string | number;
  badgeColor?: string;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const orders = useOrderStore((s) => s.orders);
  const mobileSettings = useSettingsStore((s) => s.settings.mobileExperience);
  const sections = useCMSStore((s) => s.sections);
  const isSectionVisible = useCMSStore((s) => s.isSectionVisible);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Do not render on admin pages or if disabled in settings
  if (pathname?.startsWith('/admin') || mobileSettings?.enableBottomNavigation === false) {
    return null;
  }

  // Active orders count for logged in user badge
  const userOrdersCount = isAuthenticated && user
    ? orders.filter((o) => o.userId === user.id && o.status !== 'completed' && o.status !== 'cancelled').length
    : 0;

  // 5 clear, symmetrical mobile navigation items with center primary booking button
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
      href: '/booking',
      icon: Calendar,
      isActive: pathname.startsWith('/booking'),
    },
    {
      id: 'offers',
      label: isAr ? 'العروض' : 'Offers',
      href: '/offers',
      icon: Tag,
      badge: isAr ? 'خصم' : 'Sale',
      badgeColor: 'bg-[#F0444C] text-white',
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = React.useMemo(() => {
    if (!mounted) return allNavItems;
    return allNavItems.filter((item) => {
      if (item.id === 'home' || item.id === 'account') return true;
      return isSectionVisible(item.id);
    });
  }, [allNavItems, mounted, sections, isSectionVisible]);

  return (
    <>
      {/* Rock-solid Fixed Bottom Navigation for Mobile */}
      <nav
        aria-label="Cleanzo Navigation"
        className={cn(
          'lg:hidden fixed bottom-0 inset-x-0 z-40',
          'bg-white dark:bg-[#082845] backdrop-blur-xl',
          'border-t border-slate-200/90 dark:border-[#133B61] shadow-[0_-4px_25px_rgba(0,0,0,0.08)]',
          'pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5'
        )}
      >
        <div className="max-w-md mx-auto px-3 flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCenterBooking = item.id === 'booking';

            if (isCenterBooking) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="relative -top-4 flex flex-col items-center justify-center group active:scale-95 transition-transform focus:outline-hidden"
                >
                  <div
                    className="w-13 h-13 rounded-full flex items-center justify-center text-white bg-[#0866C6] shadow-lg shadow-[#0866C6]/30 ring-4 ring-white dark:ring-[#082845] group-hover:scale-105 transition-transform"
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black mt-1 text-[#0866C6] dark:text-[#3894ec]">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl group active:scale-95 transition-transform focus:outline-hidden"
              >
                {/* Active Indicator Top Pill */}
                {item.isActive && (
                  <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-[#0866C6] shadow-xs" />
                )}

                {/* Icon Container with Badge */}
                <div className="relative">
                  <div
                    className={cn(
                      'p-1.5 rounded-xl transition-all duration-200',
                      item.isActive
                        ? 'text-[#0866C6] dark:text-[#3894ec] bg-[#0866C6]/10 dark:bg-[#0866C6]/20'
                        : 'text-slate-600 dark:text-slate-200 group-hover:text-[#07345C] dark:group-hover:text-white'
                    )}
                  >
                    <Icon className="w-5 h-5 transition-transform group-active:scale-110" />
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        'absolute -top-1 -end-2 text-[8px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white dark:ring-[#082845]',
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
                    'text-[10px] font-bold mt-1 tracking-tight truncate max-w-[64px]',
                    item.isActive
                      ? 'text-[#0866C6] dark:text-[#3894ec]'
                      : 'text-slate-600 dark:text-slate-200'
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
