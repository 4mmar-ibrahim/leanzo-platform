import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, children, options, ...props }, ref) => {
    const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-xl border border-slate-200 dark:border-[#133B61] bg-white dark:bg-[#051C30] px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#0866C6] focus:border-[#0866C6] disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer',
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
        {error && <p className="text-xs text-[#F0444C] font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
