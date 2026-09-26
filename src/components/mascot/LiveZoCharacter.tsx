'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ZoAnimationType } from '@/types/zoStudioTypes';
import { cn } from '@/lib/utils';

export interface LiveZoCharacterProps {
  imageUrl?: string;
  altText?: string;
  animation?: ZoAnimationType;
  animationSpeed?: number;      // 0.5 to 2.0 (default: 1.0)
  animationIntensity?: number;  // 0.5 to 2.0 (default: 1.0)
  size?: number;                // width in pixels
  shadow?: boolean;             // Dynamic ground contact shadow
  glow?: boolean;               // Subtle brand aura glow
  lookAtCursor?: boolean;       // Interactive 3D mouse parallax
  interactive?: boolean;        // Click/tap feedback
  className?: string;
  onClick?: () => void;
}

/**
 * Cleanzo Official Mascot SVG Fallback
 * Displayed gracefully when no custom image is set or if network loading fails.
 */
function CleanzoMascotFallback({ size = 180 }: { size?: number }) {
  return (
    <div
      style={{ width: `${size}px`, height: `${Math.round(size * 1.15)}px` }}
      className="relative flex flex-col items-center justify-center select-none"
    >
      <svg
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xl"
      >
        <defs>
          <linearGradient id="fallbackBody" x1="100" y1="20" x2="100" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#25B8E6" />
            <stop offset="50%" stopColor="#0866C6" />
            <stop offset="100%" stopColor="#06529E" />
          </linearGradient>
          <linearGradient id="fallbackHighlight" x1="70" y1="30" x2="130" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fallbackSash" x1="40" y1="120" x2="160" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F0444C" />
            <stop offset="100%" stopColor="#D42E36" />
          </linearGradient>
          <filter id="fallbackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0866C6" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Mascot Droplet Body */}
        <path
          d="M 100 25 C 105 55, 160 110, 160 160 C 160 195, 133 215, 100 215 C 67 215, 40 195, 40 160 C 40 110, 95 55, 100 25 Z"
          fill="url(#fallbackBody)"
          filter="url(#fallbackGlow)"
        />

        {/* Gloss highlight */}
        <path
          d="M 100 35 C 103 60, 145 110, 145 150 C 145 170, 135 185, 115 195 C 130 180, 135 160, 135 145 C 135 110, 98 60, 95 40 Z"
          fill="url(#fallbackHighlight)"
        />

        {/* Cleanzo Signature Red Sash */}
        <path
          d="M 50 155 Q 100 178 150 155 Q 152 166 148 174 Q 100 195 52 173 Z"
          fill="url(#fallbackSash)"
        />

        {/* Big expressive friendly eyes */}
        {/* Left eye */}
        <ellipse cx="82" cy="125" rx="14" ry="18" fill="#FFFFFF" />
        <ellipse cx="84" cy="125" rx="8" ry="11" fill="#07345C" />
        <circle cx="81" cy="120" r="4" fill="#FFFFFF" />
        <circle cx="87" cy="130" r="1.8" fill="#FFFFFF" />

        {/* Right eye */}
        <ellipse cx="118" cy="125" rx="14" ry="18" fill="#FFFFFF" />
        <ellipse cx="116" cy="125" rx="8" ry="11" fill="#07345C" />
        <circle cx="113" cy="120" r="4" fill="#FFFFFF" />
        <circle cx="119" cy="130" r="1.8" fill="#FFFFFF" />

        {/* Cheerful smiling mouth */}
        <path
          d="M 88 145 Q 100 158 112 145"
          stroke="#07345C"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cute blushing cheeks */}
        <ellipse cx="70" cy="142" rx="6" ry="3.5" fill="#F0444C" fillOpacity="0.4" />
        <ellipse cx="130" cy="142" rx="6" ry="3.5" fill="#F0444C" fillOpacity="0.4" />
      </svg>
    </div>
  );
}

/**
 * LiveZoCharacter - High Quality Animated 2D/3D-like Character Engine
 * Strictly preserves 100% of original image content, resolution, colors, and background.
 */
export function LiveZoCharacter({
  imageUrl,
  altText = 'Cleanzo Zo Character',
  animation = 'gentle_float',
  animationSpeed = 1.0,
  animationIntensity = 1.0,
  size = 180,
  shadow = true,
  glow = true,
  lookAtCursor = true,
  interactive = true,
  className = '',
  onClick,
}: LiveZoCharacterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [tapReaction, setTapReaction] = useState(false);

  // Normalize animation preset names
  const activeAnimation: ZoAnimationType = useMemo(() => {
    if (tapReaction) return 'wave';
    if (!animation || animation === 'idle' || animation === 'hover') return 'gentle_float';
    return animation;
  }, [animation, tapReaction]);

  // Reset load failure state whenever image URL updates
  useEffect(() => {
    setLoadFailed(false);
  }, [imageUrl]);

  // Mouse cursor tracking for subtle 3D parallax tilt
  useEffect(() => {
    if (!lookAtCursor) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from character center normalized (-1 to 1)
      const maxDistance = 600;
      const dx = Math.max(-1, Math.min(1, (e.clientX - centerX) / maxDistance));
      const dy = Math.max(-1, Math.min(1, (e.clientY - centerY) / maxDistance));

      setMouseOffset({ x: dx, y: dy });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [lookAtCursor]);

  // Handle tap / click reaction
  const handleCharacterTap = () => {
    if (!interactive) return;

    setTapReaction(true);
    if (onClick) onClick();

    // Auto-restore after reaction duration
    setTimeout(() => {
      setTapReaction(false);
    }, 2200);
  };

  // Compute calculated transform values based on animation, intensity, and mouse
  // Clamped safe bounds guarantee 0 distortion of the original graphic
  const baseSpeedSeconds = useMemo(() => {
    const safeSpeed = Math.max(0.4, Math.min(2.5, animationSpeed || 1.0));
    switch (activeAnimation) {
      case 'bounce':
        return 1.4 / safeSpeed;
      case 'wave':
        return 1.8 / safeSpeed;
      case 'point':
        return 2.2 / safeSpeed;
      case 'thinking':
        return 3.2 / safeSpeed;
      case 'celebration':
        return 1.2 / safeSpeed;
      case 'shake':
        return 0.8 / safeSpeed;
      case 'none':
        return 0;
      case 'gentle_float':
      default:
        return 2.8 / safeSpeed;
    }
  }, [activeAnimation, animationSpeed]);

  const intensityMultiplier = Math.max(0.4, Math.min(2.0, animationIntensity || 1.0));

  // 3D Tilt from mouse parallax (subtle, non-deforming)
  // 3D Tilt from mouse parallax (subtle, non-deforming)
  const tiltRotateY = lookAtCursor ? mouseOffset.x * 7 * intensityMultiplier : 0;
  const tiltRotateX = lookAtCursor ? -mouseOffset.y * 5 * intensityMultiplier : 0;

  // Outer perspective tilt style
  const tiltStyle = useMemo<React.CSSProperties>(() => {
    return {
      perspective: '900px',
      transform: `rotateX(${tiltRotateX}deg) rotateY(${tiltRotateY}deg)`,
      transformOrigin: 'center center',
      transition: 'transform 0.22s ease-out',
    };
  }, [tiltRotateX, tiltRotateY]);

  // Inner animation style with safe center-center origin
  const animationStyle = useMemo<React.CSSProperties>(() => {
    if (activeAnimation === 'none' || baseSpeedSeconds === 0) {
      return {
        transformOrigin: 'center center',
      };
    }

    return {
      animationDuration: `${baseSpeedSeconds}s`,
      animationTimingFunction: 'ease-in-out',
      animationIterationCount: 'infinite',
      transformOrigin: 'center center',
    };
  }, [activeAnimation, baseSpeedSeconds]);

  // Dynamic ground shadow scale/opacity sync
  const shadowAnimClass = useMemo(() => {
    switch (activeAnimation) {
      case 'bounce':
        return 'animate-cleanzo-shadow-bounce';
      case 'celebration':
        return 'animate-cleanzo-shadow-bounce';
      case 'wave':
      case 'point':
      case 'thinking':
      case 'gentle_float':
        return 'animate-cleanzo-shadow-float';
      case 'none':
      default:
        return '';
    }
  }, [activeAnimation]);

  const characterAnimClass = useMemo(() => {
    switch (activeAnimation) {
      case 'bounce':
        return 'animate-cleanzo-bounce';
      case 'wave':
        return 'animate-cleanzo-wave';
      case 'point':
        return 'animate-cleanzo-point';
      case 'thinking':
        return 'animate-cleanzo-thinking';
      case 'celebration':
        return 'animate-cleanzo-celebrate';
      case 'shake':
        return 'animate-cleanzo-shake';
      case 'gentle_float':
        return 'animate-cleanzo-float';
      case 'none':
      default:
        return '';
    }
  }, [activeAnimation]);

  const hasCustomImage = Boolean(imageUrl && imageUrl.trim() !== '' && !loadFailed);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${size}px`,
      }}
      className={cn(
        'relative inline-flex flex-col items-center justify-end select-none group',
        interactive && 'cursor-pointer',
        className
      )}
      onClick={handleCharacterTap}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient Glow Atmosphere (Theme aware) */}
      {glow && (
        <div
          style={{
            width: `${Math.round(size * 0.9)}px`,
            height: `${Math.round(size * 0.9)}px`,
          }}
          className="absolute -top-4 rounded-full pointer-events-none -z-10 blur-2xl opacity-25 dark:opacity-35 bg-gradient-to-tr from-[#0866C6] via-[#07345C] to-[#F0444C] transition-opacity duration-500 group-hover:opacity-50"
        />
      )}

      {/* Outer 3D Parallax Tilt Layer */}
      <div
        style={tiltStyle}
        className={cn(
          'relative w-full flex items-end justify-center transition-transform duration-200',
          isHovered && interactive && '-translate-y-1.5'
        )}
      >
        {/* Inner Non-Destructive Live Animation Layer */}
        <div
          style={animationStyle}
          className={cn(
            'relative w-full flex items-end justify-center zo-character',
            characterAnimClass
          )}
        >
          {hasCustomImage ? (
            <div className="relative w-full flex items-end justify-center">
              {/* Original Image Displayed with Maximum Quality & 0 Distortion */}
              <img
                src={imageUrl}
                alt={altText}
                loading="eager"
                decoding="async"
                onError={() => {
                  console.warn('[LiveZoCharacter] Failed to load character image, falling back to brand mascot:', imageUrl);
                  setLoadFailed(true);
                }}
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: `${Math.round(size * 1.35)}px`,
                  objectFit: 'contain',
                  imageRendering: 'auto',
                }}
                className="transition-all duration-300 drop-shadow-md group-hover:drop-shadow-xl select-none pointer-events-none"
              />
            </div>
          ) : (
            <CleanzoMascotFallback size={size} />
          )}
        </div>
      </div>

      {/* Dynamic Ground Contact Shadow (Soft oval that scales with vertical float/bounce) */}
      {shadow && (
        <div
          style={{
            width: `${Math.round(size * 0.72)}px`,
            height: `${Math.max(10, Math.round(size * 0.12))}px`,
            animationDuration: `${baseSpeedSeconds}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
          className={cn(
            'mt-1 rounded-full bg-slate-900/20 dark:bg-black/45 blur-[3px] pointer-events-none transition-all duration-200',
            shadowAnimClass
          )}
        />
      )}

      {/* Embedded CSS Keyframes for Smooth, Hardware-Accelerated 2D/3D Transforms */}
      <style jsx global>{`
        @keyframes cleanzoFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          50% {
            transform: translateY(-12px) rotate(-1.2deg) scale(1.015);
          }
        }

        @keyframes cleanzoBounce {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          40% {
            transform: translateY(-20px) scale(1.03);
          }
          60% {
            transform: translateY(-8px) scale(1.01);
          }
        }

        @keyframes cleanzoWave {
          0%, 100% {
            transform: rotate(0deg) translateY(0);
          }
          25% {
            transform: rotate(-4deg) translateY(-4px);
          }
          75% {
            transform: rotate(4deg) translateY(-4px);
          }
        }

        @keyframes cleanzoPoint {
          0%, 100% {
            transform: rotate(0deg) translateY(0);
          }
          50% {
            transform: rotate(-3.5deg) translateX(-4px) translateY(-5px);
          }
        }

        @keyframes cleanzoThinking {
          0%, 100% {
            transform: rotate(0deg) translateY(0);
          }
          50% {
            transform: rotate(4deg) translateY(-6px);
          }
        }

        @keyframes cleanzoCelebrate {
          0%, 100% {
            transform: translateY(0px) scale(1) rotate(0deg);
          }
          30% {
            transform: translateY(-18px) scale(1.04) rotate(-3deg);
          }
          70% {
            transform: translateY(-16px) scale(1.04) rotate(3deg);
          }
        }

        @keyframes cleanzoShake {
          0%, 100% {
            transform: rotate(0deg);
          }
          20% {
            transform: rotate(-4deg);
          }
          40% {
            transform: rotate(4deg);
          }
          60% {
            transform: rotate(-3deg);
          }
          80% {
            transform: rotate(3deg);
          }
        }

        @keyframes cleanzoShadowFloat {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(0.82);
            opacity: 0.3;
          }
        }

        @keyframes cleanzoShadowBounce {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          40% {
            transform: scale(0.68);
            opacity: 0.25;
          }
          60% {
            transform: scale(0.85);
            opacity: 0.45;
          }
        }

        .animate-cleanzo-float {
          animation-name: cleanzoFloat;
        }
        .animate-cleanzo-bounce {
          animation-name: cleanzoBounce;
        }
        .animate-cleanzo-wave {
          animation-name: cleanzoWave;
        }
        .animate-cleanzo-point {
          animation-name: cleanzoPoint;
        }
        .animate-cleanzo-thinking {
          animation-name: cleanzoThinking;
        }
        .animate-cleanzo-celebrate {
          animation-name: cleanzoCelebrate;
        }
        .animate-cleanzo-shake {
          animation-name: cleanzoShake;
        }
        .animate-cleanzo-shadow-float {
          animation-name: cleanzoShadowFloat;
        }
        .animate-cleanzo-shadow-bounce {
          animation-name: cleanzoShadowBounce;
        }

        .zo-character img {
          width: auto;
          height: auto;
          max-width: 100%;
          object-fit: contain;
          image-rendering: auto;
        }

        @media (prefers-reduced-motion: reduce) {
          .zo-character,
          .animate-cleanzo-float,
          .animate-cleanzo-bounce,
          .animate-cleanzo-wave,
          .animate-cleanzo-point,
          .animate-cleanzo-thinking,
          .animate-cleanzo-celebrate,
          .animate-cleanzo-shake,
          .animate-cleanzo-shadow-float,
          .animate-cleanzo-shadow-bounce {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
