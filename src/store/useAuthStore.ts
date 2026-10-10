'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useAddressStore } from '@/store/useAddressStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useCustomerNotificationStore } from '@/store/useCustomerNotificationStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import {
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
} from '@/lib/validation/phoneValidation';

export interface RegisteredAccount {
  phone: string;
  password: string;
  name: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended' | 'deleted' | 'disabled';
  isDeleted?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  authStatus: 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';
  rememberMe: boolean;
  registeredAccounts: RegisteredAccount[];
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

/**
 * Syncs a user to the customer store so they appear in the admin customers panel.
 * Skips if the customer already exists (matched by phone).
 */
function syncUserToCustomerStore(user: User) {
  try {
    const customerStore = useCustomerStore.getState();
    const alreadyExists = customerStore.customers.some(
      (c) => c.phone === user.phone
    );
    if (!alreadyExists) {
      customerStore.addCustomer({
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        addresses: user.addresses || [],
        status: 'active',
        source: 'website',
        tags: ['عميل جديد'],
      });
    }
  } catch {
    // Silently ignore if customer store is not ready
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      authStatus: 'AUTH_LOADING',
      rememberMe: true,
      registeredAccounts: [
        {
          phone: '01012345678',
          password: 'password123',
          name: 'أحمد المحمدي',
          email: 'ahmed@cleanzo.com',
          status: 'active',
        },
      ],

      initAuth: async () => {
        set({ authStatus: 'AUTH_LOADING' });
        try {
          // 1. Silent token refresh using HttpOnly cookie
          const res = await cleanzoApi.auth.refresh();
          if (res?.token && res?.user) {
            set({
              user: res.user,
              token: res.token,
              isAuthenticated: true,
              authStatus: 'AUTHENTICATED',
            });
            syncUserToCustomerStore(res.user);
            return;
          }
        } catch (refreshErr: any) {
          if (refreshErr?.statusCode === 403) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              authStatus: 'UNAUTHENTICATED',
            });
            return;
          }
        }

        // 2. Validate current access token with profile endpoint
        const currentToken = get().token;
        if (currentToken && currentToken !== 'cleanzo-customer-local-jwt') {
          try {
            const profile = await cleanzoApi.auth.getProfile();
            if (profile) {
              set({
                user: profile,
                isAuthenticated: true,
                authStatus: 'AUTHENTICATED',
              });
              syncUserToCustomerStore(profile);
              return;
            }
          } catch (profileErr: any) {
            if (profileErr?.statusCode === 401 || profileErr?.statusCode === 403) {
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                authStatus: 'UNAUTHENTICATED',
              });
              return;
            }
          }
        }

        // 3. Fallback for local demo mode if user existed
        const existingUser = get().user;
        if (existingUser && get().isAuthenticated) {
          set({ authStatus: 'AUTHENTICATED' });
        } else {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            authStatus: 'UNAUTHENTICATED',
          });
        }
      },

      login: async (phone: string, password = 'password123', remember: boolean = true) => {
        const cleanPhone = phone.trim();
        const cleanPassword = password ? password.trim() : '';

        if (!cleanPhone || !cleanPassword) {
          return {
            success: false,
            message: 'يرجى إدخال رقم الهاتف وكلمة المرور بشكل صحيح',
          };
        }

        const phoneVal = validateEgyptianPhone(cleanPhone);
        if (!phoneVal.isValid) {
          return {
            success: false,
            message: phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
          };
        }

        // 1. Check if customer is deactivated/suspended/deleted in customerStore
        try {
          const customerStore = useCustomerStore.getState();
          const matchedCust = customerStore.customers.find((c) => c.phone === cleanPhone);
          if (matchedCust) {
            if (matchedCust.status === 'deleted' || matchedCust.status === 'disabled' || matchedCust.isDeleted) {
              return {
                success: false,
                message: 'هذا الحساب محذوف ومعطل نهائياً من قِبل إدارة كلينزو. تم حظر الدخول.',
              };
            }
            if (matchedCust.status === 'inactive' || matchedCust.status === 'suspended') {
              return {
                success: false,
                message: 'هذا الحساب معطل من قِبل إدارة كلينزو. يرجى التواصل مع خدمة العملاء.',
              };
            }
          }
        } catch {}

        // 2. Attempt Backend API Login
        try {
          const res = await cleanzoApi.auth.login(cleanPhone, cleanPassword);
          if (res && res.user && res.token) {
            set({
              user: res.user,
              token: res.token,
              isAuthenticated: true,
              authStatus: 'AUTHENTICATED',
              rememberMe: remember,
            });
            syncUserToCustomerStore(res.user);
            return { success: true };
          }
        } catch (err: any) {
          // If backend gave a specific authorization error, respect it and return failure
          if (err?.code === 'ACCOUNT_DELETED' || err?.message?.includes('محذوف ومعطل نهائياً')) {
            return {
              success: false,
              message: 'هذا الحساب محذوف ومعطل نهائياً من قِبل إدارة كلينزو. تم حظر الدخول.',
            };
          }
          if (err?.statusCode === 401 || err?.code === 'INVALID_CREDENTIALS') {
            return {
              success: false,
              message: 'رقم الهاتف أو كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.',
            };
          }
          if (err?.statusCode === 403 || err?.code === 'ACCOUNT_DEACTIVATED') {
            return {
              success: false,
              message: 'هذا الحساب معطل من قِبل إدارة كلينزو. يرجى التواصل مع خدمة العملاء.',
            };
          }
          // If backend offline / NO_REMOTE_BACKEND, fallback to local store below
        }

        // 3. Local / Offline Credential Verification
        const accounts = get().registeredAccounts || [];
        const matchedAccount = accounts.find((a) => a.phone === cleanPhone);

        if (!matchedAccount) {
          // Check if customer was created by admin in customerStore
          const customerStore = useCustomerStore.getState();
          const cust = customerStore.customers.find((c) => c.phone === cleanPhone);
          if (!cust) {
            return {
              success: false,
              message: 'رقم الهاتف أو كلمة المرور غير صحيحة. يرجى التحقق من صحة البيانات أو إنشاء حساب جديد.',
            };
          }
          // Accept default initial password if registered via admin
          if (cleanPassword !== 'password123' && cleanPassword !== '123456') {
            return {
              success: false,
              message: 'كلمة المرور غير صحيحة. يرجى إعادة المحاولة.',
            };
          }
        } else {
          if (matchedAccount.status === 'inactive' || matchedAccount.status === 'suspended') {
            return {
              success: false,
              message: 'هذا الحساب معطل من قِبل إدارة كلينزو. يرجى التواصل مع خدمة العملاء.',
            };
          }
          if (matchedAccount.password !== cleanPassword) {
            return {
              success: false,
              message: 'رقم الهاتف أو كلمة المرور غير صحيحة. يرجى إعادة المحاولة.',
            };
          }
        }

        const userName = matchedAccount?.name || 'عميل كلينزو';
        const updatedUser: User = {
          id: `usr-${cleanPhone.slice(-4)}`,
          name: userName,
          phone: cleanPhone,
          email: matchedAccount?.email,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
          createdAt: new Date().toISOString().split('T')[0],
          addresses: [],
          status: 'active',
        };

        set({
          user: updatedUser,
          token: 'cleanzo-customer-local-jwt',
          isAuthenticated: true,
          rememberMe: remember,
        });

        syncUserToCustomerStore(updatedUser);
        return { success: true };
      },

      register: async (dataOrName, phoneArg, passwordArg) => {
        let name = '';
        let phone = '';
        let password = 'password123';
        let email: string | undefined = undefined;

        if (typeof dataOrName === 'string') {
          name = dataOrName.trim();
          phone = (phoneArg || '').trim();
          if (passwordArg) password = passwordArg.trim();
        } else {
          name = (dataOrName.name || '').trim();
          phone = (dataOrName.phone || '').trim();
          if (dataOrName.password) password = dataOrName.password.trim();
          if (dataOrName.email) email = dataOrName.email.trim().toLowerCase();
        }

        // 1. Basic format validation
        if (!name || !phone) {
          return {
            success: false,
            message: 'يرجى إدخال الاسم ورقم الهاتف بالكامل',
          };
        }

        const phoneVal = validateEgyptianPhone(phone);
        if (!phoneVal.isValid) {
          return {
            success: false,
            message: phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE,
          };
        }

        if (password.length < 6) {
          return {
            success: false,
            message: 'كلمة المرور يجب أن تتكون من 6 خانات على الأقل',
          };
        }

        // 2. Check duplicate phone / email in customerStore
        try {
          const customerStore = useCustomerStore.getState();
          const existingPhone = customerStore.customers.find((c) => c.phone === phone);
          if (existingPhone) {
            if (existingPhone.status === 'deleted' || existingPhone.status === 'disabled' || existingPhone.isDeleted) {
              return {
                success: false,
                message: 'بيانات هذا الحساب (رقم الهاتف) محظورة ومحذوفة مسبقاً من قِبل الإدارة. لا يمكن إنشاء حساب جديد بهذه البيانات.',
              };
            }
            if (existingPhone.status === 'inactive' || existingPhone.status === 'suspended') {
              return {
                success: false,
                message: 'هذا الرقم مرتبط بحساب معطل من قِبل الإدارة. يرجى التواصل مع خدمة العملاء.',
              };
            }
            return {
              success: false,
              message: 'رقم الهاتف هذا مسجل بالفعل لحساب آخر. يرجى تسجيل الدخول أو استخدام رقم مختلف.',
            };
          }

          if (email) {
            const existingEmail = customerStore.customers.find(
              (c) => c.email && c.email.toLowerCase() === email
            );
            if (existingEmail) {
              if (existingEmail.status === 'deleted' || existingEmail.status === 'disabled' || existingEmail.isDeleted) {
                return {
                  success: false,
                  message: 'البريد الإلكتروني المدخل محظور ومحذوف مسبقاً من قِبل الإدارة.',
                };
              }
              return {
                success: false,
                message: 'البريد الإلكتروني المدخل مسجل بالفعل لحساب آخر.',
              };
            }
          }
        } catch {}

        // 3. Check duplicate phone / email in local registeredAccounts
        const accounts = get().registeredAccounts || [];
        const existingAcc = accounts.find((a) => a.phone === phone);
        if (existingAcc) {
          if (existingAcc.status === 'deleted' || existingAcc.status === 'disabled' || (existingAcc as any).isDeleted) {
            return {
              success: false,
              message: 'بيانات هذا الحساب (رقم الهاتف) محظورة ومحذوفة مسبقاً من قِبل الإدارة. لا يمكن إنشاء حساب جديد بهذه البيانات.',
            };
          }
          return {
            success: false,
            message: 'رقم الهاتف هذا مسجل بالفعل لحساب آخر. يرجى تسجيل الدخول مباشرة.',
          };
        }
        if (email) {
          const existingEmailAcc = accounts.find((a) => a.email && a.email.toLowerCase() === email);
          if (existingEmailAcc) {
            if (existingEmailAcc.status === 'deleted' || existingEmailAcc.status === 'disabled' || (existingEmailAcc as any).isDeleted) {
              return {
                success: false,
                message: 'البريد الإلكتروني المدخل محظور ومحذوف مسبقاً من قِبل الإدارة.',
              };
            }
            return {
              success: false,
              message: 'البريد الإلكتروني المدخل مسجل بالفعل لحساب آخر.',
            };
          }
        }

        // 4. Attempt Backend API Registration
        try {
          const res = await cleanzoApi.auth.register({
            name,
            phone,
            password,
            email,
          });

          if (res && res.user && res.token) {
            set((state) => ({
              user: res.user,
              token: res.token,
              isAuthenticated: true,
              authStatus: 'AUTHENTICATED',
              rememberMe: true,
              registeredAccounts: [
                ...(state.registeredAccounts || []),
                {
                  name,
                  phone,
                  password,
                  email,
                  status: 'active',
                },
              ],
            }));
            syncUserToCustomerStore(res.user);
            return { success: true };
          }
        } catch (err: any) {
          // If backend returned conflict error (409)
          if (
            err?.statusCode === 409 ||
            err?.code === 'PHONE_ALREADY_EXISTS' ||
            err?.code === 'EMAIL_ALREADY_EXISTS'
          ) {
            return {
              success: false,
              message: err.message || 'بيانات الحساب (رقم الهاتف أو البريد) مسجلة بالفعل لحساب آخر.',
            };
          }
          if (err?.statusCode === 422) {
            return {
              success: false,
              message: err.message || 'يرجى مراجعة البيانات المدخلة والتأكد من صحتها.',
            };
          }
          // Fall back to local creation below
        }

        // 5. Local Registration Fallback
        const newUser: User = {
          id: `usr-${phone.slice(-4)}`,
          name,
          phone,
          email,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
          createdAt: new Date().toISOString().split('T')[0],
          addresses: [],
          status: 'active',
        };

        set((state) => ({
          user: newUser,
          token: 'cleanzo-customer-local-jwt',
          isAuthenticated: true,
          authStatus: 'AUTHENTICATED',
          rememberMe: true,
          registeredAccounts: [
            ...(state.registeredAccounts || []),
            {
              name,
              phone,
              password,
              email,
              status: 'active',
            },
          ],
        }));

        syncUserToCustomerStore(newUser);
        return { success: true };
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
            syncUserToCustomerStore(updatedUser);
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

        const updatedUser = {
          ...current,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
        };
        set({ user: updatedUser });
        syncUserToCustomerStore(updatedUser);
        return { success: true };
      },

      resetDemoUser: () => {
        return false;
      },
    }),
    {
      name: 'cleanzo-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        rememberMe: true,
        registeredAccounts: state.registeredAccounts,
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

