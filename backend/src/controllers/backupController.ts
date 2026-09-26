import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { backupService } from '../services/backupService.js';

const tempDir = path.join(process.cwd(), 'storage', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer disk storage for safe handling of large backup archives (up to 300MB)
export const backupUpload = multer({
  dest: tempDir,
  limits: {
    fileSize: 300 * 1024 * 1024,
  },
});

export const getSystemAudit = async (req: Request, res: Response): Promise<void> => {
  try {
    const audit = await backupService.getSystemAudit();
    res.json({
      success: true,
      data: audit,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'فشل فحص قاعدة البيانات وملفات الوسائط',
    });
  }
};

export const listBackups = async (req: Request, res: Response): Promise<void> => {
  try {
    const backups = await backupService.getBackupsList();
    res.json({
      success: true,
      data: backups,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'فشل جلب قائمة النسخ الاحتياطية',
    });
  }
};

export const createBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const { notes, includeMedia, type } = req.body;

    const record = await backupService.createBackup({
      notes,
      includeMedia: includeMedia !== false,
      type,
      createdBy: admin
        ? {
            id: admin.id || admin._id,
            name: admin.name || 'مسؤول النظام',
            role: admin.role || 'admin',
          }
        : undefined,
    });

    res.status(201).json({
      success: true,
      data: record,
      message: 'تم إنشاء النسخة الاحتياطية بنجاح بنسبة تغطية 100% لقاعدة البيانات والوسائط',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'فشلت عملية إنشاء النسخة الاحتياطية',
    });
  }
};

export const downloadBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    const { filePath, filename } = await backupService.getBackupFilePath(id);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.download(filePath, filename);
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'النسخة الاحتياطية المطلوبة غير موجودة للتحميل',
    });
  }
};

export const validateUploadedArchive = async (req: Request, res: Response): Promise<void> => {
  const filePath = req.file?.path;
  try {
    if (!req.file || !filePath) {
      res.status(400).json({
        success: false,
        message: 'يرجى اختيار ملف النسخة الاحتياطية (.zip) للفحص',
      });
      return;
    }

    const validation = await backupService.validateArchive(filePath);
    res.json({
      success: true,
      data: validation,
      message: validation.isValid ? 'تم التحقق من سلامة الأرشيف بنجاح' : 'تم اكتشاف بعض الملاحظات في الأرشيف',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'فشل التحقق من ملف النسخة الاحتياطية',
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup error
      }
    }
  }
};

export const restoreFromDevice = async (req: Request, res: Response): Promise<void> => {
  const filePath = req.file?.path;
  try {
    const admin = (req as any).admin;
    if (admin && admin.role !== 'owner') {
      res.status(403).json({
        success: false,
        message: 'عذراً، استعادة النسخ الاحتياطية تتطلب صلاحيات المالك الأعلى (Owner)',
      });
      return;
    }

    if (!req.file || !filePath) {
      res.status(400).json({
        success: false,
        message: 'يرجى رفع ملف الأرشيف المضغوط (.zip) للاستعادة',
      });
      return;
    }

    const result = await backupService.restoreBackupArchive(
      filePath,
      admin
        ? {
            id: admin.id || admin._id,
            name: admin.name,
            role: admin.role,
          }
        : undefined,
      { originalFilename: req.file.originalname }
    );

    res.json({
      success: true,
      data: result,
      message: 'تمت استعادة النظام بالكامل والتحقق من سلامة البيانات والوسائط بنجاح',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'فشلت عملية استعادة النسخة الاحتياطية من الجهاز',
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup error
      }
    }
  }
};

export const restoreBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);

    if (admin && admin.role !== 'owner') {
      res.status(403).json({
        success: false,
        message: 'عذراً، استعادة النسخ الاحتياطية تتطلب صلاحيات المالك الأعلى (Owner)',
      });
      return;
    }

    const result = await backupService.restoreSavedBackup(
      id,
      admin
        ? {
            id: admin.id || admin._id,
            name: admin.name,
            role: admin.role,
          }
        : undefined
    );

    res.json({
      success: true,
      data: result,
      message: 'تمت استعادة النظام بالكامل بنجاح من النسخة الاحتياطية المحفوظة',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'فشلت عملية استعادة النسخة الاحتياطية',
    });
  }
};

export const deleteBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).admin;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);

    if (admin && admin.role !== 'owner') {
      res.status(403).json({
        success: false,
        message: 'عذراً، حذف النسخ الاحتياطية محصور بصلاحيات المالك الأعلى (Owner)',
      });
      return;
    }

    const result = await backupService.deleteBackup(
      id,
      admin
        ? {
            id: admin.id || admin._id,
            name: admin.name,
            role: admin.role,
          }
        : undefined
    );

    res.json({
      success: true,
      data: result,
      message: 'تم حذف النسخة الاحتياطية بنجاح',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'فشلت عملية حذف النسخة الاحتياطية',
    });
  }
};
