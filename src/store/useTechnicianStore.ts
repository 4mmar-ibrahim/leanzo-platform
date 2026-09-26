'use client';

import { create } from 'zustand';
import { TechnicianExtended } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useNotificationStore } from './useNotificationStore';

interface TechnicianState {
  technicians: TechnicianExtended[];
  isLoading: boolean;
  error: string | null;

  fetchTechnicians: () => Promise<TechnicianExtended[]>;
  fetchPublicTechnicians: () => Promise<TechnicianExtended[]>;
  setTechnicians: (techs: TechnicianExtended[]) => void;
  addTechnician: (tech: Omit<TechnicianExtended, 'id' | 'completedOrders' | 'assignedOrders' | 'rating'>) => Promise<TechnicianExtended>;
  updateTechnician: (id: string, updates: Partial<TechnicianExtended>) => Promise<void>;
  deleteTechnician: (id: string) => Promise<void>;
  toggleAvailability: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  getTechnicianById: (id: string) => TechnicianExtended | undefined;
  getAvailableTechnicians: () => TechnicianExtended[];
}

export const useTechnicianStore = create<TechnicianState>((set, get) => ({
  technicians: [],
  isLoading: false,
  error: null,

  fetchTechnicians: async () => {
    set({ isLoading: true, error: null });
    try {
      const liveTechs = await cleanzoApi.technicians.getAll();
      if (Array.isArray(liveTechs)) {
        set({ technicians: liveTechs, isLoading: false });
        return liveTechs;
      }
      set({ technicians: [], isLoading: false });
      return [];
    } catch (err: any) {
      console.error('Failed to fetch admin technicians from API:', err);
      set({ technicians: [], isLoading: false, error: err.message });
      return [];
    }
  },

  fetchPublicTechnicians: async () => {
    set({ isLoading: true, error: null });
    try {
      const liveTechs = await cleanzoApi.technicians.getPublic();
      if (Array.isArray(liveTechs)) {
        const activeOnly = liveTechs.filter((t) => t.active !== false);
        set({ technicians: activeOnly, isLoading: false });
        return activeOnly;
      }
      set({ technicians: [], isLoading: false });
      return [];
    } catch (err: any) {
      console.error('Failed to fetch public technicians from API:', err);
      set({ technicians: [], isLoading: false, error: err.message });
      return [];
    }
  },

  setTechnicians: (techs) => {
    set({ technicians: techs });
  },

  addTechnician: async (data) => {
    try {
      const res = await cleanzoApi.technicians.create(data);
      set((state) => ({
        technicians: [res, ...state.technicians.filter((t) => t.id !== res.id)],
      }));

      try {
        useNotificationStore.getState().addNotification({
          title: 'إضافة فني جديد إلى الفريق',
          titleEn: 'New Technician Added',
          message: `تمت إضافة الكابتن ${res.name} (${res.specialty || 'فني ميداني'}) بنجاح إلى الفريق.`,
          messageEn: `Technician ${res.name} added to the team.`,
          type: 'technician',
          link: '/admin/technicians',
        });
      } catch {}

      return res;
    } catch (err: any) {
      console.error('Failed to create technician on server:', err);
      throw err;
    }
  },

  updateTechnician: async (id, updates) => {
    try {
      const updated = await cleanzoApi.technicians.update(id, updates);
      set((state) => ({
        technicians: state.technicians.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      }));
    } catch (err: any) {
      console.error('Failed to update technician on server:', err);
      throw err;
    }
  },

  deleteTechnician: async (id) => {
    try {
      await cleanzoApi.technicians.delete(id);
      set((state) => ({
        technicians: state.technicians.filter((t) => t.id !== id),
      }));
    } catch (err: any) {
      console.error('Failed to delete technician on server:', err);
      throw err;
    }
  },

  toggleAvailability: async (id) => {
    try {
      const updated = await cleanzoApi.technicians.toggleAvailability(id);
      if (updated) {
        set((state) => ({
          technicians: state.technicians.map((t) => (t.id === id ? { ...t, ...updated } : t)),
        }));
      }
    } catch (err: any) {
      console.error('Failed to toggle technician availability on server:', err);
      throw err;
    }
  },

  toggleActive: async (id) => {
    const current = get().technicians.find((t) => t.id === id);
    if (!current) return;
    const nextActive = !current.active;
    try {
      await cleanzoApi.technicians.update(id, { active: nextActive });
      set((state) => ({
        technicians: state.technicians.map((t) => (t.id === id ? { ...t, active: nextActive } : t)),
      }));
    } catch (err: any) {
      console.error('Failed to toggle technician active state on server:', err);
      throw err;
    }
  },

  getTechnicianById: (id) => {
    return get().technicians.find((t) => t.id === id);
  },

  getAvailableTechnicians: () => {
    return get().technicians.filter((t) => t.active !== false && t.status === 'available');
  },
}));
