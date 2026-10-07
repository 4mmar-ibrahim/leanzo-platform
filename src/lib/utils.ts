import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency: string = "ج.م"): string {
  return `${price.toLocaleString("ar-EG")} ${currency}`;
}

export function formatPriceEn(price: number, currency: string = "EGP"): string {
  return `${price.toLocaleString("en-US")} ${currency}`;
}

export function formatDuration(minutes: number, isArabic: boolean = true): string {
  if (minutes < 60) {
    return isArabic ? `${minutes} دقيقة` : `${minutes} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return isArabic ? `${hours} ${hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : 'ساعات'}` : `${hours} hrs`;
  }
  return isArabic
    ? `${hours} ساعة و ${remainingMins} دقيقة`
    : `${hours}h ${remainingMins}m`;
}

export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `CLZ-${year}-${randomNum}`;
}

export function normalizeMediaUrl(url?: string | null, version?: number | string | null): string {
  if (!url) return '';
  let cleaned = String(url).trim();
  if (!cleaned) return '';

  // Remove accidental trailing slashes from common file extensions (e.g. cleanzo-logo.png/ -> cleanzo-logo.png)
  cleaned = cleaned.replace(/(\.(?:png|jpg|jpeg|svg|webp|ico|gif|mp4|webm))\/*$/i, '$1');

  // Strip trailing slashes unless it's just root '/'
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.replace(/\/+$/, '');
  }

  // If it's a relative path not starting with http, https, data:, or /, prefix with /
  if (
    cleaned &&
    !cleaned.startsWith('http://') &&
    !cleaned.startsWith('https://') &&
    !cleaned.startsWith('data:') &&
    !cleaned.startsWith('/')
  ) {
    cleaned = '/' + cleaned;
  }

  // If a specific version timestamp is provided and url isn't data URL, append stable query
  if (version && !cleaned.startsWith('data:') && !cleaned.includes('v=')) {
    const separator = cleaned.includes('?') ? '&' : '?';
    cleaned = `${cleaned}${separator}v=${version}`;
  }

  return cleaned;
}

export * from './timeUtils';

