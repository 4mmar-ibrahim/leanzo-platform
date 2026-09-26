'use client';

import React from 'react';
import { LivingZoCharacter } from './LivingZoCharacter';
import { ZoExpression, ZoPose } from '@/types';

interface ZoMascotProps {
  expression?: ZoExpression;
  pose?: ZoPose;
  message?: string;
  animation?: 'breathe' | 'float' | 'wiggle' | 'blink' | 'none';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'bottom-end' | 'bottom-start' | 'inline';
  showControls?: boolean;
  className?: string;
  mode?: 'floating' | 'hero' | 'in-page' | 'compact';
  onMascotClick?: () => void;
}

export function ZoMascot({
  expression = 'happy',
  pose = 'waving',
  message,
  size = 'md',
  position = 'bottom-end',
  className,
  mode,
  onMascotClick,
}: ZoMascotProps) {
  const resolvedMode = mode || (position === 'inline' ? 'in-page' : 'floating');

  return (
    <LivingZoCharacter
      expression={expression}
      pose={pose}
      message={message}
      size={size as any}
      position={position}
      mode={resolvedMode}
      className={className}
      onInteraction={onMascotClick}
    />
  );
}
