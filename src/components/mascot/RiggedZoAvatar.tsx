'use client';

import React, { useState, useEffect } from 'react';
import { ZoExpression, ZoPose } from '@/types';
import { cn } from '@/lib/utils';
import {
  Tag,
  Calendar,
  MapPin,
  Camera,
  Lightbulb,
  PartyPopper,
  Sparkles,
  Wand2,
} from 'lucide-react';

interface RiggedZoAvatarProps {
  expression?: ZoExpression;
  pose?: ZoPose;
  isSpeaking?: boolean;
  isBlinking?: boolean;
  mousePos: { x: number; y: number }; // normalized -1 to 1
  isHovered?: boolean;
  isJumping?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function RiggedZoAvatar({
  expression = 'happy',
  pose = 'waving',
  isSpeaking = false,
  isBlinking = false,
  mousePos,
  isHovered = false,
  isJumping = false,
  size = 'md',
  className,
}: RiggedZoAvatarProps) {
  // Speech mouth animation phase (0 to 3)
  const [mouthPhase, setMouthPhase] = useState(0);

  useEffect(() => {
    if (!isSpeaking) {
      setMouthPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setMouthPhase((prev) => (prev + 1) % 4);
    }, 140);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Eye pupil tracking calculation
  const angle = Math.atan2(mousePos.y, mousePos.x);
  const distance = Math.min(1, Math.hypot(mousePos.x, mousePos.y));
  const pupilOffsetX = Math.cos(angle) * distance * 5.5;
  const pupilOffsetY = Math.sin(angle) * distance * 4.2;

  // Eyebrow offset based on expression
  const eyebrowY =
    expression === 'curious' || expression === 'surprised'
      ? -4
      : expression === 'confident'
      ? -1
      : 0;

  // Dimensions based on size
  const svgSizes = {
    sm: 'w-20 h-28',
    md: 'w-28 h-38',
    lg: 'w-44 h-56',
    xl: 'w-60 h-76',
  }[size];

  return (
    <div
      className={cn(
        'relative inline-flex flex-col items-center justify-center select-none',
        svgSizes,
        className
      )}
    >
      {/* ================= SVG PROCEDURAL LIVING RIGGED CHARACTER ================= */}
      <svg
        viewBox="0 0 200 240"
        className={cn(
          'w-full h-full overflow-visible transition-transform duration-200',
          isJumping && 'scale-y-90 translate-y-2',
          isHovered && 'scale-105'
        )}
      >
        <defs>
          {/* 3D Liquid Body Gradient */}
          <radialGradient id="zoBodyGradient" cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#4AA3FF" />
            <stop offset="35%" stopColor="#0866C6" />
            <stop offset="85%" stopColor="#0842A0" />
            <stop offset="100%" stopColor="#052866" />
          </radialGradient>

          {/* Liquid Gloss / Specular Sheen Gradient */}
          <linearGradient id="zoGlossGradient" x1="20%" y1="10%" x2="80%" y2="80%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Eye White Sclera Gradient */}
          <radialGradient id="zoEyeWhite" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="75%" stopColor="#F0F7FF" />
            <stop offset="100%" stopColor="#D8E8FC" />
          </radialGradient>

          {/* Deep Navy/Blue Pupil Gradient */}
          <radialGradient id="zoPupilGradient" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="60%" stopColor="#07345C" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Cleanzo Red Accents Gradient */}
          <linearGradient id="zoRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4D54" />
            <stop offset="100%" stopColor="#F0444C" />
          </linearGradient>

          {/* Filter for Soft 3D Glow & Dropshadow */}
          <filter id="zoDropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0866C6" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* ================= 1. FLOOR SHADOW ================= */}
        <ellipse
          cx={100 + mousePos.x * 6}
          cy="222"
          rx={isHovered ? 48 : 42}
          ry="10"
          fill="#07345C"
          opacity="0.25"
          className="transition-all duration-300"
        />

        {/* ================= 2. DROPLET LIQUID BODY ================= */}
        <g filter="url(#zoDropShadow)">
          {/* Main water drop shape (Organic 3D curved teardrop) */}
          <path
            d="
              M 100 24
              C 114 48, 148 95, 156 138
              C 164 176, 144 214, 100 214
              C 56 214, 36 176, 44 138
              C 52 95, 86 48, 100 24
              Z
            "
            fill="url(#zoBodyGradient)"
            stroke="#0842A0"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* 3D Liquid Specular Gloss Highlight (Left curvature) */}
          <path
            d="
              M 100 32
              C 90 52, 65 92, 58 132
              C 54 158, 62 186, 76 198
              C 68 184, 62 152, 68 126
              C 74 94, 94 56, 100 32
              Z
            "
            fill="url(#zoGlossGradient)"
          />

          {/* Top droplet point gloss sparkle */}
          <circle cx="98" cy="38" r="4" fill="#FFFFFF" opacity="0.9" />
          <ellipse cx="88" cy="72" rx="5" ry="14" fill="#FFFFFF" opacity="0.35" transform="rotate(-18 88 72)" />
        </g>

        {/* ================= 3. BIG LIVING EXPRESSIVE EYES ================= */}
        <g id="zoEyesGroup">
          {/* ============ LEFT EYE ============ */}
          <g id="leftEye">
            {/* White Sclera */}
            <ellipse
              cx="78"
              cy="124"
              rx="18"
              ry="24"
              fill="url(#zoEyeWhite)"
              stroke="#07345C"
              strokeWidth="2.5"
            />

            {/* Dynamic Tracking Pupil */}
            <g transform={`translate(${pupilOffsetX}, ${pupilOffsetY})`}>
              <ellipse cx="78" cy="124" rx="10" ry="13" fill="url(#zoPupilGradient)" />
              {/* Eye Catchlight (White sparkle) */}
              <circle cx="75" cy="119" r="3.5" fill="#FFFFFF" />
              <circle cx="81" cy="128" r="1.8" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Living Eyelid (Closes on blink) */}
            {isBlinking ? (
              <path
                d="M 60 124 Q 78 140 96 124 Q 78 120 60 124 Z"
                fill="#0866C6"
                stroke="#0842A0"
                strokeWidth="2.5"
              />
            ) : (
              /* Upper Eyelid crease */
              <path d="M 62 108 Q 78 103 94 109" stroke="#0842A0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}

            {/* Left Eyebrow */}
            <path
              d={`M 60 ${100 + eyebrowY} Q 76 ${92 + eyebrowY} 92 ${101 + eyebrowY}`}
              stroke="#052866"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* ============ RIGHT EYE ============ */}
          <g id="rightEye">
            {/* White Sclera */}
            <ellipse
              cx="122"
              cy="124"
              rx="18"
              ry="24"
              fill="url(#zoEyeWhite)"
              stroke="#07345C"
              strokeWidth="2.5"
            />

            {/* Dynamic Tracking Pupil */}
            <g transform={`translate(${pupilOffsetX}, ${pupilOffsetY})`}>
              <ellipse cx="122" cy="124" rx="10" ry="13" fill="url(#zoPupilGradient)" />
              {/* Eye Catchlight (White sparkle) */}
              <circle cx="119" cy="119" r="3.5" fill="#FFFFFF" />
              <circle cx="125" cy="128" r="1.8" fill="#FFFFFF" opacity="0.8" />
            </g>

            {/* Living Eyelid (Closes on blink) */}
            {isBlinking ? (
              <path
                d="M 104 124 Q 122 140 140 124 Q 122 120 104 124 Z"
                fill="#0866C6"
                stroke="#0842A0"
                strokeWidth="2.5"
              />
            ) : (
              /* Upper Eyelid crease */
              <path d="M 106 108 Q 122 103 138 109" stroke="#0842A0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}

            {/* Right Eyebrow */}
            <path
              d={`M 108 ${101 + eyebrowY} Q 124 ${92 + eyebrowY} 140 ${100 + eyebrowY}`}
              stroke="#052866"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>

        {/* ================= 4. SUNGLASSES OVERLAY (If pose is sunglasses) ================= */}
        {pose === 'sunglasses' && (
          <g id="zoSunglasses" className="transition-all duration-300">
            {/* Left Lens */}
            <path
              d="M 58 114 C 58 106, 96 106, 96 114 C 96 136, 62 136, 58 114 Z"
              fill="#07345C"
              stroke="#F0444C"
              strokeWidth="3"
            />
            {/* Right Lens */}
            <path
              d="M 104 114 C 104 106, 142 106, 142 114 C 142 136, 108 136, 104 114 Z"
              fill="#07345C"
              stroke="#F0444C"
              strokeWidth="3"
            />
            {/* Bridge */}
            <path d="M 96 114 Q 100 110 104 114" stroke="#F0444C" strokeWidth="3.5" fill="none" />
            {/* White Lens Reflection Glint */}
            <line x1="66" y1="112" x2="88" y2="128" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
            <line x1="112" y1="112" x2="134" y2="128" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
          </g>
        )}

        {/* ================= 5. TALKING ANIMATED MOUTH ================= */}
        <g id="zoMouth">
          {isSpeaking ? (
            // Lip-sync speech phoneme frames
            mouthPhase === 0 ? (
              // Open wide talking
              <g>
                <path d="M 86 162 Q 100 182 114 162 Q 100 156 86 162 Z" fill="#7F1D1D" stroke="#07345C" strokeWidth="2.5" />
                <path d="M 92 173 Q 100 178 108 173" stroke="#F87171" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M 90 162 Q 100 165 110 162" fill="#FFFFFF" />
              </g>
            ) : mouthPhase === 1 ? (
              // Round 'O' talking
              <ellipse cx="100" cy="166" rx="8" ry="10" fill="#7F1D1D" stroke="#07345C" strokeWidth="2.5" />
            ) : mouthPhase === 2 ? (
              // Smiling open talking
              <path d="M 88 162 Q 100 176 112 162 Q 100 166 88 162 Z" fill="#7F1D1D" stroke="#07345C" strokeWidth="2.5" />
            ) : (
              // Narrow closed smile
              <path d="M 88 163 Q 100 172 112 163" stroke="#052866" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            )
          ) : (
            // Idle smile with cheerful dimples
            <g>
              <path d="M 84 162 Q 100 176 116 162" stroke="#052866" strokeWidth="3.8" fill="none" strokeLinecap="round" />
              {/* Smile dimples */}
              <path d="M 82 159 Q 84 163 85 166" stroke="#0842A0" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M 118 159 Q 116 163 115 166" stroke="#0842A0" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Cute tongue / mouth inner curve if confident */}
              {expression === 'confident' && (
                <path d="M 88 163 Q 100 174 112 163 Q 100 166 88 163 Z" fill="#DC2626" opacity="0.8" />
              )}
            </g>
          )}

          {/* Cute Rosy Cheeks */}
          <circle cx="62" cy="150" r="7" fill="#FF4D54" opacity="0.4" />
          <circle cx="138" cy="150" r="7" fill="#FF4D54" opacity="0.4" />
        </g>

        {/* ================= 6. ANIMATED CARTOON ARMS & HANDS ================= */}
        {/* Left Arm & Glove */}
        <g id="zoLeftArm">
          {pose === 'celebrating' ? (
            // Left arm raised high
            <g>
              <path d="M 46 142 Q 26 110 24 82" stroke="#0842A0" strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* White Glove */}
              <circle cx="24" cy="78" r="10" fill="#FFFFFF" stroke="#07345C" strokeWidth="2" />
              <circle cx="20" cy="72" r="4" fill="#FFFFFF" stroke="#07345C" strokeWidth="1.5" />
            </g>
          ) : (
            // Left arm resting comfortably on hip
            <g>
              <path d="M 46 148 Q 30 156 34 174" stroke="#0842A0" strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* White Glove on hip */}
              <circle cx="36" cy="176" r="9" fill="#FFFFFF" stroke="#07345C" strokeWidth="2" />
            </g>
          )}
        </g>

        {/* Right Arm & Glove (Main Animated Interactive Arm) */}
        <g id="zoRightArm">
          {pose === 'waving' ? (
            // Waving Hand with Wave Swing
            <g className="origin-[154px_146px] animate-[wiggle_1.8s_ease-in-out_infinite]">
              <path d="M 154 146 Q 174 122 178 98" stroke="#0842A0" strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* White Glove Waving */}
              <g transform="translate(178, 92)">
                <circle cx="0" cy="0" r="10" fill="#FFFFFF" stroke="#07345C" strokeWidth="2" />
                {/* 4 Glove Fingers */}
                <ellipse cx="6" cy="-8" rx="3.5" ry="6" fill="#FFFFFF" stroke="#07345C" strokeWidth="1.5" />
                <ellipse cx="0" cy="-11" rx="3.5" ry="6" fill="#FFFFFF" stroke="#07345C" strokeWidth="1.5" />
                <ellipse cx="-6" cy="-8" rx="3.5" ry="6" fill="#FFFFFF" stroke="#07345C" strokeWidth="1.5" />
                <ellipse cx="-10" cy="-2" rx="3.5" ry="5" fill="#FFFFFF" stroke="#07345C" strokeWidth="1.5" />
              </g>
            </g>
          ) : pose === 'pointing' ? (
            // Pointing Arm
            <g>
              <path d="M 154 148 Q 176 150 192 144" stroke="#0842A0" strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* White Glove Pointing Index Finger */}
              <circle cx="194" cy="144" r="9" fill="#FFFFFF" stroke="#07345C" strokeWidth="2" />
              <line x1="194" y1="144" x2="210" y2="142" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            </g>
          ) : pose === 'thumbs_up' ? (
            // Thumbs Up Arm
            <g>
              <path d="M 154 150 Q 174 154 180 138" stroke="#0842A0" strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* White Glove Thumbs Up */}
              <circle cx="182" cy="134" r="9" fill="#FFFFFF" stroke="#07345C" strokeWidth="2" />
              <line x1="182" y1="134" x2="182" y2="120" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            </g>
          ) : pose === 'celebrating' ? (
            // Right arm raised high cheering
            <g>
              <path d="M 154 142 Q 174 110 176 82" stroke="#0842A0" strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* White Glove */}
              <circle cx="176" cy="78" r="10" fill="#FFFFFF" stroke="#07345C" strokeWidth="2" />
              <circle cx="180" cy="72" r="4" fill="#FFFFFF" stroke="#07345C" strokeWidth="1.5" />
            </g>
          ) : (
            // Default resting right arm
            <g>
              <path d="M 154 148 Q 170 156 166 174" stroke="#0842A0" strokeWidth="6" strokeLinecap="round" fill="none" />
              <circle cx="164" cy="176" r="9" fill="#FFFFFF" stroke="#07345C" strokeWidth="2" />
            </g>
          )}
        </g>
      </svg>

      {/* ================= 7. DYNAMIC FLOATING PROPS & ACCESSORIES ================= */}
      {pose === 'holding_coupon' && (
        <div className="absolute top-8 -start-2 bg-gradient-to-r from-amber-400 to-[#F0444C] text-white px-2.5 py-1 rounded-xl shadow-xl border border-white/60 animate-bounce flex items-center gap-1.5 z-20">
          <Tag className="w-3.5 h-3.5 fill-white" />
          <span className="text-[11px] font-black tracking-wider">20% OFF</span>
        </div>
      )}

      {pose === 'holding_calendar' && (
        <div className="absolute top-8 -end-2 bg-white dark:bg-[#07345C] text-[#0866C6] p-2 rounded-2xl shadow-xl border-2 border-[#0866C6] animate-pulse z-20">
          <Calendar className="w-4 h-4" />
        </div>
      )}

      {pose === 'holding_pin' && (
        <div className="absolute top-4 -start-2 text-[#F0444C] animate-bounce z-20 drop-shadow-lg">
          <MapPin className="w-6 h-6 fill-[#F0444C]" />
        </div>
      )}

      {pose === 'taking_photo' && (
        <div className="absolute top-8 -end-2 bg-[#0866C6] text-white p-2 rounded-2xl shadow-xl border border-white/50 animate-pulse z-20">
          <Camera className="w-4 h-4" />
        </div>
      )}

      {pose === 'thinking' && (
        <div className="absolute -top-2 start-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 p-1.5 rounded-full shadow-xl animate-pulse z-20 border-2 border-white">
          <Lightbulb className="w-4 h-4 fill-amber-300" />
        </div>
      )}

      {pose === 'celebrating' && (
        <div className="absolute -top-2 -start-1 text-amber-400 animate-bounce z-20">
          <PartyPopper className="w-6 h-6" />
        </div>
      )}

      {/* Sparkle Glint on hover */}
      {isHovered && (
        <div className="absolute top-2 start-2 text-amber-300 animate-spin z-30 pointer-events-none">
          <Sparkles className="w-4 h-4 fill-amber-300" />
        </div>
      )}
    </div>
  );
}
