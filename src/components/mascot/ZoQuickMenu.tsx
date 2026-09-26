'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Car,
  Home,
  CalendarCheck,
  PackageSearch,
  HelpCircle,
  PhoneCall,
  X,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { cn } from '@/lib/utils';

export interface ZoQuickMenuProps {
  isOpen: boolean;
  onClose: () => void;
  promptMessage?: string;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

interface MenuItem {
  id: string;
  icon: React.ElementType;
  labelAr: string;
  labelEn: string;
  href: string;
  badgeAr?: string;
  badgeEn?: string;
  colorClass: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'car-services',
    icon: Car,
    labelAr: 'خدمات السيارات',
    labelEn: 'Car Services',
    href: '/services/car',
    badgeAr: 'غسيل & تلميع',
    badgeEn: 'Wash & Detail',
    colorClass: 'text-[#0866C6] bg-[#0866C6]/10 dark:bg-[#0866C6]/20',
  },
  {
    id: 'home-services',
    icon: Home,
    labelAr: 'خدمات المنازل',
    labelEn: 'Home Services',
    href: '/services/home',
    badgeAr: 'تنظيف شامل',
    badgeEn: 'Deep Clean',
    colorClass: 'text-[#0866C6] bg-[#0866C6]/10 dark:bg-[#0866C6]/20',
  },
  {
    id: 'booking',
    icon: CalendarCheck,
    labelAr: 'احجز خدمة الآن',
    labelEn: 'Book a Service',
    href: '/booking',
    badgeAr: 'سريع وسهل',
    badgeEn: 'Fast & Easy',
    colorClass: 'text-[#0866C6] bg-[#0866C6]/10 dark:bg-[#0866C6]/20',
  },
  {
    id: 'tracking',
    icon: PackageSearch,
    labelAr: 'متابعة الطلب',
    labelEn: 'Track Order',
    href: '/track',
    colorClass: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
  },
  {
    id: 'faq',
    icon: HelpCircle,
    labelAr: 'مساعدة وأسئلة',
    labelEn: 'Help & FAQ',
    href: '/faq',
    colorClass: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
  },
  {
    id: 'contact',
    icon: PhoneCall,
    labelAr: 'تواصل معنا',
    labelEn: 'Contact Us',
    href: '/contact',
    colorClass: 'text-[#F0444C] bg-[#F0444C]/10 dark:bg-[#F0444C]/20',
  },
];

export function ZoQuickMenu({
  isOpen,
  onClose,
  promptMessage,
  position = 'bottom-right',
  className,
}: ZoQuickMenuProps) {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Auto dismiss after 12 seconds if idle
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 12000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-label={isAr ? 'قائمة زو للمساعدة السريعة' : 'Zo Quick Guide'}
      className={cn(
        'absolute bottom-[105%] z-50 mb-3 w-[270px] sm:w-[290px] rounded-2xl p-3',
        'bg-white/95 dark:bg-[#082845]/95 backdrop-blur-xl',
        'border border-[#0866C6]/30 dark:border-[#133B61]',
        'shadow-[0_16px_40px_rgba(7,52,92,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
        'animate-in fade-in-0 zoom-in-95 duration-200 pointer-events-auto',
        position === 'bottom-right' ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-[#133B61]/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#07345C] to-[#0866C6] flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#07345C] dark:text-white leading-tight">
              {isAr ? 'مساعد Cleanzo الذكي' : 'Cleanzo Smart Guide'}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-300">
              {promptMessage || (isAr ? 'كيف أقدر أساعدك اليوم؟' : 'How can I assist you today?')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          aria-label={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of Shortcuts */}
      <div className="space-y-1">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const label = isAr ? item.labelAr : item.labelEn;
          const badge = isAr ? item.badgeAr : item.badgeEn;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => onClose()}
              className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#0866C6]/10 dark:hover:bg-[#07345C]/50 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110',
                    item.colorClass
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-[#0866C6] dark:group-hover:text-[#3894ec] transition-colors">
                    {label}
                  </div>
                  {badge && (
                    <div className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">
                      {badge}
                    </div>
                  )}
                </div>
              </div>

              <ChevronLeft
                className={cn(
                  'w-3.5 h-3.5 text-slate-400 group-hover:text-[#0866C6] dark:group-hover:text-[#3894ec] transition-transform shrink-0',
                  isAr ? 'group-hover:-translate-x-1' : 'rotate-180 group-hover:translate-x-1'
                )}
              />
            </Link>
          );
        })}
      </div>

      {/* Speech Bubble Arrow pointing to Zo */}
      <div
        className={cn(
          'absolute -bottom-2 w-4 h-4 rotate-45 bg-white/95 dark:bg-[#082845]/95 border-b border-r border-[#0866C6]/30 dark:border-[#133B61]',
          position === 'bottom-right' ? 'right-6' : 'left-6'
        )}
      />
    </div>
  );
}
