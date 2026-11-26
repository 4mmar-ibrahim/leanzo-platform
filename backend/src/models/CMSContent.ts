import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface ICMSActionButton {
  id: string;
  label: string;
  labelEn?: string;
  enabled: boolean;
  destinationType: 'internal' | 'booking' | 'services' | 'category' | 'service' | 'section' | 'external';
  destinationValue: string;
  order?: number;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface ICMSContent extends RepositoryRecord {
  status: 'draft' | 'published';
  version: number;
  hero: {
    headline: string;
    headlineEn: string;
    description: string;
    descriptionEn: string;
    image: string;
    carImage?: string;
    homeImage?: string;
    primaryCtaText: string;
    primaryCtaTextEn: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaTextEn: string;
    secondaryCtaLink: string;
    announcement: string;
    announcementEn: string;
    actionButtons?: ICMSActionButton[];
  };
  about: {
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    mission: string;
    missionEn: string;
    vision: string;
    visionEn: string;
    story: string;
    storyEn: string;
    stats: Array<{ id: string; label: string; labelEn: string; value: string }>;
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    addressEn: string;
    workingHours: string;
    workingHoursEn: string;
    mapsUrl: string;
    supportNote: string;
    supportNoteEn: string;
  };
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    whatsapp: string;
    twitter: string;
    linkedin: string;
    items?: any[];
    [key: string]: any;
  };
  sections: Array<{
    id: string;
    key: string;
    nameAr: string;
    nameEn: string;
    visible: boolean;
  }>;
  lastPublishedAt?: Date;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CMSContent = createPrismaRepository('cMSContent') as any;
export default CMSContent;
