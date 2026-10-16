'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomerNotification } from '@/types';

interface CustomerNotificationState {
  notifications: CustomerNotification[];
  addNotification: (notif: Omit<CustomerNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId?: string, phone?: string) => void;
  getUnreadCount: (userId?: string, phone?: string) => number;
  getUserNotifications: (userId?: string, phone?: string) => CustomerNotification[];
  clearAll: () => void;
  purgeLegacyUnscoped: () => void;
}

export const useCustomerNotificationStore = create<CustomerNotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notif) => {
        const newNotif: CustomerNotification = {
          ...notif,
          id: `cnotif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: 'الآن',
          read: false,
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }));
      },

      getUserNotifications: (userId?: string, phone?: string) => {
        const all = get().notifications;
        if (!userId && !phone) {
          // Unauthenticated: only general broadcast offers
          return all.filter((n) => n.type === 'offer' && !n.userId && !n.customerPhone);
        }

        const cleanPhone = phone ? phone.replace(/[\s-]/g, '') : '';

        return all.filter((n) => {
          // If notification is explicitly addressed to this user or phone
          if (userId && n.userId && n.userId === userId) return true;
          if (cleanPhone && n.customerPhone) {
            const notifPhone = n.customerPhone.replace(/[\s-]/g, '');
            if (notifPhone && (cleanPhone.endsWith(notifPhone) || notifPhone.endsWith(cleanPhone))) {
              return true;
            }
          }
          // Broadcast offer
          if (n.type === 'offer' && !n.userId && !n.customerPhone) {
            return true;
          }
          return false;
        });
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllAsRead: (userId?: string, phone?: string) => {
        if (!userId && !phone) {
          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
          }));
          return;
        }

        const cleanPhone = phone ? phone.replace(/[\s-]/g, '') : '';
        set((state) => ({
          notifications: state.notifications.map((n) => {
            const isTarget =
              (userId && n.userId === userId) ||
              (cleanPhone && n.customerPhone && (cleanPhone.endsWith(n.customerPhone.replace(/[\s-]/g, '')) || n.customerPhone.replace(/[\s-]/g, '').endsWith(cleanPhone))) ||
              (n.type === 'offer' && !n.userId && !n.customerPhone);
            return isTarget ? { ...n, read: true } : n;
          }),
        }));
      },

      getUnreadCount: (userId?: string, phone?: string) => {
        const userNotifs = get().getUserNotifications(userId, phone);
        return userNotifs.filter((n) => !n.read).length;
      },

      clearAll: () => set({ notifications: [] }),

      purgeLegacyUnscoped: () => {
        // Discard any legacy order notifications that have no userId and no customerPhone
        set((state) => ({
          notifications: state.notifications.filter(
            (n) => (n.type === 'offer' && !n.userId) || !!n.userId || !!n.customerPhone
          ),
        }));
      },
    }),
    {
      name: 'cleanzo-customer-notifications',
    }
  )
);
