'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Layers,
  Sparkles,
  Save,
  RotateCcw,
  ArrowRight,
  Eye,
  CheckCircle2,
  Navigation,
  Flame,
  HelpCircle,
  PhoneCall,
  Zap,
  Star,
  Megaphone,
  Sliders,
  Car,
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { MobileExperienceSettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminMobileSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const currentSettings = useSettingsStore((s) => s.settings.mobileExperience);
  const updateMobileExperience = useSettingsStore((s) => s.updateMobileExperience);
  const fetchAdminSettings = useSettingsStore((s) => s.fetchAdminSettings);
  const saveSettingsToDatabase = useSettingsStore((s) => s.saveSettingsToDatabase);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<MobileExperienceSettings>({
    enableMobileLayout: true,
    enableBottomNavigation: true,
    enableQuickBooking: true,
    showHeroOnMobile: false,
    showOffers: true,
    showGallery: true,
    showFAQ: true,
    showContact: true,
    showFloatingBookingButton: true,
    defaultHomeSection: 'categories',
    animations: true,
    showReviews: true,
    showServices: true,
    showWelcomeCard: true,
    showBannerOnMobile: true,
  });

  useEffect(() => {
    setMounted(true);
    fetchAdminSettings();
  }, [fetchAdminSettings]);

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        enableMobileLayout: currentSettings.enableMobileLayout ?? true,
        enableBottomNavigation: currentSettings.enableBottomNavigation ?? true,
        enableQuickBooking: currentSettings.enableQuickBooking ?? true,
        showHeroOnMobile: currentSettings.showHeroOnMobile ?? false,
        showOffers: currentSettings.showOffers ?? true,
        showGallery: currentSettings.showGallery ?? true,
        showFAQ: currentSettings.showFAQ ?? true,
        showContact: currentSettings.showContact ?? true,
        showFloatingBookingButton: currentSettings.showFloatingBookingButton ?? true,
        defaultHomeSection: currentSettings.defaultHomeSection ?? 'categories',
        animations: currentSettings.animations ?? true,
        showReviews: currentSettings.showReviews ?? true,
        showServices: currentSettings.showServices ?? true,
        showWelcomeCard: currentSettings.showWelcomeCard ?? true,
        showBannerOnMobile: currentSettings.showBannerOnMobile ?? true,
      });
    }
  }, [currentSettings]);

  const handleToggle = (key: keyof MobileExperienceSettings) => {
    const nextVal = !formData[key];
    const nextData = { ...formData, [key]: nextVal };
    setFormData(nextData);
    // Instant local state update across all open tabs/views
    updateMobileExperience({ [key]: nextVal });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    updateMobileExperience(formData);
    const success = await saveSettingsToDatabase({ mobileExperience: formData as any });
    setSaving(false);

    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تحديث إعدادات تجربة الموبايل وحفظها في قاعدة البيانات',
        module: 'settings',
        target: 'Mobile Experience Settings',
      });
      toast.success('تم حفظ إعدادات تجربة الموبايل في قاعدة البيانات وتطبيقها فوراً!');
    } else {
      toast.error('حدث خطأ أثناء حفظ الإعدادات في قاعدة البيانات');
    }
  };

  const handleReset = () => {
    const defaults: MobileExperienceSettings = {
      enableMobileLayout: true,
      enableBottomNavigation: true,
      enableQuickBooking: true,
      showHeroOnMobile: false,
      showOffers: true,
      showGallery: true,
      showFAQ: true,
      showContact: true,
      showFloatingBookingButton: true,
      defaultHomeSection: 'categories',
      animations: true,
      showReviews: true,
      showServices: true,
      showWelcomeCard: true,
      showBannerOnMobile: true,
    };
    setFormData(defaults);
    updateMobileExperience(defaults);
    toast.info('تمت استعادة الإعدادات الافتراضية الموصى بها لتجربة الموبايل');
  };

  if (!mounted) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        جارٍ تحميل إعدادات تجربة الموبايل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/settings" className="hover:text-sky-500">إعدادات النظام</Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">تجربة الموبايل</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Smartphone className="w-6 h-6 text-sky-500" />
            <span>إعدادات تجربة الموبايل (Mobile Experience)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تحكم كامل في مظهر وسلوك وأقسام الموقع على الهواتف الذكية وتطبيق التغييرات لحظياً
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
          <Button
            type="button"
            variant="primary"
            isLoading={saving}
            onClick={() => handleSave()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Core Mobile Engine Options */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Zap className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              المحرك الرئيسي لتجربة الموبايل (Core Mobile Layout)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enable Mobile Layout */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">تفعيل تجربة تطبيق الموبايل (App-Like Experience)</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  تحويل الواجهة الرئيسية على الموبايل إلى واجهة تطبيق سريع يركز على سهولة الحجز وتصفح الخدمات.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enableMobileLayout}
                onChange={() => handleToggle('enableMobileLayout')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Enable Bottom Navigation */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">شريط التنقل السفلي الثابت (Bottom Navigation)</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  تفعيل شريط تنقل سفلي ثابت مع تأثير الزجاج الشفاف لتسهيل الوصول للأقسام الرئيسية والحجوزات.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enableBottomNavigation}
                onChange={() => handleToggle('enableBottomNavigation')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Enable Quick Booking */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">الحجز السريع المباشر (Quick Booking Bottom Sheet)</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  فتح قائمة حجز منزلقة من أسفل الشاشة لإتمام الحجز في خطوات معدودة دون مغادرة الصفحة.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enableQuickBooking}
                onChange={() => handleToggle('enableQuickBooking')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show Floating Booking Button */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">زر الحجز العائم عند التمرير (Floating Button)</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  إظهار زر "احجز الآن" العائم في الزاوية السفلية بمجرد تمرير الصفحة للأسفل لسهولة الطلب.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showFloatingBookingButton}
                onChange={() => handleToggle('showFloatingBookingButton')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Micro-animations */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">المؤثرات الحركية والتفاعل (Micro-animations)</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  تأثيرات الضغط التفاعلي وانزلاق القوائم ونبض أزرار العروض لتجربة مستخدم عصرية وسلسة.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.animations}
                onChange={() => handleToggle('animations')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Default Section Order */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">القسم التمهيدي الأول (Default Focus)</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  اختيار القسم الذي يظهر أولاً للعميل في واجهة الموبايل.
                </p>
              </div>
              <select
                value={formData.defaultHomeSection}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setFormData((prev) => ({ ...prev, defaultHomeSection: val }));
                  updateMobileExperience({ defaultHomeSection: val });
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              >
                <option value="categories">فئات الخدمات (السيارات والمنازل)</option>
                <option value="offers">العروض والخصومات الحصرية</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section Visibility on Mobile */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Layers className="w-4 h-4 text-[#0866C6]" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              إظهار وإخفاء الأقسام في شاشة الموبايل (Section Visibility)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Show Welcome Card */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>كارت الترحيب الذكي (Welcome Header)</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  عرض كارت الترحيب الذكي بأعلى الصفحة "أهلاً بك في كلينزو - ماذا تريد تنظيفه اليوم؟".
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showWelcomeCard}
                onChange={() => handleToggle('showWelcomeCard')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show Services Cards */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-500" />
                  <span>كروت خدمات السيارات والمنازل (Services Cards)</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  عرض الكارتين البارزين لاختيار باقات غسيل السيارات وباقات نظافة المنازل بالبخار.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showServices}
                onChange={() => handleToggle('showServices')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show Desktop Hero */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">قسم الهيرو الكبير للديسكتوب (Desktop Hero)</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  {formData.showHeroOnMobile
                    ? 'الوضع الحالي: مفعل (يظهر الهيرو الكامل مع خلفية السيارة)'
                    : 'الوضع الحالي: مخفي ومستبدل بكروت الخدمات السريعة (الموصى به للهواتف)'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showHeroOnMobile}
                onChange={() => handleToggle('showHeroOnMobile')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show Offers */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  <span>شريط العروض والخصومات (Offers Section)</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  عرض كروت العروض الموسمية وأكواد الخصم السريعة للعملاء على الموبايل.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showOffers}
                onChange={() => handleToggle('showOffers')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show Gallery */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                  <span>معرض أعمالنا قبل وبعد (Recent Work Slider)</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  عرض سلايدر التمرير التفاعلي لنتائج غسيل السيارات وتلميع المنازل قبل وبعد.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showGallery}
                onChange={() => handleToggle('showGallery')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show Reviews */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>آراء وتقييمات العملاء (Customer Reviews)</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  عرض آراء العملاء الحقيقية وتجاربهم وتقييمات النجوم على شاشات الموبايل.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showReviews}
                onChange={() => handleToggle('showReviews')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show FAQ */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
                  <span>أكورديون الأسئلة الشائعة (FAQ Accordion)</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  عرض إجابات أهم الأسئلة التي تهم العميل مباشرة في الصفحة الرئيسية.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showFAQ}
                onChange={() => handleToggle('showFAQ')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show Fast Contact Bar */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                  <span>قسم التواصل السريع والمباشر (Fast Contact Bar)</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  عرض أزرار المحادثة الفورية عبر واتساب والاتصال الهاتفي السريع.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showContact}
                onChange={() => handleToggle('showContact')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>

            {/* Show Top Banner On Mobile */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                  <span>الشريط الإعلاني العلوي على الموبايل (Top Banner)</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  إظهار شريط الإعلانات وكود الخصم في أعلى الشاشة لمستخدمي الهواتف.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.showBannerOnMobile}
                onChange={() => handleToggle('showBannerOnMobile')}
                className="w-5 h-5 rounded-md accent-sky-500 cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-400">
            يتم تحديث واجهة الموبايل فورياً وتثبيتها في قاعدة البيانات
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              استعادة الافتراضي
            </button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="px-6 py-2.5 font-bold shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الموبايل الآن'}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

