import mongoose, { Schema, Document } from 'mongoose';

export type BackupStatus = 'completed' | 'in_progress' | 'failed' | 'restoring';
export type BackupType = 'full' | 'database_only' | 'pre_restore';

export interface IBackupRecord extends Document {
  id: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  status: BackupStatus;
  type: BackupType;
  collectionsCount: number;
  documentsCount: number;
  mediaCount: number;
  checksum: string;
  notes?: string;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  error?: string;
  manifest?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const BackupRecordSchema = new Schema<IBackupRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    filename: { type: String, required: true },
    sizeBytes: { type: Number, default: 0 },
    sizeFormatted: { type: String, default: '0 KB' },
    status: {
      type: String,
      enum: ['completed', 'in_progress', 'failed', 'restoring'],
      default: 'in_progress',
      index: true,
    },
    type: {
      type: String,
      enum: ['full', 'database_only', 'pre_restore'],
      default: 'full',
      index: true,
    },
    collectionsCount: { type: Number, default: 0 },
    documentsCount: { type: Number, default: 0 },
    mediaCount: { type: Number, default: 0 },
    checksum: { type: String, default: '' },
    notes: { type: String },
    createdBy: {
      id: { type: String, default: 'system' },
      name: { type: String, default: 'المسؤول' },
      role: { type: String, default: 'admin' },
    },
    error: { type: String },
    manifest: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

BackupRecordSchema.index({ createdAt: -1 });

import { createPrismaRepository } from './prismaModelBridge.js';
export const BackupRecord = createPrismaRepository('backupRecord') as any;
