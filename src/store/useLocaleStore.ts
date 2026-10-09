'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ar } from '@/locales/ar';
import { en } from '@/locales/en';
import { autoTranslate } from '@/lib/i18n/autoTranslate';

export type Locale = 'ar' | 'en';

interface LocaleState {
  locale: Locale;
  direction: 'rtl' | 'ltr';
  t: typeof ar;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  translate: (text?: string | null) => string;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'ar',
      direction: 'rtl',
      t: ar,

      setLocale: (newLocale: Locale) => {
        const locale = newLocale === 'en' ? 'en' : 'ar';
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

      translate: (text?: string | null) => {
        return autoTranslate(text, get().locale);
      },
    }),
    {
      name: 'cleanzo-locale',
      partialize: (state) => ({
        locale: state.locale,
        direction: state.direction,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = state.locale === 'en' ? 'en' : 'ar';
          const direction = resolved === 'ar' ? 'rtl' : 'ltr';
          state.locale = resolved;
          state.direction = direction;
          state.t = resolved === 'ar' ? ar : (en as unknown as typeof ar);
          if (typeof document !== 'undefined') {
            document.documentElement.lang = resolved;
            document.documentElement.dir = direction;
          }
        }
      },
    }
  )
);
