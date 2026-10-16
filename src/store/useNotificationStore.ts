'use client';

import { create } from 'zustand';
import { AdminNotificationItem } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface NotificationState {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  addNotification: (item: Omit<AdminNotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  cleanupDuplicates: () => Promise<void>;
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
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const remote = await cleanzoApi.notifications.getAdmin();
      const rawList = Array.isArray(remote)
        ? remote
        : Array.isArray(remote?.notifications)
        ? remote.notifications
        : [];

      const mapped: AdminNotificationItem[] = rawList.map((item: any) => ({
        id: item.id || item._id?.toString() || `notif-${Date.now()}`,
        eventId: item.eventId,
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

      // Deduplicate in client memory as safety net
      const seen = new Set<string>();
      const deduplicated: AdminNotificationItem[] = [];
      for (const n of mapped) {
        const key = n.eventId || `${n.title}__${n.message}__${n.link || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(n);
        }
      }

      const backendUnread =
        typeof remote?.unreadCount === 'number'
          ? remote.unreadCount
          : deduplicated.filter((n) => !n.read).length;

      set({
        notifications: deduplicated,
        unreadCount: backendUnread,
        isLoading: false,
      });
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
    set((state) => {
      const nextList = [newNotif, ...state.notifications];
      return {
        notifications: nextList,
        unreadCount: state.unreadCount + 1,
      };
    });

    // Non-blocking background sync to server
    try {
      cleanzoApi.notifications
        .createAdmin({
          title: item.title,
          titleEn: item.titleEn,
          message: item.message,
          messageEn: item.messageEn,
          type: item.type,
          link: item.link,
          target: 'admin',
          eventId: item.eventId,
        })
        .catch(() => {});
    } catch {}
  },

  markAsRead: async (id) => {
    set((state) => {
      const nextList = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return {
        notifications: nextList,
        unreadCount: nextList.filter((n) => !n.read).length,
      };
    });
    try {
      const res = await cleanzoApi.notifications.markAdminRead(id);
      if (typeof res?.unreadCount === 'number') {
        set({ unreadCount: res.unreadCount });
      }
    } catch {}
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    try {
      const res = await cleanzoApi.notifications.markAllAdminRead();
      if (typeof res?.unreadCount === 'number') {
        set({ unreadCount: res.unreadCount });
      }
    } catch {}
  },

  clearAll: async () => {
    set({ notifications: [], unreadCount: 0 });
    try {
      await cleanzoApi.notifications.clearAllAdmin();
    } catch {}
  },

  deleteNotification: async (id) => {
    set((state) => {
      const nextList = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: nextList,
        unreadCount: nextList.filter((n) => !n.read).length,
      };
    });
    try {
      const res = await cleanzoApi.notifications.deleteAdmin(id);
      if (typeof res?.unreadCount === 'number') {
        set({ unreadCount: res.unreadCount });
      }
    } catch {}
  },

  cleanupDuplicates: async () => {
    try {
      const res = await cleanzoApi.notifications.cleanupDuplicates();
      if (res && typeof res.unreadCount === 'number') {
        set({ unreadCount: res.unreadCount });
      }
      await get().fetchNotifications();
    } catch {}
  },

  resetToDefaults: () => {
    set({ notifications: initialNotifications, unreadCount: 0 });
  },

  getUnreadCount: () => {
    const state = get();
    return typeof state.unreadCount === 'number'
      ? state.unreadCount
      : state.notifications.filter((n) => !n.read).length;
  },
}));
