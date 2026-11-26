import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IAboutContent extends RepositoryRecord {
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  mission: string;
  missionEn: string;
  vision: string;
  visionEn: string;
  story: string;
  storyEn: string;
  stats: Array<{ id: string; label: string; labelEn: string; value: string }>;
  features: Array<{ id: string; title: string; titleEn: string; description: string; descriptionEn: string; icon: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export const AboutContent = createPrismaRepository('aboutContent') as any;
