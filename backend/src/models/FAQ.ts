import mongoose, { Schema, Document } from 'mongoose';

export interface IFAQItem extends Document {
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

const FAQItemSchema = new Schema<IFAQItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    category: { type: String, enum: ['car', 'home', 'booking', 'general'], required: true, index: true },
    question: { type: String, required: true },
    questionEn: { type: String, required: true },
    answer: { type: String, required: true },
    answerEn: { type: String, required: true },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const FAQ = createPrismaRepository('fAQ') as any;
