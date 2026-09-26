'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, MoveHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeAfterSliderProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  title?: string;
  className?: string;
}

export function BeforeAfterSlider({
  beforeImage = 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=1200',
  afterImage = 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80&w=1200',
  beforeLabel = 'قبل التنظيف',
  afterLabel = 'بعد كلينزو ✨',
  title,
  className,
}: BeforeAfterSliderProps) {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const width = rect.width;
      let percentage = (x / width) * 100;
      if (percentage < 0) percentage = 0;
      if (percentage > 100) percentage = 100;
      setSliderPos(percentage);
    },
    []
  );

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  return (
    <div className={cn('relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl select-none', className)}>
      <div
        ref={containerRef}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="relative w-full h-72 sm:h-96 cursor-ew-resize overflow-hidden bg-slate-900"
      >
        {/* AFTER IMAGE (Base background full width) */}
        <img
          src={afterImage}
          alt={afterLabel}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* BEFORE IMAGE (Clipped by slider position) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none transition-[clip-path] duration-75"
          style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* DIVIDER LINE */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.7)] z-20 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          {/* DRAG HANDLE BUTTON */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center border-2 border-[#0866C6] cursor-ew-resize">
            <MoveHorizontal className="w-5 h-5 text-[#0866C6]" />
          </div>
        </div>

        {/* BADGES: BEFORE & AFTER */}
        <div className="absolute top-4 start-4 z-20 pointer-events-none">
          <span className="px-3.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md text-white text-xs font-black border border-white/20 shadow-md">
            {beforeLabel}
          </span>
        </div>

        <div className="absolute top-4 end-4 z-20 pointer-events-none">
          <span className="px-3.5 py-1.5 rounded-xl bg-[#0866C6] text-white text-xs font-black border border-white/20 shadow-md flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F0444C]" />
            <span>{afterLabel}</span>
          </span>
        </div>

        {/* SLIDER HINT AT BOTTOM */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center z-20 pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white font-bold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>اسحب المقبض يميناً ويساراً للمقارنة</span>
          </span>
        </div>
      </div>

      {title && (
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-start">
          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
