import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IReview extends RepositoryRecord {
  id: string;
  customerName: string;
  customerNameEn?: string;
  avatar?: string;
  image?: string;
  rating?: number;
  date?: string;
  comment: string;
  commentEn?: string;
  serviceName: string;
  serviceNameEn?: string;
  category: 'car' | 'home';
  verified: boolean;
  visible: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const ReviewModel = createPrismaRepository('review') as any;
export default ReviewModel;
