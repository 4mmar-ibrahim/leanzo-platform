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

const defaultNotifications: CustomerNotification[] = [
  {
    id: 'cnotif-1',
    title: '🚗 الفني في الطريق إليك',
    titleEn: 'Technician is on the way',
    message: 'تحرك الكابتن أحمد بالوحدة المتنقلة وسيصل إلى موقعك خلال 15 دقيقة تقريباً.',
    messageEn: 'Technician Ahmed has departed and will arrive in approx 15 mins.',
    timestamp: 'منذ 10 دقائق',
    read: false,
    type: 'order',
    link: '/account/orders/CLZ-2026-000124',
  },
  {
    id: 'cnotif-2',
    title: '✓ تم تأكيد موعد حجزك',
    titleEn: 'Booking Confirmed',
    message: 'تم قبول وتأكيد طلبك رقم #CLZ-2026-000124 لخدمة تلميع النانو سيراميك.',
    messageEn: 'Your booking #CLZ-2026-000124 has been confirmed.',
    timestamp: 'منذ ساعتين',
    read: false,
    type: 'order',
    link: '/account/orders/CLZ-2026-000124',
  },
  {
    id: 'cnotif-3',
    title: '🎁 كود خصم ترحيبي 20%',
    titleEn: 'Welcome 20% Discount',
    message: 'استخدم كود WELCOME20 واحصل على خصم 20% على أي باقة غسيل سيارات أو تنظيف منازل.',
    messageEn: 'Use code WELCOME20 to get 20% off on your next service.',
    timestamp: 'أمس',
    read: true,
    type: 'offer',
    link: '/offers',
  },
];

export const useCustomerNotificationStore = create<CustomerNotificationState>()(
  persist(
    (set, get) => ({
      notifications: defaultNotifications,

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
