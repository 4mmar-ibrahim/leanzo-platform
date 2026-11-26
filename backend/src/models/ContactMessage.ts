import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export type ContactStatus = 'new' | 'read' | 'replied' | 'closed';

export interface IContactMessage extends RepositoryRecord {
  name: string;
  phone: string;
  email?: string;
  message: string;
  source: string;
  status: ContactStatus;
  ip?: string;
  replyNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ContactMessage = createPrismaRepository('contactMessage') as any;
