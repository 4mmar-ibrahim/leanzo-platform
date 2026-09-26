import { createPrismaRepository } from './prismaModelBridge.js';

export interface IServiceAddon {
  id: string;
  serviceId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  durationMinutes: number;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const ServiceAddon = createPrismaRepository('serviceAddon') as any;
