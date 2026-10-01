'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomerNotification } from '@/types';

interface CustomerNotificationState {
  notifications: CustomerNotification[];
  addNotification: (notif: Omit<CustomerNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
  clearAll: () => void;
}

export const useCustomerNotificationStore = create<CustomerNotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notif) => {
        const newNotif: CustomerNotification = {
          ...notif,
          id: `cnotif-${Date.now()}`,
          timestamp: 'الآن',
          read: false,
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },

      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'cleanzo-customer-notifications',
    }
  )
);
