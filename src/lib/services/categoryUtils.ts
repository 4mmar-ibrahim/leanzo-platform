import { ServiceCategoryItem } from '@/types';
import { autoTranslate } from '@/lib/i18n/autoTranslate';

export interface CategoryInfo {
  name: string;
  isCar: boolean;
  isHome: boolean;
  slug: string;
  matchedCategory?: ServiceCategoryItem;
}

/**
 * Resolves the display name, icon indicators, and target slug for any service category,
 * dynamically checking against the admin-configured categories list first, with intelligent fallbacks.
 */
export function resolveCategoryInfo(
  categorySlugOrId: string | undefined | null,
  categories: ServiceCategoryItem[] = [],
  isAr: boolean = true
): CategoryInfo {
  const rawCat = (categorySlugOrId || '').trim();
  const rawCatLower = rawCat.toLowerCase();

  // 1. Try finding an exact or lowercase match in the categories list
  const matched = (categories || []).find((c) => {
    if (!c) return false;
    const cSlug = (c.slug || '').toLowerCase();
    const cId = (c.id || '').toLowerCase();
    const cName = (c.name || '').trim().toLowerCase();
    const cNameEn = (c.nameEn || '').trim().toLowerCase();

    return (
      cSlug === rawCatLower ||
      cId === rawCatLower ||
      cName === rawCatLower ||
      (cNameEn && cNameEn === rawCatLower)
    );
  });

  if (matched) {
    const mSlug = (matched.slug || '').toLowerCase();
    const mName = (matched.name || '').toLowerCase();
    const isCar = mSlug === 'car' || mSlug.includes('car') || mName.includes('سيار');
    const isHome = mSlug === 'home' || mSlug.includes('home') || mName.includes('منزل') || mName.includes('منازل');

    return {
      name: isAr ? matched.name : (matched.nameEn || autoTranslate(matched.name, 'en')),
      isCar,
      isHome,
      slug: matched.slug || matched.id || rawCat,
      matchedCategory: matched,
    };
  }

  // 2. Fallbacks if category is not in list (or categories list hasn't loaded yet)
  const isCar =
    rawCatLower === 'car' ||
    rawCatLower === 'cars' ||
    rawCatLower.includes('car') ||
    rawCatLower.includes('سيار') ||
    rawCatLower === 'cat-mv2vgjo7' ||
    rawCatLower === 'cat-car';

  const isHome =
    rawCatLower === 'home' ||
    rawCatLower === 'homes' ||
    rawCatLower.includes('home') ||
    rawCatLower.includes('منزل') ||
    rawCatLower.includes('منازل') ||
    rawCatLower === 'cat-mv2vh6ty' ||
    rawCatLower === 'cat-home';

  let name = '';
  if (isCar) {
    name = isAr ? 'سيارات' : 'Cars';
  } else if (isHome) {
    name = isAr ? 'منازل' : 'Homes';
  } else {
    // Custom category name or slug provided directly
    name = isAr ? (rawCat || 'عام') : autoTranslate(rawCat || 'General', 'en');
  }

  return {
    name,
    isCar,
    isHome,
    slug: rawCat,
  };
}

export function normalizeCategory(category?: string | null): 'car' | 'home' | string {
  if (!category) return '';
  const raw = String(category).trim().toLowerCase();
  if (
    raw === 'car' ||
    raw === 'cars' ||
    raw.includes('car') ||
    raw.includes('سيار') ||
    raw === 'cat-mv2vgjo7'
  ) return 'car';
  if (
    raw === 'mixed' ||
    raw === 'mix' ||
    raw.includes('mixed') ||
    raw.includes('مختلط')
  ) return 'mixed';
  if (
    raw === 'home' ||
    raw === 'homes' ||
    raw.includes('home') ||
    raw.includes('منزل') ||
    raw.includes('منازل') ||
    raw.includes('سجاد') ||
    raw === 'cat-mv2fyqvp' ||
    raw === 'cat-mv2vh6ty'
  ) return 'home';
  return raw;
}

export function isSameCategory(catA?: string | null, catB?: string | null): boolean {
  if (!catA || !catB) return false;
  const normA = normalizeCategory(catA);
  const normB = normalizeCategory(catB);
  if (!normA || !normB) return false;
  return normA === normB;
}

export function getCategoryDisplayName(category?: string | null, isAr: boolean = true): string {
  const norm = normalizeCategory(category);
  if (norm === 'car') return isAr ? 'سيارات' : 'Cars';
  if (norm === 'home') return isAr ? 'منازل' : 'Homes';
  if (norm === 'mixed') return isAr ? 'مختلط' : 'Mixed';
  return isAr ? (category || 'عام') : (category || 'General');
}

/**
 * Computes the authoritative category sector for an order from all its attached services.
 * Returns 'mixed' if order contains both car and home services.
 */
export function computeOrderCategory(order: any): 'car' | 'home' | 'mixed' | string {
  if (!order) return 'car';

  const rawCat = normalizeCategory(order.category);
  if (rawCat === 'mixed') return 'mixed';

  // Check sub-services in snapshots or metadata
  const subServices: any[] =
    (Array.isArray(order.serviceSnapshot?.services) && order.serviceSnapshot.services.length > 0
      ? order.serviceSnapshot.services
      : Array.isArray(order.metadata?.services) && order.metadata.services.length > 0
      ? order.metadata.services
      : Array.isArray(order.selectedServices) && order.selectedServices.length > 0
      ? order.selectedServices
      : Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : null) as any[];

  if (subServices && subServices.length > 0) {
    const cats = new Set<string>();
    for (const s of subServices) {
      const c = normalizeCategory(s.category || s.service?.category);
      if (c === 'car' || c === 'home') cats.add(c);
      else if (c === 'mixed') return 'mixed';
    }
    if (cats.has('car') && cats.has('home')) {
      return 'mixed';
    }
    if (cats.size === 1) {
      return cats.values().next().value || 'car';
    }
  }

  return rawCat || normalizeCategory(order.serviceSnapshot?.category) || 'car';
}

