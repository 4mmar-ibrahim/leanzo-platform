'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Home,
  Info,
  Phone,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  Save,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Star,
} from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminContentCMSPage() {
  const sections = useCMSStore((s) => s.sections);
  const toggleVisibility = useCMSStore((s) => s.toggleSectionVisibility);
  const reorderSections = useCMSStore((s) => s.reorderSections);
  const hasUnsavedChanges = useCMSStore((s) => s.hasUnsavedChanges);
  const setHasUnsavedChanges = useCMSStore((s) => s.setHasUnsavedChanges);
  const resetToDefaults = useCMSStore((s) => s.resetToDefaults);
  const fetchDraftContent = useCMSStore((s) => s.fetchDraftContent);
  const saveDraftToDatabase = useCMSStore((s) => s.saveDraftToDatabase);
  const publishToDatabase = useCMSStore((s) => s.publishToDatabase);
  const isSaving = useCMSStore((s) => s.isSaving);
  const lastPublishedAt = useCMSStore((s) => s.lastPublishedAt);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  React.useEffect(() => {
    fetchDraftContent();
  }, [fetchDraftContent]);

  const handleSaveDraft = async () => {
    const ok = await saveDraftToDatabase();
    if (ok) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'حفظ مسودة محتوى CMS',
        module: 'content',
        target: 'أقسام الموقع',
      });
      toast.success('تم حفظ مسودة محتوى الموقع بنجاح في قاعدة البيانات!');
    } else {
      toast.error('فشل حفظ المسودة في الخادم');
    }
  };

  const handlePublishAll = async () => {
    const ok = await publishToDatabase();
    if (ok) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'نشر محتوى المنصة للعملاء',
        module: 'content',
        target: 'الموقع بالكامل',
      });
      toast.success('تم نشر وتثبيت كافة تغييرات المحتوى في موقع العملاء بنجاح!');
    } else {
      toast.error('فشل نشر المحتوى إلى الخادم');
    }
  };

  return (
    <div className="space-y-6">
      {/* Unsaved changes banner */}
      {hasUnsavedChanges && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold text-amber-700 dark:text-amber-400">
              لديك تعديلات غير محفوظة في مسودة المحتوى
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
            >
              حفظ كمسودة
            </button>
            <button
              onClick={handlePublishAll}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl bg-[#0866C6] hover:bg-[#07345C] text-white text-xs font-bold shadow"
            >
              نشر للعملاء الآن 🚀
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            نظام إدارة المحتوى (Cleanzo CMS)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تحكم كامل بنصوص الصفحات، الواجهات، العناوين ومعلومات التواصل والأسئلة الشائعة
            {lastPublishedAt && (
              <span className="inline-block mr-2 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                آخر نشر: {new Date(lastPublishedAt).toLocaleTimeString('ar-EG')}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await resetToDefaults();
              toast.info('تم استعادة النصوص الافتراضية');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ مسودة</span>
          </button>
          <button
            onClick={handlePublishAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0866C6] hover:bg-[#07345C] text-white shadow-md transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>نشر لجميع العملاء</span>
          </button>
        </div>
      </div>


      {/* Main CMS Sub-Pages Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Link
          href="/admin/content/home"
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-sky-500/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Home className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-500">
            الصفحة الرئيسية (Home)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            تعديل نصوص الهيرو، صور الغلاف والإحصائيات
          </p>
        </Link>

        <Link
          href="/admin/content/about"
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#0866C6]/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#0866C6]/10 text-[#0866C6] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Info className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#0866C6]">
            صفحة من نحن (About)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            قصة التأسيس، الرؤية والرسالة، وفريق العمل
          </p>
        </Link>

        <Link
          href="/admin/content/contact"
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-500/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-500">
            بيانات التواصل (Contact)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            أرقام الهواتف، رابط واتساب، والعناوين
          </p>
        </Link>

        <Link
          href="/admin/content/faq"
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-500/50 transition-all group relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-500">
              الأسئلة الشائعة (FAQ)
            </h3>
            <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">✓</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إضافة وتعديل وترتيب الأسئلة والإجابات والتصنيفات
          </p>
        </Link>

        <Link
          href="/admin/content/reviews"
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-500/50 transition-all group relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Star className="w-5 h-5 fill-amber-500/30" />
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500">
              آراء العملاء (Reviews)
            </h3>
            <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">جديد</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إدارة آراء وتقييمات العملاء، الأسماء، الخدمات، التقييم، والصور
          </p>
        </Link>
      </div>

      {/* Sections Visibility & Ordering Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            التحكم في ظهور وترتيب أقسام الصفحة الرئيسية
          </h3>
          <p className="text-xs text-slate-400">
            يمكنك إخفاء أو إظهار أي قسم من الصفحة الرئيسية دون تعديل الكود
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold flex items-center justify-center text-slate-500">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{sec.nameAr}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{sec.key}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    disabled={idx === 0 || isSaving}
                    onClick={async () => {
                      await reorderSections(idx, idx - 1);
                      toast.success(`تم رفع ترتيب «${sec.nameAr}» وتحديث الموقع!`);
                    }}
                    title="تحريك لأعلى"
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white dark:hover:bg-slate-700 transition"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1 || isSaving}
                    onClick={async () => {
                      await reorderSections(idx, idx + 1);
                      toast.success(`تم خفض ترتيب «${sec.nameAr}» وتحديث الموقع!`);
                    }}
                    title="تحريك لأسفل"
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white dark:hover:bg-slate-700 transition"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={async () => {
                    const willBeVisible = !sec.visible;
                    await toggleVisibility(sec.id);
                    toast.success(
                      willBeVisible
                        ? `تم تفعيل قسم «${sec.nameAr}» وتحديث الاختصارات والموقع فوراً!`
                        : `تم إخفاء قسم «${sec.nameAr}» وحذفه من الاختصارات والموقع فوراً!`
                    );
                  }}
                  className={cn(
                    'px-3 py-1 rounded-full font-bold transition-colors flex items-center gap-1.5',
                    sec.visible
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  )}
                >
                  {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{sec.visible ? 'ظاهر للزوار' : 'مخفي'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
