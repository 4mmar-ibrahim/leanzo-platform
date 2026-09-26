import { AuditLog, IAuditLog, AuditLogStatus, AuditFieldDiff } from '../models/AuditLog.js';

// Blocklist of sensitive keys that must NEVER be persisted in audit logs
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'adminjwtsecret',
  'jwtsecret',
  'hash',
  'apikey',
  'authorization',
  'cookie',
  'cookies',
  'cvv',
  'creditcard',
  'cardnumber',
  'card_number',
  'paymentsecret',
]);

const ARABIC_FIELD_LABELS: Record<string, string> = {
  name: 'الاسم',
  nameAr: 'الاسم بالعربية',
  price: 'السعر',
  finalPrice: 'السعر النهائي',
  duration: 'المدة التقديرية',
  serviceDurationMinutes: 'مدة الخدمة (بالدقائق)',
  travelTimeMinutes: 'وقت التنقل (بالدقائق)',
  status: 'الحالة',
  active: 'حالة التفعيل',
  available: 'متاح للطلب',
  role: 'الدور الوظيفي',
  email: 'البريد الإلكتروني',
  phone: 'رقم الهاتف',
  discountType: 'نوع الخصم',
  discountValue: 'قيمة الخصم',
  minOrderTotal: 'الحد الأدنى للطلب',
  maxDiscountCap: 'الحد الأقصى للخصم',
  totalUsageLimit: 'حد الاستخدام الإجمالي',
  perCustomerLimit: 'حد الاستخدام للعميل',
  startDate: 'تاريخ البدء',
  endDate: 'تاريخ الانتهاء',
  isArchived: 'حالة الأرشفة',
  category: 'التصنيف',
  assignedTechnician: 'الفني المسند',
  address: 'العنوان',
  city: 'المدينة',
  governorate: 'المحافظة',
  permissions: 'مصفوفة الصلاحيات',
  headline: 'العنوان الرئيسي',
  headlineEn: 'العنوان بالإنجليزية',
  description: 'الوصف',
};

/**
 * Recursively sanitizes any object or array to completely eliminate sensitive keys
 */
export function sanitizePayload(data: any, visited = new WeakSet(), depth = 0): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (depth > 8) return '[Object]';

  // Dates or ObjectIds
  if (data instanceof Date) return data.toISOString();
  if (typeof data.toHexString === 'function') return data.toString();
  if (typeof data._bsontype === 'string' && typeof data.toString === 'function') return data.toString();

  // Convert Mongoose Documents to plain objects
  if (typeof data.toObject === 'function') {
    try {
      data = data.toObject();
    } catch {
      // fallback to shallow clone
    }
  }

  // Avoid circular references
  if (visited.has(data)) {
    return '[Circular]';
  }
  visited.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item, visited, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Ignore Mongoose internals
    if (key.startsWith('$') || key === '__v') continue;

    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
      // Omit completely
      continue;
    }

    if (value && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value, visited, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Computes field-level difference between two states
 */
export function computeDiff(
  before?: Record<string, any>,
  after?: Record<string, any>,
  ignoredKeys: string[] = ['_id', '__v', 'updatedAt', 'createdAt', 'password']
): AuditFieldDiff[] {
  if (!before && !after) return [];
  const cleanBefore = sanitizePayload(before || {});
  const cleanAfter = sanitizePayload(after || {});

  const allKeys = new Set([...Object.keys(cleanBefore), ...Object.keys(cleanAfter)]);
  const diffs: AuditFieldDiff[] = [];

  for (const key of allKeys) {
    if (ignoredKeys.includes(key)) continue;

    const valBefore = cleanBefore[key];
    const valAfter = cleanAfter[key];

    // Deep comparison via JSON serialization
    const strBefore = JSON.stringify(valBefore);
    const strAfter = JSON.stringify(valAfter);

    if (strBefore !== strAfter) {
      diffs.push({
        field: key,
        fieldLabelAr: ARABIC_FIELD_LABELS[key] || key,
        before: valBefore !== undefined ? valBefore : null,
        after: valAfter !== undefined ? valAfter : null,
      });
    }
  }

  return diffs;
}

/**
 * Formats user action into clear, grammatically sound, contextual Arabic text
 */
export function generateHumanDescription(params: {
  action: string;
  module: string;
  actorName: string;
  actorRole?: string;
  entityType?: string;
  entityName?: string;
  details?: string;
  status?: AuditLogStatus;
}): string {
  const { action, module, actorName, actorRole, entityType, entityName, details, status } = params;
  const name = actorName || 'النظام';
  const entity = entityName || entityType || 'عنصر';

  // Auth & Security
  if (action === 'login_success') {
    return `تسجيل دخول ناجح للمسؤول: ${name} (${actorRole || 'مشرف'})`;
  }
  if (action === 'login_failed') {
    return `محاولة تسجيل دخول فاشلة للمستخدم: ${entityName || 'غير معروف'} ${details ? `(${details})` : ''}`;
  }
  if (action === 'logout') {
    return `تسجيل خروج المسؤول: ${name}`;
  }
  if (action === 'password_change') {
    return `قام ${name} بتغيير كلمة المرور لحساب: ${entity}`;
  }
  if (action === 'permission_change') {
    return `قام ${name} بتعديل مصفوفة صلاحيات المسؤول: ${entity}`;
  }

  // Orders
  if (module === 'orders') {
    if (action === 'create' || action === 'create_order') return `تم إنشاء حجز جديد برقم: ${entity}`;
    if (action === 'update_order_status') return `قام ${name} بتحديث حالة الطلب #${entity} ${details ? `(${details})` : ''}`;
    if (action === 'cancel' || action === 'cancel_order') return `قام ${name} بإلغاء الحجز #${entity}`;
    if (action === 'complete' || action === 'complete_order') return `قام ${name} بإنهاء وتأكيد اكتمال الطلب #${entity}`;
    if (action === 'assign_technician') return `قام ${name} بتعيين فني للطلب #${entity} ${details ? `(${details})` : ''}`;
  }

  // Services
  if (module === 'services') {
    if (action === 'create' || action === 'create_service') return `قام ${name} بإضافة خدمة جديدة: ${entity}`;
    if (action === 'update' || action === 'update_service') return `قام ${name} بتعديل بيانات خدمة: ${entity}`;
    if (action === 'delete' || action === 'delete_service') return `قام ${name} بحذف/أرشفة خدمة: ${entity}`;
    if (action === 'create_category') return `قام ${name} بإضافة تصنيف خدمات جديد: ${entity}`;
  }

  // Customers
  if (module === 'customers') {
    if (action === 'delete_customer_permanent' || action === 'delete') return `قام ${name} بحذف حساب العميل (${entity}) نهائياً من النظام`;
    if (action === 'delete_customer_blocked') return `تم حظر محاولة ${name} لحذف حساب العميل (${entity}) لوجود طلبات قيد التنفيذ`;
    if (action === 'update_customer' || action === 'update') return `قام ${name} بتحديث بيانات وحالة العميل: ${entity}`;
  }

  // Coupons
  if (module === 'coupons') {
    if (action === 'create' || action === 'create_coupon') return `قام ${name} بإنشاء كوبون خصم جديد: ${entity}`;
    if (action === 'update' || action === 'update_coupon') return `قام ${name} بتعديل كوبون الخصم: ${entity}`;
    if (action === 'delete' || action === 'delete_coupon') return `قام ${name} بحذف كوبون الخصم: ${entity}`;
    if (action === 'apply' || action === 'apply_coupon') return `تم تطبيق كوبون الخصم ${entity} على الطلب ${details || ''}`;
  }

  // Offers
  if (module === 'offers') {
    if (action === 'create' || action === 'create_offer') return `قام ${name} بإنشاء عرض ترويجي جديد: ${entity}`;
    if (action === 'update' || action === 'update_offer') return `قام ${name} بتعديل بيانات العرض: ${entity}`;
    if (action === 'delete' || action === 'delete_offer') return `قام ${name} بحذف العرض الترويجي: ${entity}`;
  }

  // Content & CMS
  if (module === 'content') {
    if (action === 'publish' || action === 'publish_cms_content') return `قام ${name} بنشر تحديثات محتوى المنصة (CMS) للجمهور`;
    if (action === 'update' || action === 'update_cms_draft') return `قام ${name} بتعديل مسودة محتوى المنصة`;
    if (action === 'reset_cms_content') return `قام ${name} باستعادة إعدادات المحتوى الافتراضية`;
    if (action === 'create_faq') return `قام ${name} بإضافة سؤال شائع جديد: ${entity}`;
    if (action === 'delete_faq') return `قام ${name} بحذف سؤال شائع: ${entity}`;
  }

  // Media
  if (module === 'media') {
    if (action === 'upload' || action === 'upload_device_media') return `قام ${name} برفع وسائط جديدة إلى المكتبة: ${entity}`;
    if (action === 'import' || action === 'import_url_media') return `قام ${name} باستيراد وسائط من رابط خارجي: ${entity}`;
    if (action === 'delete' || action === 'delete_media') return `قام ${name} بحذف عنصر وسائط من المكتبة: ${entity}`;
  }

  // Users & Admins
  if (module === 'users') {
    if (action === 'create' || action === 'create_admin_user') return `قام ${name} بإنشاء حساب مسؤول جديد: ${entity}`;
    if (action === 'update' || action === 'update_admin_user') return `قام ${name} بتعديل بيانات المسؤول: ${entity}`;
    if (action === 'delete' || action === 'delete_admin_user') return `قام ${name} بحذف حساب المسؤول: ${entity}`;
  }

  // Locations
  if (module === 'locations') {
    if (action === 'create_governorate') return `قام ${name} بإضافة محافظة جديدة: ${entity}`;
    if (action === 'create_city') return `قام ${name} بإضافة مدينة/منطقة جديدة: ${entity}`;
    if (action === 'toggle_governorate') return `قام ${name} بتغيير حالة تفعيل المحافظة: ${entity}`;
  }

  // Settings
  if (module === 'settings') {
    if (action === 'update_system_settings') return `قام ${name} بتحديث إعدادات المنصة العامة`;
    if (action === 'backup') return `قام ${name} بإنشاء نسخة احتياطية من قاعدة البيانات`;
    if (action === 'restore_backup') return `قام ${name} باستعادة نسخة احتياطية للنظام`;
  }

  // Generic fallback
  const actionArabicMap: Record<string, string> = {
    create: 'بإنشاء',
    update: 'بتعديل',
    delete: 'بحذف',
    restore: 'باستعادة',
    enable: 'بتفعيل',
    disable: 'بتعطيل',
    publish: 'بنشر',
    unpublish: 'بإلغاء نشر',
    assign: 'بتعيين',
    cancel: 'بإلغاء',
    complete: 'بإكمال',
    approve: 'بالموافقة على',
    reject: 'برفض',
  };

  const verb = actionArabicMap[action] || `بإجراء (${action}) على`;
  return `قام ${name} ${verb} ${entity} في قسم ${module}`;
}

export interface CreateAuditLogParams {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  status?: AuditLogStatus;
  before?: Record<string, any>;
  after?: Record<string, any>;
  diff?: AuditFieldDiff[];
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  target?: string;
  targetId?: string;
  details?: string;
}

class AuditService {
  /**
   * Records an audit log event asynchronously without blocking the main workflow.
   */
  public log(params: CreateAuditLogParams): Promise<IAuditLog | null> {
    return new Promise((resolve) => {
      setImmediate(async () => {
        try {
          const sanitizedBefore = params.before ? sanitizePayload(params.before) : undefined;
          const sanitizedAfter = params.after ? sanitizePayload(params.after) : undefined;

          // Auto-compute diff if not provided
          let diff = params.diff;
          if (!diff && sanitizedBefore && sanitizedAfter) {
            diff = computeDiff(sanitizedBefore, sanitizedAfter);
          }

          // Auto-generate human description if not explicitly specified
          const description =
            params.description ||
            generateHumanDescription({
              action: params.action,
              module: params.module,
              actorName: params.actorName,
              actorRole: params.actorRole,
              entityType: params.entityType,
              entityName: params.target || params.entityId,
              details: params.details,
              status: params.status || 'success',
            });


          const auditDoc = await AuditLog.create({
            actorId: params.actorId,
            actorName: params.actorName,
            actorRole: params.actorRole,
            adminId: params.actorId, // backward-compat
            adminName: params.actorName,
            adminRole: params.actorRole,

            action: params.action,
            module: params.module,
            entityType: params.entityType,
            entityId: params.entityId || params.targetId,
            description,
            status: params.status || 'success',

            before: sanitizedBefore,
            after: sanitizedAfter,
            diff: diff || [],

            metadata: params.metadata ? sanitizePayload(params.metadata) : undefined,
            ip: params.ip,
            userAgent: params.userAgent,
            requestId: params.requestId || `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,

            target: params.target || params.entityId,
            targetId: params.targetId || params.entityId,
            details: params.details || description,
          });

          resolve(auditDoc);
        } catch (err: any) {
          if (!err.message?.includes('closed') && !err.message?.includes('interrupted')) {
            console.error('[AuditService] Failed to create audit log asynchronously:', err.message);
          }
          resolve(null);
        }
      });
    });
  }
}

export const auditService = new AuditService();
