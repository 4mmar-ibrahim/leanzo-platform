import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export type BackupStatus = 'completed' | 'in_progress' | 'failed' | 'restoring';
export type BackupType = 'full' | 'database_only' | 'pre_restore';

export interface IBackupRecord extends RepositoryRecord {
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

export const BackupRecord = createPrismaRepository('backupRecord') as any;
