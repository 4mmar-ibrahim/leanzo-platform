/**
 * Cleanzo Arabic Text Normalization & Search Utilities
 * Provides resilient, linguistically-aware text search across services, packages, and content.
 */

import { Service, ServiceCategory } from '@/types';

export function matchesCategory(serviceCat: string, targetCat: string): boolean {
  if (serviceCat === targetCat) return true;
  const s = (serviceCat || '').toLowerCase();
  const t = (targetCat || '').toLowerCase();
  if (t === 'all') return true;
  if ((t === 'car' || t === 'cat-mv2vgjo7' || t === 'cat-car') && (s === 'car' || s === 'cat-mv2vgjo7' || s === 'cat-car')) return true;
  if ((t === 'home' || t === 'cat-mv2vh6ty' || t === 'cat-home') && (s === 'home' || s === 'cat-mv2vh6ty' || s === 'cat-home')) return true;
  return s === t;
}

/**
 * Normalizes Arabic text for consistent, accent-insensitive search:
 * - Removes Arabic Tashkeel / diacritics (Fatha, Damma, Kasra, Sukun, Tanween, Shadda)
 * - Normalizes Alef variations (أ, إ, آ, ٱ -> ا)
 * - Normalizes Alef Maksura (ى -> ي)
 * - Normalizes Ta Marbuta (ة -> ه)
 * - Removes Tatweel / Kashida (ـ)
 * - Trims and collapses multiple spaces
 * - Lowercases Latin characters
 */
export function normalizeArabicText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    // Remove Tashkeel / Diacritics
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Alef forms
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Alef Maksura & Hamza on Nabrah to Yaa
    .replace(/[ىئ]/g, 'ي')
    // Normalize Ta Marbuta to Haa
    .replace(/ة/g, 'ه')
    // Remove Tatweel / Kashida
    .replace(/\u0640/g, '')
    // Lowercase
    .toLowerCase()
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes a search query into non-empty, normalized words.
 */
export function extractSearchTokens(query?: string | null): string[] {
  const normalized = normalizeArabicText(query);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export interface ServiceSearchScore {
  service: Service;
  score: number;
}

/**
 * Builds a comprehensive searchable text blob for a service:
 * Title, TitleEn, ShortDescription, Description, Features, Inclusions, Packages, and Add-ons.
 */
export function buildServiceSearchCorpus(service: Service): string {
  const parts: string[] = [
    service.title || '',
    service.titleEn || '',
    service.shortDescription || '',
    service.shortDescriptionEn || '',
    service.description || '',
    service.descriptionEn || '',
  ];

  if (Array.isArray(service.features)) {
    parts.push(...service.features);
  }
  if (Array.isArray(service.featuresEn)) {
    parts.push(...service.featuresEn);
  }
  if (Array.isArray(service.inclusions)) {
    parts.push(...service.inclusions);
  }
  if (Array.isArray(service.inclusionsEn)) {
    parts.push(...service.inclusionsEn);
  }

  // Include package names and descriptions
  if (Array.isArray(service.packages)) {
    for (const pkg of service.packages) {
      if (pkg.name) parts.push(pkg.name);
      if (pkg.nameEn) parts.push(pkg.nameEn);
      if (pkg.description) parts.push(pkg.description);
    }
  }

  // Include addon names and descriptions
  if (Array.isArray(service.addons)) {
    for (const add of service.addons) {
      if (add.name) parts.push(add.name);
      if (add.nameEn) parts.push(add.nameEn);
      if (add.description) parts.push(add.description);
    }
  }

  return parts.join(' ');
}

/**
 * Evaluates match quality between a search query and a service.
 * Returns a score > 0 if matched, 0 if no match.
 */
export function matchServiceSearch(
  service: Service,
  query: string,
  categoryFilter: ServiceCategory | 'all' = 'all'
): number {
  if (!query || !query.trim()) return 0;

  // Strict category isolation
  if (categoryFilter !== 'all') {
    if (!matchesCategory(service.category, categoryFilter)) {
      return 0;
    }
  }

  const normQuery = normalizeArabicText(query);
  const tokens = extractSearchTokens(query);
  if (tokens.length === 0) return 0;

  const normTitle = normalizeArabicText(service.title);
  const normTitleEn = (service.titleEn || '').toLowerCase();
  const fullCorpus = normalizeArabicText(buildServiceSearchCorpus(service));

  // 1. Exact phrase match in Title (Highest Priority)
  if (normTitle.includes(normQuery) || normTitleEn.includes(normQuery)) {
    return 100;
  }

  // 2. Exact phrase match in Description / Packages / Features
  if (fullCorpus.includes(normQuery)) {
    return 80;
  }

  // 3. All tokens present in Title
  const allTokensInTitle = tokens.every(
    (token) => normTitle.includes(token) || normTitleEn.includes(token)
  );
  if (allTokensInTitle) {
    return 70;
  }

  // 4. All tokens present across full service corpus
  const allTokensInCorpus = tokens.every((token) => fullCorpus.includes(token));
  if (allTokensInCorpus) {
    return 50;
  }

  // 5. Significant token overlap (at least 50% of tokens match corpus if multi-token, or single token partial match)
  if (tokens.length > 1) {
    const matchedTokensCount = tokens.filter((token) => fullCorpus.includes(token)).length;
    if (matchedTokensCount >= Math.ceil(tokens.length * 0.6)) {
      return 30;
    }
  }

  return 0;
}

/**
 * Filters and ranks services based on linguistic query matching.
 */
export function searchServices(
  services: Service[],
  query: string,
  categoryFilter: ServiceCategory | 'all' = 'all'
): Service[] {
  if (!query || !query.trim()) return [];

  const scored: ServiceSearchScore[] = [];

  for (const s of services) {
    if (s.available === false || (s as any).isArchived) continue;
    const score = matchServiceSearch(s, query, categoryFilter);
    if (score > 0) {
      scored.push({ service: s, score });
    }
  }

  // Sort descending by score, then by order/rating
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return ((a.service as any).order || 0) - ((b.service as any).order || 0);
  });

  return scored.map((item) => item.service);
}
