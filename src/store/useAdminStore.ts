'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminRole, AdminUser, PermissionLevel, RoleDefinition } from '@/types';
import { initialAdminUsers, initialRoleDefinitions } from '@/data/adminUsers';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { hasPermission, canAccessRoute, getFirstAllowedRoute } from '@/lib/permissions';

interface AdminState {
  currentAdmin: AdminUser | null;
  token: string | null;
  adminUsers: AdminUser[];
  roles: RoleDefinition[];
  modulesList: Array<{ id: string; nameAr: string; category: string; path: string }>;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminAuthStatus: 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

  // Session & Auth Actions
  initAdminAuth: () => Promise<void>;
  login: (username: string, password?: string) => Promise<boolean>;
  loginWithToken: (admin: AdminUser, token: string) => void;
  setSessionToken: (token: string) => void;
  logout: () => void;
  refreshCurrentAdmin: () => Promise<void>;
  switchUser: (userId: string) => void;
  switchRole: (role: AdminRole | string) => void;

  // Granular Permission Checks
  getPagePermission: (module: string) => PermissionLevel;
  canView: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  hasPermission: (permissionOrModule: string, action?: string) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  getFirstAllowedRoute: () => string;

  // Real Backend Data Actions
  fetchUsers: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  updateOwnerProfile: (data: { name?: string; email?: string; phone?: string }) => Promise<boolean>;
  changeOwnerPassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<{ success: boolean; message: string }>;
  changeUserPassword: (id: string, data: { newPassword: string; confirmPassword: string; mustChangePasswordNextLogin?: boolean }) => Promise<{ success: boolean; message: string }>;
  createAdminUser: (data: {
    name: string;
    username?: string;
    email?: string;
    phone?: string;
    password: string;
    role?: string;
    userType?: 'admin' | 'technician';
    technicianId?: string;
    permissions?: Record<string, PermissionLevel>;
    granularPermissions?: string[];
    mustChangePasswordNextLogin?: boolean;
  }) => Promise<AdminUser | null>;
  updateAdminUser: (
    id: string,
    updates: Partial<AdminUser> & { password?: string; permissions?: Record<string, PermissionLevel>; granularPermissions?: string[]; mustChangePasswordNextLogin?: boolean }
  ) => Promise<boolean>;
  deleteAdminUser: (id: string) => Promise<boolean>;
  updateRolePermissions: (roleId: string, permissions: Record<string, PermissionLevel>) => Promise<boolean>;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      currentAdmin: null,
      token: null,
      adminUsers: initialAdminUsers,
      roles: initialRoleDefinitions,
      modulesList: [
        { id: 'dashboard', nameAr: 'لوحة القيادة (Dashboard)', category: 'نظرة عامة', path: '/admin' },
        { id: 'calendar', nameAr: 'جدول المواعيد (Calendar)', category: 'نظرة عامة', path: '/admin/calendar' },
        { id: 'orders', nameAr: 'إدارة الطلبات (Orders)', category: 'العمليات والتشغيل', path: '/admin/orders' },
        { id: 'customers', nameAr: 'سجل العملاء CRM (Customers)', category: 'العمليات والتشغيل', path: '/admin/customers' },
        { id: 'technicians', nameAr: 'فريق الفنيين (Technicians)', category: 'العمليات والتشغيل', path: '/admin/technicians' },
        { id: 'locations', nameAr: 'المحافظات والمناطق (Locations)', category: 'العمليات والتشغيل', path: '/admin/locations' },
        { id: 'services', nameAr: 'الخدمات والتصنيفات (Services)', category: 'الخدمات والعروض', path: '/admin/services' },
        { id: 'offers', nameAr: 'العروض الترويجية (Offers)', category: 'الخدمات والعروض', path: '/admin/offers' },
        { id: 'coupons', nameAr: 'كوبونات الخصم (Coupons)', category: 'الخدمات والعروض', path: '/admin/coupons' },
        { id: 'gallery', nameAr: 'معرض الأعمال قبل وبعد (Gallery)', category: 'الخدمات والعروض', path: '/admin/gallery' },
        { id: 'media', nameAr: 'مكتبة الوسائط الموحدة (Media Library)', category: 'الخدمات والعروض', path: '/admin/media' },
        { id: 'content', nameAr: 'محتوى المنصة CMS (Content)', category: 'إدارة المحتوى', path: '/admin/content' },
        { id: 'zo', nameAr: 'استوديو تميمة زو 3D (Zo Studio)', category: 'تجربة زو التفاعلية', path: '/admin/zo-studio' },
        { id: 'reports', nameAr: 'مركز التقارير (Reports)', category: 'التقارير والذكاء', path: '/admin/reports' },
        { id: 'analytics', nameAr: 'التحليلات والمؤشرات (Analytics)', category: 'التقارير والذكاء', path: '/admin/analytics' },
        { id: 'notifications', nameAr: 'مركز التنبيهات (Notifications)', category: 'النظام والأمان', path: '/admin/notifications' },
        { id: 'users', nameAr: 'المسؤولون والمستخدمون (Users & Permissions)', category: 'النظام والأمان', path: '/admin/users' },
        { id: 'activity_logs', nameAr: 'سجل النشاطات (Activity Log)', category: 'النظام والأمان', path: '/admin/activity-log' },
        { id: 'settings', nameAr: 'إعدادات النظام (Settings)', category: 'النظام والأمان', path: '/admin/settings' },
      ],
      isAuthenticated: false,
      isLoading: false,
      adminAuthStatus: 'AUTH_LOADING',

      initAdminAuth: async () => {
        // If already authenticated in-memory (e.g. just logged in via loginWithToken),
        // skip the destructive refresh flow to avoid wiping valid auth state
        const existingState = get();
        if (existingState.isAuthenticated && existingState.currentAdmin && existingState.token) {
          set({ adminAuthStatus: 'AUTHENTICATED' });
          // Optionally try to refresh in background without affecting current state
          try {
            const refreshRes = await cleanzoApi.admin.refreshToken();
            if (refreshRes?.token && refreshRes?.admin) {
              set({
                currentAdmin: refreshRes.admin,
                token: refreshRes.token,
                isAuthenticated: true,
                adminAuthStatus: 'AUTHENTICATED',
              });
            }
          } catch {
            // Silently ignore - we're already authenticated
          }
          return;
        }

        set({ adminAuthStatus: 'AUTH_LOADING' });
        try {
          // 1. Silent token refresh using HttpOnly cookie (or authorization header)
          const refreshRes = await cleanzoApi.admin.refreshToken();
          if (refreshRes?.token && refreshRes?.admin) {
            set({
              currentAdmin: refreshRes.admin,
              token: refreshRes.token,
              isAuthenticated: true,
              adminAuthStatus: 'AUTHENTICATED',
            });
            return;
          }
        } catch (err: any) {
          if (err?.statusCode === 401 || err?.statusCode === 403) {
            set({
              currentAdmin: null,
              token: null,
              isAuthenticated: false,
              adminAuthStatus: 'UNAUTHENTICATED',
            });
            return;
          }
        }

        // 2. Try fetching profile if token exists
        const currentToken = get().token;
        if (currentToken) {
          try {
            const me = await cleanzoApi.admin.getMe();
            if (me) {
              set({
                currentAdmin: me,
                isAuthenticated: true,
                adminAuthStatus: 'AUTHENTICATED',
              });
              return;
            }
          } catch (meErr: any) {
            if (meErr?.statusCode === 401 || meErr?.statusCode === 403) {
              set({
                currentAdmin: null,
                token: null,
                isAuthenticated: false,
                adminAuthStatus: 'UNAUTHENTICATED',
              });
              return;
            }
          }
        }

        // 3. If local offline demo with existing admin
        const existingAdmin = get().currentAdmin;
        if (existingAdmin && get().isAuthenticated) {
          set({ adminAuthStatus: 'AUTHENTICATED' });
        } else {
          set({
            currentAdmin: null,
            token: null,
            isAuthenticated: false,
            adminAuthStatus: 'UNAUTHENTICATED',
          });
        }
      },

      login: async (username: string, password = 'password123') => {
        try {
          const res = await cleanzoApi.admin.login(username, password);
          if (res?.token && res?.admin) {
            set({
              currentAdmin: res.admin,
              token: res.token,
              isAuthenticated: true,
              adminAuthStatus: 'AUTHENTICATED',
            });
            if (typeof window !== 'undefined') {
              const isHttps = window.location.protocol === 'https:';
              document.cookie = `cleanzo_admin_token=${encodeURIComponent(res.token)}; path=/; max-age=2592000; SameSite=Lax${isHttps ? '; Secure' : ''}`;
            }
            return true;
          }
          return false;
        } catch (err) {
          console.error('Backend admin login failed:', err);
          return false;
        }
      },

      loginWithToken: (admin: AdminUser, token: string) => {
        set({
          currentAdmin: admin,
          token: token,
          isAuthenticated: true,
          adminAuthStatus: 'AUTHENTICATED',
        });
        if (typeof window !== 'undefined') {
          const isHttps = window.location.protocol === 'https:';
          document.cookie = `cleanzo_admin_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax${isHttps ? '; Secure' : ''}`;
        }
      },

      setSessionToken: (token: string) => {
        set({ token });
      },

      logout: () => {
        cleanzoApi.admin.logout().catch(() => {});
        set({
          currentAdmin: null,
          token: null,
          isAuthenticated: false,
          adminAuthStatus: 'UNAUTHENTICATED',
        });
        if (typeof window !== 'undefined') {
          try {
            document.cookie = 'cleanzo_admin_token=; path=/; max-age=0; SameSite=Lax';
            localStorage.removeItem('cleanzo-admin-auth-storage');
            localStorage.removeItem('cleanzo-admin-storage');
          } catch {}
        }
      },

      refreshCurrentAdmin: async () => {
        try {
          const me = await cleanzoApi.admin.getMe();
          if (me) {
            set((state) => ({
              currentAdmin: {
                ...state.currentAdmin,
                ...me,
                // Server permissions are authoritative (Requirement 6)
                permissions: me.permissions,
                granularPermissions: me.granularPermissions,
                role: me.role,
              },
              adminAuthStatus: 'AUTHENTICATED',
            }));
          }
        } catch (err) {
          // If 401, try silent refresh
          try {
            const refreshRes = await cleanzoApi.admin.refreshToken();
            if (refreshRes?.admin) {
              set({
                currentAdmin: refreshRes.admin,
                token: refreshRes.token,
                isAuthenticated: true,
                adminAuthStatus: 'AUTHENTICATED',
              });
            }
          } catch {}
        }
      },

      switchUser: (userId: string) => {
        const user = get().adminUsers.find((u) => u.id === userId);
        if (user) {
          set({ currentAdmin: user, isAuthenticated: true });
        }
      },

      switchRole: (role: AdminRole | string) => {
        const current = get().currentAdmin;
        if (current) {
          set({
            currentAdmin: { ...current, role },
          });
        }
      },

      getPagePermission: (module: string): PermissionLevel => {
        const admin = get().currentAdmin;
        if (!admin) return 'hidden';
        if (admin.role === 'owner' || admin.role === 'super_admin') return 'edit';

        if (admin.permissions && admin.permissions[module]) {
          return admin.permissions[module];
        }

        if (Array.isArray((admin as any).granularPermissions)) {
          const list = (admin as any).granularPermissions as string[];
          if (list.includes(`${module}.edit`) || list.includes(`${module}.*`)) return 'edit';
          if (list.some((p) => p.startsWith(`${module}.`))) return 'view';
        }

        return 'hidden';
      },

      canView: (module: string): boolean => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        if (admin.role === 'owner' || admin.role === 'super_admin') return true;
        return hasPermission(admin, `${module}.view`);
      },

      canEdit: (module: string): boolean => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        if (admin.role === 'owner' || admin.role === 'super_admin') return true;
        return hasPermission(admin, `${module}.edit`);
      },

      hasPermission: (permissionOrModule: string, action?: string): boolean => {
        const admin = get().currentAdmin;
        if (!admin) return false;
        if (admin.role === 'owner' || admin.role === 'super_admin') return true;
        const token = action ? `${permissionOrModule}.${action}` : permissionOrModule;
        return hasPermission(admin, token);
      },

      canAccessRoute: (pathname: string): boolean => {
        return canAccessRoute(get().currentAdmin, pathname);
      },

      getFirstAllowedRoute: (): string => {
        return getFirstAllowedRoute(get().currentAdmin);
      },

      fetchUsers: async () => {
        set({ isLoading: true });
        try {
          const users = await cleanzoApi.admin.getUsers();
          if (Array.isArray(users) && users.length > 0) {
            set({ adminUsers: users, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.error('Failed to fetch admin users from backend:', err);
          set({ isLoading: false });
        }
      },

      fetchRoles: async () => {
        try {
          const res = await cleanzoApi.admin.getRoles();
          if (res?.roles && Array.isArray(res.roles)) {
            set({
              roles: res.roles,
              modulesList: res.modules || get().modulesList,
            });
          }
        } catch (err) {
          console.warn('Failed to fetch roles from backend:', err);
        }
      },

      updateOwnerProfile: async (data) => {
        try {
          const updated = await cleanzoApi.admin.updateOwnerProfile(data);
          if (updated) {
            set((state) => ({
              currentAdmin: state.currentAdmin ? { ...state.currentAdmin, ...updated } : updated,
              adminUsers: state.adminUsers.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
            }));
            return true;
          }
        } catch (err) {
          console.error('Failed to update owner profile:', err);
        }
        return false;
      },

      changeOwnerPassword: async (data) => {
        try {
          const res = await cleanzoApi.admin.changeOwnerPassword(data);
          return { success: true, message: res?.message || 'تم تغيير كلمة مرور مالك المنصة بنجاح' };
        } catch (err: any) {
          return { success: false, message: err?.message || 'فشل تغيير كلمة المرور' };
        }
      },

      changeUserPassword: async (id, data) => {
        try {
          const res = await cleanzoApi.admin.changeUserPassword(id, data);
          return { success: true, message: res?.message || 'تم تغيير كلمة مرور المستخدم بنجاح' };
        } catch (err: any) {
          return { success: false, message: err?.message || 'فشل تغيير كلمة مرور المستخدم' };
        }
      },

      createAdminUser: async (userData) => {
        try {
          const created = await cleanzoApi.admin.createUser(userData as any);
          if (created) {
            set((state) => ({
              adminUsers: [created, ...state.adminUsers],
            }));
            return created;
          }
        } catch (err: any) {
          console.error('Failed to create admin user:', err);
          throw err;
        }
        return null;
      },

      updateAdminUser: async (id, updates) => {
        try {
          const updated = await cleanzoApi.admin.updateUser(id, updates);
          if (updated) {
            set((state) => ({
              adminUsers: state.adminUsers.map((u) => (u.id === id ? { ...u, ...updated } : u)),
              currentAdmin: state.currentAdmin?.id === id ? { ...state.currentAdmin, ...updated } : state.currentAdmin,
            }));
            return true;
          }
        } catch (err: any) {
          console.error('Failed to update admin user:', err);
          throw err;
        }
        return false;
      },

      deleteAdminUser: async (id) => {
        try {
          await cleanzoApi.admin.deleteUser(id);
          set((state) => ({
            adminUsers: state.adminUsers.filter((u) => u.id !== id),
          }));
          return true;
        } catch (err) {
          console.error('Failed to delete admin user:', err);
        }
        return false;
      },

      updateRolePermissions: async (roleId, permissions) => {
        try {
          await cleanzoApi.admin.updateRole(roleId, { permissions });
          set((state) => ({
            roles: state.roles.map((r) => (r.id === roleId ? { ...r, permissions: permissions as any } : r)),
          }));
          return true;
        } catch (err) {
          console.error('Failed to update role permissions:', err);
          return false;
        }
      },
    }),
    {
      name: 'cleanzo-admin-auth-storage',
      partialize: (state) => ({
        currentAdmin: state.currentAdmin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Cross-tab and in-tab live session synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'cleanzo-admin-auth-storage' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed?.state) {
          useAdminStore.setState({
            currentAdmin: parsed.state.currentAdmin,
            token: parsed.state.token,
            isAuthenticated: parsed.state.isAuthenticated,
          });
        }
      } catch {}
    }
  });

  window.addEventListener('cleanzo:admin-token-changed', (event: any) => {
    if (event?.detail?.token) {
      useAdminStore.setState({ token: event.detail.token });
    }
  });
}
