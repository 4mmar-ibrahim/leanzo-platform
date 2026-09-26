'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Save, Sliders, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';

export default function AdminGeneralSettingsPage() {
  const settings = useSettingsStore((s) => s.settings.general);
  const updateGeneral = useSettingsStore((s) => s.updateGeneral);
  const fetchAdminSettings = useSettingsStore((s) => s.fetchAdminSettings);
  const saveSettingsToDatabase = useSettingsStore((s) => s.saveSettingsToDatabase);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState(settings?.companyName || 'كلينزو لخدمات العناية المتنقلة');
  const [companyNameEn, setCompanyNameEn] = useState(settings?.companyNameEn || 'Cleanzo Mobile Detailing');
  const [currency, setCurrency] = useState(settings?.currency || 'ج.م');
  const [currencyEn, setCurrencyEn] = useState(settings?.currencyEn || 'EGP');
  const [defaultLanguage, setDefaultLanguage] = useState(settings?.defaultLanguage || 'ar');
  const [timezone, setTimezone] = useState(settings?.timezone || 'Africa/Cairo');

  useEffect(() => {
    fetchAdminSettings();
  }, [fetchAdminSettings]);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || 'كلينزو لخدمات العناية المتنقلة');
      setCompanyNameEn(settings.companyNameEn || 'Cleanzo Mobile Detailing');
      setCurrency(settings.currency || 'ج.م');
      setCurrencyEn(settings.currencyEn || 'EGP');
      setDefaultLanguage(settings.defaultLanguage || 'ar');
      setTimezone(settings.timezone || 'Africa/Cairo');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      companyName,
      companyNameEn,
      currency,
      currencyEn,
      defaultLanguage,
      timezone,
    };

    updateGeneral(payload);

    const success = await saveSettingsToDatabase({
      general: payload,
    });

    setSaving(false);

    if (defaultLanguage) {
      useLocaleStore.getState().setLocale(defaultLanguage as any);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cleanzo:settings-updated'));
    }

    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تحديث الإعدادات العامة للمنصة',
        module: 'settings',
        target: 'الإعدادات العامة',
        details: companyName,
      });

      toast.success('تم حفظ وتطبيق الإعدادات العامة في قاعدة البيانات وعبر كامل الموقع!');
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
          الإعدادات العامة (General Settings)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          تحديد هوية الشركة، العملة الرسمية المعتمدة، والمنطقة الزمنية
        </p>
      </div>

      <form onSubmit={handleSave} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">اسم الشركة (بالعربية)</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Company Name (English)</label>
            <input
              type="text"
              value={companyNameEn}
              onChange={(e) => setCompanyNameEn(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">رمز العملة (عربي)</label>
            <input
              type="text"
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Currency Code (En)</label>
            <input
              type="text"
              required
              value={currencyEn}
              onChange={(e) => setCurrencyEn(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">اللغة الافتراضية</label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value as any)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            >
              <option value="ar">العربية (RTL)</option>
              <option value="en">English (LTR)</option>
            </select>
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-semibold mb-1">المنطقة الزمنية (Timezone)</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] disabled:opacity-50 text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جاري الحفظ في الخادم...' : 'حفظ الإعدادات العامة'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
