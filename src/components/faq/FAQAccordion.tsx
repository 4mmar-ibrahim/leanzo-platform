'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQItem } from '@/types';
import { cn } from '@/lib/utils';

interface FAQAccordionProps {
  items: FAQItem[];
  isAr?: boolean;
  allowMultiple?: boolean;
  defaultOpenId?: string;
  className?: string;
}

export function FAQAccordion({
  items,
  isAr = true,
  allowMultiple = false,
  defaultOpenId,
  className,
}: FAQAccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenId ? [defaultOpenId] : []);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 dark:text-slate-500">
        <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">
          {isAr ? 'لا توجد أسئلة تطابق البحث الحالي.' : 'No questions match the current search.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const questionText = isAr ? item.question : item.questionEn;
        const answerText = isAr ? item.answer : item.answerEn;

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-2xl transition-all duration-200 border',
              isOpen
                ? 'bg-white dark:bg-slate-900 border-sky-500/40 dark:border-sky-500/30 shadow-md shadow-sky-500/5 ring-1 ring-sky-500/10'
                : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
            )}
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full py-4 px-5 sm:px-6 flex items-center justify-between gap-4 text-start group"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn(
                    'w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-black transition-colors',
                    isOpen
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-sky-500'
                  )}
                >
                  ؟
                </span>
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {questionText}
                </span>
              </div>

              <div
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300',
                  isOpen
                    ? 'rotate-180 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                )}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            {isOpen && (
              <div className="px-5 sm:px-6 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed ps-10">
                  {answerText}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
