'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useOrderStore } from '@/store/useOrderStore';
import { useCustomerStore } from '@/store/useCustomerStore';

interface AnalyticsResetState {
  isCleared: boolean;
  clearedAt: string | null;
  clearDashboardAndAnalyticsData: () => void;
  restoreRealData: () => void;
}

export const useAnalyticsResetStore = create<AnalyticsResetState>()(
  persist(
    (set) => ({
      isCleared: false,
      clearedAt: null,

      clearDashboardAndAnalyticsData: () => {
        const timestamp = new Date().toISOString();

        // 1. Wipe Orders from local store
        try {
          useOrderStore.setState({ orders: [] });
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(
              'cleanzo-orders-storage',
              JSON.stringify({ state: { orders: [] }, version: 0 })
            );
          }
        } catch (e) {
          console.error('Error clearing orders store:', e);
        }

        // 2. Wipe Customers from local store
        try {
          useCustomerStore.setState({ customers: [] });
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(
              'cleanzo-customers-storage',
              JSON.stringify({ state: { customers: [] }, version: 0 })
            );
          }
        } catch (e) {
          console.error('Error clearing customers store:', e);
        }

        set({
          isCleared: true,
          clearedAt: timestamp,
        });
      },

      restoreRealData: () => {
        set({
          isCleared: false,
          clearedAt: null,
        });
      },
    }),
    {
      name: 'cleanzo-analytics-reset-storage',
    }
  )
);
