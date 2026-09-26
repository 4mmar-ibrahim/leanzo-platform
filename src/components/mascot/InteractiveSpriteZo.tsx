'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Tag, Calendar, MapPin, Camera, Lightbulb, PartyPopper, Wand2 } from 'lucide-react';
import { ZoPose } from '@/types';

interface InteractiveSpriteZoProps {
  pose?: ZoPose;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isHovered?: boolean;
  isJumping?: boolean;
  mousePos?: { x: number; y: number }; // x and y from -1 to 1
  className?: string;
  isSpeaking?: boolean;
}

export function InteractiveSpriteZo({
  pose = 'waving',
  size = 'md',
  isHovered = false,
  isJumping = false,
  mousePos = { x: 0, y: 0 },
  className,
  isSpeaking = false,
}: InteractiveSpriteZoProps) {
  // Sprite configuration
  const TOTAL_FRAMES = 6;
  const SPRITE_URL = '/brand/zo/zo-sprite.png';

  // Map mouse X (-1 to 1) to a frame index
  // Based on the image, the frames are (0-indexed from left to right):
  // 0: 3/4 left, 1: slightly left, 2: profile left, 3: back, 4: profile right, 5: 3/4 right
  // We want the character to look at the mouse.
  // Left to right order of looking: 2 (profile left), 0 (3/4 left), 1 (slightly left), 5 (3/4 right), 4 (profile right)
  const xFrames = [2, 0, 1, 5, 4];
  
  // Calculate which frame to show based on mouse X
  let frameIndex = 1; // Default to slightly left
  
  if (mousePos.y < -0.7) {
     frameIndex = 3; // Back view when looking up/away
  } else {
     // Map x (-1 to 1) to index in xFrames (0 to 4)
     // x goes from -1 (left) to 1 (right)
     // xFrames goes from left-looking to right-looking
     let index = Math.floor(((mousePos.x + 1) / 2) * xFrames.length);
     index = Math.max(0, Math.min(xFrames.length - 1, index));
     frameIndex = xFrames[index];
  }

  // Calculate background position
  const bgPosX = (frameIndex / (TOTAL_FRAMES - 1)) * 100;

  const sizeStyles = {
    sm: 'w-16 h-22 sm:w-20 sm:h-26',
    md: 'w-22 h-28 sm:w-26 sm:h-34 lg:w-28 lg:h-38',
    lg: 'w-32 h-44 sm:w-40 sm:h-52 lg:w-48 lg:h-64',
    xl: 'w-44 h-60 sm:w-56 sm:h-76 lg:w-64 lg:h-84',
  }[size];

  // Subtle breathing idle animation
  const [breathePhase, setBreathePhase] = useState(0);
  
  useEffect(() => {
    let animationFrame: number;
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      // 3 second breathing cycle
      setBreathePhase(Math.sin((elapsed / 3000) * Math.PI * 2));
      animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const idleTranslateY = breathePhase * 2; // px
  const idleScaleY = 1 + breathePhase * 0.015;

  return (
    <div className={cn('relative flex items-center justify-center', sizeStyles, className)}>
      {/* Floor Shadow */}
      <div
        className="absolute -bottom-3 inset-x-2 h-4 bg-[#07345C]/30 dark:bg-black/55 rounded-full blur-md transition-all duration-200 pointer-events-none"
        style={{
          transform: `scale(${isHovered ? 1.2 : 1}) translateX(${mousePos.x * 6}px)`,
          opacity: isJumping ? 0.3 : 1
        }}
      />

      {/* Sprite Container */}
      <div 
        className={cn(
          'w-full h-full transition-transform duration-150',
          isJumping && 'animate-bounce'
        )}
        style={{
          transform: `translateY(${idleTranslateY}px) scaleY(${idleScaleY}) scale(${isHovered ? 1.05 : 1})`,
        }}
      >
        <div 
          className="w-full h-full bg-no-repeat bg-left-top drop-shadow-xl"
          style={{
            backgroundImage: `url(${SPRITE_URL})`,
            backgroundSize: `${TOTAL_FRAMES * 100}% 100%`,
            backgroundPositionX: `${bgPosX}%`,
            transition: 'background-position 0.15s ease-out'
          }}
        />
        
        {/* Accessories based on pose */}
        {pose === 'holding_coupon' && (
          <div className="absolute -top-2 -start-2 bg-gradient-to-r from-amber-400 to-[#F0444C] text-white p-1.5 rounded-xl shadow-lg border border-white/50 animate-bounce flex items-center gap-1 z-20">
            <Tag className="w-3.5 h-3.5 fill-white" />
            <span className="text-[10px] font-black">20% OFF</span>
          </div>
        )}

        {pose === 'holding_calendar' && (
          <div className="absolute -top-2 -end-2 bg-white dark:bg-[#07345C] text-[#0866C6] p-1.5 rounded-xl shadow-lg border-2 border-[#0866C6] animate-pulse z-20">
            <Calendar className="w-4 h-4" />
          </div>
        )}

        {pose === 'holding_pin' && (
          <div className="absolute -top-3 -start-1 text-[#F0444C] animate-bounce z-20 drop-shadow-md">
            <MapPin className="w-5 h-5 fill-[#F0444C]" />
          </div>
        )}

        {pose === 'taking_photo' && (
          <div className="absolute -top-2 -end-2 bg-[#0866C6] text-white p-1.5 rounded-xl shadow-lg border border-white/40 animate-pulse z-20">
            <Camera className="w-4 h-4" />
          </div>
        )}

        {pose === 'celebrating' && (
          <div className="absolute -top-3 -start-2 text-amber-400 animate-bounce z-20">
            <PartyPopper className="w-5 h-5" />
          </div>
        )}

        {pose === 'thinking' && (
          <div className="absolute -top-3 -end-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-lg animate-pulse z-20">
            <Lightbulb className="w-4 h-4 fill-amber-300" />
          </div>
        )}

        {pose === 'holding_cleaning_tool' && (
          <div className="absolute -top-2 -start-2 text-[#0866C6] dark:text-[#3B82F6] animate-pulse z-20">
            <Wand2 className="w-4 h-4" />
          </div>
        )}

        {/* Interactive Sparkle Glint on hover */}
        {isHovered && (
          <div className="absolute top-1 start-1 text-amber-300 animate-spin transition-all pointer-events-none z-20">
            <Sparkles className="w-4 h-4 fill-amber-300" />
          </div>
        )}
      </div>
    </div>
  );
}
