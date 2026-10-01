'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Sliders,
  Clock,
  Bell,
  Shield,
  ArrowRight,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { apiGet, apiPut } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminSubscriptionSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    subscriptionCancellationNoticeHours: 12,
    subscriptionRescheduleNoticeHours: 12,
    bookingCancellationNoticeHours: 6,
    bookingRescheduleNoticeHours: 6,
    appointmentReminderHours: 24,
    expirationReminderDays: 3,
    autoRenewalEnabled: true,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/subscriptions/admin/settings');
      if (res.data) {
        setSettings({
          subscriptionCancellationNoticeHours: res.data.subscriptionCancellationNoticeHours ?? 12,
          subscriptionRescheduleNoticeHours: res.data.subscriptionRescheduleNoticeHours ?? 12,
          bookingCancellationNoticeHours: res.data.bookingCancellationNoticeHours ?? 6,
          bookingRescheduleNoticeHours: res.data.bookingRescheduleNoticeHours ?? 6,
          appointmentReminderHours: res.data.appointmentReminderHours ?? 24,
          expirationReminderDays: res.data.expirationReminderDays ?? 3,
          autoRenewalEnabled: res.data.autoRenewalEnabled ?? true,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل تحميل إعدادات الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiPut('/subscriptions/admin/settings', settings);
      toast.success('تم حفظ إعدادات الاشتراكات بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/subscriptions" className="text-xs text-foreground/60 hover:text-primary flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              الاشتراكات
            </Link>
            <span className="text-foreground/40">/</span>
            <span className="text-xs text-foreground/80">الإعدادات</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">
            إعدادات وسياسات الاشتراكات والحجوزات
          </h1>
          <p className="text-xs text-foreground/60 mt-1">
            ضبط سياسات مهل الإلغاء، إعادة الجدولة، الإشعارات والتذكيرات التلقائية
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2 rounded-xl bg-card border border-border/50 text-foreground/70 hover:text-primary transition"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-xs text-foreground/60">جاري تحميل الإعدادات...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
          {/* Policy: Subscription Notice */}
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Shield className="w-4 h-4" />
              سياسة مواعيد زيارات الاشتراكات الشهرية
            </div>
            <p className="text-xs text-foreground/60">
              المهلة الزمنية الإلزامية التي يُسمح للعميل خلالها بالإلغاء أو إعادة جدولة مواعيد زيارة الاشتراك ذاتياً من حسابه.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/80">
                  مهلة إلغاء زيارة الاشتراك (ساعات قبل الموعد)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={72}
                    required
                    value={settings.subscriptionCancellationNoticeHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        subscriptionCancellationNoticeHours: parseInt(e.target.value) || 12,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs font-mono"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">
                    ساعة
                  </span>
                </div>
                <p className="text-[11px] text-foreground/50">
                  القيمة الافتراضية: 12 ساعة. أقل من هذا الحد يتم توجيه العميل للدعم.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/80">
                  مهلة إعادة جدولة زيارة الاشتراك (ساعات قبل الموعد)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={72}
                    required
                    value={settings.subscriptionRescheduleNoticeHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        subscriptionRescheduleNoticeHours: parseInt(e.target.value) || 12,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs font-mono"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">
                    ساعة
                  </span>
                </div>
                <p className="text-[11px] text-foreground/50">
                  القيمة الافتراضية: 12 ساعة. لا يتم فك حجز الموعد السابق إلا بعد نجاح حجز الجديد.
                </p>
              </div>
            </div>
          </div>

          {/* Policy: Normal Booking Notice */}
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Clock className="w-4 h-4" />
              سياسة مواعيد الحجوزات العادية (Normal Bookings)
            </div>
            <p className="text-xs text-foreground/60">
              المهلة الزمنية الإلزامية للحجوزات الفردية العادية (غير التابعة لاشتراك).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/80">
                  مهلة إلغاء الحجز العادي (ساعات قبل الموعد)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={48}
                    required
                    value={settings.bookingCancellationNoticeHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bookingCancellationNoticeHours: parseInt(e.target.value) || 6,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs font-mono"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">
                    ساعة
                  </span>
                </div>
                <p className="text-[11px] text-foreground/50">القيمة المعتمدة: 6 ساعات قبل الموعد.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/80">
                  مهلة إعادة جدولة الحجز العادي (ساعات قبل الموعد)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={48}
                    required
                    value={settings.bookingRescheduleNoticeHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bookingRescheduleNoticeHours: parseInt(e.target.value) || 6,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs font-mono"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">
                    ساعة
                  </span>
                </div>
                <p className="text-[11px] text-foreground/50">القيمة المعتمدة: 6 ساعات قبل الموعد.</p>
              </div>
            </div>
          </div>

          {/* Policy: Reminders & Notifications */}
          <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Bell className="w-4 h-4" />
              توقيت التنبيهات والإشعارات التلقائية
            </div>
            <p className="text-xs text-foreground/60">
              تحديد متى يتم إرسال إشعارات التذكير بالمواعيد وتنبيه قرب انتهاء الاشتراك.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/80">
                  التذكير قبل موعد الزيارة (ساعات)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={48}
                    required
                    value={settings.appointmentReminderHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        appointmentReminderHours: parseInt(e.target.value) || 24,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs font-mono"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">
                    ساعة
                  </span>
                </div>
                <p className="text-[11px] text-foreground/50">يتم إرسال تذكير للعميل قبل 24 ساعة من الموعد.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground/80">
                  التذكير بقرب انتهاء الاشتراك (أيام)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={14}
                    required
                    value={settings.expirationReminderDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        expirationReminderDays: parseInt(e.target.value) || 3,
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs font-mono"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40 font-bold">
                    يوم
                  </span>
                </div>
                <p className="text-[11px] text-foreground/50">
                  إرسال إشعار للعميل لتجديد الاشتراك قبل انتهائه بـ 3 أيام.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={settings.autoRenewalEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, autoRenewalEnabled: e.target.checked })
                  }
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <span>تفعيل خيار التجديد السريع افتراضياً في حسابات العملاء</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
