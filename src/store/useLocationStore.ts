'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LocationGovernorate, LocationCity } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface LocationState {
  governorates: LocationGovernorate[];
  isLoading: boolean;
  error: string | null;

  fetchLocations: (isAdmin?: boolean) => Promise<LocationGovernorate[]>;
  addGovernorate: (name: string, nameEn: string, order?: number) => Promise<LocationGovernorate>;
  updateGovernorate: (id: string, updates: Partial<LocationGovernorate>) => Promise<void>;
  toggleGovernorateActive: (id: string) => Promise<void>;
  deleteGovernorate: (id: string) => Promise<void>;

  addCity: (govId: string, name: string, nameEn: string, order?: number) => Promise<void>;
  updateCity: (govId: string, cityId: string, updates: Partial<LocationCity>) => Promise<void>;
  toggleCityActive: (govId: string, cityId: string) => Promise<void>;
  deleteCity: (govId: string, cityId: string) => Promise<void>;

  addArea: (govId: string, cityId: string, name: string, nameEn: string) => void;
  deleteArea: (govId: string, cityId: string, areaId: string) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      governorates: [],
      isLoading: false,
      error: null,

      fetchLocations: async (isAdmin = false) => {
        set({ isLoading: true, error: null });
        try {
          const res = isAdmin
            ? await cleanzoApi.admin.locations.getAll()
            : await cleanzoApi.locations.getActive();

          if (Array.isArray(res)) {
            const normalized: LocationGovernorate[] = res.map((gov: any) => ({
              ...gov,
              id: gov.id || gov._id,
              name: gov.name,
              nameEn: gov.nameEn || gov.name,
              active: gov.active !== false,
              order: gov.order || 0,
              cities: (gov.cities || []).map((city: any) => ({
                ...city,
                id: city.id || city._id,
                name: city.name,
                nameEn: city.nameEn || city.name,
                active: city.active !== false,
                order: city.order || 0,
                areas: city.areas || [],
              })),
            }));
            set({ governorates: normalized, isLoading: false });
            return normalized;
          }
          set({ governorates: [], isLoading: false });
          return [];
        } catch (err: any) {
          console.error('Failed to fetch locations from API:', err);
          // Zero silent fallback to mock data
          set({ governorates: [], isLoading: false, error: err.message || 'فشل تحميل مناطق التغطية' });
          return [];
        }
      },

      addGovernorate: async (name, nameEn, order = 0) => {
        set({ isLoading: true, error: null });
        try {
          const res: any = await cleanzoApi.admin.locations.createGovernorate({
            name,
            nameEn: nameEn || name,
            order,
          });
          const createdGov: LocationGovernorate = {
            ...res,
            id: res.id || res._id,
            name: res.name || name,
            nameEn: res.nameEn || nameEn || name,
            active: res.active !== false,
            order: res.order || order,
            cities: (res.cities || []).map((c: any) => ({
              ...c,
              id: c.id || c._id,
              active: c.active !== false,
            })),
          };
          set((state) => ({
            governorates: [...state.governorates, createdGov],
            isLoading: false,
          }));
          return createdGov;
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      updateGovernorate: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          await cleanzoApi.admin.locations.updateGovernorate(id, updates);
          set({
            governorates: get().governorates.map((g) =>
              g.id === id || (g as any)._id === id ? { ...g, ...updates } : g
            ),
            isLoading: false,
          });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      toggleGovernorateActive: async (id) => {
        try {
          await cleanzoApi.admin.locations.toggleGovernorate(id);
          set({
            governorates: get().governorates.map((g) =>
              g.id === id || (g as any)._id === id ? { ...g, active: !g.active } : g
            ),
          });
        } catch (err: any) {
          throw err;
        }
      },

      deleteGovernorate: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await cleanzoApi.admin.locations.deleteGovernorate(id);
          set({
            governorates: get().governorates.filter((g) => g.id !== id && (g as any)._id !== id),
            isLoading: false,
          });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      addCity: async (govId, name, nameEn, order = 0) => {
        set({ isLoading: true, error: null });
        try {
          const res: any = await cleanzoApi.admin.locations.addCity(govId, {
            name,
            nameEn: nameEn || name,
            order,
          });
          if (res) {
            const updatedGov: LocationGovernorate = {
              ...res,
              id: res.id || res._id || govId,
              active: res.active !== false,
              cities: (res.cities || []).map((c: any) => ({
                ...c,
                id: c.id || c._id,
                active: c.active !== false,
              })),
            };
            set({
              governorates: get().governorates.map((g) =>
                g.id === govId || (g as any)._id === govId ? updatedGov : g
              ),
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      updateCity: async (govId, cityId, updates) => {
        set({ isLoading: true, error: null });
        try {
          await cleanzoApi.admin.locations.updateCity(govId, cityId, updates);
          set({
            governorates: get().governorates.map((g) => {
              if (g.id === govId || (g as any)._id === govId) {
                return {
                  ...g,
                  cities: (g.cities || []).map((c) =>
                    c.id === cityId || (c as any)._id === cityId ? { ...c, ...updates } : c
                  ),
                };
              }
              return g;
            }),
            isLoading: false,
          });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      toggleCityActive: async (govId, cityId) => {
        try {
          await cleanzoApi.admin.locations.toggleCity(govId, cityId);
          set({
            governorates: get().governorates.map((g) => {
              if (g.id === govId || (g as any)._id === govId) {
                return {
                  ...g,
                  cities: (g.cities || []).map((c) =>
                    c.id === cityId || (c as any)._id === cityId ? { ...c, active: !c.active } : c
                  ),
                };
              }
              return g;
            }),
          });
        } catch (err: any) {
          throw err;
        }
      },

      deleteCity: async (govId, cityId) => {
        set({ isLoading: true, error: null });
        try {
          await cleanzoApi.admin.locations.deleteCity(govId, cityId);
          set({
            governorates: get().governorates.map((g) => {
              if (g.id === govId || (g as any)._id === govId) {
                return {
                  ...g,
                  cities: (g.cities || []).filter(
                    (c) => c.id !== cityId && (c as any)._id !== cityId
                  ),
                };
              }
              return g;
            }),
            isLoading: false,
          });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      addArea: (govId, cityId, name, nameEn) => {
        set({
          governorates: get().governorates.map((g) => {
            if (g.id !== govId && (g as any)._id !== govId) return g;
            return {
              ...g,
              cities: (g.cities || []).map((c) => {
                if (c.id !== cityId && (c as any)._id !== cityId) return c;
                return {
                  ...c,
                  areas: [...(c.areas || []), { id: `area-${Date.now()}`, name, nameEn, active: true }],
                };
              }),
            };
          }),
        });
      },

      deleteArea: (govId, cityId, areaId) => {
        set({
          governorates: get().governorates.map((g) => {
            if (g.id !== govId && (g as any)._id !== govId) return g;
            return {
              ...g,
              cities: (g.cities || []).map((c) => {
                if (c.id !== cityId && (c as any)._id !== cityId) return c;
                return {
                  ...c,
                  areas: (c.areas || []).filter((a) => a.id !== areaId),
                };
              }),
            };
          }),
        });
      },
    }),
    {
      name: 'cleanzo-locations-live-v3',
    }
  )
);
