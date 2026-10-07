/**
 * Cleanzo Canonical 12-Hour Time Utilities
 * Enforces 12-hour AM/PM format across all customer and admin interfaces.
 * Machine-readable values (24h HH:mm) remain in database/API.
 */

export interface FormatTimeOptions {
  locale?: string; // 'ar' | 'en'
  showPeriod?: boolean; // default true
  preserveRange?: boolean; // default true
}

/**
 * Parses any time string ("18:00", "18:00 – 19:00", "06:00 PM", "6:00 مساءً")
 * to total minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const raw = String(timeStr).trim();
  const firstSegment = raw.split(/[-–—]/)[0].trim();
  const clean = firstSegment.toUpperCase();

  const isPM = clean.includes('PM') || clean.includes('مساء') || clean.includes('م');
  const isAM = clean.includes('AM') || clean.includes('صباح') || clean.includes('ص');

  // Strip period labels to get numeric part
  const timePart = clean
    .replace(/(AM|PM|مساءً|صباحاً|مساء|صباح|م|ص)/g, '')
    .trim();
  const cleanNumbers = timePart.replace(/[^0-9:]/g, '');
  const [hourStr, minuteStr] = cleanNumbers.split(':');
  let hours = parseInt(hourStr || '0', 10);
  const minutes = parseInt(minuteStr || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
}

/**
 * Converts a single time string ("18:00", "00:00", "12:30", "1:00 AM")
 * to 12-hour AM/PM format (e.g. "6:00 PM", "12:00 AM", "12:30 PM").
 */
export function formatSingleTimeTo12Hour(
  timeStr?: string | null,
  locale: string = 'en'
): string {
  if (!timeStr || String(timeStr).trim() === '' || String(timeStr).trim() === '—') {
    return '—';
  }

  const raw = String(timeStr).trim();

  // If already formatted like "6:00 PM" or "10:30 AM", validate and normalize
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|صباحاً|مساءً|ص|م)$/i);
  if (match12) {
    const hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    const isPM = period.includes('PM') || period.includes('مساء') || period === 'م';
    const periodLabel = locale === 'ar' ? (isPM ? 'م' : 'ص') : isPM ? 'PM' : 'AM';
    return `${hours}:${minutes} ${periodLabel}`;
  }

  // Parse hours and minutes from 24h or arbitrary format
  const minsFromMidnight = parseTimeToMinutes(raw);
  const normalized = Math.max(0, Math.min(1439, minsFromMidnight));
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const minsStr = mins.toString().padStart(2, '0');

  const isPM = hours24 >= 12;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const periodLabel = locale === 'ar' ? (isPM ? 'م' : 'ص') : isPM ? 'PM' : 'AM';

  return `${hours12}:${minsStr} ${periodLabel}`;
}

/**
 * Converts any time string (including intervals like "18:00 – 19:00" or single "18:00")
 * to 12-hour AM/PM format.
 *
 * Examples:
 * - "18:00" -> "6:00 PM"
 * - "18:00 – 19:00" -> "6:00 PM – 7:00 PM"
 * - "00:00" -> "12:00 AM"
 * - "12:30" -> "12:30 PM"
 * - "10:30 AM" -> "10:30 AM"
 */
export function formatTimeTo12Hour(
  timeStr?: string | null,
  options?: FormatTimeOptions
): string {
  if (!timeStr || String(timeStr).trim() === '' || String(timeStr).trim() === '—') {
    return '—';
  }

  const raw = String(timeStr).trim();
  const locale = options?.locale || 'en';

  // Check if string contains interval separator
  if (raw.includes('–') || raw.includes('-') || raw.includes('—')) {
    const parts = raw.split(/[-–—]/).map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const start12 = formatSingleTimeTo12Hour(parts[0], locale);
      const end12 = formatSingleTimeTo12Hour(parts[1], locale);
      return `${start12} – ${end12}`;
    }
  }

  return formatSingleTimeTo12Hour(raw, locale);
}

/**
 * Returns canonical start time in 12-hour format, even if given an interval.
 */
export function formatStartTimeTo12Hour(
  timeStr?: string | null,
  locale: string = 'en'
): string {
  if (!timeStr) return '—';
  const firstPart = String(timeStr).split(/[-–—]/)[0].trim();
  return formatSingleTimeTo12Hour(firstPart, locale);
}
