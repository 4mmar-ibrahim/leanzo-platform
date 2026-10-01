import { SystemSettings } from '@/types';
import { initialSocialLinks } from './cmsData';
import { INITIAL_ZO_SETTINGS } from './zoAssets';

export const initialSystemSettings: SystemSettings = {
  general: {
    companyName: 'كلينزو لخدمات العناية المتكاملة',
    companyNameEn: 'Cleanzo Premium Cleaning & Care Services',
    defaultLanguage: 'ar',
    currency: 'ج.م',
    currencyEn: 'EGP',
    timezone: 'Africa/Cairo',
  },
  booking: {
    workingDays: [0, 1, 2, 3, 4, 5, 6], // All days
    workingHoursStart: '09:00',
    workingHoursEnd: '22:00',
    breakStart: '14:00',
    breakEnd: '15:00',
    slotDuration: 60,
    slotInterval: 30,
    bufferTime: 15,
    maxBookingsPerSlot: 4,
    advanceBookingDays: 30,
    minNoticeHours: 2,
    sameDayBooking: true,
    blockedDates: ['2026-09-25'],
    holidays: [
      { date: '2026-10-06', name: 'عيد النصر القومي' },
      { date: '2027-01-07', name: 'عيد الميلاد المجيد' },
    ],
  },
  appearance: {
    primaryColor: '#0866C6', // Cleanzo Blue
    secondaryColor: '#07345C', // Cleanzo Navy
    accentColor: '#F0444C', // Cleanzo Red
    defaultTheme: 'system',
    siteTitle: 'CLEANZO — خدمات العناية المتخصصة بالسيارات والمنازل',
    siteTitleEn: 'CLEANZO — Specialized Car & Home Care Services',
    siteDescription: 'احجز أفضل خدمات تنظيف وتلميع السيارات والعناية بالمنزل بالبخار والتعقيم مع كلينزو في مصر.',
    siteDescriptionEn: 'Book best car wash, detailing and steam home cleaning with Cleanzo.',
    logoText: 'CLEANZO',
  },
  social: initialSocialLinks,
  mobileExperience: {
    enableMobileLayout: true,
    enableBottomNavigation: true,
    enableQuickBooking: true,
    showHeroOnMobile: false, // Desktop hero removed on mobile as requested!
    showOffers: true,
    showGallery: true,
    showFAQ: true,
    showContact: true,
    showFloatingBookingButton: true,
    defaultHomeSection: 'categories',
    animations: true,
    showReviews: true,
    showServices: true,
    showWelcomeCard: true,
    showBannerOnMobile: true,
  },
  branding: {
    logoText: 'CLEANZO',
    logoUrl: '/brand/zo/cleanzo-logo.png',
    faviconUrl: '/brand/zo/cleanzo-logo.png',
    primaryColor: '#0866C6',
    secondaryColor: '#07345C',
    accentColor: '#F0444C',
    fontFamily: 'cairo',
    heroImages: {
      car: '/brand/zo/cleanzo-van-hero.png',
      home: '/brand/zo/cleanzo-van-hero.png',
    },
    ctaText: 'احجز خدمتك الآن',
    ctaTextEn: 'Book Your Service Now',
    footerText: 'CLEANZO — مساحات نظيفة، أيام أسعد. حلول تنظيف احترافية متنقلة للعناية بالسيارات والمنازل بأعلى معايير الجودة.',
    footerTextEn: 'CLEANZO — Cleaner Spaces, Happier Days. Mobile car and home care.',
    topBanner: {
      enabled: true,
      text: 'خصم 20% لفتره محدودة على جميع باقات الغسيل والديتيلينج بمناسبه التحديث الجديد! كود: WELCOME20',
      textEn: 'Limited time 20% OFF on all packages celebrating the new update! Code: WELCOME20',
      discountBadge: 'خصم 20%',
      link: '/booking',
      bgColor: 'from-[#07345C] to-[#0866C6]',
    },
    maintenanceMode: false,
    maintenanceMessage: 'الموقع يخضع حالياً لترقية شاملة لتحسين تجربة الحجز وسنعود للعمل خلال دقائق.',
  },
  notifications: {
    emailAlerts: true,
    whatsappAlerts: true,
    browserAlerts: true,
    orderCreatedNotify: true,
    orderCancelledNotify: true,
    newCustomerNotify: true,
  },
  mascot: INITIAL_ZO_SETTINGS,
};
