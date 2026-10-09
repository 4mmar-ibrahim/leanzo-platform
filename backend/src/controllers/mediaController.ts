import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { Media, IMedia } from '../models/Media.js';
import { validateMediaBuffer, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '../utils/mediaValidator.js';
import { safeFetchMedia } from '../utils/ssrfProtection.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';

// Setup directories for uploads
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const IMAGES_DIR = path.join(UPLOAD_ROOT, 'images');
const VIDEOS_DIR = path.join(UPLOAD_ROOT, 'videos');

// Ensure upload folders exist
try {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
} catch (err) {
  console.error('Failed to initialize uploads directories:', err);
}

// Multer memory storage configuration (inspected in memory before saving to disk)
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_VIDEO_SIZE, // 100MB top bound
  },
});

/**
 * Handle Device Upload (Image or Video)
 */
export async function uploadDeviceMedia(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 'يرجى اختيار ملف للرفع', 400, 'NO_FILE_PROVIDED');
      return;
    }

    const validation = validateMediaBuffer(file.buffer);
    if (!validation.isValid) {
      sendError(
        res,
        'الملف المرفوع غير مدعوم أو تالف. يرجى التأكد من رفع صورة (JPEG, PNG, WEBP, GIF) أو فيديو (MP4, WEBM) سليم',
        422,
        validation.error || 'INVALID_FILE_SIGNATURE'
      );
      return;
    }

    // Enforce size limits per type
    if (validation.type === 'image' && file.size > MAX_IMAGE_SIZE) {
      sendError(res, `حجم الصورة يتجاوز الحد الأقصى المسموح به (${MAX_IMAGE_SIZE / (1024 * 1024)}MB)`, 413, 'IMAGE_TOO_LARGE');
      return;
    }
    if (validation.type === 'video' && file.size > MAX_VIDEO_SIZE) {
      sendError(res, `حجم الفيديو يتجاوز الحد الأقصى المسموح به (${MAX_VIDEO_SIZE / (1024 * 1024)}MB)`, 413, 'VIDEO_TOO_LARGE');
      return;
    }

    // Generate unique stable filenames
    const mediaId = `med_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._\-]/g, '_');
    const fileName = `${mediaId}_${cleanOriginalName.slice(0, 30)}.${validation.extension}`;

    const targetDir = validation.type === 'video' ? VIDEOS_DIR : IMAGES_DIR;
    const filePath = path.join(targetDir, fileName);
    const relativeUrl = `/uploads/${validation.type === 'video' ? 'videos' : 'images'}/${fileName}`;

    // Write file to physical storage without lossy re-encoding to preserve full quality
    await fs.promises.writeFile(filePath, file.buffer);

    const mediaDoc = await Media.create({
      id: mediaId,
      originalName: file.originalname || fileName,
      fileName,
      type: validation.type,
      mimeType: validation.mimeType,
      size: file.size,
      width: validation.width,
      height: validation.height,
      source: 'device',
      storagePath: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
      url: relativeUrl,
      isArchived: false,
      createdBy: req.admin?.username || 'admin',
    });

    sendSuccess(res, mediaDoc, 'تم رفع الوسائط وتخزينها بنجاح', 201);
  } catch (err: any) {
    console.error('Device upload failed:', err);
    sendError(res, err.message || 'حدث خطأ أثناء معالجة رفع الملف', 500, 'UPLOAD_ERROR');
  }
}

/**
 * Handle Remote URL Import (with SSRF Defense & Magic Byte Check)
 */
export async function importUrlMedia(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { url, type } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      sendError(res, 'يرجى تقديم رابط صالح للاستيراد', 400, 'MISSING_URL');
      return;
    }

    const targetUrl = url.trim();

    // 1. Safe remote fetch protected against SSRF & DOS
    let fetchResult;
    try {
      fetchResult = await safeFetchMedia(targetUrl, MAX_VIDEO_SIZE);
    } catch (fetchErr: any) {
      const errMsg = fetchErr.message || '';
      if (errMsg.includes('SSRF_PROTECTION_TRIGGERED') || errMsg.includes('SSRF_BLOCKED')) {
        sendError(res, 'تم حظر الرابط لأسباب أمنية: لا يمكن استيراد وسائط من عناوين داخلية أو خوادم محلية', 400, 'SSRF_BLOCKED');
        return;
      }
      if (errMsg.includes('UNSUPPORTED_PROTOCOL')) {
        sendError(res, 'بروتوكول الرابط غير مدعوم. يرجى استخدام http أو https فقط', 400, 'INVALID_PROTOCOL');
        return;
      }
      if (errMsg.includes('FILE_TOO_LARGE')) {
        sendError(res, 'حجم الملف في الرابط يتجاوز الحد الأقصى المسموح به', 413, 'FILE_TOO_LARGE');
        return;
      }
      sendError(res, `فشل الاتصال بالرابط المطلوب: ${errMsg}`, 400, 'REMOTE_FETCH_FAILED');
      return;
    }

    // 2. Validate binary magic bytes from fetched buffer
    const validation = validateMediaBuffer(fetchResult.buffer, type, fetchResult.contentType);
    if (!validation.isValid) {
      sendError(
        res,
        'المحتوى المستورد من الرابط ليس وسائط صالحة أو صيغة غير مدعومة',
        422,
        validation.error || 'INVALID_REMOTE_MEDIA'
      );
      return;
    }

    // Check size limit per verified type
    if (validation.type === 'image' && fetchResult.buffer.length > MAX_IMAGE_SIZE) {
      sendError(res, `حجم الصورة يتجاوز الحد الأقصى المسموح (${MAX_IMAGE_SIZE / (1024 * 1024)}MB)`, 413, 'IMAGE_TOO_LARGE');
      return;
    }

    // 3. Extract or synthesize a clean name
    let baseName = 'remote_media';
    try {
      const parsed = new URL(targetUrl);
      const urlBase = path.basename(parsed.pathname);
      if (urlBase && urlBase.includes('.')) {
        baseName = urlBase.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
      }
    } catch {
      // fallback
    }

    const mediaId = `med_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const fileName = `${mediaId}_${baseName.slice(0, 30)}.${validation.extension}`;
    const targetDir = validation.type === 'video' ? VIDEOS_DIR : IMAGES_DIR;
    const filePath = path.join(targetDir, fileName);
    const relativeUrl = `/uploads/${validation.type === 'video' ? 'videos' : 'images'}/${fileName}`;

    // 4. Save to persistent storage without compression
    await fs.promises.writeFile(filePath, fetchResult.buffer);

    // 5. Store metadata in database
    const mediaDoc = await Media.create({
      id: mediaId,
      originalName: `${baseName}.${validation.extension}`,
      fileName,
      type: validation.type,
      mimeType: validation.mimeType,
      size: fetchResult.buffer.length,
      width: validation.width,
      height: validation.height,
      source: 'url',
      storagePath: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
      url: relativeUrl,
      isArchived: false,
      createdBy: req.admin?.username || 'admin',
    });

    sendSuccess(res, mediaDoc, 'تم استيراد الوسائط من الرابط وتخزينها بنجاح', 201);
  } catch (err: any) {
    console.error('URL import failed:', err);
    sendError(res, err.message || 'حدث خطأ أثناء استيراد الوسائط من الرابط', 500, 'IMPORT_ERROR');
  }
}

/**
 * Get All Media (Paginated + Filter + Search)
 */
export async function getAllMedia(req: Request, res: Response): Promise<void> {
  try {
    const { type, search, page = '1', limit = '30' } = req.query;

    const query: any = { isArchived: { $ne: true } };

    if (type === 'image' || type === 'video') {
      query.type = type;
    }

    if (search && typeof search === 'string' && search.trim()) {
      query.originalName = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Media.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Media.countDocuments(query),
    ]);

    // Aggregate statistics across library
    const [imagesCount, videosCount, allMediaForStats] = await Promise.all([
      Media.countDocuments({ isArchived: { $ne: true }, type: 'image' }),
      Media.countDocuments({ isArchived: { $ne: true }, type: 'video' }),
      Media.find({ isArchived: { $ne: true } }).lean(),
    ]);

    const totalBytes = (allMediaForStats as any[]).reduce((sum: number, m: any) => sum + (Number(m.size) || 0), 0);

    sendSuccess(res, {
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      stats: {
        totalItems: imagesCount + videosCount,
        imagesCount,
        videosCount,
        totalBytes,
      },
    });
  } catch (err: any) {
    console.error('Get media list failed:', err);
    sendError(res, 'فشل جلب ملفات الوسائط', 500, 'FETCH_ERROR');
  }
}

/**
 * Get Media By ID
 */
export async function getMediaById(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : String(rawId);
    const media = await Media.findOne({
      $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      isArchived: { $ne: true },
    });

    if (!media) {
      sendError(res, 'الملف المطلوب غير موجود', 404, 'MEDIA_NOT_FOUND');
      return;
    }

    sendSuccess(res, media);
  } catch (err: any) {
    sendError(res, 'خطأ أثناء جلب تفاصيل الوسائط', 500, 'FETCH_ERROR');
  }
}

/**
 * Delete / Archive Media
 */
export async function deleteMedia(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : String(rawId);
    const media = await Media.findOne({
      $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });


    if (!media) {
      sendError(res, 'الملف المطلوب غير موجود', 404, 'MEDIA_NOT_FOUND');
      return;
    }

    // Soft delete/archive to avoid breaking pages referencing this URL
    media.isArchived = true;
    await media.save();

    // Optionally try to delete physical file if strictly archived
    const fullPath = path.join(process.cwd(), media.storagePath);
    if (fs.existsSync(fullPath)) {
      try {
        await fs.promises.unlink(fullPath);
      } catch (unlinkErr) {
        console.warn('Physical file deletion deferred:', unlinkErr);
      }
    }

    sendSuccess(res, { id: media.id }, 'تم حذف ملف الوسائط بنجاح');
  } catch (err: any) {
    console.error('Delete media failed:', err);
    sendError(res, 'فشل حذف ملف الوسائط', 500, 'DELETE_ERROR');
  }
}
