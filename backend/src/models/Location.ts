import mongoose, { Schema, Document } from 'mongoose';

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

export interface ILocationGovernorate extends Document {
  id: string; // e.g. 'minya', 'cairo'
  name: string;
  nameEn: string;
  active: boolean;
  order?: number;
  cities: ICity[];
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema = new Schema<IArea>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  nameEn: { type: String, required: true },
  active: { type: Boolean, default: true },
});

const CitySchema = new Schema<ICity>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  nameEn: { type: String, required: true },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  areas: [AreaSchema],
});

const LocationGovernorateSchema = new Schema<ILocationGovernorate>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameEn: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
    cities: [CitySchema],
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const LocationGovernorate = createPrismaRepository('locationGovernorate') as any;
