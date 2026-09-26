import { create } from 'zustand';
import { MediaItem } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface MediaState {
  items: MediaItem[];
  isLoading: boolean;
  error: string | null;
  activeFilter: 'all' | 'image' | 'video';
  searchQuery: string;
  stats: {
    totalItems: number;
    imagesCount: number;
    videosCount: number;
    totalBytes: number;
  };
  setFilter: (filter: 'all' | 'image' | 'video') => void;
  setSearchQuery: (query: string) => void;
  fetchMedia: () => Promise<void>;
  uploadFromDevice: (file: File) => Promise<MediaItem>;
  importFromUrl: (url: string, type?: 'image' | 'video') => Promise<MediaItem>;
  deleteMediaItem: (id: string) => Promise<boolean>;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  activeFilter: 'all',
  searchQuery: '',
  stats: {
    totalItems: 0,
    imagesCount: 0,
    videosCount: 0,
    totalBytes: 0,
  },

  setFilter: (filter) => {
    set({ activeFilter: filter });
    get().fetchMedia();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchMedia();
  },

  fetchMedia: async () => {
    set({ isLoading: true, error: null });
    try {
      const { activeFilter, searchQuery } = get();
      const params: any = {};
      if (activeFilter !== 'all') params.type = activeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await cleanzoApi.media.getAll(params);
      set({
        items: response.items || [],
        stats: response.stats || {
          totalItems: response.items?.length || 0,
          imagesCount: 0,
          videosCount: 0,
          totalBytes: 0,
        },
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'فشل جلب ملفات الوسائط', isLoading: false });
    }
  },

  uploadFromDevice: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const item = await cleanzoApi.media.upload(file);
      set((state) => ({
        items: [item, ...state.items],
        isLoading: false,
        stats: {
          ...state.stats,
          totalItems: state.stats.totalItems + 1,
          imagesCount: item.type === 'image' ? state.stats.imagesCount + 1 : state.stats.imagesCount,
          videosCount: item.type === 'video' ? state.stats.videosCount + 1 : state.stats.videosCount,
          totalBytes: state.stats.totalBytes + item.size,
        },
      }));
      return item;
    } catch (err: any) {
      set({ error: err.message || 'فشل رفع الملف', isLoading: false });
      throw err;
    }
  },

  importFromUrl: async (url: string, type?: 'image' | 'video') => {
    set({ isLoading: true, error: null });
    try {
      const item = await cleanzoApi.media.importUrl(url, type);
      set((state) => ({
        items: [item, ...state.items],
        isLoading: false,
        stats: {
          ...state.stats,
          totalItems: state.stats.totalItems + 1,
          imagesCount: item.type === 'image' ? state.stats.imagesCount + 1 : state.stats.imagesCount,
          videosCount: item.type === 'video' ? state.stats.videosCount + 1 : state.stats.videosCount,
          totalBytes: state.stats.totalBytes + item.size,
        },
      }));
      return item;
    } catch (err: any) {
      set({ error: err.message || 'فشل استيراد الوسائط من الرابط', isLoading: false });
      throw err;
    }
  },

  deleteMediaItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await cleanzoApi.media.delete(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id && item._id !== id),
        isLoading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message || 'فشل حذف الملف', isLoading: false });
      return false;
    }
  },
}));
