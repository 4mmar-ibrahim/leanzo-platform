'use client';

import { create } from 'zustand';
import { Order, OrderStatus, Technician } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useCustomerStore } from './useCustomerStore';
import { useNotificationStore } from './useNotificationStore';
import { useCustomerNotificationStore } from './useCustomerNotificationStore';
import { findConflictingOrder } from '@/lib/bookingEngine';

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
  rescheduleOrder: (orderId: string, newDate: string, newTime: string, reason?: string, customerPhone?: string) => Promise<Order>;
  deleteOrder: (orderId: string) => Promise<void> | void;
  updateOrderNotes: (orderId: string, notes: string) => void;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByStatus: (status?: OrderStatus | 'all') => Order[];
}

interface CustomerStatusNotifMeta {
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  titleAr: string;
  titleEn: string;
  getMsgAr: (orderId: string, srvTitle: string, extra?: { date?: string; time?: string; techName?: string; note?: string; area?: string }) => string;
  getMsgEn: (orderId: string, srvTitleEn: string, extra?: { date?: string; time?: string; techName?: string; note?: string; area?: string }) => string;
}

const statusLabels: Record<OrderStatus, CustomerStatusNotifMeta> = {
  pending: {
    ar: 'قيد المراجعة',
    en: 'Pending Review',
    descAr: 'تم استلام طلب الحجز وبانتظار المراجعة والتأكيد.',
    descEn: 'Order received and pending review.',
    titleAr: '⏳ تم استلام طلبك وبانتظار المراجعة',
    titleEn: '⏳ Booking Received & Under Review',
    getMsgAr: (id, srv, extra) =>
      `تم استلام طلبك رقم #${id} لخدمة (${srv}) بنجاح. فريق العمليات يراجع التفاصيل لتأكيد الموعد (${extra?.date || ''}${extra?.time ? ` - ${extra?.time}` : ''}). سنوافيك بالتأكيد قريباً.${extra?.note ? `\nملاحظة: ${extra.note}` : ''}`,
    getMsgEn: (id, srvEn, extra) =>
      `Your booking #${id} for (${srvEn}) was received. Our operations team is reviewing details for (${extra?.date || ''}${extra?.time ? ` at ${extra?.time}` : ''}). We will confirm shortly.${extra?.note ? `\nNote: ${extra.note}` : ''}`,
  },
  confirmed: {
    ar: 'تم تأكيد الحجز',
    en: 'Booking Confirmed',
    descAr: 'تم تأكيد موعد الحجز وتثبيت الموعد في جدول الزيارات.',
    descEn: 'Booking confirmed and scheduled.',
    titleAr: '✅ تم تأكيد موعد حجزك بنجاح',
    titleEn: '✅ Booking Confirmed Successfully',
    getMsgAr: (id, srv, extra) =>
      `يسعدنا إبلاغك بتأكيد حجزك للطلب #${id} لخدمة (${srv}) ليوم ${extra?.date || ''}${extra?.time ? ` في تمام ${extra?.time}` : ''}. أسطول كلينزو جاهز للزيارة في الموعد المحدد!${extra?.note ? `\nملاحظة: ${extra.note}` : ''}`,
    getMsgEn: (id, srvEn, extra) =>
      `Great news! Your booking #${id} for (${srvEn}) is confirmed for ${extra?.date || ''}${extra?.time ? ` at ${extra?.time}` : ''}. The Cleanzo fleet is scheduled for your visit!${extra?.note ? `\nNote: ${extra.note}` : ''}`,
  },
  assigned: {
    ar: 'تم تعيين الفني المختص',
    en: 'Technician Assigned',
    descAr: 'تم إسناد الطلب للفني المختص وتجهيز المعدات اللازمة.',
    descEn: 'Specialist technician assigned and preparing.',
    titleAr: '👷‍♂️ تم تعيين الفني المختص لخدمتك',
    titleEn: '👷‍♂️ Specialist Assigned to Your Booking',
    getMsgAr: (id, srv, extra) =>
      `تم إسناد طلبك #${id} إلى الكابتن (${extra?.techName || 'الفني المختص'}). تم تجهيز سيارة الخدمة المتنقلة بأحدث معدات ومواد النظافة والتعقيم الفندقية لزيارتك.${extra?.note ? `\nملاحظة: ${extra.note}` : ''}`,
    getMsgEn: (id, srvEn, extra) =>
      `Captain (${extra?.techName || 'our specialist'}) has been assigned to your booking #${id}. The mobile unit is equipped with top cleaning and sanitization gear for your visit.${extra?.note ? `\nNote: ${extra.note}` : ''}`,
  },
  on_the_way: {
    ar: 'الفني في الطريق إليك',
    en: 'Technician On The Way',
    descAr: 'انطلقت وحدة الخدمة المتنقلة وهي متجهة إلى الموقع الآن.',
    descEn: 'Mobile service unit en route to your location.',
    titleAr: '🚗 الفني في الطريق إلى موقعك الآن!',
    titleEn: '🚗 Technician is on the Way!',
    getMsgAr: (id, srv, extra) =>
      `انطلقت سيارة الخدمة المتنقلة بقيادة الكابتن (${extra?.techName || 'الفني'}) وهي متجهة الآن إلى عنوانك (${extra?.area || 'موقعك'}) لتنفيذ طلبك #${id}. يُرجى التواجد لاستقبال الفريق.${extra?.note ? `\nملاحظة: ${extra.note}` : ''}`,
    getMsgEn: (id, srvEn, extra) =>
      `Our mobile unit with Captain (${extra?.techName || 'our technician'}) is en route to your address (${extra?.area || 'your location'}) for booking #${id}. Please be ready to welcome the team.${extra?.note ? `\nNote: ${extra.note}` : ''}`,
  },
  in_progress: {
    ar: 'الخدمة جارية الآن',
    en: 'Service In Progress',
    descAr: 'بدأ فريق العمل تنفيذ أعمال النظافة والتعقيم بالموقع.',
    descEn: 'Service execution in progress at location.',
    titleAr: '✨ بدأ تنفيذ خدمة النظافة الآن',
    titleEn: '✨ Cleaning Service in Progress',
    getMsgAr: (id, srv, extra) =>
      `بدأ فريق كلينزو الآن تنفيذ أعمال (${srv}) لطلبك #${id} في موقعك. نحرص على تقديم أعلى معايير العناية والتألق لمكانك!${extra?.note ? `\nملاحظة: ${extra.note}` : ''}`,
    getMsgEn: (id, srvEn, extra) =>
      `Our team has started performing (${srvEn}) for your booking #${id}. We are dedicated to delivering pristine results and premium care!${extra?.note ? `\nNote: ${extra.note}` : ''}`,
  },
  completed: {
    ar: 'تم إتمام الخدمة بنجاح',
    en: 'Completed Successfully',
    descAr: 'تم تسليم العمل بالكامل بأعلى معايير الجودة والنظافة.',
    descEn: 'Service completed to the highest standards.',
    titleAr: '🎉 تم اكتمال خدمتك بنجاح.. نعيماً!',
    titleEn: '🎉 Service Completed Successfully!',
    getMsgAr: (id, srv, extra) =>
      `تم الانتهاء من تنفيذ طلبك #${id} وتسليم العمل بأعلى درجات النظافة والتعقيم. يسعدنا دائماً خدمتك ونتطلع لمعرفة تقييمك ورأيك في التجربة!${extra?.note ? `\nملاحظة: ${extra.note}` : ''}`,
    getMsgEn: (id, srvEn, extra) =>
      `Your booking #${id} has been successfully completed with the highest cleanliness standards. Thank you for choosing Cleanzo — we'd love your feedback!${extra?.note ? `\nNote: ${extra.note}` : ''}`,
  },
  cancelled: {
    ar: 'تم إلغاء الطلب',
    en: 'Order Cancelled',
    descAr: 'تم إلغاء طلب الحجز.',
    descEn: 'Booking cancelled.',
    titleAr: '❌ تم إلغاء حجز الطلب',
    titleEn: '❌ Booking Cancelled',
    getMsgAr: (id, srv, extra) =>
      `نود إبلاغك بأنه تم إلغاء حجز الطلب #${id}${extra?.note ? ` (السبب: ${extra.note})` : ''}. يمكنك إعادة جدولة الحجز أو اختيار موعد جديد في أي وقت بخطوات بسيطة.`,
    getMsgEn: (id, srvEn, extra) =>
      `Please be informed that booking #${id} has been cancelled${extra?.note ? ` (Reason: ${extra.note})` : ''}. You can easily reschedule or place a new booking anytime.`,
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
            title: '⏳ تم استلام طلبك وبانتظار المراجعة',
            titleEn: '⏳ Booking Received & Under Review',
            message: `تم استلام طلبك رقم #${newOrder.id} لخدمة (${serviceTitle}) بنجاح. فريق العمليات يراجع التفاصيل لتأكيد الموعد (${newOrder.date}${newOrder.time ? ` - ${newOrder.time}` : ''}). سنوافيك بالتأكيد قريباً.`,
            messageEn: `Your booking #${newOrder.id} for (${serviceTitle}) was received. Our team is reviewing details for (${newOrder.date}${newOrder.time ? ` at ${newOrder.time}` : ''}). We will confirm shortly.`,
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

          const notifMeta = statusLabels[status] || statusLabels.pending;
          const srvTitleEn = (order?.service as any)?.titleEn || srvTitle;
          const addressArea = typeof order?.address === 'object' ? order?.address?.area || order?.address?.city : undefined;

          useCustomerNotificationStore.getState().addNotification({
            title: notifMeta.titleAr,
            titleEn: notifMeta.titleEn,
            message: notifMeta.getMsgAr(orderId, srvTitle, {
              date: order?.date,
              time: order?.time,
              techName: order?.technician?.name,
              area: addressArea,
              note,
            }),
            messageEn: notifMeta.getMsgEn(orderId, srvTitleEn, {
              date: order?.date,
              time: order?.time,
              techName: order?.technician?.name,
              area: addressArea,
              note,
            }),
            type: 'order',
            link: `/track/${orderId}`,
          });
        } catch {
          // Non-blocking
        }
      },

      assignTechnician: (orderId, technician) => {
        const state = get();
        const currentOrder = state.orders.find((o) => o.id === orderId);
        if (currentOrder) {
          const conflict = findConflictingOrder(currentOrder, technician.id, state.orders);
          if (conflict) {
            console.warn(`Prevented overlapping technician assignment for order ${orderId} with order ${conflict.id}`);
            return;
          }
        }

        const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        set((state) => ({
          orders: state.orders.map((o) => {
            if (o.id !== orderId) return o;

            return {
              ...o,
              technician,
              assignedTechnicianId: technician.id,
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
            title: '👷‍♂️ تم تعيين الفني المختص لخدمتك',
            titleEn: '👷‍♂️ Specialist Assigned to Your Booking',
            message: `تم إسناد طلبك #${orderId} إلى الكابتن (${technician.name}). تم تجهيز سيارة الخدمة المتنقلة بأحدث معدات ومواد النظافة والتعقيم الفندقية لزيارتك.`,
            messageEn: `Captain (${technician.name}) has been assigned to your booking #${orderId}. The mobile unit is equipped with top cleaning and sanitization gear for your visit.`,
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

      rescheduleOrder: async (orderId, newDate, newTime, reason, customerPhone) => {
        const updated = await cleanzoApi.bookings.reschedule(orderId, {
          newDate,
          newTime,
          reason,
          customerPhone,
        });
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, ...updated } : o)),
        }));
        return updated;
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
