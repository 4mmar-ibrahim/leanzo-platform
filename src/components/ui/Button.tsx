'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-[#0866C6] hover:bg-[#06529E] active:bg-[#054382] text-white dark:bg-[#38BDF8] dark:hover:bg-[#7DD3FC] dark:text-[#041728] font-bold shadow-xs hover:shadow-md focus:ring-[#0866C6]/40',
      secondary: 'bg-[#07345C] hover:bg-[#052746] active:bg-[#041B2D] text-white dark:bg-[#0D3357] dark:hover:bg-[#113C66] dark:text-[#F8FAFC] shadow-xs focus:ring-[#07345C]/40',
      accent: 'bg-[#F0444C] hover:bg-[#D9333B] active:bg-[#B8242C] text-white shadow-xs hover:shadow-md focus:ring-[#F0444C]/40',
      outline: 'border border-[#CBD5E1] dark:border-[#133B61] hover:bg-[#F0F6FC] dark:hover:bg-[#082845] text-[#07345C] dark:text-[#F8FAFC] focus:ring-[#0866C6]/30',
      ghost: 'text-[#162638] dark:text-[#F8FAFC] hover:bg-[#F0F6FC] dark:hover:bg-[#082845]',
      danger: 'bg-[#F0444C] hover:bg-[#D9333B] active:bg-[#B8242C] text-white shadow-xs focus:ring-[#F0444C]/40',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5 font-semibold',
    };

    const dynamicStyle: React.CSSProperties = {
      ...(variant === 'primary' ? { backgroundColor: 'var(--cleanzo-blue)' } : {}),
      ...(variant === 'accent' ? { backgroundColor: 'var(--cleanzo-red)' } : {}),
      ...(variant === 'danger' ? { backgroundColor: 'var(--cleanzo-red)' } : {}),
      ...props.style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={dynamicStyle}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ms-1 me-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
