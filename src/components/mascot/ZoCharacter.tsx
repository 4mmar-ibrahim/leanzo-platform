'use client';

import React, { useState, useEffect } from 'react';
import { LiveZoCharacter } from './LiveZoCharacter';
import { ZoSpeechBubble } from './ZoSpeechBubble';
import {
  ZoExpression3D,
  ZoPose3D,
  ZoAnimationType,
  ZoMessageConfig,
} from '@/types/zoStudioTypes';
import { cn } from '@/lib/utils';

export interface ZoCharacterProps {
  expression?: ZoExpression3D;
  pose?: ZoPose3D;
  animation?: ZoAnimationType;
  animationSpeed?: number;
  animationIntensity?: number;
  autoBlink?: boolean;
  eyeMovement?: boolean;
  scale?: number;
  rotationY?: number;
  opacity?: number;
  shadow?: boolean;
  glow?: boolean;
  visible?: boolean;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  allowOrbit?: boolean;
  lookAtCursor?: boolean;
  customImage?: string;
  originalImageUrl?: string;
  customImageDepth?: number;

  // Speech bubble
  message?: string;
  messageEn?: string;
  messageTitle?: string;
  messageConfig?: Partial<ZoMessageConfig>;
  bubbleAlignment?: 'right' | 'left' | 'center';
  onMessageClose?: () => void;
  isMessageOpen?: boolean;

  // Interaction
  interactive?: boolean;
  onInteraction?: () => void;
  onCharacterClick?: () => void;
  className?: string;
}

export function ZoCharacter({
  expression = 'happy',
  pose = 'idle',
  animation = 'idle',
  animationSpeed = 1.0,
  autoBlink = true,
  eyeMovement = true,
  scale = 1.0,
  rotationY = 0,
  opacity = 1.0,
  shadow = true,
  glow = true,
  visible = true,
  size = 'md',
  allowOrbit = false,
  lookAtCursor = true,
  customImage,
  originalImageUrl,
  customImageDepth = 0.22,
  animationIntensity = 1.0,
  message,
  messageEn,
  messageTitle,
  messageConfig,
  bubbleAlignment = 'right',
  onMessageClose,
  isMessageOpen = true,
  interactive = true,
  onInteraction,
  onCharacterClick,
  className = '',
}: ZoCharacterProps) {
  const [internalPose, setInternalPose] = useState<ZoPose3D>(pose);
  const [internalExpression, setInternalExpression] = useState<ZoExpression3D>(expression);
  const [internalAnimation, setInternalAnimation] = useState<ZoAnimationType>(animation);

  // Sync props to internal state
  useEffect(() => {
    setInternalPose(pose);
  }, [pose]);

  useEffect(() => {
    setInternalExpression(expression);
  }, [expression]);

  useEffect(() => {
    setInternalAnimation(animation);
  }, [animation]);

  if (!visible) return null;

  // Numeric pixel size calculation
  let pixelSize = 180;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'sm':
        pixelSize = 110;
        break;
      case 'md':
        pixelSize = 175;
        break;
      case 'lg':
        pixelSize = 240;
        break;
      case 'xl':
        pixelSize = 320;
        break;
    }
  }

  // Handle character click / tap
  const handleClick = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (!interactive) return;

    setInternalPose('waving');
    setInternalExpression('excited');
    setInternalAnimation('wave');

    if (onCharacterClick) onCharacterClick();
    if (onInteraction) onInteraction();

    // Return to base state after 2.5s
    setTimeout(() => {
      setInternalPose(pose);
      setInternalExpression(expression);
      setInternalAnimation(animation);
    }, 2500);
  };

  const hasMessage = Boolean(message && message.trim().length > 0);
  const activeImageUrl = originalImageUrl || customImage || '/brand/zo/zo-approved.png';

  return (
    <div
      className={cn(
        'relative inline-flex flex-col items-center select-none transition-all duration-300',
        className
      )}
    >
      {/* Optional Speech Bubble positioned above Zo */}
      {hasMessage && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute bottom-[104%] mb-2 z-40 transition-all duration-200 ease-out',
            bubbleAlignment === 'right'
              ? 'right-0 w-fit max-w-[min(280px,calc(100vw-36px))]'
              : bubbleAlignment === 'left'
              ? 'left-0 w-fit max-w-[min(280px,calc(100vw-36px))]'
              : 'left-1/2 -translate-x-1/2 w-fit max-w-[min(280px,calc(100vw-36px))]',
            isMessageOpen
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          )}
          style={{
            transformOrigin:
              bubbleAlignment === 'right'
                ? 'bottom right'
                : bubbleAlignment === 'left'
                ? 'bottom left'
                : 'bottom center',
          }}
        >
          <ZoSpeechBubble
            isOpen={isMessageOpen}
            title={messageTitle || messageConfig?.title}
            titleEn={messageConfig?.titleEn}
            message={message || ''}
            messageEn={messageEn || messageConfig?.textEn}
            bubbleStyle={messageConfig?.bubbleStyle || 'cleanzo_blue'}
            fontSize={messageConfig?.fontSize || 'sm'}
            maxWidth={messageConfig?.maxWidth || 260}
            position={
              bubbleAlignment === 'right'
                ? 'top-right'
                : bubbleAlignment === 'left'
                ? 'top-left'
                : 'top'
            }
            delay={messageConfig?.delay ?? 300}
            duration={messageConfig?.duration ?? 4000}
            autoHide={false}
            showCloseButton={messageConfig?.showCloseButton ?? true}
            playSound={false}
            textColor={messageConfig?.textColor}
            titleColor={messageConfig?.titleColor}
            backgroundColor={messageConfig?.backgroundColor}
            borderColor={messageConfig?.borderColor}
            onClose={onMessageClose}
          />
        </div>
      )}

      {/* Live Character Renderer: Strictly renders the authentic approved artwork without 3D conversion */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label="مساعد زو الذكي - اضغط لعرض أو إخفاء الرسالة"
        style={{
          width: `${pixelSize}px`,
          touchAction: 'manipulation',
        }}
        className="relative flex items-center justify-center pointer-events-auto cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-[#0866C6] focus-visible:ring-offset-2 rounded-2xl transition-all duration-200"
        title="اضغط لعرض أو إخفاء رسالة المساعد"
      >
        <LiveZoCharacter
          imageUrl={activeImageUrl}
          animation={internalAnimation}
          animationSpeed={animationSpeed}
          animationIntensity={animationIntensity}
          size={pixelSize}
          shadow={shadow}
          glow={glow}
          lookAtCursor={lookAtCursor}
          interactive={false}
        />
      </div>
    </div>
  );
}
