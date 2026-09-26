'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useZoStore } from '@/store/useZoStore';
import { ZoMascot } from './ZoMascot';
import { Sparkles, Eye } from 'lucide-react';

export function GlobalZoCompanion() {
  const pathname = usePathname();
  const {
    settings,
    userHidden,
    setUserHidden,
    triggerPageMessage,
  } = useZoStore();

  // If in admin dashboard, do not show customer floating mascot
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdmin || !settings.enabled || userHidden) return;

    // Map current path to page trigger
    if (pathname === '/') {
      triggerPageMessage('home');
    } else if (pathname === '/services') {
      triggerPageMessage('services');
    } else if (pathname.includes('/services/car') || pathname.includes('car')) {
      triggerPageMessage('car');
    } else if (pathname.includes('/services/home') || pathname.includes('home')) {
      triggerPageMessage('home_care');
    } else if (pathname.startsWith('/booking')) {
      triggerPageMessage('booking');
    } else if (pathname.startsWith('/offers')) {
      triggerPageMessage('offers');
    } else if (pathname.startsWith('/faq')) {
      triggerPageMessage('faq');
    } else if (pathname.startsWith('/gallery')) {
      triggerPageMessage('gallery');
    }
  }, [pathname, isAdmin, settings.enabled, userHidden, triggerPageMessage]);

  if (isAdmin || !settings.enabled) {
    return null;
  }

  // If the current page already has a prominent in-page Zo character,
  // do not duplicate him as a floating corner widget. This creates the illusion
  // of ONE living character that travels to different places on every page.
  const hasInPageZo =
    pathname === '/' ||
    pathname === '/services' ||
    pathname.startsWith('/booking') ||
    pathname.startsWith('/offers') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/gallery');

  if (hasInPageZo) {
    return null;
  }

  // If user hid Zo, provide a small, discreet floating pill to unhide him
  if (userHidden) {
    return (
      <div className="fixed bottom-20 lg:bottom-5 end-3 z-30">
        <button
          onClick={() => setUserHidden(false)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-[#07345C]/80 backdrop-blur-md border border-[#0866C6]/30 shadow-md text-[10px] font-bold text-[#0866C6] dark:text-[#3B82F6] hover:bg-[#0866C6] hover:text-white transition-all group"
          title="إظهار زو مرة أخرى"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#F0444C]" />
          <span>إظهار زو</span>
          <Eye className="w-3 h-3 group-hover:scale-110" />
        </button>
      </div>
    );
  }

  return (
    <ZoMascot
      position={settings.defaultPosition || 'bottom-end'}
      size={settings.size || 'md'}
      animation={settings.idleAnimation || 'breathe'}
    />
  );
}
