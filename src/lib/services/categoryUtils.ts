import { ServiceCategoryItem } from '@/types';

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
      name: isAr ? matched.name : (matched.nameEn || matched.name),
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
    rawCatLower.includes('سيار');

  const isHome =
    rawCatLower === 'home' ||
    rawCatLower === 'homes' ||
    rawCatLower.includes('home') ||
    rawCatLower.includes('منزل') ||
    rawCatLower.includes('منازل');

  let name = '';
  if (isCar) {
    name = isAr ? 'سيارات' : 'Car';
  } else if (isHome) {
    name = isAr ? 'منازل' : 'Home';
  } else {
    // Custom category name or slug provided directly
    name = rawCat || (isAr ? 'عام' : 'General');
  }

  return {
    name,
    isCar,
    isHome,
    slug: rawCat,
  };
}
