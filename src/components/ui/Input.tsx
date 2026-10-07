import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  compact?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, id, compact = false, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);
    const hasAsterisk = typeof label === 'string' && label.includes('*');

    return (
      <div className={cn("w-full text-start", compact ? "space-y-1" : "space-y-1 sm:space-y-1.5")}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block font-semibold text-slate-700 dark:text-slate-300",
              compact ? "text-[11px]" : "text-[11px] sm:text-xs"
            )}
          >
            {label}
            {props.required && !hasAsterisk && (
              <span className="text-[#F0444C] mx-1 font-bold" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'flex w-full border border-slate-200 dark:border-[#133B61] bg-white dark:bg-[#051C30] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0866C6] focus:border-[#0866C6] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            compact
              ? 'h-9 px-3 py-1 text-xs rounded-lg'
              : 'h-10 sm:h-11 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl',
            error && 'border-[#F0444C] focus:ring-[#F0444C] focus:border-[#F0444C]',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] sm:text-xs text-[#F0444C] font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
