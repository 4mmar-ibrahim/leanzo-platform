import mongoose, { Schema, Document } from 'mongoose';

export interface IEncryptionLog extends Document {
  id: string;
  timestamp: Date;
  status: 'success' | 'failed';
  algorithm: string;
  totalRecordsEncrypted: number;
  breakdown: {
    customers: number;
    orders: number;
    messages: number;
    addresses: number;
  };
  errorMessage?: string;
  initiatedBy: string;
}

const EncryptionLogSchema = new Schema<IEncryptionLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    algorithm: { type: String, default: 'AES-256-GCM' },
    totalRecordsEncrypted: { type: Number, default: 0 },
    breakdown: {
      customers: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      messages: { type: Number, default: 0 },
      addresses: { type: Number, default: 0 },
    },
    errorMessage: { type: String },
    initiatedBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const EncryptionLog = createPrismaRepository('encryptionLog') as any;
