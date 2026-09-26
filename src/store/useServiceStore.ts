'use client';

import { create } from 'zustand';
import { Service, ServiceCategory, ServiceCategoryItem } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface ServiceState {
  services: Service[];
  categories: ServiceCategoryItem[];
  isLoading: boolean;
  error: string | null;

  // Server sync
  fetchServices: (category?: ServiceCategory) => Promise<Service[]>;
  fetchAdminServices: (includeArchived?: boolean, category?: ServiceCategory) => Promise<Service[]>;
  fetchCategories: () => Promise<ServiceCategoryItem[]>;

  // Service actions (backed by API)
  addService: (service: Partial<Service>) => Promise<Service>;
  updateService: (id: string, updates: Partial<Service>) => Promise<Service>;
  deleteService: (id: string) => Promise<boolean>;
  duplicateService: (id: string) => Promise<Service | undefined>;
  toggleServiceVisibility: (id: string) => Promise<boolean>;
  reorderServices: (startIndex: number, endIndex: number) => void;
  getServiceById: (id: string) => Service | undefined;
  getServicesByCategory: (category: ServiceCategory | 'all') => Service[];

  // Category actions (backed by API)
  addCategory: (category: Omit<ServiceCategoryItem, 'id'>) => Promise<ServiceCategoryItem>;
  updateCategory: (id: string, updates: Partial<ServiceCategoryItem>) => Promise<ServiceCategoryItem>;
  deleteCategory: (id: string) => Promise<boolean>;
  toggleCategoryActive: (id: string) => Promise<boolean>;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchServices: async (category) => {
    set({ isLoading: true, error: null });
    try {
      const services = await cleanzoApi.services.getServices(category);
      // Filter out any archived or unavailable services
      const activeOnly = (services || []).filter((s) => s.available !== false && !(s as any).isArchived);

      if (category) {
        // Retain services of the other category in the local store so components don't lose them
        const otherCategoryServices = (get().services || []).filter((s) => s.category !== category);
        const merged = [...otherCategoryServices, ...activeOnly];
        set({ services: merged, isLoading: false });
      } else {
        set({ services: activeOnly, isLoading: false });
      }
      return activeOnly;
    } catch (err: any) {
      console.error('Failed to fetch services from API:', err);
      // Clean error state - NO silent fallback to mock data
      set({ services: [], isLoading: false, error: err.message || 'فشل جلب قائمة الخدمات' });
      return [];
    }
  },

  fetchAdminServices: async (includeArchived = false, category?: ServiceCategory) => {
    set({ isLoading: true, error: null });
    try {
      const services = await cleanzoApi.services.getAllAdmin(includeArchived, category);
      set({ services: services || [], isLoading: false });
      return services || [];
    } catch (err: any) {
      console.error('Failed to fetch admin services from API:', err);
      set({ isLoading: false, error: err.message });
      return [];
    }
  },

  fetchCategories: async () => {
    try {
      const liveCategories = await cleanzoApi.services.getCategories();
      if (Array.isArray(liveCategories)) {
        const normalized: ServiceCategoryItem[] = liveCategories.map((c: any) => ({
          id: c.id || c._id,
          slug: c.slug || c.id || 'cat',
          name: c.name,
          nameEn: c.nameEn || c.name,
          description: c.description || '',
          descriptionEn: c.descriptionEn || '',
          icon: c.icon || 'Sparkles',
          image: c.image || '',
          active: c.active !== false,
          order: c.order || 0,
        }));
        set({ categories: normalized });
        return normalized;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch categories from API:', err);
      return [];
    }
  },

  addService: async (data) => {
    try {
      const created = await cleanzoApi.services.create(data);
      set((state) => ({
        services: [created, ...state.services.filter((s) => s.id !== created.id)],
      }));
      return created;
    } catch (err: any) {
      console.error('Failed to create service on server:', err);
      throw err;
    }
  },

  updateService: async (id, updates) => {
    try {
      const updated = await cleanzoApi.services.update(id, updates);
      set((state) => ({
        services: state.services.map((s) => (s.id === id ? { ...s, ...updated } : s)),
      }));
      return updated;
    } catch (err: any) {
      console.error('Failed to update service on server:', err);
      throw err;
    }
  },

  deleteService: async (id) => {
    try {
      await cleanzoApi.services.delete(id);
      set((state) => ({
        services: state.services.filter((s) => s.id !== id),
      }));
      return true;
    } catch (err: any) {
      console.error('Failed to delete service on server:', err);
      throw err;
    }
  },

  duplicateService: async (id) => {
    const item = get().services.find((s) => s.id === id);
    if (!item) return;
    const duplicatedData: Partial<Service> = {
      ...item,
      id: `srv-${Date.now()}`,
      title: `${item.title} (نسخة)`,
      titleEn: `${item.titleEn} (Copy)`,
    };
    try {
      const created = await cleanzoApi.services.create(duplicatedData);
      set((state) => ({
        services: [created, ...state.services],
      }));
      return created;
    } catch (err: any) {
      console.error('Failed to duplicate service on server:', err);
      throw err;
    }
  },

  toggleServiceVisibility: async (id) => {
    const item = get().services.find((s) => s.id === id);
    if (!item) return false;
    const nextAvailable = !item.available;
    try {
      await cleanzoApi.services.update(id, { available: nextAvailable });
      set((state) => ({
        services: state.services.map((s) =>
          s.id === id ? { ...s, available: nextAvailable } : s
        ),
      }));
      return true;
    } catch (err: any) {
      console.error('Failed to toggle service visibility on server:', err);
      throw err;
    }
  },

  reorderServices: (startIndex, endIndex) => {
    set((state) => {
      const result = Array.from(state.services);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { services: result };
    });
  },

  getServiceById: (id) => {
    return get().services.find((s) => s.id === id && !(s as any).isArchived);
  },

  getServicesByCategory: (category) => {
    const list = get().services.filter((s) => s.available && !(s as any).isArchived);
    if (!category || category === 'all') {
      return list;
    }
    return list.filter((s) => s.category === category);
  },

  addCategory: async (catData) => {
    try {
      const res = await cleanzoApi.services.createCategory(catData);
      const createdCat: ServiceCategoryItem = res || {
        ...catData,
        id: `cat-${Date.now()}`,
      };
      set((state) => ({
        categories: [...state.categories, createdCat],
      }));
      return createdCat;
    } catch (err: any) {
      console.error('Failed to create category on backend:', err);
      throw err;
    }
  },

  updateCategory: async (id, updates) => {
    try {
      const res = await cleanzoApi.services.updateCategory(id, updates);
      const updatedCat = res || updates;
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? { ...c, ...updatedCat } : c)),
      }));
      return updatedCat;
    } catch (err: any) {
      console.error('Failed to update category on backend:', err);
      throw err;
    }
  },

  deleteCategory: async (id) => {
    try {
      await cleanzoApi.services.deleteCategory(id);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
      }));
      return true;
    } catch (err: any) {
      console.error('Failed to delete category on backend:', err);
      throw err;
    }
  },

  toggleCategoryActive: async (id) => {
    const existing = get().categories.find((c) => c.id === id);
    if (!existing) return false;
    const newActive = !existing.active;
    try {
      await cleanzoApi.services.updateCategory(id, { active: newActive });
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? { ...c, active: newActive } : c)),
      }));
      return true;
    } catch (err: any) {
      console.error('Failed to toggle category active on backend:', err);
      throw err;
    }
  },
}));
