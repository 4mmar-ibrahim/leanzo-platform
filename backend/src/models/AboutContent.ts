import mongoose, { Schema, Document } from 'mongoose';

export interface IAboutContent extends Document {
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

const AboutContentSchema = new Schema<IAboutContent>(
  {
    title: { type: String, required: true, default: 'من نحن - كلينزو' },
    titleEn: { type: String, required: true, default: 'About Us - Cleanzo' },
    description: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    mission: { type: String, default: '' },
    missionEn: { type: String, default: '' },
    vision: { type: String, default: '' },
    visionEn: { type: String, default: '' },
    story: { type: String, default: '' },
    storyEn: { type: String, default: '' },
    stats: [
      {
        id: String,
        label: String,
        labelEn: String,
        value: String,
      },
    ],
    features: [
      {
        id: String,
        title: String,
        titleEn: String,
        description: String,
        descriptionEn: String,
        icon: String,
      },
    ],
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const AboutContent = createPrismaRepository('aboutContent') as any;
