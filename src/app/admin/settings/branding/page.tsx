'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Save,
  Palette,
  Image as ImageIcon,
  Globe,
  Megaphone,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { Button } from '@/components/ui/Button';
import { normalizeMediaUrl } from '@/lib/utils';
import { toast } from 'sonner';

const COLOR_PRESETS = [
  { name: 'هوية كلينزو الرسمية المعتمدة (أزرق تفاعلي، كحلي بنيوي، أحمر تمييزي) [الافتراضية]', primary: '#0866C6', secondary: '#07345C', accent: '#F0444C' },
  { name: 'كلينزو دارك فوندايشن (كحلي ملكي داكن، أزرق إشراق، أحمر تمييز)', primary: '#0866C6', secondary: '#041B2D', accent: '#F0444C' },
];

export default function AdminBrandingSettingsPage() {
  const branding = useSettingsStore((s) => s.settings.branding);
  const updateBranding = useSettingsStore((s) => s.updateBranding);
  const updateAppearance = useSettingsStore((s) => s.updateAppearance);
  const fetchAdminSettings = useSettingsStore((s) => s.fetchAdminSettings);
  const saveSettingsToDatabase = useSettingsStore((s) => s.saveSettingsToDatabase);
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    logoText: branding?.logoText || 'CLEANZO',
    logoUrl: branding?.logoUrl || '/brand/zo/cleanzo-logo.png',
    faviconUrl: branding?.faviconUrl || '/favicon.ico',
    primaryColor: branding?.primaryColor || '#0866C6',
    secondaryColor: branding?.secondaryColor || '#07345C',
    accentColor: branding?.accentColor || '#F0444C',
    fontFamily: branding?.fontFamily || 'cairo',
    ctaText: branding?.ctaText || 'احجز خدمتك الآن',
    ctaTextEn: branding?.ctaTextEn || 'Book Your Service Now',
    footerText: branding?.footerText || 'CLEANZO — مساحات نظيفة، أيام أسعد',
    footerTextEn: branding?.footerTextEn || 'CLEANZO — Cleaner Spaces, Happier Days',
    topBanner: {
      enabled: branding?.topBanner?.enabled ?? true,
      text: branding?.topBanner?.text || 'خصم 20% لفتره محدودة على جميع باقات الغسيل والديتيلينج بمناسبه التحديث الجديد! كود: WELCOME20',
      textEn: branding?.topBanner?.textEn || 'Limited time 20% OFF on all packages celebrating the new update! Code: WELCOME20',
      discountBadge: branding?.topBanner?.discountBadge || 'خصم 20%',
      link: branding?.topBanner?.link || '/booking',
      bgColor: branding?.topBanner?.bgColor || 'from-[#07345C] to-[#0866C6]',
    },
    heroImages: {
      car: branding?.heroImages?.car || 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1600&q=80',
      home: branding?.heroImages?.home || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200',
    },
    maintenanceMode: branding?.maintenanceMode ?? false,
    maintenanceMessage: branding?.maintenanceMessage || 'الموقع يخضع حالياً لأعمال صيانة وتطوير وسنعود للعمل خلال وقت قصير.',
  });

  useEffect(() => {
    fetchAdminSettings();
  }, [fetchAdminSettings]);

  useEffect(() => {
    if (branding) {
      setForm((prev) => ({
        ...prev,
        logoText: branding.logoText || 'CLEANZO',
        logoUrl: branding.logoUrl || '/brand/zo/cleanzo-logo.png',
        faviconUrl: branding.faviconUrl || '/favicon.ico',
        primaryColor: branding.primaryColor || '#0866C6',
        secondaryColor: branding.secondaryColor || '#07345C',
        accentColor: branding.accentColor || '#F0444C',
        fontFamily: branding.fontFamily || 'cairo',
        ctaText: branding.ctaText || 'احجز موعدك الآن',
        ctaTextEn: branding.ctaTextEn || 'Book Now',
        footerText: branding.footerText || 'CLEANZO — مساحات نظيفة، أيام أسعد',
        footerTextEn: branding.footerTextEn || 'CLEANZO — Cleaner Spaces, Happier Days',
        topBanner: {
          enabled: branding.topBanner?.enabled ?? true,
          text: branding.topBanner?.text || 'خصم 20% لفترة محدودة على جميع باقات الغسيل والديتيلينج بمناسبة إطلاق هوية كلينزو الجديدة! كود: CLEANZO20',
          textEn: branding.topBanner?.textEn || 'Limited time: 20% OFF celebrating the new Cleanzo launch!',
          discountBadge: branding.topBanner?.discountBadge || 'هوية جديدة ✨',
          link: branding.topBanner?.link || '/booking',
          bgColor: branding.topBanner?.bgColor || 'from-[#0866C6] to-[#06529E]',
        },
        heroImages: {
          car: branding.heroImages?.car || '/brand/zo/cleanzo-van-hero.png',
          home: branding.heroImages?.home || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200',
        },
        maintenanceMode: branding.maintenanceMode ?? false,
        maintenanceMessage: branding.maintenanceMessage || 'الموقع يخضع حالياً لأعمال صيانة وتطوير وسنعود للعمل خلال وقت قصير.',
      }));
    }
  }, [branding]);

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

  const handleColorChange = (key: 'primaryColor' | 'secondaryColor' | 'accentColor', val: string) => {
    const updated = { ...form, [key]: val };
    setForm(updated);
    applyLiveColors(updated.primaryColor, updated.secondaryColor, updated.accentColor);
    updateBranding({ [key]: val } as any);
  };

  const updateLiveFavicon = (url: string) => {
    if (typeof document !== 'undefined') {
      const favUrl = normalizeMediaUrl(url) || '/favicon.ico';
      const existingIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      if (existingIcons.length > 0) {
        existingIcons.forEach((el) => {
          el.href = favUrl;
        });
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = favUrl;
        document.head.appendChild(link);
      }
    }
  };

  const handleFaviconChange = (newUrl: string) => {
    const cleaned = normalizeMediaUrl(newUrl);
    setForm((prev) => ({ ...prev, faviconUrl: cleaned }));
    updateLiveFavicon(cleaned);
  };

  const handleSave = async () => {
    setSaving(true);
    const cleanedLogo = normalizeMediaUrl(form.logoUrl);
    const cleanedFavicon = normalizeMediaUrl(form.faviconUrl);
    const cleanedHeroCar = normalizeMediaUrl(form.heroImages.car);
    const cleanedHeroHome = normalizeMediaUrl(form.heroImages.home);

    const cleanedForm = {
      ...form,
      logoUrl: cleanedLogo,
      faviconUrl: cleanedFavicon,
      heroImages: {
        car: cleanedHeroCar,
        home: cleanedHeroHome,
      },
    };

    setForm(cleanedForm);
    updateBranding(cleanedForm as any);
    const success = await saveSettingsToDatabase({
      branding: cleanedForm as any,
      appearance: {
        ...useSettingsStore.getState().settings.appearance,
        primaryColor: cleanedForm.primaryColor,
        secondaryColor: cleanedForm.secondaryColor,
        accentColor: cleanedForm.accentColor,
        logoText: cleanedForm.logoText,
      } as any,
    });
    setSaving(false);

    applyLiveColors(cleanedForm.primaryColor, cleanedForm.secondaryColor, cleanedForm.accentColor);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cleanzo:settings-updated'));
    }

    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تحديث هوية وعلامة المنصة واللوجو والألوان',
        module: 'settings',
        target: 'الهوية والعلامة',
        details: cleanedForm.logoText,
      });
      toast.success('تم حفظ إعدادات الهوية واللوجو والألوان في قاعدة البيانات وتطبيقها فوراً على كامل الموقع!');
    } else {
      toast.error('حدث خطأ أثناء حفظ الإعدادات في قاعدة البيانات');
    }
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
    applyLiveColors(preset.primary, preset.secondary, preset.accent);
    updateBranding({
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    } as any);
    toast.info(`تم تطبيق لوحة ألوان "${preset.name}" فوراً`);
  };

  const handleResetDefaults = async () => {
    const defaults = {
      logoText: 'CLEANZO',
      logoUrl: '/brand/zo/cleanzo-logo.png',
      faviconUrl: '/favicon.ico',
      primaryColor: '#0866C6',
      secondaryColor: '#07345C',
      accentColor: '#F0444C',
      fontFamily: 'cairo' as const,
      ctaText: 'احجز خدمتك الآن',
      ctaTextEn: 'Book Your Service Now',
      footerText: 'CLEANZO — مساحات نظيفة، أيام أسعد. حلول تنظيف احترافية متنقلة للعناية بالسيارات والمنازل بأعلى معايير الجودة.',
      footerTextEn: 'CLEANZO — Cleaner Spaces, Happier Days. Mobile car and home care.',
      topBanner: {
        enabled: true,
        text: 'خصم 20% لفتره محدودة على جميع باقات الغسيل والديتيلينج بمناسبه التحديث الجديد! كود: WELCOME20',
        textEn: 'Limited time 20% OFF on all packages celebrating the new update! Code: WELCOME20',
        discountBadge: 'خصم 20%',
        link: '/booking',
        bgColor: 'from-[#07345C] to-[#0866C6]',
      },
      heroImages: {
        car: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1600&q=80',
        home: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85',
      },
      maintenanceMode: false,
      maintenanceMessage: 'الموقع يخضع حالياً لترقية شاملة لتحسين تجربة الحجز وسنعود للعمل خلال دقائق.',
    };

    setForm(defaults);
    applyLiveColors(defaults.primaryColor, defaults.secondaryColor, defaults.accentColor);
    updateLiveFavicon('/favicon.ico');
    updateBranding(defaults as any);
    updateAppearance({
      primaryColor: defaults.primaryColor,
      secondaryColor: defaults.secondaryColor,
      accentColor: defaults.accentColor,
      logoText: defaults.logoText,
      defaultTheme: 'system',
    });

    setSaving(true);
    const success = await saveSettingsToDatabase({
      branding: defaults as any,
      appearance: {
        ...useSettingsStore.getState().settings.appearance,
        primaryColor: defaults.primaryColor,
        secondaryColor: defaults.secondaryColor,
        accentColor: defaults.accentColor,
        logoText: defaults.logoText,
        defaultTheme: 'system',
      } as any,
    });
    setSaving(false);

    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'استعادة هوية وعلامة وألوان كلينزو الافتراضية الأصلية',
        module: 'settings',
        target: 'الهوية والعلامة',
      });
      toast.success('تمت استعادة هوية وألوان كلينزو الأصلية بنجاح وحفظها في قاعدة البيانات!');
    } else {
      toast.info('تمت استعادة الإعدادات الافتراضية محلياً');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>إدارة الهوية والعلامة التجارية (Branding)</span>
              <Sparkles className="w-5 h-5 text-sky-500" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              تحكم باللوجو، الألوان، الشريط الترويجي، وضع الصيانة، وصور الواجهة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4 text-sky-500" />
            <span>استعادة الهوية والألوان الأصلية</span>
          </button>

          <Button
            variant="primary"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جاري الحفظ في الخادم...' : 'حفظ التعديلات في قاعدة البيانات'}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Settings */}
        <div className="lg:col-span-2 space-y-8">
          {/* Logo & Identity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-500" />
              <span>الشعار والنصوص الرئيسية</span>
            </h3>

            {/* Logo Upload Zone */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-sky-500" />
                    <span>لوجو الموقع الرئيسي (Site Logo)</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    اللوجو المعروض في أعلى الموقع (الهيدر)، الفوتر، ورسائل النظام
                  </p>
                </div>
              </div>
              <ImageUploader
                value={form.logoUrl}
                onChange={(url) => setForm((prev) => ({ ...prev, logoUrl: normalizeMediaUrl(url) }))}
                label="اختر أو ارفع لوجو الموقع (1:1 احتواء)"
                description="ارفع صورة اللوجو من جهازك (PNG أو SVG بخلفية شفافة) — يتم عرض الشعار بنسبة 1:1 مع احتواء كامل دون أي قص"
                defaultFit="contain"
                allowFitToggle={false}
              />
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">مسار أو رابط الشعار:</span>
                <input
                  type="text"
                  dir="ltr"
                  value={form.logoUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                  onBlur={(e) => setForm((prev) => ({ ...prev, logoUrl: normalizeMediaUrl(e.target.value) }))}
                  placeholder="/brand/zo/cleanzo-logo.png"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Favicon Upload Zone */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-500" />
                    <span>أيقونة الموقع والمتصفح (Site Favicon)</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تظهر في لسان تبويب المتصفح، قائمة المفضلة، وإشعارات الموقع (يدعم ICO, PNG, SVG, WEBP بنسبة 1:1)
                  </p>
                </div>

                {form.faviconUrl !== '/favicon.ico' && (
                  <button
                    type="button"
                    onClick={() => handleFaviconChange('/favicon.ico')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة الأيقونة الأصلية</span>
                  </button>
                )}
              </div>

              {/* Realistic Mini Browser Tab Simulation */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                {/* Browser Tab Header */}
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 inline-block" />
                  </div>
                  {/* Simulated Tab */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-t-lg bg-white dark:bg-slate-900 border-t border-x border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium max-w-[280px] truncate shadow-2xs">
                    <div className="w-4 h-4 rounded shrink-0 overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                      {form.faviconUrl ? (
                        <img
                          src={normalizeMediaUrl(form.faviconUrl)}
                          alt="Favicon"
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/favicon.ico';
                          }}
                        />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <span className="truncate text-[11px] font-bold">
                      {form.logoText || 'CLEANZO'} — مساحات نظيفة، أيام أسعد
                    </span>
                    <span className="text-[10px] text-slate-400 mr-auto ml-1">✕</span>
                  </div>
                </div>

                {/* Simulated URL bar */}
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span className="text-emerald-500 text-xs">🔒</span>
                  <span className="text-slate-400">https://cleanzo.app</span>
                </div>
              </div>

              {/* Image Uploader for Favicon */}
              <ImageUploader
                value={form.faviconUrl}
                onChange={(url) => handleFaviconChange(url)}
                label="اختر أو ارفع أيقونة المتصفح (Favicon)"
                description="ارفع ملف الأيقونة من جهازك أو اختر من مكتبة الوسائط — المقاس المفضل: 32×32 أو 64×64 أو 128×128 بكسل"
                defaultFit="contain"
                allowFitToggle={false}
              />

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">مسار أو رابط الأيقونة (Favicon):</span>
                <input
                  type="text"
                  dir="ltr"
                  value={form.faviconUrl}
                  onChange={(e) => handleFaviconChange(e.target.value)}
                  onBlur={(e) => handleFaviconChange(e.target.value)}
                  placeholder="/favicon.ico"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم الشعار (Logo Text)</label>
                <input
                  type="text"
                  value={form.logoText}
                  onChange={(e) => setForm({ ...form, logoText: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نص زر الحجز (بالعربية)</label>
                <input
                  type="text"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نص زر الحجز (بالإنجليزية)</label>
                <input
                  type="text"
                  value={form.ctaTextEn}
                  onChange={(e) => setForm({ ...form, ctaTextEn: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-500" />
                <span>لوحة ألوان النظام (Theme Colors)</span>
              </h3>

              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.primary }} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">اللون الأساسي (Primary)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={form.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">اللون الثانوي (Secondary)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={form.secondaryColor}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">لون التمييز (Accent)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={form.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top Announcement Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <span>الشريط الإعلاني العلوي (Announcement Bar)</span>
              </h3>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.topBanner.enabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      topBanner: { ...form.topBanner, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">شارة الخصم (Badge)</label>
                  <input
                    type="text"
                    value={form.topBanner.discountBadge}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        topBanner: { ...form.topBanner, discountBadge: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">رابط النقر (Action Link)</label>
                  <input
                    type="text"
                    value={form.topBanner.link}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        topBanner: { ...form.topBanner, link: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نص الإعلان (بالعربية)</label>
                <input
                  type="text"
                  value={form.topBanner.text}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      topBanner: { ...form.topBanner, text: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نص الإعلان (بالإنجليزية)</label>
                <input
                  type="text"
                  value={form.topBanner.textEn}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      topBanner: { ...form.topBanner, textEn: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Preview & Maintenance */}
        <div className="space-y-8">
          {/* Live Preview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>معاينة الهوية المباشرة</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-4">
              {/* Simulated Browser Tab with Live Favicon */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                <div className="w-3.5 h-3.5 rounded shrink-0 overflow-hidden flex items-center justify-center bg-slate-800">
                  {form.faviconUrl ? (
                    <img
                      src={normalizeMediaUrl(form.faviconUrl)}
                      alt="Favicon"
                      className="w-3.5 h-3.5 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/favicon.ico';
                      }}
                    />
                  ) : (
                    <Globe className="w-3 h-3 text-slate-400" />
                  )}
                </div>
                <span className="truncate font-semibold text-[10px] text-slate-200">
                  {form.logoText || 'CLEANZO'}
                </span>
                <span className="text-[9px] text-slate-500 mr-auto font-sans">الأيقونة المباشرة</span>
              </div>

              {/* Fake Top Banner */}
              {form.topBanner.enabled && (
                <div className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-[10px] flex items-center justify-between gap-2">
                  <span className="bg-white/20 px-1.5 py-0.5 rounded font-black">{form.topBanner.discountBadge}</span>
                  <span className="truncate flex-1 text-center">{form.topBanner.text}</span>
                </div>
              )}

              {/* Fake Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md"
                    style={{ backgroundColor: form.primaryColor }}
                  >
                    C
                  </div>
                </div>

                <div
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  {form.ctaText}
                </div>
              </div>

              {/* Fake Palette Swatches */}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                <span>تدرج الألوان:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: form.primaryColor }} title="Primary" />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: form.secondaryColor }} title="Secondary" />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: form.accentColor }} title="Accent" />
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Mode Emergency Card */}
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>وضع الصيانة (Maintenance)</span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.maintenanceMode}
                  onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              عند التفعيل، سيتم حجب واجهة العملاء وعرض شاشة الصيانة وتوجيه العملاء للتواصل مع خدمة الدعم عبر واتساب. لوحة الإدارة تظل تعمل كالمعتاد.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">رسالة الصيانة المعروضة للعملاء</label>
              <textarea
                rows={3}
                value={form.maintenanceMessage}
                onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
