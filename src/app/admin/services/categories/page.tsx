'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  ArrowRight,
  Edit,
  Trash2,
  CheckCircle2,
  Car,
  Home,
  Sparkles,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { ImageUploader } from '@/components/admin/ImageUploader';

export default function AdminCategoriesPage() {
  const categories = useServiceStore((s) => s.categories);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const addCategory = useServiceStore((s) => s.addCategory);
  const updateCategory = useServiceStore((s) => s.updateCategory);
  const deleteCategory = useServiceStore((s) => s.deleteCategory);
  const toggleActive = useServiceStore((s) => s.toggleCategoryActive);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const [catName, setCatName] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState('');

  const openAddModal = () => {
    setEditingCatId(null);
    setCatName('');
    setCatNameEn('');
    setCatSlug('');
    setCatDesc('');
    setCatImage('');
    setModalOpen(true);
  };

  const openEditModal = (cat: typeof categories[0]) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatNameEn(cat.nameEn);
    setCatSlug(cat.slug);
    setCatDesc(cat.description);
    setCatImage(cat.image);
    setModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error('يرجى كتابة اسم التصنيف');
      return;
    }

    // Auto-generate clean slug if not already set (e.g. when creating a new category)
    let cleanSlug = catSlug.trim();
    if (!cleanSlug) {
      if (catNameEn && catNameEn.trim()) {
        cleanSlug = catNameEn
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      if (!cleanSlug) {
        cleanSlug = catName
          .toLowerCase()
          .trim()
          .replace(/[\s\W]+/gu, '-')
          .replace(/^-+|-+$/g, '');
      }
      if (!cleanSlug) {
        cleanSlug = `cat-${Date.now().toString(36)}`;
      }
    } else {
      cleanSlug = cleanSlug.toLowerCase().trim().replace(/\s+/g, '-');
    }

    setIsSaving(true);

    try {
      if (editingCatId) {
        await updateCategory(editingCatId, {
          name: catName,
          nameEn: catNameEn || catName,
          slug: cleanSlug,
          description: catDesc,
          image: catImage,
        });
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل تصنيف خدمات',
          module: 'services',
          target: catName,
        });
        toast.success('تم تحديث التصنيف بنجاح');
      } else {
        await addCategory({
          slug: cleanSlug,
          name: catName,
          nameEn: catNameEn || catName,
          description: catDesc,
          descriptionEn: catDesc,
          icon: 'Sparkles',
          image: catImage,
          active: true,
          order: categories.length + 1,
        });
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إضافة تصنيف خدمات جديد',
          module: 'services',
          target: catName,
        });
        toast.success('تم إنشاء التصنيف الجديد بنجاح');
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving category:', err);
      toast.error(err?.message || 'فشل حفظ التصنيف، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/services"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة الخدمات
        </Link>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة تصنيف جديد</span>
        </button>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          تصنيفات وقطاعات الخدمات
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          إدارة القطاعات الرئيسية (سيارات، منازل) والتصنيفات المستقبلية
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="aspect-square w-full rounded-2xl overflow-hidden mb-4 relative bg-slate-50">
                <CleanzoImage
                  src={cat.image}
                  alt={cat.name}
                  fit="cover"
                  position="center"
                />
                <span
                  className={cn(
                    'absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs',
                    cat.active ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                  )}
                >
                  {cat.active ? 'نشط' : 'معطل'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{cat.name}</h3>
              <p className="text-[11px] text-sky-500 font-semibold mt-0.5">{cat.nameEn || cat.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {cat.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  toggleActive(cat.id);
                  toast.info('تم تبديل حالة ظهور التصنيف');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                {cat.active ? 'تعطيل' : 'تفعيل'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(cat)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                {cat.slug !== 'car' && cat.slug !== 'home' && (
                  <button
                    onClick={async () => {
                      if (window.confirm(`هل أنت متأكد من حذف تصنيف "${cat.name}"؟`)) {
                        deleteCategory(cat.id);
                        try {
                          await cleanzoApi.services.deleteCategory(cat.id);
                        } catch {
                          // local store already updated
                        }
                        toast.success(`تم حذف التصنيف "${cat.name}" بنجاح`);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                    title="حذف التصنيف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-hidden animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-[#071F38] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-[#133B61] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#133B61]/80 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-[#05182C]/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-[#0866C6] dark:text-sky-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingCatId ? 'تعديل التصنيف' : 'إضافة تصنيف خدمات جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingCatId ? 'تحديث بيانات وتصميم التصنيف' : 'أدخل بيانات التصنيف وصورته بدقة 1:1'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                {/* Arabic & English Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      اسم التصنيف (بالعربية) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="مثال: خدمات المكاتب والشركات"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] text-xs transition"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                      اسم التصنيف (بالإنجليزية)
                    </label>
                    <input
                      type="text"
                      value={catNameEn}
                      onChange={(e) => setCatNameEn(e.target.value)}
                      placeholder="e.g. Commercial Services"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] text-xs transition"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">الوصف</label>
                  <textarea
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    rows={2}
                    placeholder="اكتب وصفاً موجزاً للخدمات المندرجة تحت هذا التصنيف..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] text-xs transition resize-none"
                  />
                </div>

                {/* Unified 1:1 Image Uploader */}
                <div>
                  <ImageUploader
                    value={catImage}
                    onChange={(url) => setCatImage(url)}
                    label="صورة التصنيف (المقاس القياسي: 1:1 مربع)"
                    description="ارفع صورة عالية الدقة أو اخترها من مكتبة الوسائط"
                    defaultFit="cover"
                    allowFitToggle={true}
                  />
                </div>
              </div>

              {/* Sticky Action Buttons Footer */}
              <div className="sticky bottom-0 z-10 px-6 py-3.5 bg-slate-50/95 dark:bg-[#05182C]/95 backdrop-blur-md border-t border-slate-100 dark:border-[#133B61]/80 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#0756A8] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-sky-500/10 transition cursor-pointer active:scale-[0.98]"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{isSaving ? 'جارٍ الحفظ...' : editingCatId ? 'حفظ التعديلات' : 'إضافة التصنيف'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
