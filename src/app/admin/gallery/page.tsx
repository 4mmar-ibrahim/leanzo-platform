'use client';

import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Car,
  Home,
  Sparkles,
  Layers,
  Star,
  Smartphone,
  Layout,
  MoveHorizontal,
  X,
  Check,
} from 'lucide-react';
import { useGalleryStore } from '@/store/useGalleryStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { ServiceCategory, GalleryDisplayMode, GalleryItem } from '@/types';
import { BeforeAfterSlider } from '@/components/gallery/BeforeAfterSlider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { ImageUploader } from '@/components/admin/ImageUploader';


export default function AdminGalleryPage() {
  const items = useGalleryStore((s) => s.items);
  const fetchAdminGallery = useGalleryStore((s) => s.fetchAdminGallery);
  const addItem = useGalleryStore((s) => s.addItem);
  const updateItem = useGalleryStore((s) => s.updateItem);
  const deleteItem = useGalleryStore((s) => s.deleteItem);
  const toggleVisibility = useGalleryStore((s) => s.toggleVisibility);

  React.useEffect(() => {
    fetchAdminGallery();
  }, [fetchAdminGallery]);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'car' | 'home' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('car');
  const [subCategory, setSubCategory] = useState('exterior');
  const [image, setImage] = useState('');
  const [beforeImage, setBeforeImage] = useState('');
  const [afterImage, setAfterImage] = useState('');
  const [description, setDescription] = useState('');
  const [displayMode, setDisplayMode] = useState<GalleryDisplayMode>('before_after');
  const [featured, setFeatured] = useState(false);
  const [homepageFeatured, setHomepageFeatured] = useState(false);
  const [mobileFeatured, setMobileFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(1);

  // Preview Selected Item in Modal
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setTitleEn('');
    setCategory(categoryFilter === 'all' ? 'car' : (categoryFilter as ServiceCategory));
    setSubCategory('exterior');
    setImage('');
    setBeforeImage('');
    setAfterImage('');
    setDescription('');
    setDisplayMode('before_after');
    setFeatured(false);
    setHomepageFeatured(false);
    setMobileFeatured(false);
    setSortOrder(items.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (item: GalleryItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setTitleEn(item.titleEn || item.title);
    setCategory(item.category);
    setSubCategory(item.subCategory);
    setImage(item.image || item.afterImage || '');
    setBeforeImage(item.beforeImage || '');
    setAfterImage(item.afterImage || item.image || '');
    setDescription(item.description);
    setDisplayMode(item.displayMode || 'before_after');
    setFeatured(item.featured || false);
    setHomepageFeatured(item.homepageFeatured || false);
    setMobileFeatured(item.mobileFeatured || false);
    setSortOrder(item.sortOrder || 1);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalImage = afterImage || beforeImage || image;

    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان العمل');
      return;
    }

    if (!finalImage) {
      toast.error('يرجى رفع صورة قبل أو صورة بعد على الأقل');
      return;
    }

    const itemData = {
      title: title.trim(),
      titleEn: (titleEn || title).trim(),
      category,
      subCategory,
      image: finalImage,
      beforeImage: beforeImage || undefined,
      afterImage: afterImage || undefined,
      description,
      descriptionEn: description,
      displayMode,
      featured,
      homepageFeatured,
      mobileFeatured,
      sortOrder: Number(sortOrder) || 1,
    };


    try {
      if (editingId) {
        await updateItem(editingId, itemData);
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل عمل في المعرض',
          module: 'gallery',
          target: title,
        });
        toast.success('تم تحديث بيانات العمل في المعرض بنجاح');
      } else {
        await addItem({
          ...itemData,
          visible: true,
        });
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إضافة عمل جديد للمعرض',
          module: 'gallery',
          target: title,
        });
        toast.success('تمت إضافة العمل بنجاح إلى المعرض');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء حفظ العمل في المعرض');
    }
  };

  return (
    <div className="space-y-8 pb-16 text-start" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>إدارة معرض الأعمال (Portfolio & Before/After)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#0866C6]/10 text-[#0866C6] text-xs font-black">
              {items.length} عمل
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            تحكم في صور قبل وبعد، وأنماط العرض التحريري (Hero, Slider, Editorial)، والظهور على الواجهة والموبايل
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md rounded-xl font-black cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عمل جديد</span>
        </Button>
      </div>

      {/* Category Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              categoryFilter === 'all'
                ? 'bg-[#0866C6] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <span>جميع الأقسام</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                categoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
            >
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('car')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              categoryFilter === 'car'
                ? 'bg-[#0866C6] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Car className="w-3.5 h-3.5" />
            <span>أعمال السيارات</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                categoryFilter === 'car' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
            >
              {items.filter((i) => i.category === 'car').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('home')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              categoryFilter === 'home'
                ? 'bg-[#0866C6] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>أعمال المنازل</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                categoryFilter === 'home' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
            >
              {items.filter((i) => i.category === 'home').length}
            </span>
          </button>

          {Array.from(new Set(items.map((i) => i.category).filter((c) => c && c !== 'car' && c !== 'home'))).map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  categoryFilter === cat
                    ? 'bg-[#0866C6] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <span>{cat}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                    categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الأعمال..."
            className="w-full px-3.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Gallery Items Grid with Rich Metadata Badges */}
      {items.filter((item) => {
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesSearch =
          !searchQuery.trim() ||
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subCategory?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      }).length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <ImageIcon className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            لا توجد أعمال في هذا القسم حالياً
          </h3>
          <p className="text-xs text-slate-500">
            يمكنك إضافة عمل جديد في هذا القسم أو اختيار عرض "جميع الأقسام".
          </p>
          <Button variant="outline" size="sm" onClick={() => { setCategoryFilter('all'); setSearchQuery(''); }}>
            إلغاء الفلتر
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items
            .filter((item) => {
              const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
              const matchesSearch =
                !searchQuery.trim() ||
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.subCategory?.toLowerCase().includes(searchQuery.toLowerCase());
              return matchesCategory && matchesSearch;
            })
            .map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#082845] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Visual Thumbnail - Fixed 1:1 Square Ratio */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                  <CleanzoImage
                    src={item.afterImage || item.image || item.beforeImage}
                    alt={item.title}
                    fit="cover"
                    position="center"
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

              {/* Badges Overlay */}
              <div className="absolute top-3 start-3 flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white text-[11px] font-black">
                  {item.category === 'car' ? '🚗 سيارات' : '🏡 منازل'}
                </span>

                <span className="px-2.5 py-1 rounded-xl bg-[#0866C6] text-white text-[10px] font-black">
                  {item.displayMode === 'featured_hero' && 'Featured Hero 🌟'}
                  {item.displayMode === 'editorial' && 'Editorial 📰'}
                  {item.displayMode === 'before_after' && 'قبل وبعد ↔️'}
                  {item.displayMode === 'horizontal_slider' && 'شريط أفقي 🎞️'}
                  {item.displayMode === 'standard_card' && 'بطاقة عادية 🔲'}
                  {!item.displayMode && 'عادي'}
                </span>
              </div>

              {/* Status Badges */}
              <div className="absolute top-3 end-3 flex items-center gap-1">
                {item.featured && (
                  <span className="p-1 rounded-lg bg-amber-500 text-white" title="مميز في المعرض">
                    <Star className="w-3.5 h-3.5 fill-white" />
                  </span>
                )}
                {item.homepageFeatured && (
                  <span className="p-1 rounded-lg bg-[#0866C6] text-white text-[10px] font-black px-1.5" title="في الرئيسية">
                    Home
                  </span>
                )}
                {item.mobileFeatured && (
                  <span className="p-1 rounded-lg bg-[#F0444C] text-white" title="في الموبايل">
                    <Smartphone className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* Before/After Indicator if available */}
              {item.beforeImage && item.afterImage && (
                <div className="absolute bottom-3 end-3">
                  <span className="px-2 py-0.5 rounded-lg bg-[#F0444C] text-white text-[10px] font-black shadow-md flex items-center gap-1">
                    <MoveHorizontal className="w-3 h-3" />
                    <span>مقارنة تفاعلية</span>
                  </span>
                </div>
              )}
            </div>

            {/* Info and Actions */}
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVisibility(item.id)}
                    className={cn(
                      'p-2 rounded-xl text-xs font-bold transition-colors',
                      item.visible !== false
                        ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        : 'text-slate-400 hover:bg-slate-100'
                    )}
                    title={item.visible !== false ? 'ظاهر للعملاء' : 'مخفي عن العملاء'}
                  >
                    {item.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {item.beforeImage && (
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="p-2 rounded-xl text-[#0866C6] hover:bg-[#0866C6]/10 text-xs font-bold"
                      title="معاينة شريط المقارنة"
                    >
                      <MoveHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('هل أنت متأكد من حذف هذا العمل من المعرض؟')) {
                        deleteItem(item.id);
                        toast.info('تم حذف العمل من المعرض');
                      }
                    }}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-hidden animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#071F38] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-[#133B61] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#133B61]/80 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-[#05182C]/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-[#0866C6] dark:text-sky-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingId ? 'تعديل بيانات العمل في المعرض' : 'إضافة عمل جديد لمعرض كلينزو'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    إدارة تفاصيل العمل، صور المعالجة قبل وبعد، ونمط العرض
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
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
                {/* Titles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      عنوان العمل (عربي) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition"
                      placeholder="مثال: تلميع سيارة مرسيدس ومعالجة طلاء"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">عنوان العمل (إنجليزي)</label>
                    <input
                      type="text"
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-xs font-bold font-sans text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition"
                      placeholder="e.g. Mercedes S-Class Paint Correction"
                    />
                  </div>
                </div>

                {/* Categories & Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">الفئة الأساسية</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition"
                    >
                      <option value="car">🚗 سيارات (Car)</option>
                      <option value="home">🏡 منازل (Home)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">نمط العرض (Display Mode)</label>
                    <select
                      value={displayMode}
                      onChange={(e) => setDisplayMode(e.target.value as GalleryDisplayMode)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition"
                    >
                      <option value="before_after">Before / After قبل وبعد</option>
                      <option value="editorial">Editorial تحريري</option>
                      <option value="featured_hero">Featured Hero بطل مميز</option>
                      <option value="horizontal_slider">Horizontal Slider شريط أفقي</option>
                      <option value="standard_card">Standard Card بطاقة عادية</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">الترتيب (Sort Order)</label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition"
                      min={1}
                    />
                  </div>
                </div>

                {/* Before and After Images Section */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#133B61] bg-slate-50/50 dark:bg-[#05182C]/50 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MoveHorizontal className="w-4 h-4 text-[#0866C6]" />
                        <span>صور العمل (قبل وبعد المعالجة - 1:1 مربع)</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ارفع صورة "قبل" وصورة "بعد" مباشرة. ستُعتمد صورة (بعد) تلقائياً كالصورة الأساسية للعمل في المعرض والواجهة.
                      </p>
                    </div>

                    {beforeImage && afterImage && (
                      <button
                        type="button"
                        onClick={() => setPreviewItem({ title, beforeImage, afterImage } as any)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950 text-[#0866C6] dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition cursor-pointer self-start sm:self-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة شريط المقارنة الحي</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Before Image */}
                    <div className="rounded-2xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#133B61] p-3.5 shadow-2xs">
                      <ImageUploader
                        value={beforeImage}
                        onChange={(url) => setBeforeImage(url)}
                        label="صورة 'قبل' (قبل المعالجة - 1:1)"
                        description="المقاس القياسي 1:1 مربع (اختياري)"
                        defaultFit="cover"
                        compact={true}
                        allowPosition={true}
                      />
                    </div>

                    {/* After Image */}
                    <div className="rounded-2xl bg-white dark:bg-[#072540] border-2 border-sky-400/40 dark:border-sky-500/40 p-3.5 shadow-2xs relative">
                      <div className="absolute top-3 end-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950 text-[#0866C6] dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        الصورة الأساسية المعتمدة
                      </div>
                      <ImageUploader
                        value={afterImage}
                        onChange={(url) => setAfterImage(url)}
                        label="صورة 'بعد' (بعد المعالجة - 1:1) *"
                        description="المقاس القياسي 1:1 مربع • الصورة المعتمدة للعمل"
                        defaultFit="cover"
                        required={!beforeImage}
                        compact={true}
                        allowPosition={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">وصف العمل وتفاصيل المعالجة</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-xs font-bold text-slate-900 dark:text-white leading-relaxed resize-none focus:outline-hidden focus:border-[#0866C6] transition"
                    placeholder="شرح مختصر لما تم إنجازه في هذه الخدمة..."
                  />
                </div>

                {/* Switches for Flags */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <label className="p-3 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#062038] transition">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">عمل مميز (Featured)</span>
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="w-4 h-4 accent-[#0866C6] rounded cursor-pointer"
                    />
                  </label>

                  <label className="p-3 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#062038] transition">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">عرض بالرئيسية</span>
                    <input
                      type="checkbox"
                      checked={homepageFeatured}
                      onChange={(e) => setHomepageFeatured(e.target.checked)}
                      className="w-4 h-4 accent-[#0866C6] rounded cursor-pointer"
                    />
                  </label>

                  <label className="p-3 rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#062038] transition">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">عرض بتطبيق الموبايل</span>
                    <input
                      type="checkbox"
                      checked={mobileFeatured}
                      onChange={(e) => setMobileFeatured(e.target.checked)}
                      className="w-4 h-4 accent-[#0866C6] rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Sticky Action Buttons Footer */}
              <div className="sticky bottom-0 z-10 px-6 py-3.5 bg-slate-50/95 dark:bg-[#05182C]/95 backdrop-blur-md border-t border-slate-100 dark:border-[#133B61] flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#0756A8] text-white font-bold text-xs shadow-md shadow-sky-500/10 transition cursor-pointer active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'حفظ التعديلات' : 'حفظ العمل في المعرض'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Before/After Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white dark:bg-[#082845] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                معاينة حية لشريط المقارنة (قبل وبعد)
              </h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <BeforeAfterSlider
              beforeImage={previewItem.beforeImage || previewItem.image}
              afterImage={previewItem.afterImage || previewItem.image}
              title={previewItem.title}
            />
          </div>
        </div>
      )}
    </div>
  );
}
