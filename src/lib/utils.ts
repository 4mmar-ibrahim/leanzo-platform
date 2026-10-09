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

export function extractDirectImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  let url = String(rawUrl).trim();
  if (!url) return '';

  // Strip wrapping quotes, markdown image syntax ![](url), angle brackets <url>, parentheses (url)
  url = url.replace(/^[<"'\(\[\{\s]+|[>"'\)\]\}\s]+$/g, '').trim();
  const mdMatch = url.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch) url = mdMatch[1].trim();

  // Google Images preview / redirect link: extract actual target image URL
  if (url.includes('google.') && (url.includes('imgres') || url.includes('/url?') || url.includes('/imglanding'))) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const imgurl = parsed.searchParams.get('imgurl') || parsed.searchParams.get('url');
      if (imgurl) {
        url = decodeURIComponent(imgurl);
      }
    } catch {}
  }

  // Google Drive sharing link conversion to direct viewable stream
  const gDriveMatch = url.match(/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+)|uc\?(?:export=view&)?id=([a-zA-Z0-9_-]+))/);
  if (gDriveMatch) {
    const fileId = gDriveMatch[1] || gDriveMatch[2] || gDriveMatch[3];
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // Dropbox link: switch dl=0 to raw=1 for direct binary stream
  if (url.includes('dropbox.com') && url.includes('dl=0')) {
    url = url.replace('dl=0', 'raw=1');
  }

  // Imgur page link to direct image link
  const imgurMatch = url.match(/^https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)$/);
  if (imgurMatch) {
    return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
  }

  // Wikimedia file page link to direct thumbnail/image
  if (url.includes('commons.wikimedia.org/wiki/File:')) {
    try {
      const filename = url.split('File:')[1];
      if (filename) {
        url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(decodeURIComponent(filename))}`;
      }
    } catch {}
  }

  // If URL has no protocol but starts with domain-like string
  if (
    !url.startsWith('http://') &&
    !url.startsWith('https://') &&
    !url.startsWith('data:') &&
    !url.startsWith('/') &&
    (url.startsWith('www.') || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(url))
  ) {
    url = `https://${url}`;
  }

  return url;
}

export function normalizeMediaUrl(url?: string | null, version?: number | string | null): string {
  if (!url) return '';
  let cleaned = extractDirectImageUrl(url);
  if (!cleaned) return '';

  // If already absolute http/https or data URI, return immediately (preserving search params)
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:')) {
    return cleaned;
  }

  // Remove accidental trailing slashes from common file extensions (e.g. cleanzo-logo.png/ -> cleanzo-logo.png)
  cleaned = cleaned.replace(/(\.(?:png|jpg|jpeg|svg|webp|ico|gif|mp4|webm))\/*$/i, '$1');

  // Strip trailing slashes unless it's just root '/'
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.replace(/\/+$/, '');
  }

  // If it's a relative path not starting with /, prefix with /
  if (!cleaned.startsWith('/')) {
    cleaned = '/' + cleaned;
  }

  // If a specific version timestamp is provided and url isn't data URL, append stable query
  if (version && !cleaned.includes('v=')) {
    const separator = cleaned.includes('?') ? '&' : '?';
    cleaned = `${cleaned}${separator}v=${version}`;
  }

  return cleaned;
}

export * from './timeUtils';

