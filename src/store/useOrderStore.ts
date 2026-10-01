'use client';

import { create } from 'zustand';
import { Order, OrderStatus, Technician } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useCustomerStore } from './useCustomerStore';
import { useNotificationStore } from './useNotificationStore';
import { useCustomerNotificationStore } from './useCustomerNotificationStore';

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  fetchMyOrders: () => Promise<Order[]>;
  fetchAdminOrders: (params?: any) => Promise<Order[]>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string, actor?: string) => void;
  updateOrderStatusApi: (orderId: string, status: OrderStatus, note?: string) => Promise<Order>;
  assignTechnician: (orderId: string, technician: Technician) => void;
  bulkUpdateStatus: (orderIds: string[], status: OrderStatus) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  deleteOrder: (orderId: string) => Promise<void> | void;
  updateOrderNotes: (orderId: string, notes: string) => void;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByStatus: (status?: OrderStatus | 'all') => Order[];
}

const statusLabels: Record<OrderStatus, { ar: string; en: string; descAr: string; descEn: string }> = {
  pending: {
    ar: 'قيد المراجعة',
    en: 'Pending Review',
    descAr: 'تم استلام طلب الحجز وجارٍ مراجعته.',
    descEn: 'Order received and is pending review.',
  },
  confirmed: {
    ar: 'مستلم',
    en: 'Order Received',
    descAr: 'تم استلام وتأكيد طلب الحجز من الإدارة.',
    descEn: 'Booking accepted and scheduled.',
  },
  assigned: {
    ar: 'تم تعيين الفني المختص',
    en: 'Technician Assigned',
    descAr: 'تم إسناد الطلب للفني المختص وجاهز للانطلاق.',
    descEn: 'Specialized technician assigned.',
  },
  in_progress: {
    ar: 'الخدمة جارية الآن',
    en: 'Service In Progress',
    descAr: 'بدأ الفني في تنفيذ أعمال التنظيف والعناية بالموقع.',
    descEn: 'Technician is performing the service.',
  },
  completed: {
    ar: 'تم إتمام الخدمة بنجاح',
    en: 'Completed Successfully',
    descAr: 'انتهت الخدمة بالكامل وتم التأكد من رضا العميل.',
    descEn: 'Service completed with customer satisfaction.',
  },
  cancelled: {
    ar: 'تم إلغاء الطلب',
    en: 'Order Cancelled',
    descAr: 'تم إلغاء طلب الحجز.',
    descEn: 'Booking was cancelled.',
  },
};

export const useOrderStore = create<OrderState>((set, get) => ({
      orders: [],
      isLoading: false,

      setOrders: (orders: Order[]) => {
        set({ orders });
      },

      addOrder: (newOrder: Order) => {
        set((state) => {
          // Prevent duplicates if order already exists in state
          const exists = state.orders.some((o) => o.id === newOrder.id);
          if (exists) {
            return {
              orders: state.orders.map((o) => (o.id === newOrder.id ? newOrder : o)),
            };
          }
          return {
            orders: [newOrder, ...state.orders],
          };
        });

        // Automatically sync customer profile in useCustomerStore
        try {
          const custStore = useCustomerStore.getState();
          const phone = newOrder.customerPhone || (newOrder as any).customer?.phone || (newOrder as any).guestPhone || (newOrder as any).phone;
          const name = newOrder.customerName || (newOrder as any).customer?.name || (newOrder as any).guestName || (newOrder as any).name || 'عميل كلينزو';
          if (phone) {
            const existing = custStore.customers.find((c) => c.phone === phone);
            if (existing) {
              custStore.updateCustomer(existing.id, {
                ordersCount: (existing.ordersCount || 0) + 1,
                totalSpent: (existing.totalSpent || 0) + (newOrder.finalPrice || 0),
              });
            } else {
              custStore.addCustomer({
                name,
                phone,
                email: (newOrder as any).customer?.email || (newOrder as any).email || '',
                avatar: '',
                status: 'active',
                source: 'website',
                tags: ['طلب جديد'],
                addresses: newOrder.address ? [newOrder.address] : [],
              });
            }
          }
        } catch {
          // safe fallback
        }

        // Automatically dispatch notifications to Admin and Customer
        try {
          const serviceTitle = newOrder.service?.title || 'خدمة كلينزو';
          const custName = newOrder.customerName || (newOrder as any).guestName || 'عميل كلينزو';

          useNotificationStore.getState().addNotification({
            title: 'طلب حجز جديد',
            titleEn: 'New Booking Created',
            message: `طلب جديد برقم #${newOrder.id} لخدمة ${serviceTitle} للعميل ${custName} بقيمة ${newOrder.finalPrice || 0} ج.م`,
            messageEn: `New booking #${newOrder.id} for ${serviceTitle} by ${custName}`,
            type: 'order',
            link: `/admin/orders/${newOrder.id}`,
          });

          useCustomerNotificationStore.getState().addNotification({
            title: '✓ تم استلام طلبك بنجاح',
            titleEn: 'Booking Received',
            message: `تم استلام طلبك رقم #${newOrder.id} لخدمة ${serviceTitle} بنجاح، وسنتواصل معك قريباً.`,
            messageEn: `Your booking #${newOrder.id} was placed successfully.`,
            type: 'order',
            link: `/track/${newOrder.id}`,
          });
        } catch {
          // Non-blocking
        }
      },

      fetchMyOrders: async () => {
        set({ isLoading: true });
        try {
          const res = await cleanzoApi.bookings.getMyBookings();
          if (Array.isArray(res)) {
            const mapped = res.map((b: any) => ({
              ...b,
              service: b.service || b.serviceSnapshot || {
                id: b.serviceId || 'srv-unknown',
                title: b.serviceSnapshot?.title || 'خدمة كلينزو',
                titleEn: b.serviceSnapshot?.titleEn || 'Cleanzo Service',
                category: b.category || b.serviceSnapshot?.category || 'car',
                price: b.finalPrice || b.serviceSnapshot?.price || 0,
              },
            }));
            set({ orders: mapped });
            return mapped;
          }
          return get().orders;
        } catch (err) {
          console.warn('[useOrderStore] Could not fetch customer bookings from API, keeping current state:', err);
          return get().orders;
        } finally {
          set({ isLoading: false });
        }
      },

      fetchAdminOrders: async (params?: any) => {
        set({ isLoading: true });
        try {
          const res = await cleanzoApi.admin.getOrders(params);
          if (res && Array.isArray(res.bookings)) {
            const mapped = res.bookings.map((b: any) => ({
              ...b,
              service: b.service || b.serviceSnapshot || {
                id: b.serviceId || 'srv-unknown',
                title: b.serviceSnapshot?.title || 'خدمة كلينزو',
                titleEn: b.serviceSnapshot?.titleEn || 'Cleanzo Service',
                category: b.category || b.serviceSnapshot?.category || 'car',
                price: b.finalPrice || b.serviceSnapshot?.price || 0,
              },
            }));
            set({ orders: mapped });
            return mapped;
          }
          return get().orders;
        } catch (err) {
          console.warn('[useOrderStore] Could not fetch admin bookings from API, keeping current state:', err);
          return get().orders;
        } finally {
          set({ isLoading: false });
        }
      },

      updateOrderStatusApi: async (orderId: string, status: OrderStatus, note?: string) => {
        try {
          const updated = await cleanzoApi.admin.updateOrderStatus(orderId, status, note);
          if (updated && updated.id) {
            set((state) => ({
              orders: state.orders.map((o) => (o.id === orderId ? { ...o, ...updated } : o)),
            }));
            return updated;
          }
          get().updateOrderStatus(orderId, status, note);
          return get().getOrderById(orderId) as Order;
        } catch (err) {
          throw err;
        }
      },

      updateOrderStatus: (orderId, status, note, actor = 'إدارة كلينزو') => {
        const info = statusLabels[status] || statusLabels.pending;
        const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        set((state) => ({
          orders: state.orders.map((o) => {
            if (o.id !== orderId) return o;

            const updatedTimeline = [
              ...(o.timeline || []),
              {
                status,
                label: info.ar,
                labelEn: info.en,
                timestamp: now,
                completed: true,
                description: note || `${info.descAr} (بواسطة ${actor})`,
                descriptionEn: note || `${info.descEn} (By ${actor})`,
              },
            ];

            return {
              ...o,
              status,
              timeline: updatedTimeline,
            };
          }),
        }));

        // Dispatch notifications on status change
        try {
          const order = get().getOrderById(orderId);
          const custName = order?.customerName || 'العميل';
          const srvTitle = order?.service?.title || 'الخدمة';

          useNotificationStore.getState().addNotification({
            title: `تحديث حالة الطلب #${orderId}`,
            titleEn: `Order #${orderId} Status Updated`,
            message: `تم تحديث حالة طلب ${custName} لخدمة ${srvTitle} إلى: (${info.ar})`,
            messageEn: `Order #${orderId} status changed to ${info.en}`,
            type: 'order',
            link: `/admin/orders/${orderId}`,
          });

          useCustomerNotificationStore.getState().addNotification({
            title: `حالة طلبك: ${info.ar}`,
            titleEn: `Order Update: ${info.en}`,
            message: note || `${info.descAr}`,
            messageEn: note || `${info.descEn}`,
            type: 'order',
            link: `/track/${orderId}`,
          });
        } catch {
          // Non-blocking
        }
      },

      assignTechnician: (orderId, technician) => {
        const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        set((state) => ({
          orders: state.orders.map((o) => {
            if (o.id !== orderId) return o;

            return {
              ...o,
              technician,
              status: 'assigned' as OrderStatus,
              timeline: [
                ...(o.timeline || []),
                {
                  status: 'assigned' as OrderStatus,
                  label: 'تم تعيين الفني المختص',
                  labelEn: 'Technician Assigned',
                  timestamp: now,
                  completed: true,
                  description: `تم إسناد الطلب للكابتن ${technician.name} (${technician.specialty})`,
                  descriptionEn: `Assigned to ${technician.name}`,
                },
              ],
            };
          }),
        }));

        // Dispatch notification for technician assignment
        try {
          useNotificationStore.getState().addNotification({
            title: 'إسناد فني لميدان العمل',
            titleEn: 'Technician Assigned',
            message: `تم إسناد الطلب #${orderId} إلى الفني الكابتن ${technician.name} (${technician.specialty || 'فني ميداني'}).`,
            messageEn: `Order #${orderId} assigned to ${technician.name}`,
            type: 'technician',
            link: `/admin/orders/${orderId}`,
          });

          useCustomerNotificationStore.getState().addNotification({
            title: '🚗 تم تعيين الفني المختص',
            titleEn: 'Technician Assigned',
            message: `تم إسناد طلبك #${orderId} للكابتن ${technician.name} وفريق كلينزو جاهز للخدمة.`,
            messageEn: `Technician ${technician.name} has been assigned to your order #${orderId}.`,
            type: 'order',
            link: `/track/${orderId}`,
          });
        } catch {
          // Non-blocking
        }
      },

      bulkUpdateStatus: (orderIds, status) => {
        set((state) => ({
          orders: state.orders.map((o) => {
            if (orderIds.includes(o.id)) {
              return { ...o, status };
            }
            return o;
          }),
        }));
      },

      cancelOrder: (orderId, reason) => {
        get().updateOrderStatus(
          orderId,
          'cancelled',
          reason ? `تم الإلغاء: ${reason}` : 'تم إلغاء الحجز بناءً على طلب الإدارة/العميل.'
        );
      },

      deleteOrder: async (orderId) => {
        try {
          await cleanzoApi.admin.deleteOrder(orderId);
        } catch (e) {
          console.warn('Backend order delete error:', e);
        }
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== orderId),
        }));
      },

      updateOrderNotes: (orderId, notes) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, notes } : o)),
        }));
      },

      getOrderById: (orderId: string) => {
        return get().orders.find((o) => o.id === orderId);
      },

      getOrdersByStatus: (status = 'all') => {
        if (!status || status === 'all') {
          return get().orders;
        }
        return get().orders.filter((o) => o.status === status);
      },
    })
);
