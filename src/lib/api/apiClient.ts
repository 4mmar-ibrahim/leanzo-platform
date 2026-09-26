/**
 * Cleanzo Centralized API Client
 * Seamlessly interfaces frontend stores and components with Cleanzo Backend API.
 * Features robust token management, auto-refresh mutex, cookie synchronization,
 * and zero-leakage error handling.
 */

import { useAdminStore } from '@/store/useAdminStore';

/**
 * Returns API base URL.
 * If NEXT_PUBLIC_API_URL is configured, uses it.
 * If running in a browser on a remote hostname (e.g. cleanzo-web.vercel.app), returns null
 * to prevent Chrome's "Access other apps and services on this device" (Private Network Access) prompt
 * and avoid attempting to reach localhost on end-user devices.
 */
export function getApiBaseUrl(): string | null {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      return null;
    }
  }
  return 'http://localhost:5000/api';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  code?: string;
  errors?: any;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  errors?: any;

  constructor(message: string, statusCode: number, code?: string, errors?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export function getCustomerAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cleanzo-auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

export function getAdminAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Check in-memory store token first if initialized
    try {
      const storeToken = useAdminStore.getState().token;
      if (storeToken && storeToken !== 'demo-admin-owner-jwt-token') {
        return storeToken;
      }
    } catch {}

    // 2. Check localStorage
    const raw =
      localStorage.getItem('cleanzo-admin-auth-storage') ||
      localStorage.getItem('cleanzo-admin-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.token) return parsed.state.token;
      if (parsed?.token) return parsed.token;
    }

    // 3. Check cleanzo_admin_token cookie
    const cookieToken = getCookie('cleanzo_admin_token');
    if (cookieToken && cookieToken !== 'demo-admin-owner-jwt-token') return cookieToken;
  } catch {}
  return null;
}

export function setCustomerAuthToken(newToken: string, user?: any): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('cleanzo-auth-storage');
    let parsed: any = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {}
    }
    if (!parsed.state) parsed.state = {};
    parsed.state.token = newToken;
    parsed.state.isAuthenticated = true;
    if (user) {
      parsed.state.user = user;
    }
    localStorage.setItem('cleanzo-auth-storage', JSON.stringify(parsed));
    window.dispatchEvent(
      new CustomEvent('cleanzo:customer-token-changed', {
        detail: { token: newToken, user },
      })
    );
  } catch {}
}

export function clearCustomerAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('cleanzo-auth-storage');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.state) {
          parsed.state.token = null;
          parsed.state.isAuthenticated = false;
          parsed.state.user = null;
          localStorage.setItem('cleanzo-auth-storage', JSON.stringify(parsed));
        }
      } catch {}
    }
    window.dispatchEvent(new CustomEvent('cleanzo:customer-session-expired'));
  } catch {}
}

export function setAdminAuthToken(newToken: string): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Update localStorage
    const raw = localStorage.getItem('cleanzo-admin-auth-storage');
    let parsed: any = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {}
    }
    if (!parsed.state) parsed.state = {};
    parsed.state.token = newToken;
    parsed.state.isAuthenticated = true;
    localStorage.setItem('cleanzo-admin-auth-storage', JSON.stringify(parsed));
    localStorage.setItem('cleanzo-admin-storage', JSON.stringify(parsed));

    // 2. Update browser cookie (30 days validity, Path=/, SameSite=Lax)
    const isHttps = window.location.protocol === 'https:';
    document.cookie = `cleanzo_admin_token=${encodeURIComponent(newToken)}; path=/; max-age=2592000; SameSite=Lax${isHttps ? '; Secure' : ''}`;

    // 3. Synchronize in-memory Zustand store directly
    try {
      useAdminStore.getState().setSessionToken(newToken);
    } catch {}

    // 4. Dispatch in-tab custom event
    window.dispatchEvent(new CustomEvent('cleanzo:admin-token-changed', { detail: { token: newToken } }));
  } catch {}
}

export function clearAdminAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('cleanzo-admin-auth-storage');
    localStorage.removeItem('cleanzo-admin-storage');
    document.cookie = 'cleanzo_admin_token=; path=/; max-age=0; SameSite=Lax';
    try {
      useAdminStore.getState().logout();
    } catch {}
    window.dispatchEvent(new CustomEvent('cleanzo:admin-session-expired'));
  } catch {}
}

// Single-Flight Mutex for Admin Token Refresh
let adminRefreshPromiseMutex: Promise<string | null> | null = null;

export async function executeAdminTokenRefresh(): Promise<string | null> {
  if (adminRefreshPromiseMutex) {
    return adminRefreshPromiseMutex;
  }

  adminRefreshPromiseMutex = (async () => {
    try {
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) return null;
      const currentToken = getAdminAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const refreshRes = await fetch(`${baseUrl}/auth/admin/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      const refreshData = await refreshRes.json().catch(() => null);
      if (refreshRes.ok && refreshData?.success && refreshData?.data?.token) {
        const freshToken = refreshData.data.token;
        setAdminAuthToken(freshToken);
        if (refreshData.data.admin) {
          try {
            useAdminStore.getState().loginWithToken(refreshData.data.admin, freshToken);
          } catch {}
        }
        return freshToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      adminRefreshPromiseMutex = null;
    }
  })();

  return adminRefreshPromiseMutex;
}

// Single-Flight Mutex for Customer Token Refresh
let customerRefreshPromiseMutex: Promise<string | null> | null = null;

export async function executeCustomerTokenRefresh(): Promise<string | null> {
  if (customerRefreshPromiseMutex) {
    return customerRefreshPromiseMutex;
  }

  customerRefreshPromiseMutex = (async () => {
    try {
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) return null;
      const currentToken = getCustomerAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const refreshRes = await fetch(`${baseUrl}/auth/customer/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      const refreshData = await refreshRes.json().catch(() => null);
      if (refreshRes.ok && refreshData?.success && refreshData?.data?.token) {
        const freshToken = refreshData.data.token;
        const freshUser = refreshData.data.user;
        setCustomerAuthToken(freshToken, freshUser);
        return freshToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      customerRefreshPromiseMutex = null;
    }
  })();

  return customerRefreshPromiseMutex;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { isAdmin?: boolean; _isRetry?: boolean } = {}
): Promise<T> {
  const { isAdmin = false, _isRetry = false, headers = {}, ...rest } = options;

  // Auto-detect admin context from route or path
  const isEffectiveAdmin =
    isAdmin ||
    endpoint.includes('/admin') ||
    endpoint.startsWith('/admin') ||
    endpoint.includes('/settings/') ||
    endpoint.includes('/technicians') ||
    endpoint.includes('/audit-logs') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  const token = isEffectiveAdmin ? getAdminAuthToken() : getCustomerAuthToken();

  const reqHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  // Only set application/json if body is not FormData
  if (!(rest.body instanceof FormData) && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    // No remote backend API configured
    throw new ApiError('No remote backend API configured', 503, 'NO_REMOTE_BACKEND');
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...rest,
      credentials: 'include',
      headers: reqHeaders,
    });

    const data: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      message: 'Failed to parse JSON response',
      data: null as any,
    }));

    // Auto-refresh token on 401 using single-flight mutex
    if (response.status === 401 && !_isRetry) {
      if (
        isEffectiveAdmin &&
        !endpoint.includes('/auth/admin/refresh') &&
        !endpoint.includes('/auth/admin/login')
      ) {
        const freshToken = await executeAdminTokenRefresh();
        if (freshToken) {
          return await apiRequest<T>(endpoint, {
            ...options,
            isAdmin: true,
            _isRetry: true,
            headers: {
              ...(headers as Record<string, string>),
              Authorization: `Bearer ${freshToken}`,
            },
          });
        } else {
          clearAdminAuthSession();
          // Redirect to login page when session expires and refresh fails
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
            window.location.href = '/admin/login?session=expired';
          }
          throw new ApiError('انتهت صلاحية جلسة المسؤول، يرجى تسجيل الدخول مجدداً', 401, 'SESSION_EXPIRED');
        }
      } else if (
        !isEffectiveAdmin &&
        !endpoint.includes('/auth/customer/refresh') &&
        !endpoint.includes('/auth/customer/login') &&
        !endpoint.includes('/auth/customer/register')
      ) {
        const freshToken = await executeCustomerTokenRefresh();
        if (freshToken) {
          return await apiRequest<T>(endpoint, {
            ...options,
            isAdmin: false,
            _isRetry: true,
            headers: {
              ...(headers as Record<string, string>),
              Authorization: `Bearer ${freshToken}`,
            },
          });
        } else {
          clearCustomerAuthSession();
        }
      }
    }

    if (!response.ok || data.success === false) {
      throw new ApiError(
        data.message || `Request failed with status ${response.status}`,
        response.status,
        data.code,
        data.errors
      );
    }

    return data.data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      err.message || 'تعذر الاتصال بخادم كلينزو، يرجى التأكد من تشغيل الخادم والاتصال بالإنترنت',
      503,
      'NETWORK_ERROR'
    );
  }
}


