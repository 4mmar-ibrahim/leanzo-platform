'use client';

import { create } from 'zustand';
import { Offer } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

export interface OfferExtended extends Offer {
  active?: boolean;
  isArchived?: boolean;
  featured?: boolean;
  discountType?: 'percentage' | 'fixed';
  discountAmount?: number;
  usageLimit?: number | null;
  usageCount?: number;
  startDate?: string;
  promoCode?: string;
}

interface OfferState {
  offers: OfferExtended[];
  isLoading: boolean;
  error: string | null;

  // Server sync
  fetchOffers: () => Promise<OfferExtended[]>;
  fetchAdminOffers: (params?: { includeArchived?: boolean; status?: string; category?: string } | boolean) => Promise<OfferExtended[]>;

  // Actions (backed by API)
  addOffer: (offer: Partial<OfferExtended>) => Promise<OfferExtended>;
  updateOffer: (id: string, updates: Partial<OfferExtended>) => Promise<OfferExtended>;
  deleteOffer: (id: string) => Promise<boolean>;
  toggleOfferActive: (id: string) => Promise<boolean>;
  duplicateOffer: (id: string) => Promise<OfferExtended | undefined>;
  getOfferById: (id: string) => OfferExtended | undefined;
  getActiveOffers: () => OfferExtended[];
}

export const useOfferStore = create<OfferState>((set, get) => ({
  offers: [],
  isLoading: false,
  error: null,

  fetchOffers: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await cleanzoApi.offers.getOffers();
      const activeOnly = (data || []).filter(
        (o: any) => o.active !== false && !o.isArchived
      );
      set({ offers: activeOnly, isLoading: false });
      return activeOnly;
    } catch (err: any) {
      console.error('Failed to fetch offers from API:', err);
      set({ isLoading: false, error: err.message });
      return [];
    }
  },

  fetchAdminOffers: async (params = false) => {
    set({ isLoading: true, error: null });
    try {
      const data = await cleanzoApi.offers.getAllAdmin(params);
      set({ offers: data || [], isLoading: false });
      return data || [];
    } catch (err: any) {
      console.error('Failed to fetch admin offers from API:', err);
      set({ isLoading: false, error: err.message });
      return [];
    }
  },

  addOffer: async (data) => {
    try {
      const created = await cleanzoApi.offers.create(data);
      set((state) => ({
        offers: [created, ...state.offers.filter((o) => o.id !== created.id)],
      }));
      return created;
    } catch (err: any) {
      console.error('Failed to create offer on server:', err);
      throw err;
    }
  },

  updateOffer: async (id, updates) => {
    try {
      const updated = await cleanzoApi.offers.update(id, updates);
      set((state) => ({
        offers: state.offers.map((o) => (o.id === id ? { ...o, ...updated } : o)),
      }));
      return updated;
    } catch (err: any) {
      console.error('Failed to update offer on server:', err);
      throw err;
    }
  },

  deleteOffer: async (id) => {
    try {
      await cleanzoApi.offers.delete(id);
      set((state) => ({
        offers: state.offers.filter((o) => o.id !== id),
      }));
      return true;
    } catch (err: any) {
      console.error('Failed to delete offer on server:', err);
      throw err;
    }
  },

  toggleOfferActive: async (id) => {
    const item = get().offers.find((o) => o.id === id);
    if (!item) return false;
    try {
      const updated = await cleanzoApi.offers.toggleActive(id);
      set((state) => ({
        offers: state.offers.map((o) =>
          o.id === id ? { ...o, ...updated } : o
        ),
      }));
      return true;
    } catch (err: any) {
      console.error('Failed to toggle offer active state on server:', err);
      throw err;
    }
  },

  duplicateOffer: async (id) => {
    const item = get().offers.find((o) => o.id === id);
    if (!item) return;
    const duplicatedData: Partial<OfferExtended> = {
      ...item,
      id: `off-${Date.now().toString().slice(-4)}`,
      title: `${item.title} (جديد)`,
      titleEn: `${item.titleEn} (New)`,
      code: `${item.code}_NEW`,
    };
    try {
      const created = await cleanzoApi.offers.create(duplicatedData);
      set((state) => ({
        offers: [created, ...state.offers],
      }));
      return created;
    } catch (err: any) {
      console.error('Failed to duplicate offer on server:', err);
      throw err;
    }
  },

  getOfferById: (id) => {
    return get().offers.find((o) => o.id === id && !(o as any).isArchived);
  },

  getActiveOffers: () => {
    return get().offers.filter((o) => o.active !== false && !(o as any).isArchived);
  },
}));
