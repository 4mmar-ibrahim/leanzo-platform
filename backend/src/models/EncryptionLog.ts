import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IEncryptionLog extends RepositoryRecord {
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

export const EncryptionLog = createPrismaRepository('encryptionLog') as any;
