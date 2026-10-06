'use client';

import { create } from 'zustand';
import { CustomerProfile } from '@/types';
import { useNotificationStore } from './useNotificationStore';

interface CustomerState {
  customers: CustomerProfile[];
  addCustomer: (customer: Omit<CustomerProfile, 'id' | 'createdAt' | 'ordersCount' | 'completedOrdersCount' | 'cancelledOrdersCount' | 'totalSpent' | 'notes'>) => void;
  updateCustomer: (id: string, updates: Partial<CustomerProfile>) => void;
  deleteCustomer: (id: string) => void;
  restoreCustomer: (id: string) => void;
  toggleCustomerStatus: (id: string) => void;
  addCustomerNote: (id: string, text: string, author: string) => void;
  setCustomerDiscount: (id: string, discount: number) => void;
  getCustomerById: (id: string) => CustomerProfile | undefined;
}

/**
 * Synchronizes customer status change (especially deactivation) to the customer auth session
 */
function syncCustomerStatusToAuth(phone: string, status: 'active' | 'inactive' | 'suspended' | 'deleted' | 'disabled') {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('cleanzo-auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.user?.phone === phone) {
        if (status === 'inactive' || status === 'suspended' || status === 'deleted' || status === 'disabled') {
          parsed.state.isAuthenticated = false;
          parsed.state.user = null;
          parsed.state.token = null;
        } else if (parsed?.state?.user) {
          parsed.state.user.status = 'active';
        }
        localStorage.setItem('cleanzo-auth-storage', JSON.stringify(parsed));
        window.dispatchEvent(new Event('storage'));
      }
    }
  } catch {
    // Non-blocking
  }
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
      customers: [],

      addCustomer: (data) => {
        const newCustomer: CustomerProfile = {
          ...data,
          id: (data as any).id || `usr-${Date.now().toString().slice(-4)}`,
          createdAt: (data as any).createdAt || new Date().toISOString().split('T')[0],
          totalSpent: (data as any).totalSpent || 0,
          ordersCount: (data as any).ordersCount || 0,
          completedOrdersCount: (data as any).completedOrdersCount || 0,
          cancelledOrdersCount: (data as any).cancelledOrdersCount || 0,
          notes: (data as any).notes || [],
        };
        set((state) => ({
          customers: [newCustomer, ...state.customers],
        }));

        try {
          useNotificationStore.getState().addNotification({
            title: 'عميل جديد مسجل',
            titleEn: 'New Customer Registered',
            message: `تم تسجيل عميل جديد بالمنصة: ${newCustomer.name} (${newCustomer.phone}).`,
            messageEn: `New customer registered: ${newCustomer.name}`,
            type: 'customer',
            link: `/admin/customers/${newCustomer.id}`,
          });
        } catch {
          // Non-blocking
        }
      },

      updateCustomer: (id, updates) => {
        set((state) => {
          const updatedList = state.customers.map((c) => {
            if (c.id === id || (c as any)._id === id) {
              const updated = { ...c, ...updates };
              if (updates.status && updated.phone) {
                syncCustomerStatusToAuth(updated.phone, updates.status);
              }
              return updated;
            }
            return c;
          });
          return { customers: updatedList };
        });
      },

      deleteCustomer: (id) => {
        const target = get().customers.find((c) => c.id === id || (c as any)._id === id);
        if (target?.phone) {
          syncCustomerStatusToAuth(target.phone, 'deleted');
        }
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id && (c as any)._id !== id),
        }));
      },

      restoreCustomer: (id) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id || (c as any)._id === id
              ? {
                  ...c,
                  status: 'active',
                  isDeleted: false,
                  deletedAt: undefined,
                  deletedBy: undefined,
                }
              : c
          ),
        }));
      },

      toggleCustomerStatus: (id) => {
        set((state) => {
          let updatedPhone = '';
          let finalStatus: 'active' | 'inactive' = 'active';

          const updatedList = state.customers.map((c) => {
            if (c.id === id || (c as any)._id === id) {
              finalStatus = c.status === 'active' ? 'inactive' : 'active';
              updatedPhone = c.phone;
              return { ...c, status: finalStatus };
            }
            return c;
          });

          if (updatedPhone) {
            syncCustomerStatusToAuth(updatedPhone, finalStatus);
          }

          return { customers: updatedList };
        });
      },

      addCustomerNote: (id, text, author) => {
        const newNote = {
          id: `note-${Date.now()}`,
          text,
          date: new Date().toISOString().split('T')[0],
          author,
        };
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id || (c as any)._id === id
              ? { ...c, notes: [newNote, ...(c.notes || [])] }
              : c
          ),
        }));
      },

      setCustomerDiscount: (id, discount) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id || (c as any)._id === id ? { ...c, discount } : c
          ),
        }));
      },

      getCustomerById: (id) => {
        return get().customers.find((c) => c.id === id || (c as any)._id === id);
      },
    })
);
