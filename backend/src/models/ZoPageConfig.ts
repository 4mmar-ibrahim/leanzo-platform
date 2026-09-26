import mongoose, { Schema, Document } from 'mongoose';

export interface IZoPageConfig extends Document {
  pageId: string;
  pageNameAr: string;
  pageNameEn: string;
  pageCategory: string;
  pathPattern: string;
  enabled: boolean;
  isPublished: boolean;
  publishedAt?: Date;
  character: {
    expression: string;
    pose: string;
    animation: string;
    animationSpeed: number;
    idleAnimation: boolean;
    autoBlink: boolean;
    eyeMovement: boolean;
    scale: number;
    rotationY: number;
    opacity: number;
    shadow: boolean;
    glow: boolean;
    customImage?: string;
    customImageName?: string;
    customImageDepth?: number;
    renderMode?: string;
    originalImageUrl?: string;
    originalFilename?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    fileSize?: number;
    animationPreset?: string;
    animationIntensity?: number;
    versionTimestamp?: number;
  };
  desktop: {
    horizontal: string;
    vertical: string;
    offsetX: number;
    offsetY: number;
    size: number;
    visible: boolean;
  };
  tablet: {
    horizontal: string;
    vertical: string;
    offsetX: number;
    offsetY: number;
    size: number;
    visible: boolean;
  };
  mobile: {
    horizontal: string;
    vertical: string;
    offsetX: number;
    offsetY: number;
    size: number;
    visible: boolean;
  };
  message: {
    enabled: boolean;
    title: string;
    titleEn: string;
    text: string;
    textEn: string;
    bubbleStyle: string;
    fontSize: string;
    maxWidth: number;
    position: string;
    delay: number;
    duration: number;
    autoHide: boolean;
    showCloseButton: boolean;
    playSound: boolean;
  };
  behavior: {
    interactive: boolean;
    lookAtCursor: boolean;
    respectDismissal: boolean;
    soundEffects: boolean;
  };
  triggers: Array<{
    id: string;
    eventType: string;
    conditionKey?: string;
    priority: number;
    expression: string;
    pose: string;
    animation?: string;
    message?: string;
    messageEn?: string;
    delay?: number;
    enabled: boolean;
  }>;
  draftConfig?: any; // Stored uncommitted draft for admin preview
  createdAt: Date;
  updatedAt: Date;
}

const ZoPageConfigSchema = new Schema<IZoPageConfig>(
  {
    pageId: { type: String, required: true, unique: true, index: true },
    pageNameAr: { type: String, required: true },
    pageNameEn: { type: String, required: true },
    pageCategory: { type: String, required: true },
    pathPattern: { type: String, required: true },
    enabled: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date },
    character: { type: Schema.Types.Mixed, required: true },
    desktop: { type: Schema.Types.Mixed, required: true },
    tablet: { type: Schema.Types.Mixed, required: true },
    mobile: { type: Schema.Types.Mixed, required: true },
    message: { type: Schema.Types.Mixed, required: true },
    behavior: { type: Schema.Types.Mixed, default: {} },
    triggers: [{ type: Schema.Types.Mixed }],
    draftConfig: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const ZoPageConfig = createPrismaRepository('zoPageConfig') as any;
