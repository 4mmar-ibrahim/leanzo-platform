'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Address } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Checks whether two addresses describe the exact same physical location.
 * Compares IDs first, then location details (governorate, city, area, building, floor, apartment).
 */
export function isSameAddress(a?: Partial<Address> | null, b?: Partial<Address> | null): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if ((a as any)._id && (b as any)._id && (a as any)._id === (b as any)._id) return true;

  const normalize = (val?: string) => (val || '').trim().toLowerCase();

  const getGov = (x: any) =>
    normalize(x.governorate || x.governorateNameSnapshot || x.governorateId);
  const getCity = (x: any) =>
    normalize(x.city || x.cityNameSnapshot || x.cityId);

  const govA = getGov(a);
  const govB = getGov(b);
  const sameGov =
    (Boolean(govA && govB) && govA === govB) ||
    Boolean(a.governorateId && b.governorateId && a.governorateId === b.governorateId) ||
    (!govA && !govB);

  const cityA = getCity(a);
  const cityB = getCity(b);
  const sameCity =
    (Boolean(cityA && cityB) && cityA === cityB) ||
    Boolean(a.cityId && b.cityId && a.cityId === b.cityId) ||
    (!cityA && !cityB);

  const sameArea = normalize(a.area) === normalize(b.area);
  const sameBuilding = normalize(a.building) === normalize(b.building);
  const sameFloor = normalize(a.floor) === normalize(b.floor);
  const sameApartment = normalize(a.apartment) === normalize(b.apartment);

  return Boolean(sameGov && sameCity && sameArea && sameBuilding && sameFloor && sameApartment);
}

/**
 * Deduplicates an array of addresses, preserving the default selection and merging duplicates.
 */
export function deduplicateAddresses(list: Address[]): Address[] {
  if (!Array.isArray(list) || list.length <= 1) return list || [];
  const result: Address[] = [];
  for (const addr of list) {
    if (!addr) continue;
    const exists = result.find((existing) => isSameAddress(existing, addr));
    if (!exists) {
      result.push(addr);
    } else {
      // If the duplicate entry had isDefault true, transfer it to the retained address
      if (addr.isDefault && !exists.isDefault) {
        exists.isDefault = true;
      }
    }
  }
  // Ensure exactly one isDefault if list is non-empty
  if (result.length > 0 && !result.some((a) => a.isDefault)) {
    result[0].isDefault = true;
  }
  return result;
}

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
        const { isAuthenticated, user, token } = useAuthStore.getState();
        const effectivePhone = phone || (isAuthenticated ? user?.phone : undefined);

        if (!isAuthenticated || !token || !effectivePhone) {
          const localClean = deduplicateAddresses(get().addresses || []);
          set({ addresses: localClean, isLoading: false, error: null });
          return localClean;
        }

        set({ isLoading: true, error: null });
        try {
          const res = await cleanzoApi.addresses.getAll(effectivePhone);
          if (Array.isArray(res)) {
            const mapped: Address[] = res.map((item: any) => ({
              ...item,
              id: item.id || item._id,
              governorate: item.governorateNameSnapshot || item.governorate,
              city: item.cityNameSnapshot || item.city,
            }));
            const deduplicated = deduplicateAddresses(mapped);
            set({ addresses: deduplicated, isLoading: false });
            return deduplicated;
          }
          const currentClean = deduplicateAddresses(get().addresses);
          set({ addresses: currentClean, isLoading: false });
          return currentClean;
        } catch (err: any) {
          if (err?.statusCode === 401 || err?.statusCode === 403) {
            set({ addresses: [], isLoading: false, error: null });
            if (typeof window !== 'undefined') {
              try {
                localStorage.removeItem('cleanzo_address_storage');
              } catch {}
            }
            return [];
          }
          const currentClean = deduplicateAddresses(get().addresses);
          set({ addresses: currentClean, isLoading: false, error: err.message });
          return currentClean;
        }
      },

      addAddress: async (newAddr) => {
        set({ isLoading: true, error: null });
        const { isAuthenticated, token } = useAuthStore.getState();

        // 1. Check if an address with the same location details already exists in the store
        const existingList = deduplicateAddresses(get().addresses || []);
        const existingMatch = existingList.find((a) => isSameAddress(a, newAddr));

        if (existingMatch) {
          // Address already exists! Do NOT duplicate it. Update existing address if any fields were edited.
          const merged: Address = {
            ...existingMatch,
            ...newAddr,
            id: existingMatch.id,
            isDefault: newAddr.isDefault !== undefined ? newAddr.isDefault : existingMatch.isDefault,
          };
          if (isAuthenticated && token) {
            try {
              await cleanzoApi.addresses.update(existingMatch.id, merged);
            } catch {}
          }

          const updatedList = existingList.map((a) => (a.id === existingMatch.id ? merged : a));
          set({ addresses: deduplicateAddresses(updatedList), isLoading: false });
          return merged;
        }

        let savedAddress: Address | null = null;
        if (isAuthenticated && token) {
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
            // Optimistic local fallback if offline
          }
        }

        if (!savedAddress) {
          const id = newAddr.id || `addr-${Date.now()}`;
          const isFirst = existingList.length === 0;
          savedAddress = {
            ...newAddr,
            id,
            isDefault: newAddr.isDefault !== undefined ? newAddr.isDefault : isFirst,
          };
        }

        const isDefault = savedAddress.isDefault ?? (existingList.length === 0);
        const filtered = existingList.filter(
          (a) => a.id !== savedAddress!.id && (a as any)._id !== savedAddress!.id && !isSameAddress(a, savedAddress!)
        );

        let updatedList: Address[];
        if (isDefault) {
          updatedList = filtered.map((a) => ({ ...a, isDefault: false }));
          updatedList.unshift({ ...savedAddress, isDefault: true });
        } else {
          updatedList = [...filtered, savedAddress];
        }

        const finalDeduplicated = deduplicateAddresses(updatedList);
        set({ addresses: finalDeduplicated, isLoading: false });
        return savedAddress;
      },

      updateAddress: async (id, updates) => {
        set({ isLoading: true, error: null });
        const { isAuthenticated, token } = useAuthStore.getState();
        if (isAuthenticated && token) {
          try {
            await cleanzoApi.addresses.update(id, updates);
          } catch (err: any) {
            console.warn('Backend address update failed, applying local update:', err.message);
          }
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
        set({ addresses: deduplicateAddresses(updatedList), isLoading: false });
      },

      deleteAddress: async (id) => {
        set({ isLoading: true, error: null });
        const { isAuthenticated, token } = useAuthStore.getState();
        if (isAuthenticated && token) {
          try {
            await cleanzoApi.addresses.delete(id);
          } catch (err: any) {
            console.warn('Backend address delete failed, applying local removal:', err.message);
          }
        }
        const filtered = get().addresses.filter((a) => a.id !== id && a._id !== id);
        if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
          filtered[0].isDefault = true;
        }
        set({ addresses: deduplicateAddresses(filtered), isLoading: false });
      },

      setDefaultAddress: async (id) => {
        const { isAuthenticated, token } = useAuthStore.getState();
        if (isAuthenticated && token) {
          try {
            await cleanzoApi.addresses.setDefault(id);
          } catch (err: any) {
            console.warn('Backend set default address failed, applying locally:', err.message);
          }
        }
        const updated = get().addresses.map((a) => ({
          ...a,
          isDefault: a.id === id || a._id === id,
        }));
        set({ addresses: deduplicateAddresses(updated) });
      },

      getDefaultAddress: () => {
        const list = deduplicateAddresses(get().addresses || []);
        return list.find((a) => a.isDefault) || list[0];
      },

      clearAddresses: () => {
        set({ addresses: [], error: null, isLoading: false });
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('cleanzo_address_storage');
          } catch {}
        }
      },
    }),
    {
      name: 'cleanzo_address_storage',
      partialize: (state) => ({
        addresses: deduplicateAddresses(state.addresses),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.addresses)) {
          state.addresses = deduplicateAddresses(state.addresses);
        }
      },
    }
  )
);
