/**
 * Cleanzo Canonical 12-Hour Time Utilities (Backend)
 */

export function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const raw = String(timeStr).trim();
  const firstSegment = raw.split(/[-–—]/)[0].trim();
  const clean = firstSegment.toUpperCase();

  const isPM = clean.includes('PM') || clean.includes('مساء') || clean.includes('م');
  const isAM = clean.includes('AM') || clean.includes('صباح') || clean.includes('ص');

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

export function formatSingleTimeTo12Hour(
  timeStr?: string | null,
  locale: string = 'en'
): string {
  if (!timeStr || String(timeStr).trim() === '' || String(timeStr).trim() === '—') {
    return '—';
  }

  const raw = String(timeStr).trim();

  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|صباحاً|مساءً|ص|م)$/i);
  if (match12) {
    const hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    const isPM = period.includes('PM') || period.includes('مساء') || period === 'م';
    const periodLabel = locale === 'ar' ? (isPM ? 'م' : 'ص') : isPM ? 'PM' : 'AM';
    return `${hours}:${minutes} ${periodLabel}`;
  }

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

export function formatTimeTo12Hour(
  timeStr?: string | null,
  options?: { locale?: string }
): string {
  if (!timeStr || String(timeStr).trim() === '' || String(timeStr).trim() === '—') {
    return '—';
  }

  const raw = String(timeStr).trim();
  const locale = options?.locale || 'en';

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
