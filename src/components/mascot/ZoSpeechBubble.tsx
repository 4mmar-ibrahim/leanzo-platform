'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Sparkles, Volume2, VolumeX, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { cn } from '@/lib/utils';

export interface ZoSpeechBubbleProps {
  isOpen?: boolean;
  title?: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  bubbleStyle?: 'classic' | 'glass' | 'modern' | 'cleanzo_blue' | 'gradient';
  fontSize?: 'sm' | 'md' | 'lg';
  maxWidth?: number;
  position?: 'top' | 'top-start' | 'top-end' | 'top-right' | 'top-left' | 'side-start' | 'side-end' | 'bottom';
  delay?: number;
  duration?: number;
  autoHide?: boolean;
  showCloseButton?: boolean;
  playSound?: boolean;
  actionButton?: {
    label: string;
    labelEn?: string;
    onClick: () => void;
  };
  textColor?: string;
  titleColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  onClose?: () => void;
  className?: string;
}

// Gentle Web Audio sound synthesizer
function playSpeechBubbleChime() {
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

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  } catch {
    // Silent
  }
}

export function ZoSpeechBubble({
  isOpen,
  title,
  titleEn,
  message,
  messageEn,
  bubbleStyle = 'cleanzo_blue',
  fontSize = 'sm',
  maxWidth = 250,
  position = 'top-start',
  delay = 300,
  duration = 4000,
  autoHide = false,
  showCloseButton = true,
  playSound = false,
  actionButton,
  textColor,
  titleColor,
  backgroundColor,
  borderColor,
  onClose,
  className = '',
}: ZoSpeechBubbleProps) {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';

  const [internalVisible, setInternalVisible] = useState(isOpen !== undefined ? isOpen : false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync controlled isOpen
  useEffect(() => {
    if (isOpen !== undefined) {
      setInternalVisible(isOpen);
    }
  }, [isOpen]);

  // Determine display title & body cleanly
  const activeTitle = (isAr ? title : (titleEn || title)) || '';
  const rawMessage = ((isAr ? message : (messageEn || message)) || '').trim();

  // Strip generic/default titles completely so "زو المساعد الذكي" never appears
  const isGenericTitle = (text: string) => {
    const clean = text.trim().toLowerCase();
    return (
      clean === 'زو المساعد الذكي' ||
      clean === 'زو المساعد الذكي 👋' ||
      clean === 'zo assistant' ||
      clean === 'zo assistant 👋' ||
      clean.includes('المساعد الذكي') ||
      clean.includes('zo assistant')
    );
  };

  let displayTitle = '';
  let displayBody = rawMessage;

  if (activeTitle && !isGenericTitle(activeTitle)) {
    if (activeTitle.trim() === displayBody) {
      displayTitle = '';
    } else if (displayBody.startsWith(activeTitle.trim())) {
      const rest = displayBody.slice(activeTitle.trim().length).trim();
      if (rest) {
        displayBody = rest;
        displayTitle = activeTitle.trim();
      }
    } else {
      displayTitle = activeTitle.trim();
    }
  } else if (!displayBody && activeTitle && !isGenericTitle(activeTitle)) {
    displayBody = activeTitle;
  }

  // Entrance and optional autoHide timer for uncontrolled mode
  useEffect(() => {
    if (isOpen !== undefined) return;

    setInternalVisible(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    const actualDelay = delay ?? 200;
    const showTimer = setTimeout(() => {
      setInternalVisible(true);

      if (autoHide && duration > 0) {
        hideTimerRef.current = setTimeout(() => {
          setInternalVisible(false);
          if (onClose) onClose();
        }, duration);
      }
    }, actualDelay);

    return () => {
      clearTimeout(showTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isOpen, rawMessage, activeTitle, delay, duration, autoHide, playSound, onClose]);

  const finalContent = displayBody || displayTitle;
  if (!finalContent) return null;

  const isVisible = isOpen !== undefined ? isOpen : internalVisible;

  // Style Variants - Official Cleanzo Palette
  const styleClasses = {
    cleanzo_blue:
      'bg-[#07345C]/95 text-white border border-[#0866C6]/50 shadow-[0_12px_32px_rgba(8,102,198,0.32)] backdrop-blur-xl',
    glass:
      'bg-white/90 dark:bg-[#082845]/90 text-[#07345C] dark:text-[#F8FAFC] border border-slate-200 dark:border-[#133B61] shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl',
    modern:
      'bg-white dark:bg-[#082845] text-[#07345C] dark:text-white border-2 border-[#0866C6] shadow-xl',
    classic:
      'bg-white dark:bg-[#082845] text-[#07345C] dark:text-[#F8FAFC] border border-slate-200 dark:border-[#133B61] shadow-lg',
    gradient:
      'bg-gradient-to-br from-[#0866C6] to-[#07345C] text-white border border-white/20 shadow-xl',
  }[bubbleStyle];

  const fontClasses = {
    sm: 'text-xs sm:text-[13px] leading-normal',
    md: 'text-sm leading-normal',
    lg: 'text-base leading-normal',
  }[fontSize];

  // High contrast default text color if not explicitly customized
  const isDarkBubble = bubbleStyle === 'cleanzo_blue' || bubbleStyle === 'gradient';
  const defaultTextColorClass = isDarkBubble
    ? 'text-white'
    : 'text-slate-900 dark:text-slate-100';

  // Tail orientation
  const tailPositionClasses = {
    'top': 'bottom-[-5px] left-1/2 -translate-x-1/2',
    'top-start': 'bottom-[-5px] start-5',
    'top-end': 'bottom-[-5px] end-5',
    'top-right': 'bottom-[-5px] right-5',
    'top-left': 'bottom-[-5px] left-5',
    'side-start': 'top-1/2 -translate-y-1/2 end-[-5px]',
    'side-end': 'top-1/2 -translate-y-1/2 start-[-5px]',
    'bottom': 'top-[-5px] left-1/2 -translate-x-1/2',
  }[position] || 'bottom-[-5px] right-5';

  const customContainerStyle: React.CSSProperties = {
    maxWidth: `${maxWidth || 270}px`,
    width: 'max-content',
    minWidth: '120px',
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(borderColor ? { borderColor } : {}),
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={cn(
        'relative z-30 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl transition-all duration-200 ease-out w-max max-w-[min(280px,calc(100vw-36px))]',
        isOpen !== undefined
          ? (isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-2 pointer-events-none')
          : (isVisible ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'),
        styleClasses,
        className
      )}
      style={customContainerStyle}
    >
      {/* Optional Custom Title (only when explicitly provided and non-generic) */}
      {displayTitle ? (
        <>
          <div className="flex items-center justify-between gap-2.5 mb-1">
            <span
              className="font-bold text-[11px] leading-tight text-[#25B8E6] dark:text-[#3894ec] truncate"
              style={titleColor ? { color: titleColor } : undefined}
            >
              {displayTitle}
            </span>
            {showCloseButton && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInternalVisible(false);
                  if (onClose) onClose();
                }}
                className="shrink-0 p-1 -me-1 -mt-0.5 rounded-full hover:bg-black/20 dark:hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p
            className={cn('font-medium whitespace-normal', !textColor && defaultTextColorClass, fontClasses)}
            style={textColor ? { color: textColor } : undefined}
          >
            {displayBody}
          </p>
        </>
      ) : (
        /* Single-line or compact layout when no title: Body + Close button side-by-side */
        <div className="flex items-center justify-between gap-2.5">
          <p
            className={cn(
              'font-medium whitespace-normal select-none',
              !textColor && defaultTextColorClass,
              fontClasses
            )}
            style={textColor ? { color: textColor } : undefined}
          >
            {displayBody}
          </p>

          {showCloseButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInternalVisible(false);
                if (onClose) onClose();
              }}
              className="shrink-0 p-1 -me-1 rounded-full hover:bg-black/20 dark:hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Optional Action Button */}
      {actionButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            actionButton.onClick();
            setInternalVisible(false);
            if (onClose) onClose();
          }}
          className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F0444C] hover:bg-[#D42E36] text-white text-xs font-bold transition-all shadow-md active:scale-95"
        >
          <span>{isAr ? actionButton.label : (actionButton.labelEn || actionButton.label)}</span>
          {isAr ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
        </button>
      )}

      {/* Speech bubble tail pointer */}
      <div
        className={cn(
          'absolute w-2.5 h-2.5 rotate-45 pointer-events-none',
          tailPositionClasses,
          bubbleStyle === 'cleanzo_blue' ? 'bg-[#07345C] border-b border-e border-[#0866C6]/50' : 'bg-current'
        )}
      />
    </div>
  );
}
