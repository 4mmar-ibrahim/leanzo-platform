import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IServiceCategory extends RepositoryRecord {
  id: string; // 'car' | 'home' or slug
  slug: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  icon?: string;
  image?: string;
  active: boolean;
  order: number;
}

export const ServiceCategory = createPrismaRepository('serviceCategory') as any;
