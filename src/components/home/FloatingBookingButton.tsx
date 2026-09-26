'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';

interface FloatingBookingButtonProps {
  onClick: () => void;
}

export function FloatingBookingButton({ onClick }: FloatingBookingButtonProps) {
  const [visible, setVisible] = useState(false);
  const showSetting = useSettingsStore((s) => s.settings.mobileExperience?.showFloatingBookingButton ?? true);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down more than 120px
      setVisible(window.scrollY > 120);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!showSetting || !visible) return null;

  return (
    <div className="lg:hidden fixed bottom-[76px] end-4 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <button
        type="button"
        onClick={onClick}
        style={{ backgroundColor: 'var(--cleanzo-blue)' }}
        className={cn(
          'flex items-center gap-2.5 px-4 py-3 rounded-full font-black text-xs text-white shadow-xl',
          'hover:brightness-110 active:scale-95 transition-all duration-200 ring-2 ring-white/30 shadow-sky-500/25'
        )}
      >
        <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center animate-pulse">
          <Sparkles className="w-3 h-3 text-white" />
        </span>
        <span className="tracking-wide">احجز الآن</span>
        <Calendar className="w-3.5 h-3.5 opacity-90" />
      </button>
    </div>
  );
}
