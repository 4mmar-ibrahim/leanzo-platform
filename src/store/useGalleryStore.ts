'use client';

import { create } from 'zustand';
import { GalleryItem, ServiceCategory } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface GalleryState {
  items: GalleryItem[];
  isLoading: boolean;
  error: string | null;

  fetchGallery: (category?: 'car' | 'home') => Promise<GalleryItem[]>;
  fetchAdminGallery: () => Promise<GalleryItem[]>;
  addItem: (item: Omit<GalleryItem, 'id'>) => Promise<GalleryItem>;
  updateItem: (id: string, updates: Partial<GalleryItem>) => Promise<GalleryItem>;
  deleteItem: (id: string) => Promise<boolean>;
  toggleVisibility: (id: string) => Promise<boolean>;
  getItemsByCategory: (category: ServiceCategory | 'all') => GalleryItem[];
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchGallery: async (category) => {
    set({ isLoading: true, error: null });
    try {
      const data = await cleanzoApi.portfolio.getPortfolio(category);
      if (Array.isArray(data)) {
        const visibleOnly = data.filter((i) => i.visible !== false);
        set({ items: visibleOnly, isLoading: false });
        return visibleOnly;
      }
      set({ items: [], isLoading: false });
      return [];
    } catch (err: any) {
      console.error('Failed to fetch public gallery from API:', err);
      set({ items: [], isLoading: false, error: err.message });
      return [];
    }
  },

  fetchAdminGallery: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await cleanzoApi.portfolio.getAllAdmin();
      if (Array.isArray(data)) {
        set({ items: data, isLoading: false });
        return data;
      }
      set({ items: [], isLoading: false });
      return [];
    } catch (err: any) {
      console.error('Failed to fetch admin gallery from API:', err);
      set({ items: [], isLoading: false, error: err.message });
      return [];
    }
  },

  addItem: async (data) => {
    try {
      const created = await cleanzoApi.portfolio.create(data as any);
      set((state) => ({
        items: [created, ...state.items.filter((i) => i.id !== created.id)],
      }));
      return created;
    } catch (err: any) {
      console.error('Failed to create gallery item on server:', err);
      throw err;
    }
  },

  updateItem: async (id, updates) => {
    try {
      const updated = await cleanzoApi.portfolio.update(id, updates);
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, ...updated } : i)),
      }));
      return updated;
    } catch (err: any) {
      console.error('Failed to update gallery item on server:', err);
      throw err;
    }
  },

  deleteItem: async (id) => {
    try {
      await cleanzoApi.portfolio.delete(id);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      }));
      return true;
    } catch (err: any) {
      console.error('Failed to delete gallery item on server:', err);
      throw err;
    }
  },

  toggleVisibility: async (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return false;
    const newVisible = !(item.visible ?? true);
    try {
      await cleanzoApi.portfolio.update(id, { visible: newVisible });
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, visible: newVisible } : i)),
      }));
      return true;
    } catch (err: any) {
      console.error('Failed to toggle gallery item visibility on server:', err);
      throw err;
    }
  },

  getItemsByCategory: (category) => {
    if (!category || category === 'all') {
      return get().items.filter((i) => i.visible !== false);
    }
    return get().items.filter((i) => i.category === category && i.visible !== false);
  },
}));
