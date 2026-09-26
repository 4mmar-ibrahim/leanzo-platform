'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ZoSettings, ZoMessageItem, ZoExpression, ZoPose, ZoPagePlacement } from '@/types';
import { INITIAL_ZO_SETTINGS, INITIAL_ZO_PAGE_PLACEMENTS } from '@/data/zoAssets';

interface ActiveSpeech {
  message: string;
  expression?: ZoExpression;
  pose?: ZoPose;
  duration?: number;
  key?: string;
}

interface ZoState {
  settings: ZoSettings;
  userHidden: boolean;
  userMuted: boolean;
  activeSpeech: ActiveSpeech | null;

  // Actions
  updateSettings: (updates: Partial<ZoSettings>) => void;
  updateMessage: (id: string, updates: Partial<ZoMessageItem>) => void;
  addMessage: (message: Omit<ZoMessageItem, 'id'>) => void;
  deleteMessage: (id: string) => void;
  resetMessages: () => void;

  // Page Placements Management
  updatePagePlacement: (pageId: string, updates: Partial<ZoPagePlacement>) => void;
  resetPagePlacements: () => void;
  getPagePlacement: (pageId: string) => ZoPagePlacement;

  // Custom Image & Video Upload & Render Mode Management
  setCustomImage: (key: string, dataUrl: string) => void;
  removeCustomImage: (key: string) => void;
  setCustomVideo: (key: string, dataUrlOrUrl: string) => void;
  removeCustomVideo: (key: string) => void;
  setRenderMode: (mode: 'rigged_living' | 'custom_image' | 'video') => void;
  setVideoBlendMode: (mode: 'normal' | 'screen' | 'multiply') => void;
  getCustomImage: (key: string) => string | undefined;
  getCustomVideo: (key: string) => string | undefined;

  setUserHidden: (hidden: boolean) => void;
  setUserMuted: (muted: boolean) => void;

  speak: (message: string, expression?: ZoExpression, pose?: ZoPose, duration?: number) => void;
  dismissSpeech: () => void;
  triggerPageMessage: (page: ZoMessageItem['page']) => void;
}

export const useZoStore = create<ZoState>()(
  persist(
    (set, get) => ({
      settings: INITIAL_ZO_SETTINGS,
      userHidden: false,
      userMuted: false,
      activeSpeech: null,

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            messages: state.settings.messages.map((m) =>
              m.id === id ? { ...m, ...updates } : m
            ),
          },
        }));
      },

      addMessage: (msg) => {
        const newItem: ZoMessageItem = {
          ...msg,
          id: `zo-msg-${Date.now().toString().slice(-4)}`,
        };
        set((state) => ({
          settings: {
            ...state.settings,
            messages: [...state.settings.messages, newItem],
          },
        }));
      },

      deleteMessage: (id) => {
        set((state) => ({
          settings: {
            ...state.settings,
            messages: state.settings.messages.filter((m) => m.id !== id),
          },
        }));
      },

      resetMessages: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            messages: INITIAL_ZO_SETTINGS.messages,
          },
        }));
      },

      updatePagePlacement: (pageId, updates) => {
        set((state) => {
          const currentPlacements = state.settings.pagePlacements || INITIAL_ZO_PAGE_PLACEMENTS;
          const currentItem = currentPlacements[pageId] || INITIAL_ZO_PAGE_PLACEMENTS[pageId] || {
            pageId,
            pageNameAr: pageId,
            pageNameEn: pageId,
            enabled: true,
            pose: 'waving',
            expression: 'happy',
            messageAr: '',
            messageEn: '',
            position: 'center',
          };

          return {
            settings: {
              ...state.settings,
              pagePlacements: {
                ...currentPlacements,
                [pageId]: { ...currentItem, ...updates },
              },
            },
          };
        });
      },

      resetPagePlacements: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            pagePlacements: INITIAL_ZO_PAGE_PLACEMENTS,
          },
        }));
      },

      getPagePlacement: (pageId) => {
        const placements = get().settings.pagePlacements || INITIAL_ZO_PAGE_PLACEMENTS;
        return placements[pageId] || INITIAL_ZO_PAGE_PLACEMENTS[pageId] || {
          pageId,
          pageNameAr: pageId,
          pageNameEn: pageId,
          enabled: true,
          pose: 'waving',
          expression: 'happy',
          messageAr: '',
          messageEn: '',
          position: 'center',
        };
      },

      setCustomImage: (key, dataUrl) => {
        set((state) => ({
          settings: {
            ...state.settings,
            customImages: {
              ...(state.settings.customImages || {}),
              [key]: dataUrl,
            },
          },
        }));
      },

      removeCustomImage: (key) => {
        set((state) => {
          const updated = { ...(state.settings.customImages || {}) };
          delete updated[key];
          return {
            settings: {
              ...state.settings,
              customImages: updated,
            },
          };
        });
      },

      setCustomVideo: (key, dataUrlOrUrl) => {
        set((state) => ({
          settings: {
            ...state.settings,
            customVideos: {
              ...(state.settings.customVideos || {}),
              [key]: dataUrlOrUrl,
            },
          },
        }));
      },

      removeCustomVideo: (key) => {
        set((state) => {
          const updated = { ...(state.settings.customVideos || {}) };
          delete updated[key];
          return {
            settings: {
              ...state.settings,
              customVideos: updated,
            },
          };
        });
      },

      setRenderMode: (mode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            renderMode: mode,
          },
        }));
      },

      setVideoBlendMode: (mode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            videoBlendMode: mode,
          },
        }));
      },

      getCustomImage: (key) => {
        return get().settings.customImages?.[key];
      },

      getCustomVideo: (key) => {
        return get().settings.customVideos?.[key];
      },

      setUserHidden: (hidden) => {
        set({ userHidden: hidden });
      },

      setUserMuted: (muted) => {
        set({ userMuted: muted });
      },

      speak: (message, expression = 'happy', pose = 'waving', duration = 5000) => {
        const { userMuted, userHidden, settings } = get();
        if (userHidden || !settings.enabled) return;

        set({
          activeSpeech: {
            message: userMuted ? '' : message,
            expression,
            pose,
            duration,
            key: `${Date.now()}`,
          },
        });
      },

      dismissSpeech: () => {
        set({ activeSpeech: null });
      },

      triggerPageMessage: (page) => {
        const { settings, userHidden, userMuted } = get();
        if (userHidden || !settings.enabled) return;

        // Check page setting switches
        if (page === 'home' && !settings.showOnHome) return;
        if (page === 'services' && !settings.showOnServices) return;
        if (page === 'booking' && !settings.showOnBooking) return;
        if (page === 'offers' && !settings.showOnOffers) return;
        if (page === 'faq' && !settings.showOnFAQ) return;
        if (page === 'gallery' && !settings.showOnGallery) return;

        const targetMessage = settings.messages.find(
          (m) => m.page === page && m.enabled
        );

        if (targetMessage) {
          set({
            activeSpeech: {
              message: userMuted ? '' : targetMessage.message,
              expression: targetMessage.expression,
              pose: targetMessage.pose,
              duration: targetMessage.duration || 5000,
              key: `${page}-${Date.now()}`,
            },
          });
        }
      },
    }),
    {
      name: 'cleanzo-zo-mascot-storage',
      partialize: (state) => ({
        settings: state.settings,
        userHidden: state.userHidden,
        userMuted: state.userMuted,
      }),
    }
  )
);
