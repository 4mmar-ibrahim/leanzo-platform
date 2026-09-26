'use client';

import React, { useState } from 'react';
import { Sparkles, ImageOff } from 'lucide-react';
import { normalizeMediaUrl } from '@/lib/utils';

export type CleanzoImageFit = 'cover' | 'contain';
export type CleanzoImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface CleanzoImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fit?: CleanzoImageFit;
  position?: CleanzoImagePosition;
  aspectRatio?: '1/1' | 'square' | string;
  fallbackSrc?: string;
  containerClassName?: string;
  priority?: boolean;
  showBadge1x1?: boolean;
}

/**
 * CleanzoImage — Global Unified 1:1 Image Component
 *
 * Enforces a strict 1:1 Aspect Ratio container across all content cards,
 * lists, grids, and thumbnails without stretching or distorting images.
 *
 * Supports two distinct display modes:
 * - 'contain': For logos, Zo mascot, product icons (no cropping, neutral background)
 * - 'cover': For real-world photographs, service hero cards, portfolio transformations
 */
export function CleanzoImage({
  src,
  alt,
  fit = 'cover',
  position = 'center',
  aspectRatio = '1/1',
  fallbackSrc = '/brand/zo/cleanzo-logo.png',
  className = '',
  containerClassName = '',
  priority = false,
  showBadge1x1 = false,
  ...rest
}: CleanzoImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const cleanSrc = src ? normalizeMediaUrl(src) : null;
  const isVideo = cleanSrc && (cleanSrc.endsWith('.mp4') || cleanSrc.endsWith('.webm') || cleanSrc.includes('/videos/'));

  // Object position mapping
  const positionClass = {
    center: 'object-center',
    top: 'object-top',
    bottom: 'object-bottom',
    left: 'object-left',
    right: 'object-right',
  }[position] || 'object-center';

  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

  // Background style based on fit mode (contain mode preserves native alpha transparency without dark backdrops)
  const bgStyle =
    fit === 'contain'
      ? 'bg-transparent'
      : 'bg-slate-100 dark:bg-slate-950';

  return (
    <div
      style={{ aspectRatio: aspectRatio === 'square' ? '1 / 1' : aspectRatio }}
      className={`relative w-full overflow-hidden select-none ${bgStyle} ${containerClassName}`}
    >
      {/* 1:1 Loading Skeleton — Prevents Layout Shift */}
      {!loaded && !error && cleanSrc && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-200/60 via-slate-100 to-slate-200/60 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-800/60 animate-pulse z-10 flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="w-8 h-8 rounded-full bg-slate-300/40 dark:bg-slate-700/50 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#0866C6]/50 animate-spin" />
          </div>
        </div>
      )}

      {/* Media Rendering */}
      {cleanSrc && !error ? (
        isVideo ? (
          <video
            src={cleanSrc}
            playsInline
            muted
            loop
            autoPlay
            onLoadedData={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`w-full h-full ${fitClass} ${positionClass} transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
          />
        ) : (
          <img
            src={cleanSrc}
            alt={alt || 'Cleanzo Image'}
            loading={priority ? 'eager' : 'lazy'}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`w-full h-full ${fitClass} ${positionClass} transition-all duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${fit === 'contain' ? 'p-2' : ''} ${className}`}
            {...rest}
          />
        )
      ) : (
        /* Fallback Cleanzo 1:1 Placeholder */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-100/90 dark:bg-slate-900/90 text-slate-400 dark:text-slate-500">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex items-center justify-center p-2 mb-1.5">
            {fallbackSrc ? (
              <img
                src={fallbackSrc}
                alt="Cleanzo Fallback"
                className="w-full h-full object-contain opacity-70"
              />
            ) : (
              <ImageOff className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
            {error ? 'تعذر تحميل الصورة' : 'CLEANZO 1:1'}
          </span>
        </div>
      )}

      {/* Optional Debug/Quality 1:1 Badge */}
      {showBadge1x1 && (
        <div className="absolute top-2 start-2 z-20 pointer-events-none">
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-black bg-black/60 backdrop-blur-sm text-sky-400 border border-white/20">
            1:1 {fit.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

export default CleanzoImage;
