import mongoose, { Schema, Document } from 'mongoose';

export type PermissionLevel = 'hidden' | 'view' | 'edit';
export type PermissionModule = string;
export type PermissionAction = string;

export const ADMIN_MODULES = [
  { id: 'dashboard', nameAr: 'لوحة القيادة (Dashboard)', category: 'نظرة عامة', path: '/admin' },
  { id: 'calendar', nameAr: 'جدول المواعيد (Calendar)', category: 'نظرة عامة', path: '/admin/calendar' },
  { id: 'orders', nameAr: 'إدارة الطلبات (Orders)', category: 'العمليات والتشغيل', path: '/admin/orders' },
  { id: 'customers', nameAr: 'سجل العملاء CRM (Customers)', category: 'العمليات والتشغيل', path: '/admin/customers' },
  { id: 'technicians', nameAr: 'فريق الفنيين (Technicians)', category: 'العمليات والتشغيل', path: '/admin/technicians' },
  { id: 'locations', nameAr: 'المحافظات والمناطق (Locations)', category: 'العمليات والتشغيل', path: '/admin/locations' },
  { id: 'services', nameAr: 'الخدمات والتصنيفات (Services)', category: 'الخدمات والعروض', path: '/admin/services' },
  { id: 'offers', nameAr: 'العروض الترويجية (Offers)', category: 'الخدمات والعروض', path: '/admin/offers' },
  { id: 'coupons', nameAr: 'كوبونات الخصم (Coupons)', category: 'الخدمات والعروض', path: '/admin/coupons' },
  { id: 'gallery', nameAr: 'معرض الأعمال قبل وبعد (Gallery)', category: 'الخدمات والعروض', path: '/admin/gallery' },
  { id: 'media', nameAr: 'مكتبة الوسائط الموحدة (Media Library)', category: 'الخدمات والعروض', path: '/admin/media' },
  { id: 'content', nameAr: 'محتوى المنصة CMS (Content)', category: 'إدارة المحتوى', path: '/admin/content' },
  { id: 'zo', nameAr: 'استوديو تميمة زو 3D (Zo Studio)', category: 'تجربة زو التفاعلية', path: '/admin/zo-studio' },
  { id: 'reports', nameAr: 'مركز التقارير (Reports)', category: 'التقارير والذكاء', path: '/admin/reports' },
  { id: 'analytics', nameAr: 'التحليلات والمؤشرات (Analytics)', category: 'التقارير والذكاء', path: '/admin/analytics' },
  { id: 'notifications', nameAr: 'مركز التنبيهات (Notifications)', category: 'النظام والأمان', path: '/admin/notifications' },
  { id: 'users', nameAr: 'المسؤولون والمستخدمون (Users & Permissions)', category: 'النظام والأمان', path: '/admin/users' },
  { id: 'activity_logs', nameAr: 'سجل النشاطات (Activity Log)', category: 'النظام والأمان', path: '/admin/activity-log' },
  { id: 'settings', nameAr: 'إعدادات النظام (Settings)', category: 'النظام والأمان', path: '/admin/settings' },
] as const;

export type AdminModuleId = (typeof ADMIN_MODULES)[number]['id'];

export interface IRole extends Document {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  permissions: Record<string, PermissionLevel | any>;
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String },
    descriptionAr: { type: String },
    permissions: { type: Schema.Types.Mixed, default: {} },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const Role = createPrismaRepository('role') as any;

/**
 * Baseline role templates with 3-level permissions
 */
export function getDefaultRolePermissions(roleId: string): Record<string, PermissionLevel> {
  const perms: Record<string, PermissionLevel> = {};

  // Initialize all to hidden by default
  ADMIN_MODULES.forEach((m) => {
    perms[m.id] = 'hidden';
  });

  if (roleId === 'owner' || roleId === 'super_admin') {
    ADMIN_MODULES.forEach((m) => {
      perms[m.id] = 'edit';
    });
    return perms;
  }

  if (roleId === 'manager' || roleId === 'admin') {
    ADMIN_MODULES.forEach((m) => {
      if (['users', 'activity_logs', 'settings'].includes(m.id)) {
        perms[m.id] = 'view';
      } else {
        perms[m.id] = 'edit';
      }
    });
    return perms;
  }

  if (roleId === 'booking_manager') {
    perms['dashboard'] = 'view';
    perms['calendar'] = 'edit';
    perms['orders'] = 'edit';
    perms['customers'] = 'edit';
    perms['technicians'] = 'view';
    perms['locations'] = 'view';
    perms['services'] = 'view';
    perms['notifications'] = 'view';
    return perms;
  }

  if (roleId === 'content_manager') {
    perms['dashboard'] = 'view';
    perms['content'] = 'edit';
    perms['media'] = 'edit';
    perms['gallery'] = 'edit';
    perms['offers'] = 'edit';
    perms['coupons'] = 'edit';
    perms['services'] = 'view';
    perms['zo'] = 'edit';
    return perms;
  }

  if (roleId === 'support') {
    perms['dashboard'] = 'view';
    perms['orders'] = 'view';
    perms['customers'] = 'view';
    perms['calendar'] = 'view';
    perms['notifications'] = 'view';
    return perms;
  }

  if (roleId === 'technician') {
    perms['calendar'] = 'view';
    perms['orders'] = 'view';
    return perms;
  }

  return perms;
}
