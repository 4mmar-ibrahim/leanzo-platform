'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ZoPageConfig,
  ZoTriggerRule,
  ZoTriggerEventType,
  ZoExpression3D,
  ZoPose3D,
  ZoAnimationType,
} from '@/types/zoStudioTypes';
import { DEFAULT_ZO_PAGE_CONFIGS } from '@/data/defaultZoConfigs';
import { saveZoImage, getZoImage, deleteZoImage, getCachedZoImage } from '@/lib/zo/zoImageStorage';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

export interface ActiveTriggerEvent {
  priority: 1 | 2 | 3 | 4 | 5;
  expression: ZoExpression3D;
  pose: ZoPose3D;
  animation?: ZoAnimationType;
  message?: string;
  messageEn?: string;
  duration?: number;
  timestamp: number;
}

interface ZoStudioState {
  // Published configurations consumed by the customer website
  publishedConfigs: Record<string, ZoPageConfig>;

  // Draft configurations being edited by administrators in Zo Studio
  draftConfigs: Record<string, ZoPageConfig>;

  // Active page being edited/previewed in Zo Studio
  activeStudioPageId: string;

  // Active runtime trigger state
  activeTrigger: ActiveTriggerEvent | null;

  // Track pages with uncommitted drafts
  dirtyPages: Record<string, boolean>;

  // Global user dismissal state (persisted per session)
  dismissedPages: Record<string, boolean>;
  userMuted: boolean;
  userHidden: boolean;

  // Admin Actions
  selectStudioPage: (pageId: string) => void;
  updateDraftConfig: (pageId: string, updates: Partial<ZoPageConfig>) => void;
  updateDraftCharacter: (pageId: string, updates: Partial<ZoPageConfig['character']>) => void;
  updateDraftPosition: (pageId: string, device: 'desktop' | 'tablet' | 'mobile', updates: Partial<ZoPageConfig['desktop']>) => void;
  updateDraftMessage: (pageId: string, updates: Partial<ZoPageConfig['message']>) => void;
  updateDraftBehavior: (pageId: string, updates: Partial<ZoPageConfig['behavior']>) => void;
  addDraftTrigger: (pageId: string, trigger: Omit<ZoTriggerRule, 'id'>) => void;
  updateDraftTrigger: (pageId: string, triggerId: string, updates: Partial<ZoTriggerRule>) => void;
  removeDraftTrigger: (pageId: string, triggerId: string) => void;

  // Lifecycle
  saveDraft: (pageId: string) => void;
  publishPage: (pageId: string) => void;
  publishAll: (sourcePageId?: string) => void;
  applyCharacterToAllPages: (sourcePageId?: string) => void;
  syncFromBackend: () => Promise<void>;
  resetPage: (pageId: string) => void;
  duplicateConfig: (sourcePageId: string, targetPageId: string) => void;

  // Customer Site Dispatcher & Event Priority Bus
  getActivePageConfig: (pathname: string, search?: string) => ZoPageConfig;
  emitTrigger: (
    eventType: ZoTriggerEventType,
    options?: {
      conditionKey?: string;
      customMessage?: string;
      customMessageEn?: string;
      customExpression?: ZoExpression3D;
      customPose?: ZoPose3D;
      priority?: 1 | 2 | 3 | 4 | 5;
    }
  ) => void;
  clearActiveTrigger: () => void;

  // User controls
  dismissCurrentMessage: (pageId: string) => void;
  setUserMuted: (muted: boolean) => void;
  setUserHidden: (hidden: boolean) => void;
}

// Helper to map pathname and optional query to canonical pageId
export function resolvePageIdFromPath(pathname: string, search?: string): string {
  if (!pathname || pathname === '/') return 'home';

  // Normalize: lower case and trim trailing slashes (except root '/')
  let clean = pathname.toLowerCase().trim();
  while (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }

  // Detect query params for multi-step flows
  let query = (search || '').toLowerCase();
  if (!query && typeof window !== 'undefined' && window.location?.search) {
    query = window.location.search.toLowerCase();
  }

  // 1. Booking Flow & Steps
  if (clean === '/booking/confirmation' || clean === '/booking/success') {
    return 'booking-confirmation';
  }
  if (clean === '/booking' || clean.startsWith('/booking/')) {
    if (query.includes('step=1') || clean.includes('/step-1') || clean.endsWith('/1')) return 'booking-step-1';
    if (query.includes('step=2') || clean.includes('/step-2') || clean.endsWith('/2')) return 'booking-step-2';
    if (query.includes('step=3') || clean.includes('/step-3') || clean.endsWith('/3')) return 'booking-step-3';
    if (query.includes('step=4') || clean.includes('/step-4') || clean.endsWith('/4')) return 'booking-step-4';
    return 'booking';
  }

  // 2. Services: Car & Home specific vs Service Details
  if (clean === '/services/car') return 'car-services';
  if (clean.startsWith('/services/car/')) return 'service-details'; // Individual car service detail

  if (clean === '/services/home') return 'home-services';
  if (clean.startsWith('/services/home/')) return 'service-details'; // Individual home service detail

  if (clean === '/services') return 'services';
  if (clean.startsWith('/services/')) return 'service-details'; // General individual service detail

  // 3. User Dashboard vs Account
  if (clean === '/dashboard' || clean.startsWith('/dashboard/')) return 'dashboard';
  if (clean === '/account' || clean.startsWith('/account/')) return 'account';

  // 4. Content & Marketing Pages
  if (clean === '/offers' || clean.startsWith('/offers/')) return 'offers';
  if (clean === '/gallery' || clean.startsWith('/gallery/')) return 'gallery';
  if (clean === '/about' || clean.startsWith('/about/')) return 'about';
  if (clean === '/faq' || clean.startsWith('/faq/')) return 'faq';
  if (clean === '/contact' || clean.startsWith('/contact/')) return 'contact';
  if (clean === '/reviews' || clean.startsWith('/reviews/')) return 'gallery';

  // 5. Auth Pages
  if (clean === '/login' || clean === '/auth/login' || clean.startsWith('/forgot-password') || clean.startsWith('/auth/')) return 'login';
  if (clean === '/register' || clean === '/auth/register') return 'register';

  // 6. Tracking
  if (clean === '/track' || clean.startsWith('/track/') || clean.startsWith('/tracking')) return 'tracking';

  // 7. System States
  if (clean === '/empty' || clean.startsWith('/empty/')) return 'empty-state';
  if (clean === '/error' || clean.startsWith('/error/')) return 'error';
  if (clean === '/404' || clean.startsWith('/404/')) return 'not-found';

  // Fallbacks for content sub-pages
  if (clean.startsWith('/team') || clean.startsWith('/terms') || clean.startsWith('/privacy')) return 'about';

  return 'home';
}

// Automatic legacy storage cleanup & migration
if (typeof window !== 'undefined') {
  try {
    // 1. Remove obsolete storage keys if present
    window.localStorage.removeItem('cleanzo-zo-studio-storage');
    window.localStorage.removeItem('cleanzo-zo-studio-storage-v1');
    window.localStorage.removeItem('cleanzo-zo-companion-storage');

    // 2. Sanitize bloated cleanzo-zo-studio-storage-v2 to free up quota immediately
    const current = window.localStorage.getItem('cleanzo-zo-studio-storage-v2');
    if (current && current.length > 1500000) {
      console.info('[ZoStudioStore] Sanitizing legacy bloated storage payload...');
      const parsed = JSON.parse(current);
      if (parsed?.state) {
        // Safely offload any heavy base64 images to IndexedDB so they are NEVER lost
        if (parsed.state.draftConfigs) {
          for (const key of Object.keys(parsed.state.draftConfigs)) {
            const char = parsed.state.draftConfigs[key]?.character;
            if (char?.customImage && char.customImage.startsWith('data:')) {
              saveZoImage(`zo_img_${key}`, char.customImage);
              char.customImage = `indexeddb://zo_img_${key}`;
            }
          }
        }
        if (parsed.state.publishedConfigs) {
          for (const key of Object.keys(parsed.state.publishedConfigs)) {
            const char = parsed.state.publishedConfigs[key]?.character;
            if (char?.customImage && char.customImage.startsWith('data:')) {
              saveZoImage(`zo_img_${key}`, char.customImage);
              char.customImage = `indexeddb://zo_img_${key}`;
            }
          }
        }
        window.localStorage.setItem('cleanzo-zo-studio-storage-v2', JSON.stringify(parsed));
      }
    }
  } catch (e) {
    console.warn('[ZoStudioStore] Initial storage migration notice:', e);
  }
}

// Custom Safe Storage Adapter that prevents QuotaExceededError crashes
const safeLocalStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(name);
      if (!raw) return null;

      // Rehydrate any stored indexeddb:// references synchronously from memory/localStorage
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.state) {
          let modified = false;
          if (parsed.state.publishedConfigs) {
            for (const key of Object.keys(parsed.state.publishedConfigs)) {
              const char = parsed.state.publishedConfigs[key]?.character;
              if (char?.customImage && char.customImage.startsWith('indexeddb://')) {
                const imgKey = char.customImage.replace('indexeddb://', '');
                const resolved = getCachedZoImage(imgKey);
                if (resolved) {
                  char.customImage = resolved;
                  modified = true;
                }
              }
            }
          }
          if (parsed.state.draftConfigs) {
            for (const key of Object.keys(parsed.state.draftConfigs)) {
              const char = parsed.state.draftConfigs[key]?.character;
              if (char?.customImage && char.customImage.startsWith('indexeddb://')) {
                const imgKey = char.customImage.replace('indexeddb://', '');
                const resolved = getCachedZoImage(imgKey);
                if (resolved) {
                  char.customImage = resolved;
                  modified = true;
                }
              }
            }
          }
          if (modified) {
            return JSON.stringify(parsed);
          }
        }
      } catch {}

      return raw;
    } catch (e) {
      console.warn('[ZoStudioStore] Failed to read from localStorage:', e);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(name, value);
    } catch (err) {
      console.warn('[ZoStudioStore] LocalStorage quota exceeded. Applying IndexedDB offload...', err);
      try {
        const parsed = JSON.parse(value);
        if (parsed?.state) {
          // Offload heavy base64 strings into IndexedDB safely without losing user images
          if (parsed.state.draftConfigs) {
            for (const key of Object.keys(parsed.state.draftConfigs)) {
              const char = parsed.state.draftConfigs[key]?.character;
              if (char?.customImage && char.customImage.startsWith('data:')) {
                saveZoImage(`zo_img_${key}`, char.customImage);
                char.customImage = `indexeddb://zo_img_${key}`;
              }
            }
          }
          if (parsed.state.publishedConfigs) {
            for (const key of Object.keys(parsed.state.publishedConfigs)) {
              const char = parsed.state.publishedConfigs[key]?.character;
              if (char?.customImage && char.customImage.startsWith('data:')) {
                saveZoImage(`zo_img_${key}`, char.customImage);
                char.customImage = `indexeddb://zo_img_${key}`;
              }
            }
          }
          window.localStorage.setItem(name, JSON.stringify(parsed));
        }
      } catch (innerErr) {
        console.warn('[ZoStudioStore] LocalStorage quota reached, state remains fully operational in memory.', innerErr);
      }
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
    } catch {}
  },
};

export const useZoStudioStore = create<ZoStudioState>()(
  persist(
    (set, get) => ({
      publishedConfigs: DEFAULT_ZO_PAGE_CONFIGS,
      draftConfigs: DEFAULT_ZO_PAGE_CONFIGS,
      activeStudioPageId: 'home',
      activeTrigger: null,
      dirtyPages: {},
      dismissedPages: {},
      userMuted: false,
      userHidden: false,

      selectStudioPage: (pageId) => {
        set({ activeStudioPageId: pageId });
      },

      updateDraftConfig: (pageId, updates) => {
        const now = new Date().toISOString();
        set((state) => {
          const current = state.draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId] || DEFAULT_ZO_PAGE_CONFIGS.home;
          const updated: ZoPageConfig = {
            ...current,
            ...updates,
            updatedAt: now,
            publishedAt: now,
          };

          return {
            draftConfigs: {
              ...state.draftConfigs,
              [pageId]: updated,
            },
            publishedConfigs: {
              ...state.publishedConfigs,
              [pageId]: updated,
            },
            dirtyPages: {
              ...state.dirtyPages,
              [pageId]: false,
            },
          };
        });

        // Instant cross-tab & website event broadcast
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cleanzo-zo-updated'));
          try {
            const bc = new BroadcastChannel('cleanzo_zo_channel');
            bc.postMessage({ type: 'SYNC_ZO', pageId });
            bc.close();
          } catch {}
        }
      },

      updateDraftCharacter: (pageId, updates) => {
        const current = get().draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
        if (!current) return;

        // Persist to IndexedDB for high-capacity local backing
        if (updates.customImage && updates.customImage.startsWith('data:')) {
          saveZoImage(`zo_img_${pageId}`, updates.customImage);
        } else if (updates.customImage === undefined && updates.renderMode === '3d_procedural') {
          deleteZoImage(`zo_img_${pageId}`);
        }

        get().updateDraftConfig(pageId, {
          character: {
            ...current.character,
            ...updates,
            versionTimestamp: updates.versionTimestamp || Date.now(),
          },
        });
      },

      updateDraftPosition: (pageId, device, updates) => {
        const current = get().draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
        if (!current) return;
        get().updateDraftConfig(pageId, {
          [device]: { ...current[device], ...updates },
        });
      },

      updateDraftMessage: (pageId, updates) => {
        const current = get().draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
        if (!current) return;
        get().updateDraftConfig(pageId, {
          message: { ...current.message, ...updates },
        });
      },

      updateDraftBehavior: (pageId, updates) => {
        const current = get().draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
        if (!current) return;
        get().updateDraftConfig(pageId, {
          behavior: { ...current.behavior, ...updates },
        });
      },

      addDraftTrigger: (pageId, trigger) => {
        const current = get().draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
        if (!current) return;
        const newTrigger: ZoTriggerRule = {
          ...trigger,
          id: `trig-${Date.now()}`,
        };
        get().updateDraftConfig(pageId, {
          triggers: [...(current.triggers || []), newTrigger],
        });
      },

      updateDraftTrigger: (pageId, triggerId, updates) => {
        const current = get().draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
        if (!current) return;
        get().updateDraftConfig(pageId, {
          triggers: current.triggers.map((t) => (t.id === triggerId ? { ...t, ...updates } : t)),
        });
      },

      removeDraftTrigger: (pageId, triggerId) => {
        const current = get().draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
        if (!current) return;
        get().updateDraftConfig(pageId, {
          triggers: current.triggers.filter((t) => t.id !== triggerId),
        });
      },

      // Save Draft & Automatically Update Published for Immediate Live Website Reflection
      saveDraft: (pageId) => {
        set((state) => {
          const draft = state.draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
          const published: ZoPageConfig = {
            ...draft,
            publishedAt: new Date().toISOString(),
          };

          return {
            publishedConfigs: {
              ...state.publishedConfigs,
              [pageId]: published,
            },
            dirtyPages: {
              ...state.dirtyPages,
              [pageId]: false,
            },
          };
        });
      },

      publishPage: (pageId) => {
        set((state) => {
          const draft = state.draftConfigs[pageId] || DEFAULT_ZO_PAGE_CONFIGS[pageId];
          const published: ZoPageConfig = {
            ...draft,
            publishedAt: new Date().toISOString(),
          };

          return {
            publishedConfigs: {
              ...state.publishedConfigs,
              [pageId]: published,
            },
            dirtyPages: {
              ...state.dirtyPages,
              [pageId]: false,
            },
          };
        });
      },

      publishAll: () => {
        const now = new Date().toISOString();

        set((state) => {
          const newDrafts = { ...state.draftConfigs };
          const newPublished: Record<string, ZoPageConfig> = {};

          Object.keys(DEFAULT_ZO_PAGE_CONFIGS).forEach((k) => {
            const baseDraft = newDrafts[k] || state.publishedConfigs[k] || DEFAULT_ZO_PAGE_CONFIGS[k];
            const updatedDraft = {
              ...baseDraft,
              updatedAt: now,
            };
            newDrafts[k] = updatedDraft;

            newPublished[k] = {
              ...updatedDraft,
              publishedAt: now,
            };
          });

          return {
            draftConfigs: newDrafts,
            publishedConfigs: newPublished,
            dirtyPages: {},
          };
        });
      },

      applyCharacterToAllPages: (sourcePageId?: string) => {
        const activeId = sourcePageId || get().activeStudioPageId || 'home';
        const sourceCfg = get().draftConfigs[activeId] || get().publishedConfigs[activeId] || DEFAULT_ZO_PAGE_CONFIGS[activeId];
        if (!sourceCfg || !sourceCfg.character) return;

        const char = { ...sourceCfg.character };
        const now = new Date().toISOString();

        if (char.customImage && char.customImage.startsWith('data:')) {
          saveZoImage('zo_master_custom_image', char.customImage);
        }

        set((state) => {
          const newDrafts = { ...state.draftConfigs };
          const newPublished = { ...state.publishedConfigs };

          Object.keys(DEFAULT_ZO_PAGE_CONFIGS).forEach((pageKey) => {
            const currentDraft = newDrafts[pageKey] || DEFAULT_ZO_PAGE_CONFIGS[pageKey];
            newDrafts[pageKey] = {
              ...currentDraft,
              character: { ...char },
              updatedAt: now,
            };

            const currentPub = newPublished[pageKey] || currentDraft;
            newPublished[pageKey] = {
              ...currentPub,
              character: { ...char },
              publishedAt: now,
            };
          });

          return {
            draftConfigs: newDrafts,
            publishedConfigs: newPublished,
            dirtyPages: {},
          };
        });
      },

      syncFromBackend: async () => {
        try {
          const res = await cleanzoApi.zo.getPublishedConfigs();
          if (res && typeof res === 'object' && Object.keys(res).length > 0) {
            set((state) => {
              const updatedPublished = { ...state.publishedConfigs };
              const updatedDrafts = { ...state.draftConfigs };

              for (const [key, val] of Object.entries(res)) {
                if (val && typeof val === 'object') {
                  updatedPublished[key] = {
                    ...(DEFAULT_ZO_PAGE_CONFIGS[key] || {}),
                    ...(updatedPublished[key] || {}),
                    ...(val as any),
                  };
                  if (!updatedDrafts[key]?.character?.customImage) {
                    updatedDrafts[key] = {
                      ...(DEFAULT_ZO_PAGE_CONFIGS[key] || {}),
                      ...(updatedDrafts[key] || {}),
                      ...(val as any),
                    };
                  }
                }
              }

              return {
                publishedConfigs: updatedPublished,
                draftConfigs: updatedDrafts,
              };
            });
          }
        } catch {}
      },

      resetPage: (pageId) => {
        const defaultCfg = DEFAULT_ZO_PAGE_CONFIGS[pageId];
        if (!defaultCfg) return;
        set((state) => ({
          draftConfigs: {
            ...state.draftConfigs,
            [pageId]: defaultCfg,
          },
          publishedConfigs: {
            ...state.publishedConfigs,
            [pageId]: defaultCfg,
          },
          dirtyPages: {
            ...state.dirtyPages,
            [pageId]: false,
          },
        }));
      },

      duplicateConfig: (sourcePageId, targetPageId) => {
        const source = get().draftConfigs[sourcePageId] || DEFAULT_ZO_PAGE_CONFIGS[sourcePageId];
        const targetMeta = DEFAULT_ZO_PAGE_CONFIGS[targetPageId];
        if (!source || !targetMeta) return;

        const duplicated: ZoPageConfig = {
          ...source,
          pageId: targetMeta.pageId,
          pageNameAr: targetMeta.pageNameAr,
          pageNameEn: targetMeta.pageNameEn,
          pageCategory: targetMeta.pageCategory,
          pathPattern: targetMeta.pathPattern,
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          draftConfigs: {
            ...state.draftConfigs,
            [targetPageId]: duplicated,
          },
          dirtyPages: {
            ...state.dirtyPages,
            [targetPageId]: true,
          },
        }));
      },

      getActivePageConfig: (pathname, search) => {
        const pageId = resolvePageIdFromPath(pathname, search);
        const configs = get().publishedConfigs || {};
        const drafts = get().draftConfigs || {};

        const draftConfig = drafts[pageId];
        const publishedConfig = configs[pageId];
        const defaultConfig = DEFAULT_ZO_PAGE_CONFIGS[pageId] || DEFAULT_ZO_PAGE_CONFIGS.home;

        const base = publishedConfig || draftConfig || defaultConfig;

        // Resolve freshest custom image across draft, published, and cached image storage
        const bestImage =
          draftConfig?.character?.originalImageUrl ||
          draftConfig?.character?.customImage ||
          publishedConfig?.character?.originalImageUrl ||
          publishedConfig?.character?.customImage ||
          getCachedZoImage(`zo_img_${pageId}`) ||
          defaultConfig?.character?.originalImageUrl ||
          defaultConfig?.character?.customImage ||
          '/brand/zo/zo-approved.png';

        let config: ZoPageConfig = {
          ...defaultConfig,
          ...base,
          character: {
            ...defaultConfig.character,
            ...(base.character || {}),
            customImage: bestImage,
            originalImageUrl: bestImage,
            renderMode: 'live_2d_character',
          },
        };

        // Safety guard: ensure not-found and error never render in screen center overlapping content
        if ((pageId === 'not-found' || pageId === 'error') && (config.desktop.horizontal === 'center' || config.desktop.vertical === 'center')) {
          return {
            ...config,
            desktop: {
              ...config.desktop,
              horizontal: 'corner-right',
              vertical: 'bottom',
              offsetX: 28,
              offsetY: 28,
            },
            tablet: {
              ...config.tablet,
              horizontal: 'corner-right',
              vertical: 'bottom',
              offsetX: 20,
              offsetY: 20,
            },
            mobile: {
              ...config.mobile,
              horizontal: 'corner-right',
              vertical: 'bottom',
              offsetX: 14,
              offsetY: 86,
            },
            message: {
              ...config.message,
              position: 'top-start',
            },
          };
        }

        return config;
      },

      // Trigger Dispatcher with Strict Priority Conflict Resolution
      emitTrigger: (eventType, options = {}) => {
        const state = get();
        const currentActive = state.activeTrigger;

        let incomingPriority: 1 | 2 | 3 | 4 | 5 = options.priority || 3;
        if (eventType === 'error') incomingPriority = 1;
        else if (eventType === 'booking_completed' || eventType === 'login_success' || eventType === 'registration_success') {
          incomingPriority = 2;
        } else if (eventType === 'page_load' || eventType === 'page_enter') {
          incomingPriority = 4;
        }

        // If an existing higher priority trigger is running, don't allow lower priority to interrupt
        if (currentActive) {
          const timeSinceCurrent = Date.now() - currentActive.timestamp;
          const currentDuration = currentActive.duration || 4000;
          if (timeSinceCurrent < currentDuration && currentActive.priority < incomingPriority) {
            return;
          }
        }

        const newEvent: ActiveTriggerEvent = {
          priority: incomingPriority,
          expression: options.customExpression || 'happy',
          pose: options.customPose || 'idle',
          message: options.customMessage,
          messageEn: options.customMessageEn,
          duration: 4500,
          timestamp: Date.now(),
        };

        set({ activeTrigger: newEvent });

        // Auto clear after duration
        setTimeout(() => {
          if (get().activeTrigger?.timestamp === newEvent.timestamp) {
            set({ activeTrigger: null });
          }
        }, 4600);
      },

      clearActiveTrigger: () => {
        set({ activeTrigger: null });
      },

      dismissCurrentMessage: (pageId) => {
        set((state) => ({
          dismissedPages: {
            ...state.dismissedPages,
            [pageId]: true,
          },
        }));
      },

      setUserMuted: (muted) => set({ userMuted: muted }),
      setUserHidden: (hidden) => set({ userHidden: hidden }),
    }),
    {
      name: 'cleanzo-zo-studio-storage-v2',
      storage: safeLocalStorage as any,
      partialize: (state) => ({
        publishedConfigs: state.publishedConfigs,
        draftConfigs: state.draftConfigs,
        userMuted: state.userMuted,
        userHidden: state.userHidden,
      }),
    }
  )
);
