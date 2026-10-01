'use client';

import { create } from 'zustand';
import { AdminNotificationItem } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface NotificationState {
  notifications: AdminNotificationItem[];
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (item: Omit<AdminNotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  resetToDefaults: () => void;
  getUnreadCount: () => number;
}

export const initialNotifications: AdminNotificationItem[] = [];

function formatTimeAgo(dateStr?: string | Date): string {
  if (!dateStr) return 'الآن';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'الآن';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'أمس';
    return `منذ ${diffDays} يوم`;
  } catch {
    return 'الآن';
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const remoteList = await cleanzoApi.notifications.getAdmin();
      if (Array.isArray(remoteList)) {
        const mapped: AdminNotificationItem[] = remoteList.map((item: any) => ({
          id: item.id || item._id?.toString() || `notif-${Date.now()}`,
          title: item.title,
          titleEn: item.titleEn || item.title,
          message: item.message,
          messageEn: item.messageEn || item.message,
          type: ['order', 'customer', 'technician', 'system'].includes(item.type)
            ? item.type
            : 'system',
          timestamp: formatTimeAgo(item.createdAt),
          read: Boolean(item.read),
          link: item.link,
        }));

        set({ notifications: mapped, isLoading: false });
        return;
      }
    } catch {
      // Keep state clean on error
    } finally {
      set({ isLoading: false });
    }
  },

      addNotification: (item) => {
        const newNotif: AdminNotificationItem = {
          ...item,
          id: `notif-${Date.now()}`,
          timestamp: 'الآن',
          read: false,
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }));

        // Non-blocking background sync to server
        try {
          cleanzoApi.notifications.createAdmin({
            title: item.title,
            titleEn: item.titleEn,
            message: item.message,
            messageEn: item.messageEn,
            type: item.type,
            link: item.link,
            target: 'admin',
          }).catch(() => {});
        } catch {}
      },

      markAsRead: async (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        try {
          await cleanzoApi.notifications.markAdminRead(id);
        } catch {}
      },

      markAllAsRead: async () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
        try {
          await cleanzoApi.notifications.markAllAdminRead();
        } catch {}
      },

      clearAll: async () => {
        set({ notifications: [] });
        try {
          await cleanzoApi.notifications.clearAllAdmin();
        } catch {}
      },

      deleteNotification: async (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
        try {
          await cleanzoApi.notifications.deleteAdmin(id);
        } catch {}
      },

      resetToDefaults: () => {
        set({ notifications: initialNotifications });
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    })
);
