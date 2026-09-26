'use client';

import { create } from 'zustand';
import {
  ActivityLog,
  AdminPermissionModule,
  AuditLogFilterParams,
  AuditLogSummary,
} from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface ActivityLogState {
  logs: ActivityLog[];
  selectedLog: ActivityLog | null;
  isLoading: boolean;
  error: string | null;

  // Pagination
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };

  // KPIs
  summary: AuditLogSummary;

  // Active filters
  filters: AuditLogFilterParams;

  // Actions
  fetchLogs: (overrideFilters?: Partial<AuditLogFilterParams>) => Promise<void>;
  setPage: (page: number) => Promise<void>;
  setLimit: (limit: number) => Promise<void>;
  setFilters: (newFilters: Partial<AuditLogFilterParams>) => void;
  resetFilters: () => void;
  setSelectedLog: (log: ActivityLog | null) => void;
  purgeLogs: (retentionDays?: number) => Promise<{ success: boolean; message?: string }>;

  // Backward compatibility methods
  addLog: (log: {
    adminName: string;
    adminRole: string;
    action: string;
    module: AdminPermissionModule | string;
    target?: string;
    details?: string;
    [key: string]: any;
  }) => void;
  clearLogs: () => void;
}

const defaultSummary: AuditLogSummary = {
  total: 0,
  success: 0,
  warning: 0,
  failed: 0,
  critical: 0,
};

const defaultFilters: AuditLogFilterParams = {
  module: 'all',
  action: 'all',
  status: 'all',
  actorRole: 'all',
  search: '',
  page: 1,
  limit: 25,
};

export const useActivityLogStore = create<ActivityLogState>((set, get) => ({
  logs: [],
  selectedLog: null,
  isLoading: false,
  error: null,

  pagination: {
    total: 0,
    page: 1,
    limit: 25,
    pages: 1,
  },

  summary: defaultSummary,
  filters: defaultFilters,

  fetchLogs: async (overrideFilters) => {
    set({ isLoading: true, error: null });

    const currentFilters = get().filters;
    const mergedFilters: AuditLogFilterParams = {
      ...currentFilters,
      ...(overrideFilters || {}),
    };

    try {
      const response = await cleanzoApi.audit.getLogs(mergedFilters);

      // Map MongoDB items if needed (ensure id is set)
      const mappedLogs: ActivityLog[] = (response.logs || []).map((l: any) => ({
        ...l,
        id: l._id || l.id,
        actorName: l.actorName || l.adminName || 'مستخدم النظام',
        actorRole: l.actorRole || l.adminRole || 'admin',
        description: l.description || l.action || l.details || 'إجراء في النظام',
        status: l.status || 'success',
        timestamp: l.timestamp || (l.createdAt ? new Date(l.createdAt).toLocaleString('ar-EG') : new Date().toLocaleString('ar-EG')),
      }));

      set({
        logs: mappedLogs,
        pagination: response.pagination || {
          total: mappedLogs.length,
          page: mergedFilters.page || 1,
          limit: mergedFilters.limit || 25,
          pages: Math.ceil(mappedLogs.length / (mergedFilters.limit || 25)) || 1,
        },
        summary: response.summary || {
          total: response.pagination?.total || mappedLogs.length,
          success: mappedLogs.filter((x) => x.status === 'success').length,
          warning: mappedLogs.filter((x) => x.status === 'warning').length,
          failed: mappedLogs.filter((x) => x.status === 'failed').length,
          critical: mappedLogs.filter((x) => x.status === 'critical').length,
        },
        filters: mergedFilters,
        isLoading: false,
      });
    } catch (err: any) {
      console.warn('Could not fetch audit logs from backend:', err.message);
      set({
        logs: [],
        filters: mergedFilters,
        isLoading: false,
        error: err.message || 'فشل جلب سجل العمليات',
      });
    }
  },

  setPage: async (page: number) => {
    const { filters, fetchLogs } = get();
    await fetchLogs({ ...filters, page });
  },

  setLimit: async (limit: number) => {
    const { filters, fetchLogs } = get();
    await fetchLogs({ ...filters, limit, page: 1 });
  },

  setFilters: (newFilters: Partial<AuditLogFilterParams>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, page: 1 },
    }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().fetchLogs(defaultFilters);
  },

  setSelectedLog: (log: ActivityLog | null) => {
    set({ selectedLog: log });
  },

  purgeLogs: async (retentionDays = 30) => {
    try {
      const res = await cleanzoApi.audit.purge(retentionDays);
      await get().fetchLogs({ page: 1 });
      return { success: true, message: `تم تنظيف ${res.deletedCount} سجل أقدم من ${res.retentionDays} يوم بنجاح` };
    } catch (err: any) {
      return { success: false, message: err.message || 'فشلت عملية تنظيف السجلات' };
    }
  },

  addLog: (log) => {
    const now = new Date();
    const dateStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      actorId: log.adminId || 'current',
      actorName: log.adminName || 'المسؤول الحالي',
      actorRole: log.adminRole || 'admin',
      adminId: log.adminId || 'current',
      target: log.target,
      description: log.details || `${log.adminName}: ${log.action} - ${log.target || ''}`,
      status: (log.status as any) || 'success',
      timestamp: dateStr,
      ip: log.ip || '127.0.0.1',
      details: log.details,
      ...log,
    };

    set((state) => ({
      logs: [newLog, ...state.logs],
      summary: {
        ...state.summary,
        total: state.summary.total + 1,
        success: state.summary.success + 1,
      },
    }));
  },

  clearLogs: () => {
    set({
      logs: [],
      summary: { total: 0, success: 0, warning: 0, failed: 0, critical: 0 },
    });
  },
}));
