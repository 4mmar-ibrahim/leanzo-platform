'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Save, Send, Eye, Loader2, Clock } from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';

export default function AdminContentAboutPage() {
  const about = useCMSStore((s) => s.about);
  const isLoading = useCMSStore((s) => s.isLoading);
  const isSaving = useCMSStore((s) => s.isSaving);
  const lastPublishedAt = useCMSStore((s) => s.lastPublishedAt);
  const updateAbout = useCMSStore((s) => s.updateAbout);
  const fetchDraftContent = useCMSStore((s) => s.fetchDraftContent);
  const saveDraftToDatabase = useCMSStore((s) => s.saveDraftToDatabase);
  const publishToDatabase = useCMSStore((s) => s.publishToDatabase);
  const setHasUnsavedChanges = useCMSStore((s) => s.setHasUnsavedChanges);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [title, setTitle] = useState(about.title);
  const [description, setDescription] = useState(about.description);
  const [mission, setMission] = useState(about.mission);
  const [vision, setVision] = useState(about.vision);
  const [story, setStory] = useState(about.story);

  useEffect(() => {
    fetchDraftContent();
  }, [fetchDraftContent]);

  useEffect(() => {
    if (about) {
      setTitle(about.title || '');
      setDescription(about.description || '');
      setMission(about.mission || '');
      setVision(about.vision || '');
      setStory(about.story || '');
    }
  }, [about]);

  const applyLocalChanges = () => {
    updateAbout({
      title,
      description,
      mission,
      vision,
      story,
    });
  };

  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    applyLocalChanges();
    const success = await saveDraftToDatabase();
    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'حفظ مسودة صفحة من نحن',
        module: 'content',
        target: 'صفحة من نحن',
      });
      toast.success('تم حفظ مسودة صفحة من نحن في قاعدة البيانات بنجاح!');
    } else {
      toast.error('حدث خطأ أثناء حفظ المسودة.');
    }
  };

  const handlePublish = async () => {
    applyLocalChanges();
    const success = await publishToDatabase();
    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'نشر صفحة من نحن للعملاء',
        module: 'content',
        target: 'صفحة من نحن',
      });
      toast.success('تم نشر محتوى صفحة من نحن لجميع زوار وعملاء الموقع بنجاح!');
    } else {
      toast.error('فشل نشر المحتوى. تأكد من اتصال الخادم.');
    }
  };

  return (
    <div className="space-y-6">
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
              <span>آخر نشر: {new Date(lastPublishedAt).toLocaleString('ar-EG')}</span>
            </span>
          )}
          <Link
            href="/about"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-500 hover:underline px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة صفحة من نحن</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            إدارة صفحة من نحن (About Cleanzo)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تعديل قصة كلينزو، الرؤية، الرسالة، ومعايير الجودة في قاعدة البيانات
          </p>
        </div>

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

      <form onSubmit={handleSaveDraft} className="space-y-6 max-w-4xl">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">عنوان الصفحة الرئيسي</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">الوصف التمهيدي</label>
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
            <label className="block text-xs font-semibold mb-1">قصة التأسيس والانطلاق</label>
            <textarea
              rows={4}
              value={story}
              onChange={(e) => {
                setStory(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">رسالتنا (Our Mission)</label>
              <textarea
                rows={3}
                value={mission}
                onChange={(e) => {
                  setMission(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">رؤيتنا (Our Vision)</label>
              <textarea
                rows={3}
                value={vision}
                onChange={(e) => {
                  setVision(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving || isLoading}
              onClick={handlePublish}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>نشر التعديلات للعملاء</span>
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ كمسودة</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
