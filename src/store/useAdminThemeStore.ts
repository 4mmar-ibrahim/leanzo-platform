'use client';

import { create } from 'zustand';

interface AdminThemeState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'cleanzo-admin-theme';

export const useAdminThemeStore = create<AdminThemeState>((set) => ({
  // Default to light or check localStorage safely
  theme: typeof window !== 'undefined'
    ? ((localStorage.getItem(STORAGE_KEY) as 'light' | 'dark') || 'light')
    : 'light',

  setTheme: (theme: 'light' | 'dark') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.setAttribute('data-admin-theme', theme);
    }
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, nextTheme);
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        document.documentElement.setAttribute('data-admin-theme', nextTheme);
      }
      return { theme: nextTheme };
    });
  },
}));
