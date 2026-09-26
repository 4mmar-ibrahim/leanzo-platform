'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentlyViewedState {
  viewedServiceIds: string[];
  addViewedService: (id: string) => void;
  addRecentlyViewed: (id: string) => void;
  clearViewed: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      viewedServiceIds: ['car-wash-steam', 'home-sofa-steam'],

      addViewedService: (id: string) => {
        set((state) => {
          const filtered = state.viewedServiceIds.filter((item) => item !== id);
          return {
            viewedServiceIds: [id, ...filtered].slice(0, 8),
          };
        });
      },

      addRecentlyViewed: (id: string) => {
        set((state) => {
          const filtered = state.viewedServiceIds.filter((item) => item !== id);
          return {
            viewedServiceIds: [id, ...filtered].slice(0, 8),
          };
        });
      },

      clearViewed: () => set({ viewedServiceIds: [] }),
    }),
    {
      name: 'cleanzo-recently-viewed',
    }
  )
);
