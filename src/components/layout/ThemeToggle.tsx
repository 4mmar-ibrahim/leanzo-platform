'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

export function ThemeToggle({ className, iconClassName }: ThemeToggleProps = {}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { locale } = useLocaleStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn('w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse', className)} />;
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getIcon = () => {
    const iconCls = cn('h-4 w-4', iconClassName);
    if (theme === 'light') return <Sun className={cn(iconCls, 'text-amber-500')} />;
    if (theme === 'dark') return <Moon className={cn(iconCls, 'text-sky-400')} />;
    return <Laptop className={cn(iconCls, 'text-slate-500 dark:text-slate-400')} />;
  };

  const getLabel = () => {
    if (theme === 'light') return locale === 'ar' ? 'فاتح' : 'Light';
    if (theme === 'dark') return locale === 'ar' ? 'داكن' : 'Dark';
    return locale === 'ar' ? 'تلقائي' : 'System';
  };

  return (
    <button
      onClick={cycleTheme}
      title={getLabel()}
      aria-label="Toggle theme"
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#DDE7EC] dark:border-[#133B61] bg-white dark:bg-[#072540] text-[#162631] dark:text-[#F6F8FA] hover:bg-[#EAF8FC] dark:hover:bg-[#082845] transition-colors shadow-2xs font-sans',
        className
      )}
    >
      {getIcon()}
    </button>
  );
}
