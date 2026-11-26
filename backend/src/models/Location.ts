import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IArea {
  id: string;
  name: string;
  nameEn: string;
  active: boolean;
}

export interface ICity {
  id: string;
  name: string;
  nameEn: string;
  active: boolean;
  order?: number;
  areas: IArea[];
}

export interface ILocationGovernorate extends RepositoryRecord {
  id: string; // e.g. 'minya', 'cairo'
  name: string;
  nameEn: string;
  active: boolean;
  order?: number;
  cities: ICity[];
  createdAt: Date;
  updatedAt: Date;
}

export const LocationGovernorate = createPrismaRepository('locationGovernorate') as any;
