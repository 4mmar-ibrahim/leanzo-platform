import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IFAQItem extends RepositoryRecord {
  id: string;
  category: 'car' | 'home' | 'booking' | 'general';
  question: string;
  questionEn: string;
  answer: string;
  answerEn: string;
  order: number;
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const FAQ = createPrismaRepository('fAQ') as any;
