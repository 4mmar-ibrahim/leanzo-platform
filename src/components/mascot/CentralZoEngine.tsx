'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useZoStudioStore } from '@/store/useZoStudioStore';
import { ZoCharacter } from './ZoCharacter';
import { cn } from '@/lib/utils';
import { ZoDeviceBreakpoint } from '@/types/zoStudioTypes';
import { getCachedZoImage } from '@/lib/zo/zoImageStorage';
import { DEFAULT_ZO_PAGE_CONFIGS } from '@/data/defaultZoConfigs';

// Subtle, gentle chime played ONLY when customer explicitly taps Zo (if enabled in Admin)
function playInteractiveZoChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.21);
  } catch {
    // Silent fail
  }
}

type ResponsiveDeviceTier = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'large';

export function CentralZoEngine() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  const {
    publishedConfigs,
    activeTrigger,
    getActivePageConfig,
  } = useZoStudioStore();

  const [deviceTier, setDeviceTier] = useState<ResponsiveDeviceTier>('desktop');
  const [deviceBreakpoint, setDeviceBreakpoint] = useState<ZoDeviceBreakpoint>('desktop');
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentSearch, setCurrentSearch] = useState('');

  // Page-specific speech bubble visibility state.
  // Independent for each page route — NEVER persisted across pages in localStorage/cookies.
  const [isMessageOpen, setIsMessageOpen] = useState(false);

  // Mascot DOM reference used to exempt clicks/taps on Zo from global dismiss listeners
  const mascotContainerRef = useRef<HTMLDivElement | null>(null);
  const prevPathnameRef = useRef<string | null>(null);

  // Track search query params (for multi-step booking flows like ?step=2)
  useEffect(() => {
    const updateSearch = () => {
      if (typeof window !== 'undefined') {
        setCurrentSearch(window.location.search || '');
      }
    };
    updateSearch();
    window.addEventListener('popstate', updateSearch);
    return () => {
      window.removeEventListener('popstate', updateSearch);
    };
  }, [pathname]);

  // Device responsiveness and screen tier detection
  useEffect(() => {
    setMounted(true);
    const updateDevice = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setDeviceTier('mobile');
        setDeviceBreakpoint('mobile');
      } else if (w < 1024) {
        setDeviceTier('tablet');
        setDeviceBreakpoint('tablet');
      } else if (w < 1280) {
        setDeviceTier('laptop');
        setDeviceBreakpoint('desktop');
      } else if (w < 1536) {
        setDeviceTier('desktop');
        setDeviceBreakpoint('desktop');
      } else {
        setDeviceTier('large');
        setDeviceBreakpoint('desktop');
      }
    };
    updateDevice();
    window.addEventListener('resize', updateDevice);

    // Initial backend sync
    useZoStudioStore.getState().syncFromBackend?.().catch(() => {});

    // Instant cross-tab & admin sync event
    const handleSync = async () => {
      try {
        await useZoStudioStore.persist?.rehydrate?.();
        await useZoStudioStore.getState().syncFromBackend?.();
      } catch {}
      setRefreshKey((k) => k + 1);
    };

    window.addEventListener('cleanzo-zo-updated', handleSync);
    window.addEventListener('storage', handleSync);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('cleanzo_zo_channel');
      bc.onmessage = handleSync;
    } catch {}

    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('cleanzo-zo-updated', handleSync);
      window.removeEventListener('storage', handleSync);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, []);

  // Current page config - dynamically resolved per pathname & query
  const pageConfig = useMemo(() => {
    return getActivePageConfig(pathname || '/', currentSearch);
  }, [pathname, currentSearch, getActivePageConfig, publishedConfigs, refreshKey]);

  // Determine if this page has an enabled message and valid text
  const fallbackMessageText = 'أهلاً بك في Cleanzo! كيف يمكنني مساعدتك؟';
  const fallbackMessageTextEn = 'Welcome to Cleanzo! How can I help you?';

  const resolvedMessageText =
    activeTrigger?.message ||
    pageConfig?.message?.text ||
    DEFAULT_ZO_PAGE_CONFIGS[pageConfig?.pageId || 'home']?.message?.text ||
    DEFAULT_ZO_PAGE_CONFIGS.home?.message?.text ||
    fallbackMessageText;

  const resolvedMessageTextEn =
    activeTrigger?.messageEn ||
    pageConfig?.message?.textEn ||
    DEFAULT_ZO_PAGE_CONFIGS[pageConfig?.pageId || 'home']?.message?.textEn ||
    DEFAULT_ZO_PAGE_CONFIGS.home?.message?.textEn ||
    fallbackMessageTextEn;

  const hasConfiguredMessage = Boolean(
    pageConfig &&
    pageConfig.enabled &&
    pageConfig.message?.enabled !== false &&
    resolvedMessageText &&
    resolvedMessageText.trim().length > 0
  );

  // 1. PAGE INDEPENDENCE LIFECYCLE:
  // When navigating to a new page route:
  // - Reset the message visibility state independently for the new page.
  // - Do NOT inherit dismissed status from the previous page.
  // - Message appears if enabled for this page, or starts hidden if disabled.
  useEffect(() => {
    if (!mounted || isAdmin) return;

    const fullRoute = `${pathname}${currentSearch}`;
    if (prevPathnameRef.current !== fullRoute) {
      prevPathnameRef.current = fullRoute;
      // Initialize message state freshly for this specific page
      setIsMessageOpen(hasConfiguredMessage);
    }
  }, [pathname, currentSearch, mounted, isAdmin, hasConfiguredMessage]);

  // 2. USER INTERACTION AUTO-DISMISS:
  // On any clear user interaction with the page (scroll, swipe, touch, click any element, typing),
  // smoothly hide the speech bubble while keeping the Zo mascot visible.
  // Clicking/touching Zo itself is strictly exempted.
  useEffect(() => {
    if (isAdmin || !isMessageOpen) return;

    let initialScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    let initialScrollX = typeof window !== 'undefined' ? window.scrollX : 0;
    let isAttached = true;

    const handleDismiss = (e?: Event) => {
      if (!isAttached) return;

      // Exception: If the interaction originated inside Zo mascot or its speech bubble, DO NOT dismiss!
      if (e && e.target && mascotContainerRef.current) {
        if (mascotContainerRef.current.contains(e.target as Node)) {
          return;
        }
      }

      // Hide message bubble smoothly, keeping the mascot character visible
      setIsMessageOpen(false);
    };

    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      const dy = Math.abs(window.scrollY - initialScrollY);
      const dx = Math.abs(window.scrollX - initialScrollX);
      // Threshold of 10px ensures micro-movements or layout stabilization don't cause false dismissals
      if (dy > 10 || dx > 10) {
        handleDismiss();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 5 || Math.abs(e.deltaX) > 5) {
        handleDismiss(e);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleDismiss(e);
    };

    const handlePointerDown = (e: PointerEvent) => {
      handleDismiss(e);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore standalone modifier keys (Shift, Ctrl, Alt, Meta, Tab)
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock'].includes(e.key)) return;
      handleDismiss(e);
    };

    // Small delay (150ms) to allow smooth page entrance without immediate false trigger
    const timer = setTimeout(() => {
      if (!isAttached) return;
      initialScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      initialScrollX = typeof window !== 'undefined' ? window.scrollX : 0;

      window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
      window.addEventListener('wheel', handleWheel, { passive: true, capture: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
      window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
      window.addEventListener('keydown', handleKeyDown, { passive: true, capture: true });
    }, 150);

    return () => {
      isAttached = false;
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleWheel, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isAdmin, isMessageOpen]);

  // 3. EXPLICIT CLICK ON ZO MASCOT:
  // Toggles the speech bubble open or closed smoothly without moving Zo or causing flicker
  const handleZoToggle = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (pageConfig?.message?.playSound) {
      playInteractiveZoChime();
    }

    setIsMessageOpen((prev) => !prev);
  }, [pageConfig]);

  if (!mounted || isAdmin) return null;
  if (!pageConfig || !pageConfig.enabled) return null;

  // Active appearance config
  const expression = activeTrigger?.expression || pageConfig.character.expression;
  const pose = activeTrigger?.pose || pageConfig.character.pose;
  const animation = activeTrigger?.animation || pageConfig.character.animation;

  // Consistent, beautiful responsive size for the permanent Zo floating mascot
  let computedSize = 125;
  switch (deviceTier) {
    case 'mobile':
      computedSize = 76;
      break;
    case 'tablet':
      computedSize = 96;
      break;
    case 'laptop':
      computedSize = 112;
      break;
    case 'desktop':
      computedSize = 125;
      break;
    case 'large':
      computedSize = 140;
      break;
  }

  // Safe bottom elevation on mobile & tablet:
  // MobileBottomNav takes ~64px-72px + env(safe-area-inset-bottom).
  // Zo MUST float CLEARLY ABOVE IT with ample air gap.
  // Calculated bottom: 84px + env(safe-area-inset-bottom, 12px) + 16px = 100px+
  const isSmallScreen = deviceTier === 'mobile' || deviceTier === 'tablet';
  const bottomMargin = isSmallScreen
    ? `calc(84px + env(safe-area-inset-bottom, 12px) + 16px)`
    : '24px';

  // Container styling:
  // - zIndex: 50 ensures Zo is visually layered cleanly above page sections and bottom nav (z-40)
  // - pointerEvents: 'none' ensures the fixed root NEVER blocks clicks on page content or navigation
  // - Zo mascot and its speech bubble have pointerEvents: 'auto'
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 50,
    pointerEvents: 'none',
    bottom: bottomMargin,
    right: isSmallScreen ? `calc(14px + env(safe-area-inset-right, 0px))` : '24px',
    transition: 'bottom 0.35s cubic-bezier(0.16, 1, 0.3, 1), right 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <div
      style={containerStyle}
      className="zo-mascot-root-container select-none"
      aria-label="مساعد Cleanzo الذكي"
    >
      {/* Mascot Wrapper ref: Exempts all inner clicks/touches from global interaction dismissal */}
      <div
        ref={mascotContainerRef}
        className="relative pointer-events-auto"
      >
        <ZoCharacter
          key={`zo-engine-${pageConfig.pageId}-${refreshKey}-${pageConfig.character.customImage || 'default'}`}
          expression={expression}
          pose={pose}
          animation={animation}
          animationSpeed={pageConfig.character.animationSpeed}
          autoBlink={pageConfig.character.autoBlink}
          eyeMovement={pageConfig.character.eyeMovement}
          scale={pageConfig.character.scale}
          rotationY={pageConfig.character.rotationY}
          opacity={pageConfig.character.opacity}
          shadow={pageConfig.character.shadow}
          glow={pageConfig.character.glow}
          originalImageUrl={
            (() => {
              const url = pageConfig.character.originalImageUrl || pageConfig.character.customImage || '/brand/zo/zo-approved.png';
              if (url && url.startsWith('/uploads') && pageConfig.character.versionTimestamp) {
                return `${url}?v=${pageConfig.character.versionTimestamp}`;
              }
              return url;
            })()
          }
          customImage={
            (() => {
              const raw =
                pageConfig.character.originalImageUrl ||
                pageConfig.character.customImage ||
                getCachedZoImage(`zo_img_${pageConfig.pageId}`) ||
                '/brand/zo/zo-approved.png';
              if (raw && raw.startsWith('/uploads') && pageConfig.character.versionTimestamp) {
                return `${raw}?v=${pageConfig.character.versionTimestamp}`;
              }
              return raw;
            })()
          }
          animationIntensity={pageConfig.character.animationIntensity}
          customImageDepth={pageConfig.character.customImageDepth}
          size={computedSize}
          lookAtCursor={true}
          bubbleAlignment="right"
          message={resolvedMessageText}
          messageEn={resolvedMessageTextEn}
          messageTitle={pageConfig.message.title}
          isMessageOpen={isMessageOpen}
          messageConfig={{
            ...pageConfig.message,
            delay: 200,
            duration: 4000,
            autoHide: false, // Fully controlled by CentralZoEngine interaction system
            playSound: false,
          }}
          onCharacterClick={handleZoToggle}
          onMessageClose={() => {
            setIsMessageOpen(false);
          }}
        />
      </div>
    </div>
  );
}
