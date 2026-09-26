import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';
import { auditService } from '../services/auditService.js';

/**
 * Retrieves paginated, filtered audit logs with summary KPI statistics
 */
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const {
      module,
      action,
      status,
      actorId,
      actorRole,
      entityType,
      entityId,
      startDate,
      endDate,
      search,
      page = '1',
      limit = '25',
    } = req.query;

    const filter: any = {};

    if (module && module !== 'all') {
      filter.module = module;
    }
    if (action && action !== 'all') {
      filter.action = action;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (actorId && actorId !== 'all') {
      filter.$or = [{ actorId }, { adminId: actorId }];
    }
    if (actorRole && actorRole !== 'all') {
      filter.$or = [{ actorRole }, { adminRole: actorRole }];
    }
    if (entityType && entityType !== 'all') {
      filter.entityType = entityType;
    }
    if (entityId) {
      filter.$or = [{ entityId }, { targetId: entityId }];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Search query across description, actorName, target, details, IP, requestId
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      filter.$or = [
        { description: { $regex: q, $options: 'i' } },
        { actorName: { $regex: q, $options: 'i' } },
        { adminName: { $regex: q, $options: 'i' } },
        { target: { $regex: q, $options: 'i' } },
        { details: { $regex: q, $options: 'i' } },
        { entityId: { $regex: q, $options: 'i' } },
        { ip: { $regex: q, $options: 'i' } },
        { requestId: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total, successCount, warningCount, failedCount, criticalCount] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      AuditLog.countDocuments(filter),
      AuditLog.countDocuments({ ...filter, status: 'success' }),
      AuditLog.countDocuments({ ...filter, status: 'warning' }),
      AuditLog.countDocuments({ ...filter, status: 'failed' }),
      AuditLog.countDocuments({ ...filter, status: 'critical' }),
    ]);

    sendSuccess(res, {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
      summary: {
        total,
        success: successCount,
        warning: warningCount,
        failed: failedCount,
        critical: criticalCount,
      },
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Exports filtered audit logs as a clean UTF-8 BOM CSV spreadsheet
 */
export async function exportAuditLogsCSV(req: Request, res: Response): Promise<void> {
  try {
    const { module, action, status, actorId, actorRole, startDate, endDate, search } = req.query;

    const filter: any = {};
    if (module && module !== 'all') filter.module = module;
    if (action && action !== 'all') filter.action = action;
    if (status && status !== 'all') filter.status = status;
    if (actorId && actorId !== 'all') filter.$or = [{ actorId }, { adminId: actorId }];
    if (actorRole && actorRole !== 'all') filter.$or = [{ actorRole }, { adminRole: actorRole }];

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      filter.$or = [
        { description: { $regex: q, $options: 'i' } },
        { actorName: { $regex: q, $options: 'i' } },
        { target: { $regex: q, $options: 'i' } },
        { entityId: { $regex: q, $options: 'i' } },
      ];
    }

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(5000);

    const headers = [
      'المعرف (Log ID)',
      'التاريخ والوقت',
      'المسؤول (Actor)',
      'الدور الوظيفي',
      'القسم (Module)',
      'نوع الإجراء (Action)',
      'الحالة (Status)',
      'الهدف (Target/Entity)',
      'الوصف البشري (Description)',
      'عنوان IP',
      'الجهاز (User Agent)',
      'معرف الطلب (Request ID)',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = logs.map((l) => [
      escapeCsv(l._id),
      escapeCsv(l.createdAt ? new Date(l.createdAt).toLocaleString('ar-EG', { hour12: false }) : ''),
      escapeCsv(l.actorName || l.adminName || 'System'),
      escapeCsv(l.actorRole || l.adminRole || 'system'),
      escapeCsv(l.module),
      escapeCsv(l.action),
      escapeCsv(l.status),
      escapeCsv(l.target || l.entityId || ''),
      escapeCsv(l.description),
      escapeCsv(l.ip || ''),
      escapeCsv(l.userAgent || ''),
      escapeCsv(l.requestId || ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cleanzo-audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
    );

    res.status(200).send(csvContent);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}

/**
 * Purges older audit logs - STRICTLY restricted to Platform Owner (Immutability guarantee)
 */
export async function purgeAuditLogs(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    if (req.admin?.role !== 'owner') {
      sendError(res, 'غير مصرح: تفريغ سجلات التدقيق محصور بمالك المنصة فقط', 403, 'OWNER_REQUIRED');
      return;
    }

    const { olderThanDays = 30 } = req.body;
    const daysNum = Math.max(1, parseInt(olderThanDays, 10) || 30);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    const matchFilter = { createdAt: { $lt: cutoffDate } };
    const countToDelete = await AuditLog.countDocuments(matchFilter);

    // Log the purge action before deletion
    await auditService.log({
      actorId: req.admin._id.toString(),
      actorName: req.admin.name || req.admin.username,
      actorRole: 'owner',
      action: 'purge_audit_logs',
      module: 'system',
      status: 'critical',
      details: `قام مالك المنصة بتفريغ سجلات التدقيق الأقدم من ${daysNum} يوماً (${countToDelete} سجل)`,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
      userAgent: (req.headers['user-agent'] as string) || 'Unknown Device',
    });

    const result = await AuditLog.deleteMany(matchFilter);

    sendSuccess(
      res,
      {
        deletedCount: result.deletedCount,
        cutoffDate,
      },
      `تم تفريغ ${result.deletedCount} سجلاً أقدم من ${daysNum} يوماً بنجاح`
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
}
