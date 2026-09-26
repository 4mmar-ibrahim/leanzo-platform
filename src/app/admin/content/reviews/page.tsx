'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Car,
  Home,
  User,
  X,
  UploadCloud,
  Check,
  Calendar,
  Layers,
  Image as ImageIcon,
  AlertTriangle,
  ZoomIn,
} from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { Review, ServiceCategory } from '@/types';
import { MediaUploadZone } from '@/components/media/MediaUploadZone';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminReviewsManagementPage() {
  const reviews = useCMSStore((s) => s.reviews);
  const fetchAdminReviews = useCMSStore((s) => s.fetchAdminReviews);
  const addReview = useCMSStore((s) => s.addReview);
  const updateReview = useCMSStore((s) => s.updateReview);
  const deleteReview = useCMSStore((s) => s.deleteReview);
  const deleteAllReviews = useCMSStore((s) => s.deleteAllReviews);
  const reorderReviews = useCMSStore((s) => s.reorderReviews);
  const toggleReviewVisibility = useCMSStore((s) => s.toggleReviewVisibility);
  const resetToDefaults = useCMSStore((s) => s.resetToDefaults);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  React.useEffect(() => {
    fetchAdminReviews();
  }, [fetchAdminReviews]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerNameEn, setCustomerNameEn] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('car');
  const [comment, setComment] = useState('');
  const [commentEn, setCommentEn] = useState('');
  const [date, setDate] = useState('الآن');
  
  // Image / Screenshot Upload State
  const [image, setImage] = useState('');
  const [hasAvatar, setHasAvatar] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [hasRating, setHasRating] = useState(true);
  const [rating, setRating] = useState(5);
  const [verified, setVerified] = useState(true);
  const [visible, setVisible] = useState(true);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة يجب ألا يتجاوز 10 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImage(dataUrl);
      setAvatar(dataUrl);
      setHasAvatar(true);
      toast.success('تم إرفاق صورة / سكرين شوت العميل بنجاح من جهازك');
    };
    reader.onerror = () => {
      toast.error('فشل قراءة ملف الصورة');
    };
    reader.readAsDataURL(file);
  };

  // Reset form
  const resetForm = () => {
    setEditingReview(null);
    setCustomerName('');
    setCustomerNameEn('');
    setServiceName('');
    setServiceNameEn('');
    setCategory('car');
    setComment('');
    setCommentEn('');
    setDate('الآن');
    setImage('');
    setHasAvatar(false);
    setAvatar('');
    setHasRating(true);
    setRating(5);
    setVerified(true);
    setVisible(true);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (rev: Review) => {
    setEditingReview(rev);
    setCustomerName(rev.customerName);
    setCustomerNameEn(rev.customerNameEn || '');
    setServiceName(rev.serviceName);
    setServiceNameEn(rev.serviceNameEn || '');
    setCategory(rev.category || 'car');
    setComment(rev.comment);
    setCommentEn(rev.commentEn || '');
    setDate(rev.date || 'الآن');
    const attachedImg = rev.image || rev.avatar || '';
    setImage(attachedImg);
    setHasAvatar(Boolean(attachedImg && attachedImg.trim().length > 0));
    setAvatar(attachedImg);
    setHasRating(Boolean(rev.rating && rev.rating > 0));
    setRating(rev.rating && rev.rating > 0 ? rev.rating : 5);
    setVerified(rev.verified !== false);
    setVisible(rev.visible !== false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }
    if (!serviceName.trim()) {
      toast.error('يرجى إدخال اسم الخدمة التي حصل عليها العميل');
      return;
    }
    if (!comment.trim()) {
      toast.error('يرجى إدخال نص رأي أو تقييم العميل');
      return;
    }

    const reviewPayload: Omit<Review, 'id'> = {
      customerName: customerName.trim(),
      customerNameEn: customerNameEn.trim(),
      serviceName: serviceName.trim(),
      serviceNameEn: serviceNameEn.trim(),
      category,
      comment: comment.trim(),
      commentEn: commentEn.trim(),
      date: date.trim() || 'الآن',
      image: image.trim() || (hasAvatar ? avatar.trim() : ''),
      avatar: hasAvatar ? avatar.trim() : (image.trim() || ''),
      rating: hasRating ? rating : 0,
      verified,
      visible,
    };

    if (editingReview) {
      const ok = await updateReview(editingReview.id, reviewPayload);
      if (ok) {
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل رأي عميل',
          module: 'content',
          target: customerName,
        });
        toast.success(`تم تحديث رأي العميل «${customerName}» بنجاح!`);
        setModalOpen(false);
      } else {
        toast.error('حدث خطأ أثناء تحديث الرأي');
      }
    } else {
      const created = await addReview(reviewPayload);
      if (created) {
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إضافة رأي عميل جديد',
          module: 'content',
          target: customerName,
        });
        toast.success(`تمت إضافة رأي العميل «${customerName}» بنجاح!`);
        setModalOpen(false);
      } else {
        toast.error('حدث خطأ أثناء إضافة الرأي');
      }
    }
  };

  const handleDelete = async (rev: Review) => {
    if (confirm(`هل أنت متأكد من حذف تقييم العميل «${rev.customerName}»؟`)) {
      const ok = await deleteReview(rev.id);
      if (ok) {
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'حذف رأي عميل',
          module: 'content',
          target: rev.customerName,
        });
        toast.success('تم حذف رأي العميل بنجاح');
      } else {
        toast.error('فشل حذف الرأي');
      }
    }
  };

  const handleClearAllReviews = async () => {
    try {
      setIsDeletingAll(true);
      await deleteAllReviews();
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'مسح جميع تقييمات العملاء نهائياً',
        module: 'content',
        target: 'جميع التقييمات',
      });
      toast.success('تم مسح جميع التقييمات والصور المرفقة نهائياً من قاعدة البيانات ومن الموقع');
      setClearAllModalOpen(false);
    } catch (err) {
      toast.error('حدث خطأ أثناء مسح التقييمات');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= uniqueReviews.length) return;
    const newItems = Array.from(uniqueReviews);
    const [moved] = newItems.splice(index, 1);
    newItems.splice(newIndex, 0, moved);
    reorderReviews(newItems);
  };

  // Deduplicate reviews strictly so every review appears only ONCE
  const uniqueReviews = useMemo(() => {
    const seenIds = new Set<string>();
    const seenSignatures = new Set<string>();
    return reviews.filter((r) => {
      if (!r || !r.id) return false;
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      const sig = `${(r.customerName || '').trim().toLowerCase()}_${(r.comment || '').trim().toLowerCase()}`;
      if (sig.length > 2 && seenSignatures.has(sig)) return false;
      if (sig.length > 2) seenSignatures.add(sig);
      return true;
    });
  }, [reviews]);

  // Filtered reviews from unique deduplicated set
  const filteredReviews = useMemo(() => {
    return uniqueReviews.filter((r) => {
      const matchesCategory =
        selectedCategory === 'all' || r.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.customerName?.toLowerCase().includes(q) ||
        r.serviceName?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [uniqueReviews, selectedCategory, search]);

  const serviceSuggestions = [
    'الباقة الملكية - ديتيلينج شامل وفائق VIP',
    'غسيل بريميوم متكامل مع طبقة شمع',
    'التنظيف العميق الشامل للمنازل والفلل',
    'غسيل وتعقيم المفروشات والكنب والسجاد بالبخار',
    'غسيل فندقي داخلي وخارجي بالبخار',
    'تلميع وإزالة الخدوش وتصحيح الطلاء',
    'تطهير وتعقيم المطابخ والحمامات بدرجة حرارة 140°',
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/content"
              className="text-xs font-bold text-slate-400 hover:text-[#0866C6] flex items-center gap-1 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>نظام إدارة المحتوى (CMS)</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              آراء وتقييمات العملاء
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>إدارة آراء وتقييمات العملاء (Reviews)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            أضف وعدّل آراء عملائك الحقيقيين التي تظهر في الصفحة الرئيسية مع التحكم بالصور، الخدمات، والتقييم
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Delete All Reviews Button */}
          <button
            type="button"
            onClick={() => setClearAllModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white transition shadow-xs cursor-pointer"
            title="حذف جميع التقييمات نهائياً من قاعدة البيانات ومن الموقع"
          >
            <Trash2 className="w-4 h-4" />
            <span>مسح جميع التقييمات</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (confirm('هل تريد استعادة آراء العملاء الافتراضية؟')) {
                await resetToDefaults();
                toast.info('تمت استعادة الآراء الافتراضية');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black bg-[#0866C6] hover:bg-[#06529E] text-white shadow-md shadow-[#0866C6]/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة رأي عميل جديد</span>
          </button>
        </div>
      </div>

      {/* Stats & Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-bold">إجمالي الآراء (بدون تكرار)</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{uniqueReviews.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-bold">الآراء الظاهرة</p>
          <p className="text-xl font-black text-emerald-500 mt-1">
            {uniqueReviews.filter((r) => r.visible !== false).length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-bold">آراء السيارات 🚗</p>
          <p className="text-xl font-black text-sky-500 mt-1">
            {uniqueReviews.filter((r) => r.category === 'car').length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-bold">آراء المنازل 🏠</p>
          <p className="text-xl font-black text-indigo-500 mt-1">
            {uniqueReviews.filter((r) => r.category === 'home').length}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'car', label: 'خدمات السيارات 🚗' },
            { id: 'home', label: 'خدمات المنازل 🏠' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                selectedCategory === tab.id
                  ? 'bg-[#0866C6] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم العميل أو الخدمة أو التعليق..."
            className="w-full ps-9 pe-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#0866C6]"
          />
        </div>
      </div>

      {/* Reviews Cards List */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Star className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              لا توجد آراء مطابقة
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'جرّب كلمة بحث أخرى أو أزل الفلتر' : 'اضغط على زر «إضافة رأي عميل جديد» أعلاه لإضافة أول تقييم'}
            </p>
          </div>
        ) : (
          filteredReviews.map((rev, idx) => (
            <div
              key={rev.id}
              className={cn(
                'p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4',
                rev.visible !== false
                  ? 'border-slate-200/80 dark:border-slate-800 hover:border-[#0866C6]/40'
                  : 'border-slate-200/40 dark:border-slate-800/40 opacity-60 bg-slate-50/50 dark:bg-slate-900/50'
              )}
            >
              {/* Review Content */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                {/* Avatar / Fallback */}
                {rev.avatar ? (
                  <img
                    src={rev.avatar}
                    alt={rev.customerName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0866C6] to-[#07345C] text-white font-black flex items-center justify-center text-base shadow-xs shrink-0 border border-white/20">
                    {rev.customerName ? rev.customerName.trim().charAt(0) : <User className="w-5 h-5" />}
                  </div>
                )}

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {rev.customerName}
                    </h4>
                    {rev.customerNameEn && (
                      <span className="text-xs text-slate-400 font-mono">
                        ({rev.customerNameEn})
                      </span>
                    )}
                    {rev.verified !== false && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>حجز موثق</span>
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {rev.category === 'home' ? '🏠 منازل' : '🚗 سيارات'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {rev.date || 'مؤخراً'}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[#0866C6] dark:text-[#3B82F6]">
                    {rev.serviceName}
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    "{rev.comment}"
                  </p>

                  {/* Rating Stars (if any) */}
                  <div className="pt-0.5 flex items-center gap-2">
                    {rev.rating !== undefined && rev.rating > 0 ? (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        ))}
                        <span className="text-[10px] font-bold text-slate-400 ms-1">
                          ({rev.rating} من 5)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">بدون تحديد نجوم تقييم</span>
                    )}
                  </div>

                  {/* Attached Screenshot / Image Preview */}
                  {(rev.image || rev.avatar) && (
                    <div className="pt-2 flex items-center gap-2">
                      <div
                        onClick={() => setLightboxImage(rev.image || rev.avatar || null)}
                        className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
                      >
                        <img
                          src={rev.image || rev.avatar}
                          alt="مرفق رأي العميل"
                          className="w-14 h-14 aspect-square rounded-xl object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>صورة / سكرين شوت مرفقة</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setLightboxImage(rev.image || rev.avatar || null)}
                          className="text-[10px] text-slate-400 hover:text-[#0866C6] underline cursor-pointer"
                        >
                          معاينة بالحجم الكامل
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                {/* Reorder Arrows */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'up')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white dark:hover:bg-slate-700 transition"
                    title="تحريك لأعلى"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === filteredReviews.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white dark:hover:bg-slate-700 transition"
                    title="تحريك لأسفل"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Visibility Toggle */}
                <button
                  type="button"
                  onClick={() => toggleReviewVisibility(rev.id)}
                  className={cn(
                    'p-2 rounded-xl text-xs font-bold transition flex items-center gap-1',
                    rev.visible !== false
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300'
                  )}
                  title={rev.visible !== false ? 'إخفاء من الموقع' : 'إظهار للزوار'}
                >
                  {rev.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => openEditModal(rev)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#0866C6]/10 hover:text-[#0866C6] transition"
                  title="تعديل الرأي"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(rev)}
                  className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition"
                  title="حذف الرأي"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===================== ADD / EDIT MODAL ===================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl my-8 overflow-hidden text-start">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span>{editingReview ? 'تعديل رأي العميل' : 'إضافة رأي عميل جديد'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  الاسم والخدمة والتعليق مطلوبون، بينما الصورة والتقييم بالنجوم اختيارية
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Category & Verified */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تصنيف الخدمة <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategory('car')}
                      className={cn(
                        'py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5',
                        category === 'car'
                          ? 'border-[#0866C6] bg-[#0866C6]/10 text-[#0866C6]'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      <Car className="w-4 h-4" />
                      <span>سيارات</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategory('home')}
                      className={cn(
                        'py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5',
                        category === 'home'
                          ? 'border-[#0866C6] bg-[#0866C6]/10 text-[#0866C6]'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      <Home className="w-4 h-4" />
                      <span>منازل</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تاريخ التجربة (أو الوقت)
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="مثال: منذ يومين، أمس، 15 سبتمبر"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6]"
                  />
                </div>
              </div>

              {/* Customer Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    اسم العميل (بالعربية) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثال: أحمد عبد الله، د. سارة المنشاوي"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    اسم العميل (بالإنجليزية - اختياري)
                  </label>
                  <input
                    type="text"
                    value={customerNameEn}
                    onChange={(e) => setCustomerNameEn(e.target.value)}
                    placeholder="e.g. Ahmed Abdallah"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6]"
                  />
                </div>
              </div>

              {/* Service Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  اسم الخدمة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="مثال: الباقة الملكية - ديتيلينج شامل وفائق VIP"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6]"
                />

                {/* Suggestions Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400">مقترحات سريعة:</span>
                  {serviceSuggestions.slice(0, 3).map((sugg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setServiceName(sugg)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0866C6]/10 hover:text-[#0866C6] text-slate-600 dark:text-slate-400 transition"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Device Screenshot / Image Upload Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#0866C6]" />
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      صورة أو سكرين شوت العميل (اختياري)
                    </label>
                  </div>
                  {image && (
                    <button
                      type="button"
                      onClick={() => {
                        setImage('');
                        setAvatar('');
                        setHasAvatar(false);
                      }}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إزالة الصورة</span>
                    </button>
                  )}
                </div>

                {/* Hidden input for direct device file selection */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {!image ? (
                  <div className="space-y-2">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#0866C6] dark:hover:border-[#0866C6] rounded-2xl p-4 text-center cursor-pointer transition bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <UploadCloud className="w-8 h-8 text-[#0866C6] mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        اضغط لرفع صورة أو سكرين شوت من جهازك (كمبيوتر أو موبايل)
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        يدعم صور وسكرين شوت (PNG, JPG, WEBP) • المقاس القياسي: 1:1 مربع
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                      <span className="text-[10px] text-slate-400 font-bold">أو أدخل رابط مباشر</span>
                      <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                    </div>

                    <input
                      type="url"
                      value={avatar}
                      onChange={(e) => {
                        setAvatar(e.target.value);
                        setImage(e.target.value);
                        setHasAvatar(Boolean(e.target.value.trim()));
                      }}
                      placeholder="https://example.com/screenshot.jpg"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6]"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="relative group cursor-pointer" onClick={() => setLightboxImage(image)}>
                      <img
                        src={image}
                        alt="Preview"
                        className="w-20 h-20 aspect-square rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:opacity-85 transition shadow-sm"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم إرفاق الصورة / السكرين شوت بنجاح</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        ستظهر هذه الصورة في لوحة التحكم ومع بطاقة الرأي على الموقع
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setLightboxImage(image)}
                          className="text-[11px] font-bold text-[#0866C6] hover:underline cursor-pointer"
                        >
                          معاينة بالحجم الكامل
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-[#0866C6] cursor-pointer"
                        >
                          تغيير الصورة من الجهاز
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Rating Stars Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      التقييم بالنجوم (اختياري)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasRating(!hasRating)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold transition',
                      hasRating
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {hasRating ? `${rating} نجوم مفعّلة ⭐` : 'بدون تحديد نجوم'}
                  </button>
                </div>

                {hasRating ? (
                  <div className="flex items-center gap-2 animate-in fade-in">
                    <span className="text-xs text-slate-500">اختر التقييم:</span>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setRating(starVal)}
                          className="p-1 hover:scale-125 transition-transform"
                        >
                          <Star
                            className={cn(
                              'w-6 h-6 transition-colors',
                              starVal <= rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {rating === 5 ? 'ممتاز (5 نجوم)' : `${rating} نجوم`}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    يمكنك كتابة الرأي دون إظهار نجوم تقييم، وسيظهر للزوار كـ "تجربة موثقة".
                  </p>
                )}
              </div>

              {/* Review Comment Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  نص رأي / تقييم العميل <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="اكتب كلام وتجربة العميل بالتفصيل هنا..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6] leading-relaxed"
                />
              </div>

              {/* Badges & Settings Toggles */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0866C6] focus:ring-[#0866C6]"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    شارة «حجز مؤكد» للعميل
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0866C6] focus:ring-[#0866C6]"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    ظاهر في الموقع للزوار
                  </span>
                </label>
              </div>

              {/* Live Card Preview Inside Modal */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400">
                  معاينة مباشرة لشكل البطاقة على الموقع:
                </span>
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {hasAvatar && avatar ? (
                        <img
                          src={avatar}
                          alt="preview"
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0866C6] to-[#07345C] text-white font-black flex items-center justify-center text-sm shadow-xs border border-white/20">
                          {customerName ? customerName.trim().charAt(0) : '؟'}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {customerName || 'اسم العميل'}
                        </h4>
                        <p className="text-[11px] text-[#0866C6] font-medium">
                          {serviceName || 'اسم الخدمة'}
                        </p>
                      </div>
                    </div>

                    {hasRating ? (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-md">
                        تجربة موثقة
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    "{comment || 'نص رأي وتقييم العميل سيظهر هنا...'}"
                  </p>

                  {/* Attached image preview in card */}
                  {image && (
                    <div className="pt-1">
                      <img
                        src={image}
                        alt="مرفق الرأي"
                        className="w-24 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                    {verified ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>حجز مؤكد</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <span>{date || 'الآن'}</span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#0866C6] hover:bg-[#06529E] text-white shadow-md shadow-[#0866C6]/25 transition cursor-pointer"
                >
                  {editingReview ? 'حفظ التعديلات' : 'إضافة الرأي للموقع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== CONFIRMATION MODAL: CLEAR ALL REVIEWS ===================== */}
      {clearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl w-full max-w-md p-6 space-y-4 text-start animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد مسح جميع التقييمات نهائياً
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف <strong className="text-rose-600 font-black">جميع آراء وتقييمات العملاء ({uniqueReviews.length} تقييم)</strong> من الموقع وقاعدة البيانات؟
              </p>
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                <p className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>تنبيه هام لا يمكن التراجع عنه:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-300">
                  سيتم حذف التقييمات والصور والمرفقات نهائياً من قاعدة بيانات MongoDB ومن الموقع بالكامل، مع منع استعادة البيانات القديمة أو الكاش تلقائياً.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setClearAllModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={handleClearAllReviews}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingAll ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ المسح الشامل...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، امسح كل التقييمات نهائياً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== LIGHTBOX MODAL: FULL-SIZE SCREENSHOT ===================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xl hover:bg-slate-100 transition z-10 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="صورة مكبرة"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
