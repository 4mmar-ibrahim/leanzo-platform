import { createPrismaRepository } from './prismaModelBridge.js';

export interface IServicePackage {
  id: string;
  serviceId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  originalPrice?: number;
  durationMinutes: number;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const ServicePackage = createPrismaRepository('servicePackage') as any;
