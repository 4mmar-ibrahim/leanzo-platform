import { Response, NextFunction } from 'express';
import { AuthenticatedAdminRequest } from './adminAuthMiddleware.js';
import { auditService } from '../services/auditService.js';
import { AuditLogStatus } from '../models/AuditLog.js';

export function recordAuditLog(action: string, module: string, options?: { entityType?: string }) {
  return async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req.headers['x-request-id'] as string) ||
      `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    (req as any).requestId = requestId;

    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      const statusCode = res.statusCode || 200;

      // Only log if admin is authenticated or actor is known
      const actor = req.admin;
      if (actor) {
        let status: AuditLogStatus = 'success';
        if (statusCode >= 500) status = 'critical';
        else if (statusCode >= 400) status = 'warning';

        const clientIp =
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.ip ||
          req.socket?.remoteAddress ||
          '127.0.0.1';

        const userAgent = (req.headers['user-agent'] as string) || 'Unknown Device';

        const entityId =
          (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ||
          req.body?.id ||
          req.body?.code ||
          body?.data?.id ||
          body?.data?._id?.toString() ||
          body?.id;
        const targetName =
          (req as any).auditTarget ||
          req.body?.nameAr ||
          req.body?.name ||
          req.body?.title ||
          req.body?.code ||
          entityId ||
          req.originalUrl;

        // Custom before and after diffs attached by controller if any
        const before = (req as any).auditBefore;
        const after = (req as any).auditAfter || (statusCode < 300 ? body?.data || req.body : undefined);

        auditService.log({
          actorId: actor._id.toString(),
          actorName: actor.name || actor.username || 'مشرف',
          actorRole: actor.role || 'manager',
          action: (req as any).auditAction || action,
          module,
          entityType: options?.entityType,
          entityId,
          target: targetName,
          status,
          before,
          after,
          ip: clientIp,
          userAgent,
          requestId,
          metadata: {
            method: req.method,
            path: req.originalUrl,
            statusCode,
            query: req.query,
          },
        });
      }

      return originalJson(body);
    };

    next();
  };
}

