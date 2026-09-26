import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'start';
  className?: string;
}

export function SectionHeader({
  badge,
  title,
  subtitle,
  align = 'center',
  className,
}: SectionHeaderProps) {
  const isCenter = align === 'center';

  return (
    <div
      className={cn(
        'max-w-3xl space-y-3',
        isCenter ? 'mx-auto text-center' : 'text-start',
        className
      )}
    >
      {badge && (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-[#0866C6] dark:bg-[#072540] dark:text-[#38BDF8] border border-sky-200/80 dark:border-[#133B61]">
          {badge}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#07345C] dark:text-white tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm sm:text-base text-[#334155] dark:text-slate-100 leading-relaxed max-w-2xl mx-auto font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
}
