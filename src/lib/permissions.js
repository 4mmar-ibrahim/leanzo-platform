"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PERMISSION_TOKENS = exports.PERMISSION_MODULES = void 0;
exports.hasPermission = hasPermission;
exports.getRequiredPermissionForRoute = getRequiredPermissionForRoute;
exports.canAccessRoute = canAccessRoute;
exports.getFirstAllowedRoute = getFirstAllowedRoute;
exports.PERMISSION_MODULES = [
    {
        id: 'dashboard',
        nameAr: 'لوحة القيادة (Dashboard)',
        descriptionAr: 'الإحصائيات الرئيسية ومؤشرات الأداء اللحظية',
        actions: [
            { id: 'view', token: 'dashboard.view', nameAr: 'عرض لوحة القيادة والمؤشرات' },
        ],
    },
    {
        id: 'customers',
        nameAr: 'سجل العملاء CRM',
        descriptionAr: 'بيانات العملاء وسجل تعاملاتهم والاتصال',
        actions: [
            { id: 'view', token: 'customers.view', nameAr: 'عرض العملاء CRM' },
            { id: 'create', token: 'customers.create', nameAr: 'إضافة عميل جديد' },
            { id: 'edit', token: 'customers.edit', nameAr: 'تعديل بيانات العميل' },
            { id: 'delete', token: 'customers.delete', nameAr: 'حذف العميل' },
        ],
    },
    {
        id: 'services',
        nameAr: 'الخدمات والتصنيفات',
        descriptionAr: 'قائمة خدمات الغسيل والتنظيف والتسعير',
        actions: [
            { id: 'view', token: 'services.view', nameAr: 'عرض الخدمات والتصنيفات' },
            { id: 'create', token: 'services.create', nameAr: 'إضافة خدمة جديدة' },
            { id: 'edit', token: 'services.edit', nameAr: 'تعديل الخدمة والأسعار' },
            { id: 'delete', token: 'services.delete', nameAr: 'حذف أو أرشفة خدمة' },
        ],
    },
    {
        id: 'orders',
        nameAr: 'الطلبات والحجوزات',
        descriptionAr: 'إدارة وتعيين وتتبع حجوزات العملاء',
        actions: [
            { id: 'view', token: 'orders.view', nameAr: 'عرض الحجوزات والطلبات' },
            { id: 'create', token: 'orders.create', nameAr: 'إنشاء حجز / طلب يدوي' },
            { id: 'edit', token: 'orders.edit', nameAr: 'تعديل بيانات الحجز' },
            { id: 'delete', token: 'orders.delete', nameAr: 'إلغاء وحذف الحجز' },
            { id: 'status', token: 'orders.status', nameAr: 'تغيير حالة الطلب (تعيين، إكمال)' },
        ],
    },
    {
        id: 'coupons',
        nameAr: 'كوبونات الخصم',
        descriptionAr: 'أكواد الخصم والترويج ونسب التخفيض',
        actions: [
            { id: 'view', token: 'coupons.view', nameAr: 'عرض الكوبونات' },
            { id: 'create', token: 'coupons.create', nameAr: 'إنشاء كوبون جديد' },
            { id: 'edit', token: 'coupons.edit', nameAr: 'تعديل الكوبون وشروطه' },
            { id: 'delete', token: 'coupons.delete', nameAr: 'حذف الكوبون' },
        ],
    },
    {
        id: 'offers',
        nameAr: 'العروض الترويجية',
        descriptionAr: 'الباقات والعروض الخاصة وشرائح التخفيض',
        actions: [
            { id: 'view', token: 'offers.view', nameAr: 'عرض العروض الترويجية' },
            { id: 'create', token: 'offers.create', nameAr: 'إطلاق عرض جديد' },
            { id: 'edit', token: 'offers.edit', nameAr: 'تعديل العرض والخصم' },
            { id: 'delete', token: 'offers.delete', nameAr: 'حذف العرض' },
        ],
    },
    {
        id: 'portfolio',
        nameAr: 'معرض الأعمال (قبل وبعد)',
        descriptionAr: 'معرض نتائج التنظيف وتوثيق الجودة',
        actions: [
            { id: 'view', token: 'portfolio.view', nameAr: 'عرض معرض الأعمال' },
            { id: 'create', token: 'portfolio.create', nameAr: 'إضافة عمل جديد للمعرض' },
            { id: 'edit', token: 'portfolio.edit', nameAr: 'تعديل صور وبيانات المعرض' },
            { id: 'delete', token: 'portfolio.delete', nameAr: 'حذف عمل من المعرض' },
        ],
    },
    {
        id: 'faq',
        nameAr: 'الأسئلة الشائعة (FAQ)',
        descriptionAr: 'بنك الأسئلة الشائعة وإجاباتها للعملاء',
        actions: [
            { id: 'view', token: 'faq.view', nameAr: 'عرض الأسئلة الشائعة' },
            { id: 'create', token: 'faq.create', nameAr: 'إضافة سؤال وجواب جديد' },
            { id: 'edit', token: 'faq.edit', nameAr: 'تعديل الأسئلة والأجوبة' },
            { id: 'delete', token: 'faq.delete', nameAr: 'حذف سؤال' },
        ],
    },
    {
        id: 'content',
        nameAr: 'محتوى المنصة (CMS)',
        descriptionAr: 'تعديل نصوص وتصميم صفحات الموقع الخارجي',
        actions: [
            { id: 'view', token: 'content.view', nameAr: 'عرض محتوى المنصة CMS' },
            { id: 'edit', token: 'content.edit', nameAr: 'تعديل صفحات ومحتوى الموقع' },
        ],
    },
    {
        id: 'reports',
        nameAr: 'مركز التقارير والذكاء',
        descriptionAr: 'التقارير المالية والتشغيلية وإحصائيات المنصة',
        actions: [
            { id: 'view', token: 'reports.view', nameAr: 'عرض التقارير والتحليلات' },
            { id: 'export', token: 'reports.export', nameAr: 'تصدير التقارير (Excel/PDF)' },
        ],
    },
    {
        id: 'settings',
        nameAr: 'إعدادات النظام',
        descriptionAr: 'الهوية، مواعيد العمل، وسائل التواصل، والتنبيهات',
        actions: [
            { id: 'view', token: 'settings.view', nameAr: 'عرض إعدادات النظام' },
            { id: 'edit', token: 'settings.edit', nameAr: 'تعديل إعدادات المنصة' },
        ],
    },
    {
        id: 'users',
        nameAr: 'المستخدمون والصلاحيات',
        descriptionAr: 'إدارة حسابات الموظفين والصلاحيات الدقيقة',
        actions: [
            { id: 'view', token: 'users.view', nameAr: 'عرض المسؤولين والمستخدمين' },
            { id: 'create', token: 'users.create', nameAr: 'إضافة مستخدم جديد' },
            { id: 'edit', token: 'users.edit', nameAr: 'تعديل بيانات المستخدمين' },
            { id: 'delete', token: 'users.delete', nameAr: 'حذف مستخدم' },
            { id: 'permissions', token: 'users.permissions', nameAr: 'تعديل مصفوفة الصلاحيات' },
            { id: 'password', token: 'users.password', nameAr: 'تغيير كلمة مرور المستخدمين' },
        ],
    },
    {
        id: 'security',
        nameAr: 'الأمان وتشفير البيانات',
        descriptionAr: 'سجلات الأمان وتشفير الجلسات وحماية البيانات',
        actions: [
            { id: 'view', token: 'security.view', nameAr: 'عرض مركز الأمان' },
            { id: 'password', token: 'security.password', nameAr: 'تغيير كلمات المرور' },
        ],
    },
    {
        id: 'activity_logs',
        nameAr: 'سجل النشاطات (Audit Logs)',
        descriptionAr: 'التوثيق الرقابي لجميع العمليات والتعديلات في النظام',
        actions: [
            { id: 'view', token: 'activity_logs.view', nameAr: 'استعراض سجل النشاطات' },
        ],
    },
];
exports.ALL_PERMISSION_TOKENS = exports.PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => a.token));
/**
 * Checks whether an admin has a specific permission token.
 * Platform Owner has unconditional 100% access across the entire system.
 */
function hasPermission(admin, permissionToken) {
    if (!admin)
        return false;
    if (admin.role === 'owner' || admin.role === 'super_admin')
        return true;
    // 1. Check granular permissions array
    if (Array.isArray(admin.granularPermissions) && admin.granularPermissions.length > 0) {
        const list = admin.granularPermissions;
        if (list.includes('*') || list.includes(permissionToken))
            return true;
        // Check wildcard module matching (e.g. 'customers.*')
        const [mod, act] = permissionToken.split('.');
        if (list.includes(`${mod}.*`))
            return true;
        if (act === 'view' && list.some((p) => p.startsWith(`${mod}.`)))
            return true;
        return false;
    }
    // 2. Check fallback legacy permissions dictionary
    const [mod, act] = permissionToken.split('.');
    const level = admin.permissions?.[mod];
    if (!level || level === 'hidden')
        return false;
    if (act === 'view')
        return level === 'view' || level === 'edit';
    return level === 'edit';
}
/**
 * Maps a URL route path to the required permission token.
 */
function getRequiredPermissionForRoute(pathname) {
    if (pathname === '/admin' || pathname === '/admin/')
        return 'dashboard.view';
    if (pathname.startsWith('/admin/calendar'))
        return 'dashboard.view';
    if (pathname.startsWith('/admin/orders'))
        return 'orders.view';
    if (pathname.startsWith('/admin/customers'))
        return 'customers.view';
    if (pathname.startsWith('/admin/technicians'))
        return 'orders.view';
    if (pathname.startsWith('/admin/locations'))
        return 'settings.view';
    if (pathname.startsWith('/admin/services'))
        return 'services.view';
    if (pathname.startsWith('/admin/offers'))
        return 'offers.view';
    if (pathname.startsWith('/admin/coupons'))
        return 'coupons.view';
    if (pathname.startsWith('/admin/gallery'))
        return 'portfolio.view';
    if (pathname.startsWith('/admin/media'))
        return 'portfolio.view';
    if (pathname.startsWith('/admin/content/faq'))
        return 'faq.view';
    if (pathname.startsWith('/admin/content'))
        return 'content.view';
    if (pathname.startsWith('/admin/zo-studio'))
        return 'content.view';
    if (pathname.startsWith('/admin/reports') || pathname.startsWith('/admin/analytics'))
        return 'reports.view';
    if (pathname.startsWith('/admin/notifications'))
        return 'dashboard.view';
    if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles'))
        return 'users.view';
    if (pathname.startsWith('/admin/activity-log'))
        return 'activity_logs.view';
    if (pathname.startsWith('/admin/settings/security'))
        return 'security.view';
    if (pathname.startsWith('/admin/settings'))
        return 'settings.view';
    return 'dashboard.view';
}
/**
 * Checks whether an admin is authorized to view a specific admin route path.
 */
function canAccessRoute(admin, pathname) {
    if (!admin)
        return false;
    if (admin.role === 'owner' || admin.role === 'super_admin')
        return true;
    const token = getRequiredPermissionForRoute(pathname);
    return hasPermission(admin, token);
}
/**
 * Determines the first valid landing route for a user based on their active permissions.
 */
function getFirstAllowedRoute(admin) {
    if (!admin)
        return '/admin/login';
    if (admin.role === 'owner' || admin.role === 'super_admin')
        return '/admin';
    const candidateRoutes = [
        { path: '/admin', token: 'dashboard.view' },
        { path: '/admin/orders', token: 'orders.view' },
        { path: '/admin/customers', token: 'customers.view' },
        { path: '/admin/services', token: 'services.view' },
        { path: '/admin/reports', token: 'reports.view' },
        { path: '/admin/offers', token: 'offers.view' },
        { path: '/admin/coupons', token: 'coupons.view' },
        { path: '/admin/content', token: 'content.view' },
        { path: '/admin/gallery', token: 'portfolio.view' },
        { path: '/admin/settings', token: 'settings.view' },
        { path: '/admin/users', token: 'users.view' },
        { path: '/admin/activity-log', token: 'activity_logs.view' },
    ];
    for (const candidate of candidateRoutes) {
        if (hasPermission(admin, candidate.token)) {
            return candidate.path;
        }
    }
    return '/admin';
}
//# sourceMappingURL=permissions.js.map