'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Save,
  Send,
  Home,
  Car,
  Eye,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { MediaUploadZone } from '@/components/media/MediaUploadZone';
import { ActionButtonEditor } from '@/components/admin/cms/ActionButtonEditor';
import { CMSActionButton } from '@/types';
import { toast } from 'sonner';

export default function AdminContentHomePage() {
  const hero = useCMSStore((s) => s.hero);
  const isLoading = useCMSStore((s) => s.isLoading);
  const isSaving = useCMSStore((s) => s.isSaving);
  const hasUnsavedChanges = useCMSStore((s) => s.hasUnsavedChanges);
  const lastPublishedAt = useCMSStore((s) => s.lastPublishedAt);
  const updateHero = useCMSStore((s) => s.updateHero);
  const fetchDraftContent = useCMSStore((s) => s.fetchDraftContent);
  const saveDraftToDatabase = useCMSStore((s) => s.saveDraftToDatabase);
  const publishToDatabase = useCMSStore((s) => s.publishToDatabase);
  const setHasUnsavedChanges = useCMSStore((s) => s.setHasUnsavedChanges);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  // Form State
  const [headline, setHeadline] = useState(hero.headline);
  const [headlineEn, setHeadlineEn] = useState(hero.headlineEn);
  const [description, setDescription] = useState(hero.description);
  const [descriptionEn, setDescriptionEn] = useState(hero.descriptionEn);
  const [announcement, setAnnouncement] = useState(hero.announcement);
  const [image, setImage] = useState(hero.image);
  const [carImage, setCarImage] = useState(hero.carImage || '');
  const [homeImage, setHomeImage] = useState(hero.homeImage || '');
  const [primaryCtaText, setPrimaryCtaText] = useState(hero.primaryCtaText);
  const [primaryCtaLink, setPrimaryCtaLink] = useState(hero.primaryCtaLink);
  const [secondaryCtaText, setSecondaryCtaText] = useState(hero.secondaryCtaText);
  const [secondaryCtaLink, setSecondaryCtaLink] = useState(hero.secondaryCtaLink);

  const [actionButtons, setActionButtons] = useState<CMSActionButton[]>(() => {
    if (hero.actionButtons && hero.actionButtons.length > 0) {
      return hero.actionButtons;
    }
    return [
      {
        id: 'btn-1',
        label: hero.primaryCtaText || 'احجز الآن',
        labelEn: hero.primaryCtaTextEn || 'Book Now',
        enabled: true,
        destinationType: 'booking',
        destinationValue: hero.primaryCtaLink || '/booking',
        order: 0,
        variant: 'primary',
      },
      {
        id: 'btn-2',
        label: hero.secondaryCtaText || 'استكشف خدماتنا',
        labelEn: hero.secondaryCtaTextEn || 'Explore Services',
        enabled: true,
        destinationType: 'services',
        destinationValue: hero.secondaryCtaLink || '/services',
        order: 1,
        variant: 'secondary',
      },
    ];
  });

  // Load latest draft from backend on mount
  useEffect(() => {
    fetchDraftContent();
  }, [fetchDraftContent]);

  // Sync state whenever hero from store updates
  useEffect(() => {
    if (hero) {
      setHeadline(hero.headline || '');
      setHeadlineEn(hero.headlineEn || '');
      setDescription(hero.description || '');
      setDescriptionEn(hero.descriptionEn || '');
      setAnnouncement(hero.announcement || '');
      setImage(hero.image || '');
      setCarImage(hero.carImage || '');
      setHomeImage(hero.homeImage || '');
      setPrimaryCtaText(hero.primaryCtaText || '');
      setPrimaryCtaLink(hero.primaryCtaLink || '');
      setSecondaryCtaText(hero.secondaryCtaText || '');
      setSecondaryCtaLink(hero.secondaryCtaLink || '');

      if (hero.actionButtons && hero.actionButtons.length > 0) {
        setActionButtons(hero.actionButtons);
      }
    }
  }, [hero]);

  const applyLocalChanges = () => {
    // Keep legacy CTA fields synced with first enabled action buttons
    const enabledBtns = actionButtons.filter((b) => b.enabled);
    const pBtn = enabledBtns[0];
    const sBtn = enabledBtns[1];

    const finalPrimaryText = pBtn ? pBtn.label : primaryCtaText;
    const finalPrimaryLink = pBtn ? pBtn.destinationValue : primaryCtaLink;
    const finalSecondaryText = sBtn ? sBtn.label : secondaryCtaText;
    const finalSecondaryLink = sBtn ? sBtn.destinationValue : secondaryCtaLink;

    updateHero({
      headline,
      headlineEn,
      description,
      descriptionEn,
      announcement,
      image,
      carImage,
      homeImage,
      primaryCtaText: finalPrimaryText,
      primaryCtaLink: finalPrimaryLink,
      secondaryCtaText: finalSecondaryText,
      secondaryCtaLink: finalSecondaryLink,
      actionButtons,
    });
  };

  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    applyLocalChanges();
    const success = await saveDraftToDatabase();
    if (success) {
      await publishToDatabase();
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'حفظ وتثبيت محتوى وأزرار واجهة الهيرو',
        module: 'content',
        target: 'الصفحة الرئيسية',
        details: headline,
      });
      toast.success('تم حفظ التعديلات ونشرها فوراً في الصفحة بنجاح!');
    } else {
      toast.error('حدث خطأ أثناء حفظ التعديلات. يرجى المحاولة لاحقاً.');
    }
  };

  const handlePublish = async () => {
    applyLocalChanges();
    const success = await publishToDatabase();
    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'نشر واجهة الهيرو للعملاء في الموقع الحي',
        module: 'content',
        target: 'الصفحة الرئيسية',
        details: headline,
      });
      toast.success('تم نشر محتوى الصفحة الرئيسية لجميع زوار وعملاء الموقع بنجاح!');
    } else {
      toast.error('فشل نشر المحتوى. تأكد من اتصال الخادم.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لمركز المحتوى CMS
        </Link>
        <div className="flex items-center gap-3">
          {lastPublishedAt && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
              <Clock className="w-3 h-3" />
              <span>آخر نشر للعملاء: {new Date(lastPublishedAt).toLocaleString('ar-EG')}</span>
            </span>
          )}
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-500 hover:underline px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة الصفحة الرئيسية مباشرة</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            إدارة واجهة الصفحة الرئيسية (Hero Section)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تعديل العناوين الرئيسية، شريط الإعلانات، صور الغلاف، وأزرار الحجز — مصدر الحقيقة هو قاعدة البيانات
          </p>
        </div>

        {/* Global actions bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={() => handleSaveDraft()}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>حفظ كمسودة</span>
          </button>
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={handlePublish}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 shadow-sm shadow-emerald-600/30 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>نشر مباشر للعملاء</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveDraft} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 2 Cols: Text fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">العناوين والوصف</h3>

              <div>
                <label className="block text-xs font-semibold mb-1">شريط الإعلان العلوي (Announcement Bar)</label>
                <input
                  type="text"
                  value={announcement}
                  onChange={(e) => {
                    setAnnouncement(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">العنوان الرئيسي (عربي)</label>
                  <input
                    type="text"
                    required
                    value={headline}
                    onChange={(e) => {
                      setHeadline(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Headline (English)</label>
                  <input
                    type="text"
                    value={headlineEn}
                    onChange={(e) => {
                      setHeadlineEn(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">الوصف الفرعي (عربي)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Subtitle / Description (English)</label>
                <textarea
                  rows={2}
                  value={descriptionEn}
                  onChange={(e) => {
                    setDescriptionEn(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed"
                />
              </div>
            </div>

            {/* Action Buttons Editor */}
            <ActionButtonEditor
              buttons={actionButtons}
              onChange={(updatedBtns) => {
                setActionButtons(updatedBtns);
                setHasUnsavedChanges(true);
              }}
            />
          </div>

          {/* Right Col: Images & Actions */}
          <div className="space-y-6">
            {/* Car Services Image */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">صورة واجهة خدمات السيارات 🚗</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تظهر في الهيرو عند اختيار باقات غسيل وتلميع السيارات</p>
                </div>
              </div>
              <MediaUploadZone
                value={carImage}
                onChange={(url) => {
                  setCarImage(url);
                  setHasUnsavedChanges(true);
                }}
                accept="image"
                label="اختر صورة خدمات السيارات"
                description="اسحب وأفلت صورة لسيارات الخدمة أو اكتب رابط مباشر"
              />
            </div>

            {/* Home Services Image */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">صورة واجهة خدمات المنازل 🏠</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تظهر في الهيرو عند اختيار باقات تنظيف وتعقيم المنازل</p>
                </div>
              </div>
              <MediaUploadZone
                value={homeImage}
                onChange={(url) => {
                  setHomeImage(url);
                  setHasUnsavedChanges(true);
                }}
                accept="image"
                label="اختر صورة خدمات المنازل"
                description="اسحب وأفلت صورة لتنظيف المنازل بالبخار أو اكتب رابط مباشر"
              />
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <button
                type="button"
                disabled={isSaving || isLoading}
                onClick={handlePublish}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>نشر التعديلات فوراً للعملاء</span>
              </button>

              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ كمسودة في قاعدة البيانات</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
