'use client';

import React from 'react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatPrice, formatPriceEn } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PriceDisplay({ price, originalPrice, size = 'md', className }: PriceDisplayProps) {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const generalSettings = useSettingsStore((s) => s.settings.general);
  const activeCurrency = isAr
    ? (generalSettings?.currency || 'ج.م')
    : (generalSettings?.currencyEn || 'EGP');

  const sizeClasses = {
    sm: 'text-sm font-bold',
    md: 'text-base font-extrabold',
    lg: 'text-xl font-extrabold',
    xl: 'text-2xl sm:text-3xl font-black',
  };

  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className={cn('flex items-baseline gap-2 flex-wrap', className)}>
      <span className={cn('text-[#0866C6] dark:text-[#2581DE] tracking-tight', sizeClasses[size])}>
        {isAr ? formatPrice(price, activeCurrency) : formatPriceEn(price, activeCurrency)}
      </span>

      {originalPrice && originalPrice > price && (
        <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 line-through">
          {isAr ? formatPrice(originalPrice, activeCurrency) : formatPriceEn(originalPrice, activeCurrency)}
        </span>
      )}

      {discount > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FEECEE] text-[#F0444C] dark:bg-[#380C10] dark:text-[#F87176] border border-[#F0444C]/30">
          -{discount}%
        </span>
      )}
    </div>
  );
}
