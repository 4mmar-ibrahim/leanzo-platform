'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppearanceSettings, BookingSettings, SystemSettings, ZoSettings } from '@/types';
import { initialSystemSettings } from '@/data/settingsData';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useNotificationStore } from './useNotificationStore';

interface SettingsState {
  settings: SystemSettings;
  backupHistory: { id: string; date: string; size: string; notes: string }[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;

  fetchPublicSettings: () => Promise<void>;
  fetchAdminSettings: () => Promise<void>;
  saveSettingsToDatabase: (updates?: Partial<SystemSettings>) => Promise<boolean>;
  setHasUnsavedChanges: (val: boolean) => void;

  updateGeneral: (updates: Partial<SystemSettings['general']>) => void;
  updateBooking: (updates: Partial<BookingSettings>) => void;
  updateAppearance: (updates: Partial<AppearanceSettings>) => void;
  updateMobileExperience: (updates: Partial<SystemSettings['mobileExperience']>) => void;
  updateBranding: (updates: Partial<SystemSettings['branding']>) => void;
  updateNotifications: (updates: Partial<SystemSettings['notifications']>) => void;
  updateMascot: (updates: Partial<ZoSettings>) => void;
  addHoliday: (date: string, name: string) => void;
  removeHoliday: (date: string) => void;
  toggleBlockedDate: (date: string) => void;
  createBackupRecord: (notes?: string) => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: initialSystemSettings,
      backupHistory: [
        { id: 'bak-1', date: '2026-09-01 03:00', size: '1.4 MB', notes: 'نسخة احتياطية آلية أولية' },
        { id: 'bak-2', date: '2026-09-07 18:30', size: '1.6 MB', notes: 'تحديث بيانات الخدمات والأسعار' },
      ],
      isLoading: false,
      isSaving: false,
      hasUnsavedChanges: false,

      fetchPublicSettings: async () => {
        try {
          const res = await cleanzoApi.settings.getPublic();
          if (res) {
            set((state) => ({
              settings: {
                ...state.settings,
                general: res.general ? { ...state.settings.general, ...res.general } : state.settings.general,
                appearance: res.appearance ? { ...state.settings.appearance, ...res.appearance } : state.settings.appearance,
                branding: res.branding ? { ...state.settings.branding, ...res.branding } : state.settings.branding,
                mobileExperience: res.mobileExperience ? { ...state.settings.mobileExperience, ...res.mobileExperience } : state.settings.mobileExperience,
                social: res.social ? { ...state.settings.social, ...res.social } : state.settings.social,
                booking: res.booking ? { ...state.settings.booking, ...res.booking } : state.settings.booking,
                notifications: res.notifications ? { ...state.settings.notifications, ...res.notifications } : state.settings.notifications,
              },
            }));
          }
        } catch (err) {
          console.warn('Could not fetch public settings from server, using local defaults:', err);
        }
      },

      fetchAdminSettings: async () => {
        set({ isLoading: true });
        try {
          const res = await cleanzoApi.settings.getAllAdmin();
          if (res) {
            set((state) => ({
              settings: {
                ...state.settings,
                general: res.general ? { ...state.settings.general, ...res.general } : state.settings.general,
                booking: res.booking ? { ...state.settings.booking, ...res.booking } : state.settings.booking,
                appearance: res.appearance ? { ...state.settings.appearance, ...res.appearance } : state.settings.appearance,
                branding: res.branding ? { ...state.settings.branding, ...res.branding } : state.settings.branding,
                mobileExperience: res.mobileExperience ? { ...state.settings.mobileExperience, ...res.mobileExperience } : state.settings.mobileExperience,
                social: res.social ? { ...state.settings.social, ...res.social } : state.settings.social,
                notifications: res.notifications ? { ...state.settings.notifications, ...res.notifications } : state.settings.notifications,
                security: res.security ? { ...state.settings.security, ...res.security } : state.settings.security,
              },
              isLoading: false,
              hasUnsavedChanges: false,
            }));
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.warn('Could not fetch admin settings from server:', err);
          set({ isLoading: false });
        }
      },

      saveSettingsToDatabase: async (updates) => {
        set({ isSaving: true });
        try {
          const payload = updates ? updates : get().settings;
          const res = await cleanzoApi.settings.updateAdmin(payload);
          if (res) {
            set((state) => ({
              settings: {
                ...state.settings,
                ...(res.general ? { general: { ...state.settings.general, ...res.general } } : {}),
                ...(res.booking ? { booking: { ...state.settings.booking, ...res.booking } } : {}),
                ...(res.appearance ? { appearance: { ...state.settings.appearance, ...res.appearance } } : {}),
                ...(res.branding ? { branding: { ...state.settings.branding, ...res.branding } } : {}),
                ...(res.mobileExperience ? { mobileExperience: { ...state.settings.mobileExperience, ...res.mobileExperience } } : {}),
                ...(res.social ? { social: { ...state.settings.social, ...res.social } } : {}),
                ...(res.notifications ? { notifications: { ...state.settings.notifications, ...res.notifications } } : {}),
              },
              isSaving: false,
              hasUnsavedChanges: false,
            }));

            try {
              useNotificationStore.getState().addNotification({
                title: 'تحديث إعدادات النظام',
                titleEn: 'System Settings Updated',
                message: 'تم تحديث وضبط إعدادات المنصة بنجاح بواسطة الإدارة.',
                messageEn: 'Platform system settings updated.',
                type: 'system',
                link: '/admin/settings',
              });
            } catch {}

            return true;
          }
          set({ isSaving: false });
          return false;
        } catch (err) {
          console.error('Failed to save settings to database:', err);
          set({ isSaving: false });
          return false;
        }
      },

      setHasUnsavedChanges: (val) => {
        set({ hasUnsavedChanges: val });
      },

      updateGeneral: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            general: { ...state.settings.general, ...updates },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateBooking: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            booking: { ...state.settings.booking, ...updates },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateAppearance: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            appearance: { ...state.settings.appearance, ...updates },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateMobileExperience: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            mobileExperience: { ...state.settings.mobileExperience, ...updates },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateBranding: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            branding: { ...state.settings.branding, ...updates },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateNotifications: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            notifications: { ...state.settings.notifications, ...updates },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateMascot: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            mascot: state.settings.mascot ? { ...state.settings.mascot, ...updates } : (updates as any),
          },
          hasUnsavedChanges: true,
        }));
      },

      addHoliday: (date, name) => {
        set((state) => ({
          settings: {
            ...state.settings,
            booking: {
              ...state.settings.booking,
              holidays: [...state.settings.booking.holidays, { date, name }],
            },
          },
          hasUnsavedChanges: true,
        }));
      },

      removeHoliday: (date) => {
        set((state) => ({
          settings: {
            ...state.settings,
            booking: {
              ...state.settings.booking,
              holidays: state.settings.booking.holidays.filter((h) => h.date !== date),
            },
          },
          hasUnsavedChanges: true,
        }));
      },

      toggleBlockedDate: (date) => {
        const current = get().settings.booking.blockedDates;
        const exists = current.includes(date);
        const updated = exists ? current.filter((d) => d !== date) : [...current, date];

        set((state) => ({
          settings: {
            ...state.settings,
            booking: {
              ...state.settings.booking,
              blockedDates: updated,
            },
          },
          hasUnsavedChanges: true,
        }));
      },

      createBackupRecord: (notes = 'نسخة احتياطية يدوية من لوحة التحكم') => {
        const id = `bak-${Date.now().toString().slice(-4)}`;
        const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
        const newRecord = {
          id,
          date: dateStr,
          size: '1.8 MB',
          notes,
        };
        set((state) => ({
          backupHistory: [newRecord, ...state.backupHistory],
        }));

        try {
          useNotificationStore.getState().addNotification({
            title: 'إنشاء نسخة احتياطية للنظام',
            titleEn: 'System Backup Created',
            message: `تم حفظ نسخة احتياطية لقاعدة البيانات بنجاح (${newRecord.size}) - ${notes}`,
            messageEn: `Database backup created (${newRecord.size})`,
            type: 'system',
            link: '/admin/settings',
          });
        } catch {}

        return id;
      },
    }),
    {
      name: 'cleanzo-settings-storage',
    }
  )
);
