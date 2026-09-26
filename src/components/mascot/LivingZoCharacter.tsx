'use client';

import React from 'react';
import { ZoCharacter } from './ZoCharacter';
import { ZoExpression3D, ZoPose3D } from '@/types/zoStudioTypes';

interface LivingZoCharacterProps {
  expression?: any;
  pose?: any;
  message?: string;
  mode?: 'floating' | 'hero' | 'in-page' | 'compact' | 'peek';
  position?: 'bottom-end' | 'bottom-start' | 'inline';
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onInteraction?: () => void;
}

export function LivingZoCharacter({
  expression = 'happy',
  pose = 'idle',
  message,
  interactive = true,
  size = 'md',
  className = '',
  onInteraction,
}: LivingZoCharacterProps) {
  // Map legacy expression IDs to 3D expression
  const validExpressions: ZoExpression3D[] = [
    'happy',
    'confident',
    'excited',
    'curious',
    'thinking',
    'wink',
    'surprised',
    'chill',
    'concerned',
    'helpful',
    'celebrating',
    'neutral',
  ];
  const activeExpression: ZoExpression3D = validExpressions.includes(expression)
    ? expression
    : 'happy';

  // Map legacy pose IDs to 3D pose
  const validPoses: ZoPose3D[] = [
    'idle',
    'waving',
    'pointing',
    'welcoming',
    'walking',
    'thinking',
    'thumbs_up',
    'celebrating',
    'looking_around',
    'leaning',
    'explaining',
    'holding_calendar',
    'holding_location',
    'holding_checkmark',
    'holding_pin',
    'holding_cleaning_tool',
    'holding_coupon',
    'taking_photo',
    'sunglasses',
    'sitting',
  ];
  const activePose: ZoPose3D = validPoses.includes(pose) ? pose : 'idle';

  return (
    <div className={className}>
      <ZoCharacter
        expression={activeExpression}
        pose={activePose}
        animation="idle"
        size={size}
        message={message}
        interactive={interactive}
        onInteraction={onInteraction}
        lookAtCursor={true}
      />
    </div>
  );
}
