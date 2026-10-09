import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'aqua' | 'success' | 'warning' | 'neutral';
}

export function Badge({ className, variant = 'primary', children, ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-[#EAF8FC] text-[#0866C6] dark:bg-[#072540] dark:text-[#38BDF8] border border-[#0866C6]/20 dark:border-[#0866C6]/40 font-semibold',
    secondary: 'bg-[#F6F8FA] text-[#07345C] dark:bg-[#0A2E50] dark:text-[#F6F8FA] border border-[#DDE7EC] dark:border-[#133B61] font-semibold',
    accent: 'bg-[#FEECEE] text-[#F0444C] dark:bg-[#380C10] dark:text-[#F87176] border border-[#F0444C]/25 dark:border-[#F0444C]/40 font-bold',
    aqua: 'bg-[#EAF8FC] text-[#25B8E6] dark:bg-[#082845] dark:text-[#25B8E6] border border-[#25B8E6]/30 font-semibold',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold',
    neutral: 'bg-[#F6F8FA] text-[#60717C] dark:bg-[#072540] dark:text-[#94A7BF] border border-[#DDE7EC] dark:border-[#133B61] font-normal',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs tracking-wide transition-colors font-sans',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
