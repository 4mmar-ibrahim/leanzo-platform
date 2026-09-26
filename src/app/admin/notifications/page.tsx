'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingBag,
  Users,
  HardHat,
  ShieldAlert,
  RotateCw,
  Sparkles,
  ExternalLink,
  PlusCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminNotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'order' | 'customer' | 'system' | 'technician'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const notifications = useNotificationStore((s) => s.notifications);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const resetToDefaults = useNotificationStore((s) => s.resetToDefaults);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
    toast.success('تم تحديث قائمة الإشعارات بنجاح');
  };

  const handleCreateTestNotification = (type: 'order' | 'technician' | 'customer' | 'system') => {
    const testSamples = {
      order: {
        title: 'طلب حجز تجريبي جديد',
        titleEn: 'New Test Booking',
        message: 'قام العميل أحمد صبري بطلب خدمة غسيل سيارات VIP متنقل برقم #CLZ-2026-999.',
        messageEn: 'New test booking #CLZ-2026-999 created.',
        type: 'order' as const,
        link: '/admin/orders',
      },
      technician: {
        title: 'تنبيه فني ميداني',
        titleEn: 'Field Tech Alert',
        message: 'تم إسناد طلب جديد للكابتن سامح علي بالسيارة المتنقلة رقم 4.',
        messageEn: 'Technician Sameh Ali has been assigned to job.',
        type: 'technician' as const,
        link: '/admin/technicians',
      },
      customer: {
        title: 'تسجيل عميل جديد',
        titleEn: 'New Customer Registered',
        message: 'سجل العميل المهندس إسلام ممدوح حسابه الجديد بنجاح (01223456789).',
        messageEn: 'New customer Eng. Eslam Mamdouh registered.',
        type: 'customer' as const,
        link: '/admin/customers',
      },
      system: {
        title: 'تنبيه فحص أمان المنصة',
        titleEn: 'System Health Verification',
        message: 'تم التحقق من تشفير البيانات والاتصال بقاعدة البيانات بنجاح، وجميع الخدمات متصلة.',
        messageEn: 'System integrity verified successfully.',
        type: 'system' as const,
        link: '/admin/settings',
      },
    };

    addNotification(testSamples[type]);
    toast.success(`تم إنشاء إشعار تجريبي بقسم: ${
      type === 'order' ? 'الطلبات' : type === 'technician' ? 'الفنيين' : type === 'customer' ? 'العملاء' : 'النظام'
    }`);
  };

  const filtered = notifications.filter((n) => filter === 'all' || n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const counts = {
    all: notifications.length,
    order: notifications.filter((n) => n.type === 'order').length,
    technician: notifications.filter((n) => n.type === 'technician').length,
    customer: notifications.filter((n) => n.type === 'customer').length,
    system: notifications.filter((n) => n.type === 'system').length,
  };

  const iconForType = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-sky-500" />;
      case 'customer':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'technician':
        return <HardHat className="w-4 h-4 text-indigo-500" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#0866C6]/10 text-[#0866C6] dark:text-sky-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                مركز التنبيهات والإشعارات
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                لديك {unreadCount} إشعار جديد بحاجة لمتابعة • مرتبط آلياً بالطلبات، الفنيين، العملاء والنظام
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#0E3A64] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0A2E50] transition shadow-2xs"
            title="تحديث البيانات"
          >
            <RotateCw className={cn('w-3.5 h-3.5 text-sky-500', isRefreshing && 'animate-spin')} />
            <span>تحديث</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => {
                markAllAsRead();
                toast.success('تم تحديد جميع الإشعارات كمقروءة');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#0E3A64] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0A2E50] transition shadow-2xs"
            >
              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => {
                clearAll();
                toast.info('تم مسح كافة الإشعارات');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح السجل</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs with Live Badges */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#0E3A64] text-xs font-semibold shadow-2xs">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all',
            filter === 'all'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50]'
          )}
        >
          <span>كافة الإشعارات</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-mono',
              filter === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setFilter('order')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all',
            filter === 'order'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50]'
          )}
        >
          <span>الطلبات والحجوزات</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-mono',
              filter === 'order'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            {counts.order}
          </span>
        </button>

        <button
          onClick={() => setFilter('technician')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all',
            filter === 'technician'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50]'
          )}
        >
          <span>الفنيين والميدان</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-mono',
              filter === 'technician'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            {counts.technician}
          </span>
        </button>

        <button
          onClick={() => setFilter('customer')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all',
            filter === 'customer'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50]'
          )}
        >
          <span>العملاء</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-mono',
              filter === 'customer'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            {counts.customer}
          </span>
        </button>

        <button
          onClick={() => setFilter('system')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all',
            filter === 'system'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50]'
          )}
        >
          <span>تنبيهات النظام</span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-mono',
              filter === 'system'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            {counts.system}
          </span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#0E3A64] shadow-xs space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Bell className="w-7 h-7 text-sky-500/70" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                لا توجد إشعارات في هذا التصنيف حالياً
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سيتم إضافة أي إشعار جديد تلقائياً فور قيام العملاء بحجز طلبات جديدة، أو تغيير حالة الطلب، أو إسناد الفنيين، أو تنبيهات أمان النظام.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetToDefaults();
                  toast.success('تم استعادة الإشعارات النموذجية بنجاح');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0866C6] hover:bg-[#0756A8] text-white transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>استعادة إشعارات نموذجية للمعاينة</span>
              </button>
            </div>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={cn(
                'p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer group',
                n.read
                  ? 'bg-white dark:bg-[#072540] border-slate-200/80 dark:border-[#0E3A64] text-slate-500 hover:border-[#0866C6]/40'
                  : 'bg-sky-50/50 dark:bg-[#061E35] border-[#0866C6]/30 text-slate-800 dark:text-slate-200 shadow-xs hover:border-[#0866C6]'
              )}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={cn(
                    'p-2.5 rounded-xl shrink-0 mt-0.5',
                    n.type === 'order'
                      ? 'bg-sky-500/10 text-sky-500'
                      : n.type === 'customer'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : n.type === 'technician'
                      ? 'bg-indigo-500/10 text-indigo-500'
                      : 'bg-amber-500/10 text-amber-500'
                  )}
                >
                  {iconForType(n.type)}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {n.title}
                    </h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-mono">
                      {n.type === 'order'
                        ? 'طلب وحجز'
                        : n.type === 'technician'
                        ? 'فني ميداني'
                        : n.type === 'customer'
                        ? 'عميل'
                        : 'نظام وأمان'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono block pt-1">
                    {n.timestamp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {n.link && (
                  <Link
                    href={n.link}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-[#0866C6] hover:text-white text-xs font-bold transition shadow-2xs"
                  >
                    <span>معاينة</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                    toast.info('تم حذف الإشعار');
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="حذف الإشعار"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Developer / Testing Helper Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#041525] border border-slate-200 dark:border-[#0E3A64] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <PlusCircle className="w-4 h-4 text-sky-500" />
          <span className="font-bold">أدوات فحص واختبار التنبيهات المباشرة:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleCreateTestNotification('order')}
            className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white font-medium transition cursor-pointer text-[11px]"
          >
            + تجربة إشعار طلب
          </button>
          <button
            onClick={() => handleCreateTestNotification('technician')}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white font-medium transition cursor-pointer text-[11px]"
          >
            + تجربة إشعار فني
          </button>
          <button
            onClick={() => handleCreateTestNotification('customer')}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-medium transition cursor-pointer text-[11px]"
          >
            + تجربة إشعار عميل
          </button>
          <button
            onClick={() => handleCreateTestNotification('system')}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white font-medium transition cursor-pointer text-[11px]"
          >
            + تجربة إشعار نظام
          </button>
        </div>
      </div>
    </div>
  );
}
