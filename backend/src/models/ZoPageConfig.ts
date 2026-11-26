import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface IZoPageConfig extends RepositoryRecord {
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

export const ZoPageConfig = createPrismaRepository('zoPageConfig') as any;
