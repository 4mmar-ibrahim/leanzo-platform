'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { useAddressStore } from '@/store/useAddressStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useCustomerNotificationStore } from '@/store/useCustomerNotificationStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import {
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
} from '@/lib/validation/phoneValidation';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  authStatus: 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';
  rememberMe: boolean;
  initAuth: () => Promise<void>;
  login: (
    phone: string,
    password?: string,
    remember?: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  register: (
    dataOrName: string | { name: string; phone: string; password?: string; email?: string },
    phoneArg?: string,
    passwordArg?: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: {
    name?: string;
    email?: string;
    phone?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  resetDemoUser: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      authStatus: 'AUTH_LOADING',
      rememberMe: true,
      initAuth: async () => {
        try {
          const session = await cleanzoApi.auth.refresh();
          if (session?.token && session?.user) {
            set({ user: session.user, token: session.token, isAuthenticated: true, authStatus: 'AUTHENTICATED' });
            return;
          }
        } catch {}
        if (get().token) {
          try {
            const user = await cleanzoApi.auth.getProfile();
            if (user?.id) {
              set({ user, isAuthenticated: true, authStatus: 'AUTHENTICATED' });
              return;
            }
          } catch {}
        }
        set({ user: null, token: null, isAuthenticated: false, authStatus: 'UNAUTHENTICATED' });
      },

      login: async (phone, password, remember = true) => {
        const validPhone = validateEgyptianPhone(phone.trim());
        if (!validPhone.isValid || !password?.trim()) {
          return { success: false, message: validPhone.message || 'يرجى إدخال رقم الهاتف وكلمة المرور' };
        }
        try {
          const session = await cleanzoApi.auth.login(phone.trim(), password);
          if (!session?.user || !session.token) throw new Error('تعذر تأكيد تسجيل الدخول');
          set({ user: session.user, token: session.token, isAuthenticated: true, authStatus: 'AUTHENTICATED', rememberMe: remember });
          return { success: true };
        } catch (error) {
          return { success: false, message: error instanceof Error ? error.message : 'تعذر تسجيل الدخول' };
        }
      },

      register: async (input, phoneArg, passwordArg) => {
        const data = typeof input === 'string' ? { name: input, phone: phoneArg || '', password: passwordArg } : input;
        const name = data.name.trim();
        const phone = data.phone.trim();
        const password = data.password;
        const validPhone = validateEgyptianPhone(phone);
        if (!validPhone.isValid) return { success: false, message: validPhone.message || CANONICAL_PHONE_ERROR_MESSAGE };
        if (!name || !password || password.length < 6) {
          return { success: false, message: 'يرجى إدخال الاسم وكلمة مرور من 6 خانات على الأقل' };
        }
        try {
          const session = await cleanzoApi.auth.register({ name, phone, password, email: data.email?.trim() });
          if (!session?.user || !session.token) throw new Error('تعذر تأكيد إنشاء الحساب');
          set({ user: session.user, token: session.token, isAuthenticated: true, authStatus: 'AUTHENTICATED', rememberMe: true });
          return { success: true };
        } catch (error) {
          return { success: false, message: error instanceof Error ? error.message : 'تعذر إنشاء الحساب' };
        }
      },

      logout: () => {
        cleanzoApi.auth.logout().catch(() => {});
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          authStatus: 'UNAUTHENTICATED',
        });
        try {
          useAddressStore.getState().clearAddresses();
        } catch {}
        try {
          useBookingStore.getState().resetBooking();
          useBookingStore.getState().clearCustomerInfo();
        } catch {}
        try {
          useCustomerNotificationStore.getState().clearAll();
        } catch {}
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('cleanzo_address_storage');
            localStorage.removeItem('cleanzo_booking_store');
            localStorage.removeItem('cleanzo-customer-notifications');
            localStorage.removeItem('cleanzo-auth-storage');
            sessionStorage.clear();
          } catch {}
        }
      },

      updateProfile: async ({ name, email, phone }) => {
        const current = get().user;
        if (!current) return { success: false, message: 'المستخدم غير مسجل' };

        const cleanName = name !== undefined ? name.trim() : current.name;
        const cleanEmail = email !== undefined ? email.trim() : current.email;
        let cleanPhone = current.phone;

        if (phone !== undefined) {
          cleanPhone = phone.trim();
          const phoneVal = validateEgyptianPhone(cleanPhone);
          if (!phoneVal.isValid) {
            return {
              success: false,
              message: phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
            };
          }
        }

        try {
          const res = await cleanzoApi.auth.updateProfile({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
          });
          if (res) {
            const updatedUser = {
              ...current,
              name: res.name || cleanName,
              email: res.email || cleanEmail,
              phone: res.phone || cleanPhone,
            };
            set({ user: updatedUser });
            return { success: true };
          }
        } catch (err: any) {
          if (err?.code === 'PHONE_ALREADY_EXISTS') {
            return {
              success: false,
              message: 'رقم الهاتف مسجل بالفعل لحساب آخر',
            };
          }
          return {
            success: false,
            message: err?.message || 'فشل تحديث البيانات في الخادم',
          };
        }

        return { success: false, message: 'تعذر تأكيد تحديث البيانات' };
      },

      resetDemoUser: () => {
        return false;
      },
    }),
    {
      name: 'cleanzo-auth-storage',
      version: 1,
      migrate: () => ({}),
      partialize: (state) => ({
        token: state.rememberMe ? state.token : null,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

// Cross-tab and in-tab live session synchronization for customer auth
if (typeof window !== 'undefined') {
  window.addEventListener('cleanzo:customer-token-changed', (event: any) => {
    if (event?.detail?.token) {
      useAuthStore.setState({
        token: event.detail.token,
        user: event.detail.user || useAuthStore.getState().user,
        isAuthenticated: true,
        authStatus: 'AUTHENTICATED',
      });
    }
  });

  window.addEventListener('cleanzo:customer-session-expired', () => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
      authStatus: 'UNAUTHENTICATED',
    });
    try {
      useAddressStore.getState().clearAddresses();
    } catch {}
    // Retain useBookingStore selections so user does not lose chosen service & datetime
    try {
      useCustomerNotificationStore.getState().clearAll();
    } catch {}
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cleanzo_address_storage');
        localStorage.removeItem('cleanzo-customer-notifications');
      } catch {}
    }
  });
}

