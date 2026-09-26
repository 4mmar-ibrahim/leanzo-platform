'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAdminThemeStore } from '@/store/useAdminThemeStore';
import { cn } from '@/lib/utils';

export function AdminThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useAdminThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Sync DOM with saved admin theme on mount
    const saved = localStorage.getItem('cleanzo-admin-theme') as 'light' | 'dark' | null;
    if (saved && (saved === 'light' || saved === 'dark')) {
      document.documentElement.classList.toggle('dark', saved === 'dark');
      document.documentElement.setAttribute('data-admin-theme', saved);
    }
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer select-none shadow-xs',
        isDark
          ? 'bg-[#041728] hover:bg-[#072540] text-amber-300 border-[#133B61]'
          : 'bg-white hover:bg-slate-100 text-[#07345C] border-slate-200/80',
        className
      )}
      title={isDark ? 'تبديل إلى الوضع النهاري للوحة الإدارة' : 'تبديل إلى الوضع الليلي للوحة الإدارة'}
      aria-label="تبديل مظهر لوحة الإدارة"
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="hidden sm:inline text-[11px] font-semibold text-slate-200">الوضع الليلي</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-[#07345C] shrink-0" />
          <span className="hidden sm:inline text-[11px] font-semibold text-slate-700">الوضع النهاري</span>
        </>
      )}
    </button>
  );
}
