import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export type GalleryDisplayMode =
  | 'featured_hero'
  | 'editorial'
  | 'before_after'
  | 'horizontal_slider'
  | 'full_width'
  | 'standard_card';

export interface IPortfolioItem extends RepositoryRecord {
  id: string;
  title: string;
  titleEn: string;
  category: 'car' | 'home';
  subCategory: string;
  image: string;
  beforeImage?: string;
  afterImage?: string;
  description: string;
  descriptionEn: string;
  displayMode: GalleryDisplayMode;
  featured: boolean;
  homepageFeatured: boolean;
  mobileFeatured: boolean;
  sortOrder: number;
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PortfolioItem = createPrismaRepository('portfolioItem') as any;
