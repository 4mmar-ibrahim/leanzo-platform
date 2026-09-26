import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAdminToken, AdminTokenPayload } from '../utils/jwt.js';
import { sendError } from '../utils/responseHandler.js';
import { AdminUser, IAdminUser, PermissionLevel } from '../models/AdminUser.js';
import { Role, PermissionModule, PermissionAction, getDefaultRolePermissions } from '../models/Role.js';
import { Technician } from '../models/Technician.js';
import { ENV } from '../config/env.js';

export interface AuthenticatedAdminRequest extends Request {
  admin?: IAdminUser;
  adminToken?: AdminTokenPayload;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, str) => {
    const [key, ...v] = str.trim().split('=');
    if (key) acc[key] = decodeURIComponent(v.join('='));
    return acc;
  }, {} as Record<string, string>);
}

export async function authenticateAdmin(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Fallback to cookie if Bearer header is missing
  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies['cleanzo_admin_token'] || (req as any).cookies?.cleanzo_admin_token || null;
  }

  if (!token) {
    sendError(res, 'غير مصرح: يلزم تسجيل دخول المشرف', 401, 'ADMIN_UNAUTHORIZED');
    return;
  }

  // Verify JWT token signature strictly
  try {
    let decoded: any;
    try {
      decoded = verifyAdminToken(token);
    } catch (verifyErr: any) {
      if (verifyErr?.name === 'TokenExpiredError') {
        sendError(
          res,
          'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
          401,
          'TOKEN_EXPIRED'
        );
        return;
      }
      sendError(res, 'رمز جلسة المشرف غير صالح أو منتهي الصلاحية', 401, 'INVALID_ADMIN_TOKEN');
      return;
    }

    if (!decoded || decoded.type !== 'admin') {
      sendError(res, 'جلسة المشرف غير صالحة', 401, 'INVALID_ADMIN_TOKEN');
      return;
    }

    let admin = decoded.id ? await AdminUser.findById(decoded.id) : null;
    if (!admin && decoded.username) {
      // In case database was re-seeded with fresh ObjectIds
      admin = await AdminUser.findOne({ username: decoded.username });
    }
    if (!admin && (decoded.role === 'owner' || decoded.role === 'super_admin')) {
      admin = await AdminUser.findOne({ role: 'owner' });
    }

    if (!admin) {
      sendError(res, 'حساب المشرف غير موجود', 401, 'ADMIN_NOT_FOUND');
      return;
    }

    if (admin.status !== 'active') {
      sendError(res, 'تم تعطيل حساب هذا المشرف', 403, 'ADMIN_INACTIVE');
      return;
    }

    // Inactive technician check: If linked technician is disabled/inactive, access is blocked immediately
    if (admin.userType === 'technician' || admin.role === 'technician') {
      if (admin.technicianId) {
        const tech = (await Technician.findOne({ id: admin.technicianId })) || (await Technician.findById(admin.technicianId));
        if (!tech || tech.active === false) {
          sendError(res, 'تم تعطيل سجل الفني المرتبط بهذا الحساب، تم إيقاف الوصول إلى النظام', 403, 'TECHNICIAN_RECORD_INACTIVE');
          return;
        }
      }
    }

    req.admin = admin;
    req.adminToken = {
      id: admin._id.toString(),
      username: admin.username,
      role: admin.role,
      userType: admin.userType || 'admin',
      technicianId: admin.technicianId || undefined,
      type: 'admin',
    };
    next();
  } catch (err: any) {
    const isExpired = err?.name === 'TokenExpiredError';
    sendError(
      res,
      'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
      401,
      isExpired ? 'TOKEN_EXPIRED' : 'INVALID_OR_EXPIRED_ADMIN_TOKEN'
    );
  }
}

/**
 * Granular RBAC Authorization Middleware (3-Level Permission System: Hidden | View Only | Edit)
 * - 'owner': Full unrestricted access to all modules and actions.
 * - 'hidden': Completely blocked from both view (GET) and mutation operations (HTTP 403).
 * - 'view': Allowed for view (GET) operations, but strictly BLOCKED from mutations (HTTP 403).
 * - 'edit': Allowed for both view and mutation operations.
 */
export function authorize(module: string, action: string = 'view') {
  return async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.admin) {
      sendError(res, 'غير مصرح بالدخول', 401, 'UNAUTHORIZED');
      return;
    }

    // Owner role has absolute full access unconditionally
    if (req.admin.role === 'owner' || req.admin.role === 'super_admin') {
      return next();
    }

    // Scope enforcement for Technician Users: strictly restricted to orders only
    if (req.admin.userType === 'technician' || req.admin.role === 'technician') {
      if (module !== 'orders') {
        const specificToken = `${module}.${action}`;
        const perms = req.admin.granularPermissions || [];
        const hasExplicitAccess = perms.includes(specificToken) || perms.includes(`${module}.*`) || perms.includes('*');
        if (!hasExplicitAccess) {
          sendError(
            res,
            `تم رفض الوصول: حساب الفني مقيد بقسم الطلبات فقط ولا يملك صلاحية الوصول إلى (${module})`,
            403,
            'ACCESS_DENIED_SCOPE'
          );
          return;
        }
      }
    }

    try {
      const specificToken = `${module}.${action}`;
      const isViewAction = action === 'view';
      const isAnalyticsOrReports = module === 'analytics' || module === 'reports';

      // 1. Check granular permissions list first if present
      if (Array.isArray(req.admin.granularPermissions) && req.admin.granularPermissions.length > 0) {
        const perms = req.admin.granularPermissions;
        const hasDirectMatch = perms.includes(specificToken) || perms.includes(`${module}.*`) || perms.includes('*');
        const hasEditPrivilege = perms.includes(`${module}.edit`) || perms.includes(`${module}.manage`);
        const hasViewPrivilege = perms.includes(`${module}.view`) || perms.includes(`${module}.view_assigned`) || perms.includes(`${module}.view_details`) || hasEditPrivilege || perms.some((p) => p.startsWith(`${module}.`));

        // Specialized handling for orders workflow actions
        let hasOrderActionPrivilege = false;
        if (module === 'orders') {
          if (action === 'status' || action === 'edit') {
            hasOrderActionPrivilege = hasEditPrivilege || perms.some((p) => [
              'orders.receive',
              'orders.start_execution',
              'orders.mark_finished',
              'orders.complete',
              'orders.cancel',
              'orders.reopen',
              'orders.status',
              'orders.add_note',
              'orders.edit_note',
            ].includes(p));
          } else if (action === 'assign') {
            hasOrderActionPrivilege = hasEditPrivilege || perms.includes('orders.assign_technician') || perms.includes('orders.change_technician') || perms.includes('orders.assign');
          } else if (action === 'delete') {
            hasOrderActionPrivilege = perms.includes('orders.delete') || perms.includes('orders.manage');
          }
        }

        if (hasDirectMatch || (!isViewAction && (hasEditPrivilege || hasOrderActionPrivilege)) || (isViewAction && hasViewPrivilege)) {
          return next();
        }

        if (isAnalyticsOrReports) {
          if (
            perms.includes(`reports.${action}`) ||
            perms.includes(`analytics.${action}`) ||
            (isViewAction && (perms.includes('reports.view') || perms.includes('analytics.view')))
          ) {
            return next();
          }
        }

        sendError(
          res,
          `تم رفض الوصول: ليس لديك صلاحية تنفيذ العملية (${specificToken})`,
          403,
          'ACCESS_DENIED_PERMISSION'
        );
        return;
      }

      // 2. Check user-specific custom permissions map
      let userLevel: PermissionLevel | undefined = req.admin.permissions?.[module];
      if (!userLevel && isAnalyticsOrReports) {
        userLevel = req.admin.permissions?.reports || req.admin.permissions?.analytics;
      }

      // 3. If not defined on user, resolve from Role definition or default role template
      if (!userLevel) {
        const roleDef = await Role.findOne({
          $or: [
            { id: req.admin.role },
            ...((req.admin as any).customRole ? [{ _id: (req.admin as any).customRole }] : []),
          ],
        });


        if (roleDef && roleDef.permissions) {
          const rolePerm = roleDef.permissions[module];
          if (typeof rolePerm === 'string' && ['hidden', 'view', 'edit'].includes(rolePerm)) {
            userLevel = rolePerm as PermissionLevel;
          } else if (Array.isArray(rolePerm)) {
            if (rolePerm.includes('manage') || rolePerm.includes('edit') || rolePerm.includes('create') || rolePerm.includes('delete') || rolePerm.includes('*')) {
              userLevel = 'edit';
            } else if (rolePerm.includes('view')) {
              userLevel = 'view';
            } else {
              userLevel = 'hidden';
            }
          }
        }

        // Fallback to standard role template
        if (!userLevel) {
          const defaults = getDefaultRolePermissions(req.admin.role);
          userLevel = defaults[module] || 'hidden';
        }
      }

      // 4. Enforce 3-Level Permission Rules
      if (userLevel === 'hidden') {
        sendError(
          res,
          `تم رفض الوصول: ليس لديك صلاحية الدخول إلى قسم (${module})`,
          403,
          'ACCESS_DENIED_HIDDEN'
        );
        return;
      }

      if (!isViewAction && userLevel === 'view') {
        sendError(
          res,
          `تم رفض العملية: لديك صلاحية عرض فقط في قسم (${module}) ولا يمكنك إجراء أي تعديلات`,
          403,
          'ACCESS_DENIED_VIEW_ONLY'
        );
        return;
      }

      // userLevel === 'edit' has full permissions for both view and mutations
      next();
    } catch (err: any) {
      console.error('Permission check error:', err);
      sendError(res, 'خطأ أثناء فحص الصلاحيات', 500, 'PERMISSION_CHECK_ERROR');
    }
  };
}

export function authorizePermission(permission: string) {
  const parts = permission.split('.');
  const module = parts[0];
  const action = parts[1] || 'view';
  return authorize(module, action);
}

