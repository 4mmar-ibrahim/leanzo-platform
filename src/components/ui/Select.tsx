import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  compact?: boolean;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, children, options, compact = false, ...props }, ref) => {
    const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className={cn("w-full text-start", compact ? "space-y-1" : "space-y-1 sm:space-y-1.5")}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              "block font-semibold text-slate-700 dark:text-slate-300 truncate whitespace-nowrap",
              compact ? "text-[11px]" : "text-[11px] sm:text-xs"
            )}
          >
            {label}
            {props.required && (
              <span className="text-[#F0444C] mx-1 font-bold" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'flex w-full border border-slate-200 dark:border-[#133B61] bg-white dark:bg-[#051C30] focus:outline-hidden focus:ring-2 focus:ring-[#0866C6] focus:border-[#0866C6] disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer',
            compact
              ? 'h-9 px-2.5 py-1 text-xs rounded-lg'
              : 'h-10 sm:h-11 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl',
            error && 'border-[#F0444C] focus:ring-[#F0444C] focus:border-[#F0444C]',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-[11px] sm:text-xs text-[#F0444C] font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
