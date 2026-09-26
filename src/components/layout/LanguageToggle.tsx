'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
  compact?: boolean;
  className?: string;
}

export function LanguageToggle({ compact = false, className }: LanguageToggleProps = {}) {
  const { locale, toggleLocale } = useLocaleStore();

  return (
    <button
      onClick={toggleLocale}
      title={locale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
      aria-label="Toggle language"
      className={cn(
        compact
          ? 'inline-flex items-center justify-center gap-1 px-1.5 h-7.5 sm:h-8 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all'
          : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs',
        className
      )}
    >
      <Globe className={cn('text-sky-500 shrink-0', compact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5')} />
      {compact ? (
        <span className="text-[10.5px] font-black uppercase text-slate-700 dark:text-slate-200">
          {locale === 'ar' ? 'EN' : 'ع'}
        </span>
      ) : (
        <span>{locale === 'ar' ? 'English' : 'عربي'}</span>
      )}
    </button>
  );
}
