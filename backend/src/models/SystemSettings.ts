import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  key: string; // 'global_settings'
  general: {
    companyName: string;
    companyNameEn: string;
    defaultLanguage: 'ar' | 'en';
    currency: string;
    currencyEn: string;
    timezone: string;
  };
  booking: {
    workingDays: number[];
    workingHoursStart: string; // "09:00"
    workingHoursEnd: string;   // "22:00"
    breakStart?: string;
    breakEnd?: string;
    slotDuration: number;      // 60 minutes
    slotInterval: number;      // 60 minutes
    bufferTime: number;        // 15 minutes
    maxBookingsPerSlot: number;
    advanceBookingDays: number;
    minNoticeHours: number;
    sameDayBooking: boolean;
    blockedDates: string[];
    holidays: Array<{ date: string; name: string }>;
  };
  appearance: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    defaultTheme: 'light' | 'dark' | 'system';
    siteTitle: string;
    siteTitleEn: string;
    siteDescription: string;
    siteDescriptionEn: string;
    logoText: string;
  };
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    whatsapp: string;
    twitter: string;
    linkedin: string;
  };
  branding: {
    logoText: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    heroImages: {
      car: string;
      home: string;
    };
    ctaText: string;
    ctaTextEn: string;
    footerText: string;
    footerTextEn: string;
    topBanner: {
      enabled: boolean;
      text: string;
      textEn: string;
      discountBadge: string;
      link: string;
      bgColor: string;
    };
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  notifications: {
    emailAlerts: boolean;
    whatsappAlerts: boolean;
    browserAlerts: boolean;
    orderCreatedNotify: boolean;
    orderCancelledNotify: boolean;
    newCustomerNotify: boolean;
  };
  mobileExperience?: any;
  security?: {
    isEncrypted: boolean;
    lastEncryptedAt: Date | null;
    algorithm: string;
    totalRecordsEncrypted: number;
    breakdown: {
      customers: number;
      orders: number;
      messages: number;
      addresses: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: { type: String, required: true, unique: true, default: 'global_settings', index: true },
    general: { type: Schema.Types.Mixed, default: {} },
    booking: { type: Schema.Types.Mixed, default: {} },
    appearance: { type: Schema.Types.Mixed, default: {} },
    social: { type: Schema.Types.Mixed, default: {} },
    branding: { type: Schema.Types.Mixed, default: {} },
    notifications: { type: Schema.Types.Mixed, default: {} },
    mobileExperience: { type: Schema.Types.Mixed, default: {} },
    security: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const SystemSettings = createPrismaRepository('systemSettings') as any;
