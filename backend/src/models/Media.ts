import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IMedia extends RepositoryRecord {
  id: string;
  originalName: string;
  fileName: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  source: 'device' | 'url';
  sourceUrl?: string;
  storagePath: string;
  url: string;
  isArchived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const Media = createPrismaRepository('media') as any;
export default Media;
