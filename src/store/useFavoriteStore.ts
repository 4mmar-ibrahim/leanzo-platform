'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteState {
  favorites: string[]; // service IDs
  toggleFavorite: (serviceId: string) => void;
  isFavorite: (serviceId: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: ['car-full-detailing', 'home-deep-clean'], // default favorites for demonstration

      toggleFavorite: (serviceId: string) => {
        set((state) => {
          const exists = state.favorites.includes(serviceId);
          return {
            favorites: exists
              ? state.favorites.filter((id) => id !== serviceId)
              : [...state.favorites, serviceId],
          };
        });
      },

      isFavorite: (serviceId: string) => {
        return get().favorites.includes(serviceId);
      },

      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: 'cleanzo-user-favorites',
    }
  )
);
