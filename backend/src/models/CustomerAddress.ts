import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface ICustomerAddress extends RepositoryRecord {
  customerId?: string;
  customerPhone: string;
  label: string; // e.g. 'المنزل', 'العمل'
  governorateId: string;
  governorateNameSnapshot: string;
  cityId: string;
  cityNameSnapshot: string;
  area: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  notes?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CustomerAddress = createPrismaRepository('customerAddress') as any;
