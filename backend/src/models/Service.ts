import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IService extends RepositoryRecord {
  id: string; // e.g. 'car-wash-steam'
  category: string;
  subCategory?: string;
  title: string;
  titleEn: string;
  shortDescription: string;
  shortDescriptionEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  price: number;
  originalPrice?: number;
  duration: number; // in minutes (legacy alias)
  serviceDurationMinutes?: number; // actual service duration
  travelTimeMinutes?: number; // technician transit buffer
  totalOccupiedMinutes?: number; // serviceDurationMinutes + travelTimeMinutes
  rating: number;
  reviewCount: number;
  popular: boolean;
  available: boolean;
  isArchived: boolean;
  discount?: number;
  features: string[];
  featuresEn: string[];
  inclusions: string[];
  inclusionsEn: string[];
  importantNotes?: string[];
  importantNotesEn?: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const Service = createPrismaRepository('service') as any;
