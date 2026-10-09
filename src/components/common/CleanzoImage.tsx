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
  const [useProxyFallback, setUseProxyFallback] = useState(false);

  const cleanSrc = src ? normalizeMediaUrl(src) : null;
  const isVideo = cleanSrc && (cleanSrc.endsWith('.mp4') || cleanSrc.endsWith('.webm') || cleanSrc.includes('/videos/'));

  // Reset states whenever src prop changes
  React.useEffect(() => {
    setLoaded(false);
    setError(false);
    setUseProxyFallback(false);
  }, [src]);

  // Compute active image source (direct or weserv proxy fallback)
  const activeImageSrc = React.useMemo(() => {
    if (!cleanSrc) return null;
    if (useProxyFallback && (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) && !cleanSrc.includes('images.weserv.nl')) {
      return `https://images.weserv.nl/?url=${encodeURIComponent(cleanSrc)}`;
    }
    return cleanSrc;
  }, [cleanSrc, useProxyFallback]);

  const imgRef = React.useRef<HTMLImageElement>(null);

  // Check if image is already cached/complete on mount or src change
  React.useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [activeImageSrc]);

  // Object position mapping
  const positionClass = {
    center: 'object-center',
    top: 'object-top',
    bottom: 'object-bottom',
    left: 'object-left',
    right: 'object-right',
  }[position] || 'object-center';

  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

  // Default to transparent background unless an explicit background is provided in containerClassName
  const bgStyle = containerClassName?.includes('bg-') ? '' : 'bg-transparent';

  const handleImageError = () => {
    if (!useProxyFallback && cleanSrc && (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) && !cleanSrc.includes('images.weserv.nl')) {
      // Try resilient proxy fallback before declaring failure
      setUseProxyFallback(true);
    } else {
      setError(true);
    }
  };

  return (
    <div
      style={{ aspectRatio: aspectRatio === 'square' ? '1 / 1' : aspectRatio }}
      className={`relative w-full overflow-hidden select-none ${bgStyle} ${containerClassName}`}
    >
      {/* 1:1 Loading Skeleton — Prevents Layout Shift */}
      {!loaded && !error && activeImageSrc && (
        <div
          className="absolute inset-0 bg-transparent animate-pulse z-10 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div className="w-8 h-8 rounded-full bg-slate-300/20 dark:bg-slate-700/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#0866C6]/50 animate-spin" />
          </div>
        </div>
      )}

      {/* Media Rendering */}
      {activeImageSrc && !error ? (
        isVideo ? (
          <video
            src={activeImageSrc}
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
            ref={imgRef}
            src={activeImageSrc}
            alt={alt || 'Cleanzo Image'}
            loading={priority ? 'eager' : 'lazy'}
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full ${fitClass} ${positionClass} transition-all duration-300 ${
              fit === 'contain' ? 'p-2' : ''
            } ${className}`}
            {...rest}
          />
        )
      ) : (
        /* Transparent Fallback without dark circles or squares */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-transparent text-slate-400">
          {fallbackSrc ? (
            <img
              src={fallbackSrc}
              alt="Cleanzo Fallback"
              className="w-10 h-10 object-contain opacity-60"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sky-500/10 text-sky-500">
              <Sparkles className="w-5 h-5" />
            </div>
          )}
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
