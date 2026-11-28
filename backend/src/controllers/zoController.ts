import { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma, { inDatabaseTransaction } from '../config/prisma.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const configFields = [
  'pageNameAr', 'pageNameEn', 'pageCategory', 'pathPattern', 'enabled',
  'character', 'desktop', 'tablet', 'mobile', 'message', 'behavior', 'triggers',
] as const;

function pageSettings(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const settings = value as Prisma.InputJsonObject;
  return Object.fromEntries(configFields.filter(key => settings[key] !== undefined).map(key => [key, settings[key]]));
}

export async function getPublishedZoConfigs(req: Request, res: Response): Promise<void> {
  try {
    const configs = await prisma.zoPageConfig.findMany({ where: { isPublished: true }, omit: { draftConfig: true } });
    res.set('Cache-Control', 'no-store');
    sendSuccess(res, Object.fromEntries(configs.map(config => [config.pageId, config])));
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getPublishedConfigByPageId(req: Request, res: Response): Promise<void> {
  try {
    const config = await prisma.zoPageConfig.findUnique({
      where: { pageId: String(req.params.pageId), isPublished: true },
      omit: { draftConfig: true },
    });
    if (!config) {
      sendError(res, 'إعدادات زو غير منشورة لهذه الصفحة', 404);
      return;
    }
    res.set('Cache-Control', 'no-store');
    sendSuccess(res, config);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function getAllZoConfigsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const configs = await prisma.zoPageConfig.findMany();
    sendSuccess(res, Object.fromEntries(configs.map(config => [config.pageId, config])));
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function updateZoDraftConfig(req: Request, res: Response): Promise<void> {
  try {
    const pageId = String(req.params.pageId);
    const current = await prisma.zoPageConfig.findUnique({ where: { pageId } });
    const draftConfig = { ...pageSettings(current?.draftConfig), ...pageSettings(req.body) };
    const config = await prisma.zoPageConfig.upsert({
      where: { pageId },
      create: { pageId, draftConfig },
      update: { draftConfig },
    });
    sendSuccess(res, config, 'تم حفظ مسودة زو');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function publishZoPageConfig(req: Request, res: Response): Promise<void> {
  try {
    const pageId = String(req.params.pageId);
    const config = await prisma.zoPageConfig.findUnique({ where: { pageId } });
    if (!config) {
      sendError(res, 'الصفحة غير موجودة', 404);
      return;
    }
    const published = await prisma.zoPageConfig.update({
      where: { pageId, updatedAt: config.updatedAt },
      data: { ...pageSettings(config.draftConfig), isPublished: true, publishedAt: new Date() },
      omit: { draftConfig: true },
    });
    sendSuccess(res, published, 'تم نشر إعدادات زو للصفحة');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

export async function publishAllZoPages(req: Request, res: Response): Promise<void> {
  try {
    const { character, configs } = req.body || {};
    const publishedAt = new Date();
    const published = await inDatabaseTransaction(async tx => {
      const current = await tx.zoPageConfig.findMany();
      const pages = new Map(current.map(config => [config.pageId, config]));
      const pageIds = [...new Set([...pages.keys(), ...Object.keys(configs || {})])].sort();
      return Promise.all(pageIds.map(pageId => {
        const page = pages.get(pageId);
        const draftConfig = {
          ...pageSettings(page?.draftConfig),
          ...(character ? { character } : {}),
          ...pageSettings(configs?.[pageId]),
        };
        const data = { ...draftConfig, draftConfig, isPublished: true, publishedAt };
        return tx.zoPageConfig.upsert({ where: { pageId }, create: { pageId, ...data }, update: data, omit: { draftConfig: true } });
      }));
    });
    sendSuccess(res, Object.fromEntries(published.map(config => [config.pageId, config])), 'تم نشر إعدادات زو لجميع الصفحات');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
