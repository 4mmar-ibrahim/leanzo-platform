/**
 * Cleanzo API Gateway & Convenience Wrappers
 */
import { apiRequest } from './apiClient';

export interface ClientApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  code?: string;
  errors?: any;
}

export async function apiGet<T = any>(endpoint: string, options: any = {}): Promise<ClientApiResponse<T>> {
  const data = await apiRequest<T>(endpoint, { method: 'GET', ...options });
  return { success: true, data };
}

export async function apiPost<T = any>(endpoint: string, body?: any, options: any = {}): Promise<ClientApiResponse<T>> {
  const data = await apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
  return { success: true, data };
}

export async function apiPut<T = any>(endpoint: string, body?: any, options: any = {}): Promise<ClientApiResponse<T>> {
  const data = await apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
  return { success: true, data };
}

export async function apiPatch<T = any>(endpoint: string, body?: any, options: any = {}): Promise<ClientApiResponse<T>> {
  const data = await apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
  return { success: true, data };
}

export async function apiDelete<T = any>(endpoint: string, options: any = {}): Promise<ClientApiResponse<T>> {
  const data = await apiRequest<T>(endpoint, { method: 'DELETE', ...options });
  return { success: true, data };
}

export * from './apiClient';
export * from './cleanzoApi';
