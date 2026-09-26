'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ar } from '@/locales/ar';
import { en } from '@/locales/en';

export type Locale = 'ar' | 'en';

interface LocaleState {
  locale: Locale;
  direction: 'rtl' | 'ltr';
  t: typeof ar;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'ar',
      direction: 'rtl',
      t: ar,
      setLocale: (locale: Locale) => {
        const direction = locale === 'ar' ? 'rtl' : 'ltr';
        if (typeof document !== 'undefined') {
          document.documentElement.lang = locale;
          document.documentElement.dir = direction;
        }
        set({
          locale,
          direction,
          t: locale === 'ar' ? ar : (en as unknown as typeof ar),
        });
      },
      toggleLocale: () => {
        const next = get().locale === 'ar' ? 'en' : 'ar';
        get().setLocale(next);
      },
    }),
    {
      name: 'cleanzo-locale',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);
