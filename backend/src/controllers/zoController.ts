import { Request, Response } from 'express';
import { ZoPageConfig, IZoPageConfig } from '../models/ZoPageConfig.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Public Customer Endpoint: Retrieves ONLY published Zo configurations
 */
export async function getPublishedZoConfigs(req: Request, res: Response): Promise<void> {
  try {
    const configs = await ZoPageConfig.find({ isPublished: true, enabled: true });
    const mapped: Record<string, any> = {};
    for (const c of configs) {
      mapped[c.pageId] = c;
    }
    sendSuccess(res, mapped);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getPublishedConfigByPageId(req: Request, res: Response): Promise<void> {
  try {
    const { pageId } = req.params;
    const config = await ZoPageConfig.findOne({ pageId, isPublished: true });
    if (!config) {
      sendError(res, 'إعدادات زو غير منشورة لهذه الصفحة', 404);
      return;
    }
    sendSuccess(res, config);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Admin Endpoints: Full draft & publishing control
 */
export async function getAllZoConfigsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const configs = await ZoPageConfig.find();
    const mapped: Record<string, any> = {};
    for (const c of configs) {
      mapped[c.pageId] = c;
    }
    sendSuccess(res, mapped);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateZoDraftConfig(req: Request, res: Response): Promise<void> {
  try {
    const { pageId } = req.params;
    const updates = req.body;

    let config = await ZoPageConfig.findOne({ pageId });
    if (!config) {
      config = await ZoPageConfig.create({
        pageNameAr: updates.pageNameAr || pageId,
        pageNameEn: updates.pageNameEn || pageId,
        pageCategory: updates.pageCategory || 'main',
        pathPattern: updates.pathPattern || `/${pageId}`,
        character: {
          expression: 'happy',
          pose: 'idle',
          animation: 'idle',
          animationSpeed: 1,
          idleAnimation: true,
          autoBlink: true,
          eyeMovement: true,
          scale: 1,
          rotationY: 0,
          opacity: 1,
          shadow: true,
          glow: true,
          renderMode: '3d_procedural',
          ...(updates.character || {}),
        },
        desktop: {
          horizontal: 'corner-right',
          vertical: 'bottom',
          offsetX: 28,
          offsetY: 28,
          size: 180,
          visible: true,
          ...(updates.desktop || {}),
        },
        tablet: {
          horizontal: 'corner-right',
          vertical: 'bottom',
          offsetX: 20,
          offsetY: 20,
          size: 160,
          visible: true,
          ...(updates.tablet || {}),
        },
        mobile: {
          horizontal: 'corner-right',
          vertical: 'bottom',
          offsetX: 16,
          offsetY: 88,
          size: 140,
          visible: true,
          ...(updates.mobile || {}),
        },
        message: {
          enabled: true,
          title: 'زو',
          titleEn: 'Zo',
          text: '',
          textEn: '',
          bubbleStyle: 'cleanzo_blue',
          fontSize: 'md',
          maxWidth: 290,
          position: 'top-start',
          delay: 500,
          duration: 5000,
          autoHide: true,
          showCloseButton: true,
          playSound: true,
          ...(updates.message || {}),
        },
        behavior: updates.behavior || {},
        triggers: updates.triggers || [],
        draftConfig: updates,
        ...updates,
        pageId,
        isPublished: false,
      });
    } else {
      // Save draft
      config.draftConfig = { ...(config.draftConfig || {}), ...updates };
      // Also update draft fields
      if (updates.character) config.character = { ...config.character, ...updates.character };
      if (updates.desktop) config.desktop = { ...config.desktop, ...updates.desktop };
      if (updates.tablet) config.tablet = { ...config.tablet, ...updates.tablet };
      if (updates.mobile) config.mobile = { ...config.mobile, ...updates.mobile };
      if (updates.message) config.message = { ...config.message, ...updates.message };
      if (updates.behavior) config.behavior = { ...config.behavior, ...updates.behavior };
      if (updates.triggers) config.triggers = updates.triggers;
      if (updates.enabled !== undefined) config.enabled = updates.enabled;

      config.markModified('character');
      config.markModified('draftConfig');
      await config.save();
    }

    sendSuccess(res, config, `تم حفظ مسودة زو لصفحة (${config.pageNameAr || pageId}) بنجاح`);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function publishZoPageConfig(req: Request, res: Response): Promise<void> {
  try {
    const { pageId } = req.params;
    const config = await ZoPageConfig.findOne({ pageId });

    if (!config) {
      sendError(res, 'الصفحة غير موجودة', 404);
      return;
    }

    // Commit any uncommitted draft configuration changes
    if (config.draftConfig) {
      if (config.draftConfig.character) config.character = { ...config.character, ...config.draftConfig.character };
      if (config.draftConfig.desktop) config.desktop = { ...config.desktop, ...config.draftConfig.desktop };
      if (config.draftConfig.tablet) config.tablet = { ...config.tablet, ...config.draftConfig.tablet };
      if (config.draftConfig.mobile) config.mobile = { ...config.mobile, ...config.draftConfig.mobile };
      if (config.draftConfig.message) config.message = { ...config.message, ...config.draftConfig.message };
      if (config.draftConfig.behavior) config.behavior = { ...config.behavior, ...config.draftConfig.behavior };
      if (config.draftConfig.triggers) config.triggers = config.draftConfig.triggers;
      if (config.draftConfig.enabled !== undefined) config.enabled = config.draftConfig.enabled;
    }

    config.isPublished = true;
    config.publishedAt = new Date();
    config.markModified('character');
    await config.save();

    sendSuccess(res, config, `تم نشر إعدادات زو لصفحة (${config.pageNameAr}) بنجاح وتحديث الموقع فورياً!`);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function publishAllZoPages(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const { character, configs: batchConfigs } = req.body || {};
    const configs = await ZoPageConfig.find();
    
    for (const config of configs) {
      if (character) {
        config.character = { ...config.character, ...character };
      }
      if (batchConfigs && batchConfigs[config.pageId]) {
        const pageUpdates = batchConfigs[config.pageId];
        if (pageUpdates.character) config.character = { ...config.character, ...pageUpdates.character };
        if (pageUpdates.desktop) config.desktop = { ...config.desktop, ...pageUpdates.desktop };
        if (pageUpdates.tablet) config.tablet = { ...config.tablet, ...pageUpdates.tablet };
        if (pageUpdates.mobile) config.mobile = { ...config.mobile, ...pageUpdates.mobile };
        if (pageUpdates.message) config.message = { ...config.message, ...pageUpdates.message };
        if (pageUpdates.behavior) config.behavior = { ...config.behavior, ...pageUpdates.behavior };
        if (pageUpdates.triggers) config.triggers = pageUpdates.triggers;
        if (pageUpdates.enabled !== undefined) config.enabled = pageUpdates.enabled;
      }
      if (config.draftConfig) {
        if (config.draftConfig.character) config.character = { ...config.character, ...config.draftConfig.character };
        if (config.draftConfig.desktop) config.desktop = { ...config.desktop, ...config.draftConfig.desktop };
        if (config.draftConfig.tablet) config.tablet = { ...config.tablet, ...config.draftConfig.tablet };
        if (config.draftConfig.mobile) config.mobile = { ...config.mobile, ...config.draftConfig.mobile };
        if (config.draftConfig.message) config.message = { ...config.message, ...config.draftConfig.message };
        if (config.draftConfig.behavior) config.behavior = { ...config.behavior, ...config.draftConfig.behavior };
        if (config.draftConfig.triggers) config.triggers = config.draftConfig.triggers;
        if (config.draftConfig.enabled !== undefined) config.enabled = config.draftConfig.enabled;
      }
      config.isPublished = true;
      config.publishedAt = now;
      config.markModified('character');
      await config.save();
    }

    sendSuccess(res, null, 'تم نشر إعدادات زو لكافة صفحات الموقع فورياً!');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
