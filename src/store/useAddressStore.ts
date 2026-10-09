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
      addresses: [],
      isLoading: false,
      error: null,

      fetchAddresses: async (phone?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await cleanzoApi.addresses.getAll(phone);
          if (Array.isArray(res) && res.length > 0) {
            const mapped: Address[] = res.map((item: any) => ({
              ...item,
              id: item.id || item._id,
              governorate: item.governorateNameSnapshot || item.governorate,
              city: item.cityNameSnapshot || item.city,
            }));
            set({ addresses: mapped, isLoading: false });
            return mapped;
          }
          // If server returned empty, preserve existing local cache in localStorage
          set({ isLoading: false });
          return get().addresses;
        } catch (err: any) {
          // Keep current local cache on network error or unauthorized
          set({ isLoading: false, error: err.message });
          return get().addresses;
        }
      },

      addAddress: async (newAddr) => {
        set({ isLoading: true, error: null });
        let savedAddress: Address | null = null;
        try {
          const res = await cleanzoApi.addresses.create(newAddr);
          if (res) {
            savedAddress = {
              ...newAddr,
              ...res,
              id: (res as any)._id || res.id || `addr-${Date.now()}`,
              governorate: (res as any).governorateNameSnapshot || newAddr.governorate,
              city: (res as any).cityNameSnapshot || newAddr.city,
            };
          }
        } catch (err: any) {
          // Optimistic local fallback if offline or guest
        }

        if (!savedAddress) {
          const id = newAddr.id || `addr-${Date.now()}`;
          const isFirst = get().addresses.length === 0;
          savedAddress = {
            ...newAddr,
            id,
            isDefault: newAddr.isDefault !== undefined ? newAddr.isDefault : isFirst,
          };
        }

        const isDefault = savedAddress.isDefault ?? (get().addresses.length === 0);
        const existing = get().addresses.filter(
          (a) => a.id !== savedAddress!.id && (a as any)._id !== savedAddress!.id
        );

        let updatedList: Address[];
        if (isDefault) {
          updatedList = existing.map((a) => ({ ...a, isDefault: false }));
          updatedList.unshift({ ...savedAddress, isDefault: true });
        } else {
          updatedList = [...existing, savedAddress];
        }

        set({ addresses: updatedList, isLoading: false });
        return savedAddress;
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
      name: 'cleanzo_address_storage',
      partialize: (state) => ({
        addresses: state.addresses,
      }),
    }
  )
);
