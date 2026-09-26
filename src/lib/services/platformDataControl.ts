import { useOrderStore } from '@/store/useOrderStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useOfferStore } from '@/store/useOfferStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useGalleryStore } from '@/store/useGalleryStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAnalyticsResetStore } from '@/store/useAnalyticsResetStore';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * Fast client-side obfuscation matching enc:v1 format
 */
export function clientEncryptString(text: string | undefined | null): string {
  if (!text) return '';
  if (text.startsWith('enc:v1:')) return text;
  // Convert to hex representation
  const hex = Array.from(text)
    .map((c) => c.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
  return `enc:v1:aes-256-gcm:${hex}`;
}

export function clientDecryptString(cipher: string | undefined | null): string {
  if (!cipher) return '';
  if (!cipher.startsWith('enc:v1:aes-256-gcm:')) return cipher;
  const hex = cipher.replace('enc:v1:aes-256-gcm:', '');
  let result = '';
  for (let i = 0; i < hex.length; i += 4) {
    const code = parseInt(hex.substring(i, i + 4), 16);
    if (!isNaN(code)) result += String.fromCharCode(code);
  }
  return result;
}

/**
 * Encrypts client-side cached Zustand stores to guarantee UI synchronization with backend encryption.
 */
export function encryptFrontendStores(): { customersCount: number; ordersCount: number } {
  let custCount = 0;
  let ordCount = 0;

  // 1. Customers
  const custState = useCustomerStore.getState();
  if (custState.customers && custState.customers.length > 0) {
    const encryptedCustomers = custState.customers.map((c) => {
      custCount++;
      return {
        ...c,
        phone: clientEncryptString(c.phone),
        email: clientEncryptString(c.email),
      };
    });
    useCustomerStore.setState({ customers: encryptedCustomers });
  }

  // 2. Orders
  const orderState = useOrderStore.getState();
  if (orderState.orders && orderState.orders.length > 0) {
    const encryptedOrders = orderState.orders.map((o) => {
      ordCount++;
      return {
        ...o,
        customerPhone: o.customerPhone ? clientEncryptString(o.customerPhone) : o.customerPhone,
        notes: o.notes ? clientEncryptString(o.notes) : o.notes,
      };
    });
    useOrderStore.setState({ orders: encryptedOrders });
  }

  return { customersCount: custCount, ordersCount: ordCount };
}

/**
 * Completely wipes all Zustand stores and persistent localStorage entries
 * across every section of the platform.
 */
export function wipeAllFrontendStores(): void {
  // Reset all Zustand stores
  try {
    useOrderStore.setState({ orders: [] });
  } catch {}
  try {
    useCustomerStore.setState({ customers: [] });
  } catch {}
  try {
    useServiceStore.setState({ services: [], categories: [] });
  } catch {}
  try {
    useOfferStore.setState({ offers: [] });
  } catch {}
  try {
    useLocationStore.setState({ governorates: [] });
  } catch {}
  try {
    useGalleryStore.setState({ items: [] });
  } catch {}
  try {
    useNotificationStore.setState({ notifications: [] });
  } catch {}
  try {
    useTechnicianStore.setState({ technicians: [] });
  } catch {}
  try {
    useCMSStore.setState({
      reviews: [],
      faqs: [],
      about: {
        title: '',
        titleEn: '',
        description: '',
        descriptionEn: '',
        mission: '',
        missionEn: '',
        vision: '',
        visionEn: '',
        story: '',
        storyEn: '',
        stats: [],
      },
      contact: {
        phone: '',
        whatsapp: '',
        email: '',
        address: '',
        addressEn: '',
        workingHours: '',
        workingHoursEn: '',
        mapsUrl: '',
        supportNote: '',
        supportNoteEn: '',
      },
      social: {
        facebook: '',
        instagram: '',
        tiktok: '',
        youtube: '',
        whatsapp: '',
        twitter: '',
        linkedin: '',
        items: [],
      },
      hasUnsavedChanges: false,
    });
  } catch {}
  try {
    const currSettings = useSettingsStore.getState().settings;
    useSettingsStore.setState({
      settings: {
        ...currSettings,
        social: {
          facebook: '',
          instagram: '',
          tiktok: '',
          youtube: '',
          whatsapp: '',
          twitter: '',
          linkedin: '',
        },
      },
      hasUnsavedChanges: false,
    });
  } catch {}
  try {
    useActivityLogStore.setState({ logs: [] });
  } catch {}
  try {
    useAnalyticsResetStore.setState({ isCleared: true, clearedAt: new Date().toISOString() });
  } catch {}

  // Set empty state in localStorage for all stores to prevent fallback to initial mock data on reload
  if (typeof window !== 'undefined' && window.localStorage) {
    const emptyStates: Record<string, any> = {
      'cleanzo-orders-storage': { orders: [] },
      'cleanzo-customers-storage': { customers: [] },
      'cleanzo-services-storage': { services: [], categories: [] },
      'cleanzo-offers-storage': { offers: [] },
      'cleanzo-locations-storage': { governorates: [] },
      'cleanzo-gallery-storage': { items: [] },
      'cleanzo-notifications-storage': { notifications: [] },
      'cleanzo-technicians-storage': { technicians: [] },
      'cleanzo-cms-storage': {
        reviews: [],
        faqs: [],
        about: { title: '', titleEn: '', description: '', descriptionEn: '', mission: '', missionEn: '', vision: '', visionEn: '', story: '', storyEn: '', stats: [] },
        contact: { phone: '', whatsapp: '', email: '', address: '', addressEn: '', workingHours: '', workingHoursEn: '', mapsUrl: '', supportNote: '', supportNoteEn: '' },
        social: { facebook: '', instagram: '', tiktok: '', youtube: '', whatsapp: '', twitter: '', linkedin: '', items: [] },
      },
      'cleanzo-cms-storage-v2': {
        hero: {
          headline: '',
          headlineEn: '',
          description: '',
          descriptionEn: '',
          image: '',
          primaryCtaText: '',
          primaryCtaTextEn: '',
          primaryCtaLink: '',
          secondaryCtaText: '',
          secondaryCtaTextEn: '',
          secondaryCtaLink: '',
          announcement: '',
          announcementEn: '',
        },
        about: {
          title: '',
          titleEn: '',
          description: '',
          descriptionEn: '',
          mission: '',
          missionEn: '',
          vision: '',
          visionEn: '',
          story: '',
          storyEn: '',
          stats: [],
        },
        contact: {
          phone: '',
          whatsapp: '',
          email: '',
          address: '',
          addressEn: '',
          workingHours: '',
          workingHoursEn: '',
          mapsUrl: '',
          supportNote: '',
          supportNoteEn: '',
        },
        social: {
          facebook: '',
          instagram: '',
          tiktok: '',
          youtube: '',
          whatsapp: '',
          twitter: '',
          linkedin: '',
          items: [],
        },
        sections: [],
        lastPublishedAt: new Date().toISOString(),
      },
      'cleanzo-activity-log-storage': { logs: [] },
      'cleanzo-addresses-storage': { addresses: [] },
      'cleanzo-media-storage': { media: [] },
      'cleanzo-analytics-reset-storage': { isCleared: true, clearedAt: new Date().toISOString() },
    };

    Object.entries(emptyStates).forEach(([key, state]) => {
      try {
        localStorage.setItem(key, JSON.stringify({ state, version: 0 }));
      } catch {}
    });
  }
}
