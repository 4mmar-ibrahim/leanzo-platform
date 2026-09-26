import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, id, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-xl border border-slate-200 dark:border-[#133B61] bg-white dark:bg-[#051C30] px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0866C6] focus:border-[#0866C6] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-[#F0444C] focus:ring-[#F0444C] focus:border-[#F0444C]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#F0444C] font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
