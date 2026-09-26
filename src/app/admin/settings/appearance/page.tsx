'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Save, Palette, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function AdminAppearanceSettingsPage() {
  const { setTheme } = useTheme();
  const appearance = useSettingsStore((s) => s.settings.appearance);
  const branding = useSettingsStore((s) => s.settings.branding);
  const updateAppearance = useSettingsStore((s) => s.updateAppearance);
  const updateBranding = useSettingsStore((s) => s.updateBranding);
  const fetchAdminSettings = useSettingsStore((s) => s.fetchAdminSettings);
  const saveSettingsToDatabase = useSettingsStore((s) => s.saveSettingsToDatabase);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(appearance?.primaryColor || '#0866C6');
  const [secondaryColor, setSecondaryColor] = useState(appearance?.secondaryColor || '#07345C');
  const [accentColor, setAccentColor] = useState(appearance?.accentColor || '#F0444C');
  const [defaultTheme, setDefaultTheme] = useState(appearance?.defaultTheme || 'system');
  const [siteTitle, setSiteTitle] = useState(appearance?.siteTitle || 'كلينزو — خدمات تنظيف العناية بالسيارات والمنازل');
  const [logoText, setLogoText] = useState(appearance?.logoText || 'CLEANZO');

  useEffect(() => {
    fetchAdminSettings();
  }, [fetchAdminSettings]);

  useEffect(() => {
    if (appearance) {
      const effPrimary = appearance.primaryColor || branding?.primaryColor || '#0866C6';
      const effSecondary = appearance.secondaryColor || branding?.secondaryColor || '#07345C';
      const effAccent = appearance.accentColor || branding?.accentColor || '#F0444C';

      setPrimaryColor(effPrimary);
      setSecondaryColor(effSecondary);
      setAccentColor(effAccent);
      setDefaultTheme(appearance.defaultTheme || 'system');
      setSiteTitle(appearance.siteTitle || 'كلينزو — خدمات تنظيف العناية بالسيارات والمنازل');
      setLogoText(appearance.logoText || branding?.logoText || 'CLEANZO');
    }
  }, [appearance, branding]);

  const applyLiveColors = (primary: string, secondary: string, accent: string) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--cleanzo-blue', primary);
      document.documentElement.style.setProperty('--primary', primary);
      document.documentElement.style.setProperty('--cleanzo-navy', secondary);
      document.documentElement.style.setProperty('--cleanzo-red', accent);
      document.documentElement.style.setProperty('--accent', accent);

      const styleEl = document.getElementById('cleanzo-live-branding');
      if (styleEl) {
        styleEl.innerHTML = `
          :root, html, body {
            --cleanzo-blue: ${primary} !important;
            --primary: ${primary} !important;
            --ring: ${primary} !important;
            --cleanzo-navy: ${secondary} !important;
            --cleanzo-red: ${accent} !important;
            --accent: ${accent} !important;
          }
          .dark {
            --cleanzo-blue: ${primary} !important;
            --primary: ${primary} !important;
            --ring: ${primary} !important;
            --cleanzo-red: ${accent} !important;
            --accent: ${accent} !important;
          }
          [class*="bg-[#0866C6]"] { background-color: var(--cleanzo-blue) !important; }
          [class*="text-[#0866C6]"] { color: var(--cleanzo-blue) !important; }
          [class*="border-[#0866C6]"] { border-color: var(--cleanzo-blue) !important; }
          [class*="fill-[#0866C6]"] { fill: var(--cleanzo-blue) !important; }
          [class*="stroke-[#0866C6]"] { stroke: var(--cleanzo-blue) !important; }
          [class*="shadow-[#0866C6]"] { --tw-shadow-color: var(--cleanzo-blue) !important; }
          [class*="bg-[#07345C]"] { background-color: var(--cleanzo-navy) !important; }
          [class*="text-[#07345C]"] { color: var(--cleanzo-navy) !important; }
          [class*="border-[#07345C]"] { border-color: var(--cleanzo-navy) !important; }
          [class*="bg-[#F0444C]"] { background-color: var(--cleanzo-red) !important; }
          [class*="text-[#F0444C]"] { color: var(--cleanzo-red) !important; }
          [class*="border-[#F0444C]"] { border-color: var(--cleanzo-red) !important; }
          .dark [class*="dark:text-[#25B8E6]"], .dark [class*="dark:text-[#3B82F6]"] { color: var(--cleanzo-blue) !important; }
          .dark [class*="dark:hover:text-[#25B8E6]"]:hover, .dark [class*="dark:hover:text-[#3B82F6]"]:hover { color: var(--cleanzo-blue) !important; }
          .dark [class*="dark:border-[#0866C6]"] { border-color: var(--cleanzo-blue) !important; }
        `;
      }
    }
  };

  const handleColorChange = (key: 'primary' | 'secondary' | 'accent', val: string) => {
    let p = primaryColor;
    let s = secondaryColor;
    let a = accentColor;

    if (key === 'primary') {
      setPrimaryColor(val);
      p = val;
    } else if (key === 'secondary') {
      setSecondaryColor(val);
      s = val;
    } else if (key === 'accent') {
      setAccentColor(val);
      a = val;
    }

    applyLiveColors(p, s, a);

    updateAppearance({
      primaryColor: p,
      secondaryColor: s,
      accentColor: a,
    });
    updateBranding({
      primaryColor: p,
      secondaryColor: s,
      accentColor: a,
    });
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setDefaultTheme(newTheme);
    setTheme(newTheme);
    updateAppearance({ defaultTheme: newTheme });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const appearanceData = {
      primaryColor,
      secondaryColor,
      accentColor,
      defaultTheme,
      siteTitle,
      logoText,
    };

    const brandingData = {
      ...useSettingsStore.getState().settings.branding,
      primaryColor,
      secondaryColor,
      accentColor,
      logoText,
    };

    updateAppearance(appearanceData);
    updateBranding(brandingData);

    const success = await saveSettingsToDatabase({
      appearance: appearanceData as any,
      branding: brandingData as any,
    });
    setSaving(false);

    applyLiveColors(primaryColor, secondaryColor, accentColor);

    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تحديث مظهر وهوية المنصة في قاعدة البيانات',
        module: 'settings',
        target: 'المظهر والهوية',
      });
      toast.success('تم حفظ إعدادات الهوية البصرية والمظهر في قاعدة البيانات وتطبيقها فوراً على كامل الموقع!');
    } else {
      toast.error('حدث خطأ أثناء حفظ الإعدادات في قاعدة البيانات');
    }
  };

  const handleResetDefaults = async () => {
    const defaultP = '#0866C6';
    const defaultS = '#07345C';
    const defaultA = '#F0444C';
    const defaultT = 'system' as const;
    const defaultTitle = 'CLEANZO — خدمات العناية المتخصصة بالسيارات والمنازل';
    const defaultLogo = 'CLEANZO';

    setPrimaryColor(defaultP);
    setSecondaryColor(defaultS);
    setAccentColor(defaultA);
    setDefaultTheme(defaultT);
    setTheme(defaultT);
    setSiteTitle(defaultTitle);
    setLogoText(defaultLogo);

    applyLiveColors(defaultP, defaultS, defaultA);

    const appearanceData = {
      primaryColor: defaultP,
      secondaryColor: defaultS,
      accentColor: defaultA,
      defaultTheme: defaultT,
      siteTitle: defaultTitle,
      logoText: defaultLogo,
    };

    const brandingData = {
      ...useSettingsStore.getState().settings.branding,
      primaryColor: defaultP,
      secondaryColor: defaultS,
      accentColor: defaultA,
      logoText: defaultLogo,
    };

    updateAppearance(appearanceData);
    updateBranding(brandingData);

    setSaving(true);
    const success = await saveSettingsToDatabase({
      appearance: appearanceData as any,
      branding: brandingData as any,
    });
    setSaving(false);

    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'استعادة ألوان ومظهر وهوية كلينزو الافتراضية الأصلية',
        module: 'settings',
        target: 'المظهر والهوية',
      });
      toast.success('تمت استعادة ألوان ومظهر وثيم الموقع الافتراضية الأصلية بنجاح وحفظها في قاعدة البيانات!');
    } else {
      toast.info('تم تطبيق الألوان الافتراضية محلياً');
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

        <button
          type="button"
          onClick={handleResetDefaults}
          disabled={saving}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4 text-sky-500" />
          <span>استعادة الألوان والمظهر الأصلي</span>
        </button>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>المظهر والهوية البصرية (Appearance & Branding)</span>
          <Sparkles className="w-5 h-5 text-sky-500" />
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          تخصيص ألوان العلامة التجارية، النمط الافتراضي، ونصوص الشعار فورياً لكامل الموقع
        </p>
      </div>

      <form onSubmit={handleSave} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block font-semibold">اللون الرئيسي (Primary Color)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-full p-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block font-semibold">اللون الثانوي (Secondary Color)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-full p-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block font-semibold">لون التمييز (Accent Color)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-full p-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          <div>
            <label className="block font-semibold mb-1.5">النمط الافتراضي للزوار (Default Theme)</label>
            <select
              value={defaultTheme}
              onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
            >
              <option value="system">حسب تفضيل نظام العميل (System Default)</option>
              <option value="dark">الوضع الليلي الداكن (Dark)</option>
              <option value="light">الوضع النهاري الفاتح (Light)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1.5">نص الشعار (Logo Brand Name)</label>
            <input
              type="text"
              value={logoText}
              onChange={(e) => setLogoText(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-semibold mb-1.5">عنوان الموقع الرئيسي في محركات البحث (SEO Title)</label>
          <input
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="px-6 py-2.5 font-bold shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات المظهر'}</span>
            </Button>

            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-sky-500" />
              <span>استعادة الإعدادات الافتراضية</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            يتم تطبيق الألوان والنمط لحظياً وتثبيتها في قاعدة البيانات
          </span>
        </div>
      </form>
    </div>
  );
}
