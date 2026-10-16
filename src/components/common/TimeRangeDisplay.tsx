'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  formatSingleTimeTo12Hour,
  parseTimeToMinutes,
  getTimeRangeAriaLabel,
} from '@/lib/timeUtils';

export interface TimeRangeDisplayProps {
  time?: string | null;
  start?: string | null;
  end?: string | null;
  locale?: string;
  format12?: boolean;
  className?: string;
  separatorClassName?: string;
}

/**
 * TimeRangeDisplay
 *
 * Guarantees correct RTL/LTR rendering of time intervals across all Cleanzo views:
 * 1. Wraps content inside <bdi dir="ltr"> to isolate layout from surrounding Arabic text.
 * 2. Places start time strictly before end time chronologically.
 * 3. Sets an accessible aria-label for screen readers (e.g. "من 09:00 إلى 10:00").
 * 4. Preserves surrounding RTL context without text direction corruption.
 */
export function TimeRangeDisplay({
  time,
  start,
  end,
  locale = 'ar',
  format12 = false,
  className,
  separatorClassName,
}: TimeRangeDisplayProps) {
  let startPart = (start || '').trim();
  let endPart = (end || '').trim();

  // If time string passed, extract interval
  if ((!startPart || !endPart) && time) {
    const raw = String(time).trim();
    if (raw.includes('–') || raw.includes('-') || raw.includes('—')) {
      const parts = raw.split(/[-–—]/).map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        startPart = parts[0];
        endPart = parts[1];
      } else {
        startPart = raw;
      }
    } else {
      startPart = raw;
    }
  }

  if (!startPart || startPart === '—') {
    return <span className={cn('text-slate-400 font-mono', className)}>—</span>;
  }

  // Ensure start is before end
  if (startPart && endPart) {
    const sMin = parseTimeToMinutes(startPart);
    const eMin = parseTimeToMinutes(endPart);
    if (sMin > eMin && eMin > 0) {
      const tmp = startPart;
      startPart = endPart;
      endPart = tmp;
    }
  }

  const startFormatted = format12
    ? formatSingleTimeTo12Hour(startPart, locale)
    : startPart;
  const endFormatted = endPart
    ? format12
      ? formatSingleTimeTo12Hour(endPart, locale)
      : endPart
    : null;

  const rawDisplayString = endPart ? `${startPart} – ${endPart}` : startPart;
  const ariaLabel = getTimeRangeAriaLabel(rawDisplayString, locale);

  return (
    <bdi
      dir="ltr"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-1 unicode-isolate font-mono', className)}
    >
      <span className="shrink-0">{startFormatted}</span>
      {endFormatted && (
        <>
          <span className={cn('text-slate-400 select-none mx-0.5', separatorClassName)}>
            –
          </span>
          <span className="shrink-0">{endFormatted}</span>
        </>
      )}
    </bdi>
  );
}

export default TimeRangeDisplay;
