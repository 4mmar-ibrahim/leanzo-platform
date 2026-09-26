'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Address } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface AddressState {
  addresses: Address[];
  isLoading: boolean;
  error: string | null;
  fetchAddresses: (phone?: string) => Promise<Address[]>;
  addAddress: (address: Omit<Address, 'id'> & { id?: string }) => Promise<Address>;
  updateAddress: (id: string, updates: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  getDefaultAddress: () => Address | undefined;
  clearAddresses: () => void;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      // Real first-time customers start with NO addresses (clean slate)
      addresses: [],
      isLoading: false,
      error: null,

      fetchAddresses: async (phone?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await cleanzoApi.addresses.getAll(phone);
          const mapped: Address[] = (res || []).map((item: any) => ({
            ...item,
            id: item.id || item._id,
            governorate: item.governorateNameSnapshot || item.governorate,
            city: item.cityNameSnapshot || item.city,
          }));
          set({ addresses: mapped, isLoading: false });
          return mapped;
        } catch (err: any) {
          // Keep current local cache on network blip
          set({ isLoading: false, error: err.message });
          return get().addresses;
        }
      },

      addAddress: async (newAddr) => {
        set({ isLoading: true, error: null });
        try {
          const res = await cleanzoApi.addresses.create(newAddr);
          const savedAddress: Address = {
            ...newAddr,
            ...res,
            id: (res as any)._id || res.id || `addr-${Date.now()}`,
            governorate: (res as any).governorateNameSnapshot || newAddr.governorate,
            city: (res as any).cityNameSnapshot || newAddr.city,
          };

          let updatedList = [...get().addresses];
          if (savedAddress.isDefault) {
            updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
          }
          updatedList.push(savedAddress);
          set({ addresses: updatedList, isLoading: false });
          return savedAddress;
        } catch (err: any) {
          // Optimistic local fallback if offline
          const id = newAddr.id || `addr-${Date.now()}`;
          const isFirst = get().addresses.length === 0;
          const fallbackAddress: Address = {
            ...newAddr,
            id,
            isDefault: newAddr.isDefault || isFirst,
          };
          let updatedList = [...get().addresses];
          if (fallbackAddress.isDefault) {
            updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
          }
          updatedList.push(fallbackAddress);
          set({ addresses: updatedList, isLoading: false });
          return fallbackAddress;
        }
      },

      updateAddress: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          await cleanzoApi.addresses.update(id, updates);
        } catch (err: any) {
          console.warn('Backend address update failed, applying local update:', err.message);
        }
        const updatedList = get().addresses.map((a) => {
          if (a.id === id || a._id === id) {
            return { ...a, ...updates };
          }
          if (updates.isDefault) {
            return { ...a, isDefault: false };
          }
          return a;
        });
        set({ addresses: updatedList, isLoading: false });
      },

      deleteAddress: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await cleanzoApi.addresses.delete(id);
        } catch (err: any) {
          console.warn('Backend address delete failed, applying local removal:', err.message);
        }
        const filtered = get().addresses.filter((a) => a.id !== id && a._id !== id);
        if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
          filtered[0].isDefault = true;
        }
        set({ addresses: filtered, isLoading: false });
      },

      setDefaultAddress: async (id) => {
        try {
          await cleanzoApi.addresses.setDefault(id);
        } catch (err: any) {
          console.warn('Backend set default address failed, applying locally:', err.message);
        }
        const updated = get().addresses.map((a) => ({
          ...a,
          isDefault: a.id === id || a._id === id,
        }));
        set({ addresses: updated });
      },

      getDefaultAddress: () => {
        return get().addresses.find((a) => a.isDefault) || get().addresses[0];
      },

      clearAddresses: () => {
        set({ addresses: [], error: null, isLoading: false });
      },
    }),
    {
      name: 'cleanzo-addresses-storage-v2', // bumped to invalidate old mock cache
    }
  )
);
