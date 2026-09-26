'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Save, Bell, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';

export default function AdminNotificationSettingsPage() {
  const notifSettings = useSettingsStore((s) => s.settings.notifications);
  const updateNotifications = useSettingsStore((s) => s.updateNotifications);
  const fetchAdminSettings = useSettingsStore((s) => s.fetchAdminSettings);
  const saveSettingsToDatabase = useSettingsStore((s) => s.saveSettingsToDatabase);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);
  const [saving, setSaving] = useState(false);

  const [emailAlerts, setEmailAlerts] = useState(notifSettings?.emailAlerts ?? true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(notifSettings?.whatsappAlerts ?? true);
  const [browserAlerts, setBrowserAlerts] = useState(notifSettings?.browserAlerts ?? true);
  const [orderCreatedNotify, setOrderCreatedNotify] = useState(notifSettings?.orderCreatedNotify ?? true);
  const [orderCancelledNotify, setOrderCancelledNotify] = useState(notifSettings?.orderCancelledNotify ?? true);
  const [newCustomerNotify, setNewCustomerNotify] = useState(notifSettings?.newCustomerNotify ?? true);

  useEffect(() => {
    fetchAdminSettings();
  }, [fetchAdminSettings]);

  useEffect(() => {
    if (notifSettings) {
      setEmailAlerts(notifSettings.emailAlerts ?? true);
      setWhatsappAlerts(notifSettings.whatsappAlerts ?? true);
      setBrowserAlerts(notifSettings.browserAlerts ?? true);
      setOrderCreatedNotify(notifSettings.orderCreatedNotify ?? true);
      setOrderCancelledNotify(notifSettings.orderCancelledNotify ?? true);
      setNewCustomerNotify(notifSettings.newCustomerNotify ?? true);
    }
  }, [notifSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const notifData = {
      emailAlerts,
      whatsappAlerts,
      browserAlerts,
      orderCreatedNotify,
      orderCancelledNotify,
      newCustomerNotify,
    };

    updateNotifications(notifData);
    const success = await saveSettingsToDatabase({ notifications: notifData as any });
    setSaving(false);

    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تحديث تفضيلات إشعارات وتنبيهات النظام في قاعدة البيانات',
        module: 'settings',
        target: 'تفضيلات الإشعارات',
      });
      toast.success('تم حفظ تفضيلات الإشعارات في قاعدة البيانات بنجاح!');
    } else {
      toast.error('حدث خطأ أثناء حفظ الإعدادات في قاعدة البيانات');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة الإعدادات
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          تفضيلات التنبيهات والإشعارات (Notification Preferences)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          تحديد قنوات وأحداث استلام إشعارات الحجوزات والعمليات الفورية
        </p>
      </div>

      <form onSubmit={handleSave} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs text-xs">
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">إشعارات المتصفح المباشرة (In-App)</span>
              <span className="text-[10px] text-slate-400">إظهار شارات وتنبيهات فورية في الشريط العلوي</span>
            </div>
            <input
              type="checkbox"
              checked={browserAlerts}
              onChange={(e) => setBrowserAlerts(e.target.checked)}
              className="w-4 h-4 rounded-sm text-sky-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">تنبيهات البريد الإلكتروني الإداري</span>
              <span className="text-[10px] text-slate-400">إرسال ملخص فوري عند ورود طلبات جديدة</span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 rounded-sm text-sky-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">تنبيهات واتساب للإدارة والفنيين</span>
              <span className="text-[10px] text-slate-400">إشعار الفنيين تلقائياً عبر واتساب عند إسناد مهمة</span>
            </div>
            <input
              type="checkbox"
              checked={whatsappAlerts}
              onChange={(e) => setWhatsappAlerts(e.target.checked)}
              className="w-4 h-4 rounded-sm text-sky-500"
            />
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white">الأحداث التي يتم التنبيه بشأنها</h4>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={orderCreatedNotify}
              onChange={(e) => setOrderCreatedNotify(e.target.checked)}
              className="w-4 h-4 rounded-sm text-sky-500"
            />
            <span>إنشاء حجز جديد بواسطة عميل</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={orderCancelledNotify}
              onChange={(e) => setOrderCancelledNotify(e.target.checked)}
              className="w-4 h-4 rounded-sm text-sky-500"
            />
            <span>إلغاء حجز أو طلب</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newCustomerNotify}
              onChange={(e) => setNewCustomerNotify(e.target.checked)}
              className="w-4 h-4 rounded-sm text-sky-500"
            />
            <span>تسجيل عميل جديد بالمنصة</span>
          </label>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/25 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ تفضيلات الإشعارات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
