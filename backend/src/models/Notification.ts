import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface INotification extends RepositoryRecord {
  target: 'admin' | 'customer';
  userId?: string; // If customer specific
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type: 'order' | 'customer' | 'system' | 'technician' | 'offer' | 'info';
  read: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const Notification = createPrismaRepository('notification') as any;
