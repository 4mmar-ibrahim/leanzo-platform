import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'neutral';
}

export function Badge({ className, variant = 'primary', children, ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-[#F0F6FC] text-[#0866C6] dark:bg-[#082845] dark:text-[#7CB5F0] border border-[#0866C6]/20 dark:border-[#0866C6]/40',
    secondary: 'bg-slate-100 text-[#07345C] dark:bg-[#0D3357] dark:text-slate-200 border border-slate-200 dark:border-[#133B61]',
    accent: 'bg-[#FEECEE] text-[#F0444C] dark:bg-[#380C10] dark:text-[#F87176] border border-[#F0444C]/25 dark:border-[#F0444C]/40',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
