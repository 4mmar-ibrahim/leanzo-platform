import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerAddress extends Document {
  customerId?: mongoose.Types.ObjectId;
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

const CustomerAddressSchema = new Schema<ICustomerAddress>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    customerPhone: { type: String, required: true, trim: true, index: true },
    label: { type: String, default: 'المنزل' },
    governorateId: { type: String, required: true, trim: true, index: true },
    governorateNameSnapshot: { type: String, required: true },
    cityId: { type: String, required: true, trim: true, index: true },
    cityNameSnapshot: { type: String, required: true },
    area: { type: String, required: true, trim: true },
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    apartment: { type: String, trim: true },
    landmark: { type: String, trim: true },
    notes: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CustomerAddressSchema.index({ customerId: 1, isDefault: -1 });
CustomerAddressSchema.index({ customerPhone: 1, isDefault: -1 });

import { createPrismaRepository } from './prismaModelBridge.js';
export const CustomerAddress = createPrismaRepository('customerAddress') as any;
