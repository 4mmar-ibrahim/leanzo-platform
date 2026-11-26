import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IOffer extends RepositoryRecord {
  id: string; // e.g. 'ramadan-special'
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  discountPercentage: number;
  code: string;
  expiresAt: string; // YYYY-MM-DD
  startDate?: string;
  badge: string;
  badgeEn: string;
  serviceId?: string;
  category?: 'car' | 'home';
  image: string;
  active: boolean;
  isArchived: boolean;
  promoCode?: string;
  usageLimit?: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const Offer = createPrismaRepository('offer') as any;
