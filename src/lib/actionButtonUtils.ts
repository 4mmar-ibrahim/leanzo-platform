import { CMSActionButton, CMSActionDestinationType } from '@/types';

export interface DestinationPresetOption {
  value: string;
  labelAr: string;
  labelEn: string;
  badge?: string;
}

export const INTERNAL_DESTINATIONS: DestinationPresetOption[] = [
  { value: '/', labelAr: 'الصفحة الرئيسية', labelEn: 'Home Page' },
  { value: '/booking', labelAr: 'صفحة الحجز والطلب', labelEn: 'Booking Page', badge: 'حجز' },
  { value: '/services', labelAr: 'كافة الخدمات', labelEn: 'All Services' },
  { value: '/services/car', labelAr: 'خدمات سيارات متنقلة', labelEn: 'Car Detailing' },
  { value: '/services/home', labelAr: 'خدمات تنظيف منازل', labelEn: 'Home Sanitation' },
  { value: '/offers', labelAr: 'العروض والخصومات الحصرية', labelEn: 'Special Offers', badge: 'عروض' },
  { value: '/gallery', labelAr: 'معرض الأعمال قبل وبعد', labelEn: 'Work Gallery' },
  { value: '/reviews', labelAr: 'آراء وتقييمات العملاء', labelEn: 'Customer Reviews' },
  { value: '/about', labelAr: 'من نحن وقصة كلينزو', labelEn: 'About Cleanzo' },
  { value: '/contact', labelAr: 'تواصل معنا ومعلومات الاتصال', labelEn: 'Contact Us' },
  { value: '/faq', labelAr: 'الأسئلة الشائعة', labelEn: 'FAQs' },
  { value: '/track', labelAr: 'تتبع الطلب', labelEn: 'Track Order' },
  { value: '/terms', labelAr: 'الشروط والأحكام', labelEn: 'Terms of Service' },
  { value: '/privacy', labelAr: 'سياسة الخصوصية', labelEn: 'Privacy Policy' },
];

export const BOOKING_DESTINATIONS: DestinationPresetOption[] = [
  { value: '/booking', labelAr: 'حجز عام (النموذج الكامل)', labelEn: 'General Booking' },
  { value: '/booking?category=car', labelAr: 'حجز خدمة سيارات مباشرة 🚗', labelEn: 'Book Car Service' },
  { value: '/booking?category=home', labelAr: 'حجز خدمة منازل مباشرة 🏠', labelEn: 'Book Home Service' },
];

export const SERVICES_DESTINATIONS: DestinationPresetOption[] = [
  { value: '/services', labelAr: 'تصفح كافة الخدمات والباقات', labelEn: 'All Services Catalog' },
  { value: '/services/car', labelAr: 'قسم خدمات غسيل وتلميع السيارات 🚗', labelEn: 'Car Detailing Services' },
  { value: '/services/home', labelAr: 'قسم خدمات تنظيف وتعقيم المنازل 🏠', labelEn: 'Home Sanitation Services' },
];

export const SECTION_DESTINATIONS: DestinationPresetOption[] = [
  { value: '#services-selection', labelAr: 'قسم اختيار الخدمات (خدماتنا)', labelEn: 'Services Selection Section' },
  { value: '#why-us', labelAr: 'قسم لماذا تختار كلينزو', labelEn: 'Why Choose Cleanzo' },
  { value: '#how-it-works', labelAr: 'قسم كيف يعمل النظام (الخطوات)', labelEn: 'How It Works Steps' },
  { value: '#stats', labelAr: 'قسم إحصائيات الثقة والأرقام', labelEn: 'Trust Stats Section' },
  { value: '#reviews', labelAr: 'قسم آراء وتقييمات العملاء', labelEn: 'Client Reviews Section' },
  { value: '#offers', labelAr: 'قسم العروض والباقات الترويجية', labelEn: 'Offers Section' },
  { value: '#gallery', labelAr: 'قسم معرض أعمالنا (قبل وبعد)', labelEn: 'Gallery Section' },
  { value: '#faq', labelAr: 'قسم الأسئلة الأكثر شيوعاً', labelEn: 'FAQ Section' },
  { value: '#contact', labelAr: 'قسم تواصل معنا ومعلومات الاتصال', labelEn: 'Contact Section' },
];

export const DESTINATION_TYPE_LABELS: Record<CMSActionDestinationType, { labelAr: string; labelEn: string; iconDesc: string }> = {
  internal: { labelAr: 'صفحة داخلية بالموقع', labelEn: 'Internal Page', iconDesc: '📄' },
  booking: { labelAr: 'صفحة حجز سريع', labelEn: 'Booking Flow', iconDesc: '📅' },
  services: { labelAr: 'قائمة الخدمات', labelEn: 'Services List', iconDesc: '✨' },
  category: { labelAr: 'فئة خدمة محددة', labelEn: 'Service Category', iconDesc: '🏷️' },
  service: { labelAr: 'خدمة تفصيلية محددة', labelEn: 'Specific Service', iconDesc: '🔍' },
  section: { labelAr: 'قسم بالصفحة الحالية (#)', labelEn: 'Page Section Anchor', iconDesc: '⚓' },
  external: { labelAr: 'رابط خارجي (URL)', labelEn: 'External URL', iconDesc: '🌐' },
};

/**
 * Validates whether an external URL is safe and valid HTTP/HTTPS.
 * Strictly prevents javascript:, data:, vbscript:, and malicious schemes.
 */
export function isValidSafeExternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Block forbidden script/data schemes
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('about:')
  ) {
    return false;
  }

  // Must start with http:// or https:// (or safe tel/mailto/wa.me if specifically formed)
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  if (lower.startsWith('https://wa.me/') || lower.startsWith('tel:') || lower.startsWith('mailto:')) {
    return true;
  }

  return false;
}

/**
 * Automatically infers destination type from user-entered URL or path string.
 */
export function detectDestinationType(val: string): CMSActionDestinationType {
  const trimmed = (val || '').trim().toLowerCase();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('wa.me')
  ) {
    return 'external';
  }
  if (trimmed.startsWith('#')) {
    return 'section';
  }
  if (trimmed.startsWith('/booking')) {
    return 'booking';
  }
  if (trimmed.startsWith('/services')) {
    return 'services';
  }
  return 'internal';
}

/**
 * Resolves a CMS action button into a safe, valid clickable destination URL.
 * Accepts external URLs (http/https), anchors (#), and internal routes (/path).
 */
export function resolveActionButtonUrl(
  btn: CMSActionButton,
  context?: { activeCategory?: string }
): string | null {
  if (!btn || btn.enabled === false) return null;

  const rawVal = (btn.destinationValue || '').trim();
  if (!rawVal) return null;

  // 1. External URL or protocol
  if (
    rawVal.startsWith('http://') ||
    rawVal.startsWith('https://') ||
    rawVal.startsWith('tel:') ||
    rawVal.startsWith('mailto:') ||
    rawVal.startsWith('https://wa.me/') ||
    rawVal.startsWith('wa.me/')
  ) {
    if (rawVal.startsWith('wa.me/')) return `https://${rawVal}`;
    return rawVal;
  }

  // 2. Page Section Anchor
  if (rawVal.startsWith('#')) {
    return rawVal.length > 1 ? rawVal : null;
  }

  // 3. Dynamic booking category context if path is exactly /booking
  if (rawVal === '/booking' && context?.activeCategory) {
    return `/booking?category=${context.activeCategory}`;
  }

  // 4. Internal relative path (ensure leading slash)
  return rawVal.startsWith('/') ? rawVal : `/${rawVal}`;
}
