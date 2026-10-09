'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  UploadCloud,
  Image as ImageIcon,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useOfferStore, OfferExtended } from '@/store/useOfferStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { hasPermission } from '@/lib/permissions';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { ImageUploader } from '@/components/admin/ImageUploader';

type LifecycleFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'disabled';
type CategoryFilter = 'all' | 'car' | 'home';

export default function AdminOffersPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canCreate = hasPermission(currentAdmin, 'offers.create');
  const canEdit = hasPermission(currentAdmin, 'offers.edit');
  const canDelete = hasPermission(currentAdmin, 'offers.delete');

  const offers = useOfferStore((s) => s.offers);
  const fetchAdminOffers = useOfferStore((s) => s.fetchAdminOffers);
  const addOffer = useOfferStore((s) => s.addOffer);
  const updateOffer = useOfferStore((s) => s.updateOffer);
  const deleteOffer = useOfferStore((s) => s.deleteOffer);
  const toggleActive = useOfferStore((s) => s.toggleOfferActive);
  const duplicateOffer = useOfferStore((s) => s.duplicateOffer);

  const addLog = useActivityLogStore((s) => s.addLog);

  // Split offers into Hero Banners and Regular Cards
  const heroBanners = useMemo(() => {
    return (offers || []).filter((o) => o.promoCode === 'HERO_BANNER');
  }, [offers]);

  const regularOffers = useMemo(() => {
    return (offers || []).filter((o) => o.promoCode !== 'HERO_BANNER');
  }, [offers]);

  // Filter and Search states for regular offers
  const [selectedStatusTab, setSelectedStatusTab] = useState<LifecycleFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const searchParams = useSearchParams();

  // Regular Modal and Form states
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams?.get('action') === 'new') {
      setModalOpen(true);
    }
  }, [searchParams]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  // Regular Form fields
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('20');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'car' | 'home'>('car');
  const [usageLimit, setUsageLimit] = useState('');
  const [hasUsageLimit, setHasUsageLimit] = useState(false);

  // Hero Banner Modal and Form states
  const [heroModalOpen, setHeroModalOpen] = useState(false);
  const [heroIsSubmitting, setHeroIsSubmitting] = useState(false);
  const [editingHeroBannerId, setEditingHeroBannerId] = useState<string | null>(null);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroTitleEn, setHeroTitleEn] = useState('');
  const [heroBadge, setHeroBadge] = useState('عرض حصري من زو التميمة ✦');
  const [heroBadgeEn, setHeroBadgeEn] = useState('Exclusive Mascot Offer ✦');
  const [heroDescription, setHeroDescription] = useState('');
  const [heroDescriptionEn, setHeroDescriptionEn] = useState('');
  const [heroCode, setHeroCode] = useState('');
  const [heroDiscount, setHeroDiscount] = useState('20');
  const [heroUsageLimit, setHeroUsageLimit] = useState('50');
  const [heroHasUsageLimit, setHeroHasUsageLimit] = useState(false);
  const [heroStartDate, setHeroStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [heroExpiresAt, setHeroExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Direct Device File Picker states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const loadOffers = async () => {
    setIsRefreshing(true);
    try {
      await fetchAdminOffers({ includeArchived: false });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  // Compute lifecycle status of an offer
  const computeStatus = (offer: OfferExtended): 'active' | 'scheduled' | 'expired' | 'disabled' => {
    if (offer.active === false || offer.isArchived) return 'disabled';
    const today = new Date().toISOString().split('T')[0];
    if (offer.expiresAt && offer.expiresAt < today) return 'expired';
    if (offer.startDate && offer.startDate > today) return 'scheduled';
    return 'active';
  };

  // Filtered regular offers list
  const filteredOffers = useMemo(() => {
    return regularOffers.filter((offer) => {
      const status = computeStatus(offer);
      if (selectedStatusTab !== 'all' && status !== selectedStatusTab) {
        return false;
      }
      if (selectedCategory !== 'all' && offer.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = offer.code?.toLowerCase().includes(q);
        const matchesTitle = offer.title?.toLowerCase().includes(q);
        const matchesTitleEn = offer.titleEn?.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesTitleEn) {
          return false;
        }
      }
      return true;
    });
  }, [regularOffers, selectedStatusTab, selectedCategory, searchQuery]);

  // Counts for status tabs
  const statusCounts = useMemo(() => {
    const counts = { all: regularOffers.length, active: 0, scheduled: 0, expired: 0, disabled: 0 };
    for (const o of regularOffers) {
      const s = computeStatus(o);
      if (s in counts) {
        counts[s as keyof typeof counts]++;
      }
    }
    return counts;
  }, [regularOffers]);

  // Handle File Selection with strict validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setImageError('صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.');
      toast.error('صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.');
      return;
    }

    // Validate size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError('حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.');
      toast.error('حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddModal = () => {
    setEditingOfferId(null);
    setTitle('');
    setTitleEn('');
    setCode('');
    setDiscount('20');
    setUsageLimit('');
    setHasUsageLimit(false);
    setStartDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setExpiresAt(d.toISOString().split('T')[0]);
    setDescription('');
    setCategory('car');
    setSelectedFile(null);
    setPreviewUrl(null);
    setExistingImageUrl(null);
    setImageError(null);
    setModalOpen(true);
  };

  const openEditModal = (o: OfferExtended) => {
    setEditingOfferId(o.id);
    setTitle(o.title);
    setTitleEn(o.titleEn || o.title);
    setCode(o.code);
    setDiscount(o.discountPercentage.toString());
    if (o.usageLimit && o.usageLimit > 0) {
      setHasUsageLimit(true);
      setUsageLimit(o.usageLimit.toString());
    } else {
      setHasUsageLimit(false);
      setUsageLimit('');
    }
    setStartDate(o.startDate || new Date().toISOString().split('T')[0]);
    setExpiresAt(o.expiresAt);
    setDescription(o.description || '');
    setCategory((o.category as any) || 'car');
    setSelectedFile(null);
    setPreviewUrl(null);
    setExistingImageUrl(o.image || null);
    setImageError(null);
    setModalOpen(true);
  };

  // Hero Banner Modal openers
  const openAddHeroModal = () => {
    setEditingHeroBannerId(null);
    setHeroTitle('خصم 20% فوري على كل خدمات البخار');
    setHeroTitleEn('Instant 20% Off All Steam Services');
    setHeroBadge('عرض حصري من زو التميمة ✦');
    setHeroBadgeEn('Exclusive Mascot Offer ✦');
    setHeroDescription('اغتنم كود الترحيب الخاص من زو صالح لجميع حجوزات غسيل السيارات والعناية بالمنزل حتى نهاية الشهر.');
    setHeroDescriptionEn('Claim Zo special welcome discount code valid on all mobile car detailing & home steam bookings.');
    setHeroCode('CLEANZO20');
    setHeroDiscount('20');
    setHeroUsageLimit('50');
    setHeroHasUsageLimit(true);
    setHeroStartDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setHeroExpiresAt(d.toISOString().split('T')[0]);
    setHeroModalOpen(true);
  };

  const openEditHeroModal = (b: OfferExtended) => {
    setEditingHeroBannerId(b.id);
    setHeroTitle(b.title);
    setHeroTitleEn(b.titleEn || b.title);
    setHeroBadge(b.badge || 'عرض حصري من زو التميمة ✦');
    setHeroBadgeEn(b.badgeEn || 'Exclusive Mascot Offer ✦');
    setHeroDescription(b.description || '');
    setHeroDescriptionEn(b.descriptionEn || '');
    setHeroCode(b.code);
    setHeroDiscount(b.discountPercentage.toString());
    if (b.usageLimit && b.usageLimit > 0) {
      setHeroHasUsageLimit(true);
      setHeroUsageLimit(b.usageLimit.toString());
    } else {
      setHeroHasUsageLimit(false);
      setHeroUsageLimit('');
    }
    setHeroStartDate(b.startDate || new Date().toISOString().split('T')[0]);
    setHeroExpiresAt(b.expiresAt);
    setHeroModalOpen(true);
  };

  const handleSaveHeroBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroTitle.trim() || !heroCode.trim()) {
      toast.error('يرجى ملء عنوان البانر وكود الخصم');
      return;
    }

    if (heroStartDate > heroExpiresAt) {
      toast.error('تاريخ بداية البانر يجب أن يكون قبل أو يساوي تاريخ الانتهاء');
      return;
    }

    const discNum = Number(heroDiscount) || 20;
    const usageLimitNum = heroHasUsageLimit && heroUsageLimit.trim() ? Number(heroUsageLimit) : null;

    setHeroIsSubmitting(true);
    try {
      const bannerData = {
        title: heroTitle.trim(),
        titleEn: heroTitleEn.trim() || heroTitle.trim(),
        badge: heroBadge.trim() || 'عرض حصري من زو التميمة ✦',
        badgeEn: heroBadgeEn.trim() || 'Exclusive Mascot Offer ✦',
        description: heroDescription.trim(),
        descriptionEn: heroDescriptionEn.trim() || heroDescription.trim(),
        code: heroCode.trim().toUpperCase(),
        discountPercentage: discNum,
        startDate: heroStartDate,
        expiresAt: heroExpiresAt,
        promoCode: 'HERO_BANNER',
        usageLimit: usageLimitNum,
        category: 'car' as const,
        image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31',
        active: true,
      };

      if (editingHeroBannerId) {
        await updateOffer(editingHeroBannerId, bannerData);
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل بانر ترويجي حصري',
          module: 'offers',
          target: heroCode.trim().toUpperCase(),
        });
        toast.success('تم تحديث البانر الترويجي بنجاح');
      } else {
        await addOffer(bannerData);
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إطلاق بانر ترويجي حصري جديد',
          module: 'offers',
          target: heroCode.trim().toUpperCase(),
        });
        toast.success('تم إطلاق البانر الترويجي بنجاح');
      }

      setHeroModalOpen(false);
    } catch (err: any) {
      console.error('Save hero banner error:', err);
      toast.error(err.message || 'حدث خطأ أثناء حفظ البانر الترويجي');
    } finally {
      setHeroIsSubmitting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageError(null);

    if (!title.trim() || !code.trim()) {
      toast.error('يرجى ملء عنوان العرض وكود الخصم');
      return;
    }

    if (startDate > expiresAt) {
      toast.error('تاريخ بداية العرض يجب أن يكون قبل أو يساوي تاريخ الانتهاء');
      return;
    }

    // Require an image either newly uploaded or already existing
    if (!selectedFile && !existingImageUrl) {
      setImageError('يرجى اختيار صورة للعرض من جهازك.');
      toast.error('يرجى اختيار صورة للعرض من جهازك.');
      return;
    }

    const discNum = Number(discount) || 10;
    const usageLimitNum = hasUsageLimit && usageLimit.trim() ? Number(usageLimit) : null;
    setIsSubmitting(true);

    try {
      let finalImageUrl = existingImageUrl || '';

      // Upload image directly to backend storage if a new file was chosen
      if (selectedFile) {
        setUploadProgress(true);
        const uploadedMedia = await cleanzoApi.media.upload(selectedFile);
        if (!uploadedMedia || !uploadedMedia.url) {
          throw new Error('فشل رفع الصورة إلى الخادم، يرجى المحاولة مرة أخرى');
        }
        finalImageUrl = uploadedMedia.url;
        setUploadProgress(false);
      }

      if (editingOfferId) {
        await updateOffer(editingOfferId, {
          title: title.trim(),
          titleEn: titleEn.trim() || title.trim(),
          code: code.trim().toUpperCase(),
          discountPercentage: discNum,
          startDate,
          expiresAt,
          description: description.trim(),
          category,
          image: finalImageUrl,
          badge: `خصم ${discNum}%`,
          badgeEn: `${discNum}% OFF`,
          usageLimit: usageLimitNum,
        });

        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل عرض ترويجي',
          module: 'offers',
          target: code.trim().toUpperCase(),
        });
        toast.success('تم تحديث العرض الترويجي وحفظ التعديلات بنجاح');
      } else {
        await addOffer({
          title: title.trim(),
          titleEn: titleEn.trim() || title.trim(),
          description: description.trim() || `وفر ${discNum}% عند استخدام الكود ${code.trim().toUpperCase()}`,
          descriptionEn: `Save ${discNum}% with promo code ${code.trim().toUpperCase()}`,
          discountPercentage: discNum,
          code: code.trim().toUpperCase(),
          startDate,
          expiresAt,
          badge: `خصم ${discNum}%`,
          badgeEn: `${discNum}% OFF`,
          category,
          image: finalImageUrl,
          usageLimit: usageLimitNum,
          active: true,
        });

        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إطلاق عرض ترويجي جديد',
          module: 'offers',
          target: code.trim().toUpperCase(),
        });
        toast.success('تم إطلاق وحفظ العرض الترويجي الجديد بنجاح');
      }

      setModalOpen(false);
      removeSelectedFile();
    } catch (err: any) {
      console.error('Save offer error:', err);
      toast.error(err.message || 'حدث خطأ أثناء حفظ العرض الترويجي');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(false);
    }
  };

  const handleToggle = async (id: string, code: string, currentActive: boolean) => {
    try {
      await toggleActive(id);
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: currentActive ? 'تعطيل عرض ترويجي' : 'تفعيل عرض ترويجي',
        module: 'offers',
        target: code,
      });
      toast.info(currentActive ? 'تم تعطيل العرض في الموقع' : 'تم تفعيل العرض في الموقع');
    } catch (err: any) {
      toast.error(err.message || 'فشل تغيير حالة العرض');
    }
  };

  const handleDeleteOffer = async (id: string, code: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف العرض (${code})؟`)) return;
    try {
      await deleteOffer(id);
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'حذف عرض ترويجي',
        module: 'offers',
        target: code,
      });
      toast.success('تم حذف العرض بنجاح من النظام');
    } catch (err: any) {
      toast.error(err.message || 'فشل حذف العرض من الخادم');
    }
  };

  const handleDuplicateOffer = async (id: string, code: string) => {
    try {
      await duplicateOffer(id);
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'استنساخ عرض ترويجي',
        module: 'offers',
        target: code,
      });
      toast.success('تم استنساخ العرض بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل استنساخ العرض');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-sky-500" />
            <span>العروض الترويجية وأكواد الخصم</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة الخصومات، فترات الصلاحية، ورفع صور العروض مباشرة للموقع والمنصة
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadOffers}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            <span>تحديث</span>
          </button>

          {canCreate && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء عرض ترويجي جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIP HERO PROMO BANNERS SECTION (بانرات العروض الحصرية العلوية)         */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/30 dark:from-[#051c33] dark:via-[#072540] dark:to-[#041525] p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 dark:border-sky-900/40 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0866C6]/10 text-[#0866C6] dark:text-sky-400 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 fill-[#0866C6] dark:fill-sky-400" />
              <span>بانرات العروض الحصرية العلوية (VIP Promo Banners)</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              التحكم في البانر الترويجي العلوي بقسم العروض
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              تحكم بالبانر الأزرق الملكي البارز في أعلى صفحة العروض. يمكنك تعديل النص، الشارة، كود الخصم، وتحديد عدد المستفيدين (لكم شخص). على الموبايل تظهر البانرات جنب بعضها في سلايدر أفقي قابل للتمرير.
            </p>
          </div>

          {canCreate && (
            <button
              onClick={openAddHeroModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#0866C6] hover:bg-[#0753a1] text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بانر ترويجي جديد</span>
            </button>
          )}
        </div>

        {/* Hero Banners List */}
        {heroBanners.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-sky-200 dark:border-sky-800/80 p-6 text-center space-y-3 bg-white/60 dark:bg-slate-900/40">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              يتم حالياً عرض البانر التلقائي لزو التميمة (كود: CLEANZO20)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              لم تقم بإضافة بانرات مخصصة بعد. أضف بانرك الأول الآن للتحكم الكامل بالنص والكوبون وعدد المستفيدين.
            </p>
            {canCreate && (
              <button
                onClick={openAddHeroModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#0866C6] text-white hover:bg-[#0753a1] shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة أول بانر ترويجي</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {heroBanners.map((banner) => {
              const limit = banner.usageLimit;
              const hasLimit = typeof limit === 'number' && limit > 0;
              const remaining = hasLimit ? Math.max(0, limit - (banner.usageCount || 0)) : null;

              return (
                <div
                  key={banner.id}
                  className="rounded-3xl bg-gradient-to-br from-[#0866C6] via-[#0842A0] to-[#07345C] text-white p-5 shadow-lg relative overflow-hidden border border-white/20 flex flex-col justify-between space-y-4"
                >
                  {/* Top Bar: Badges & Active Status */}
                  <div className="flex items-center justify-between gap-2 z-10">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-300 text-[11px] font-black border border-white/20 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-amber-300" />
                        <span>{banner.badge || 'عرض حصري'}</span>
                      </span>
                      {hasLimit ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-300/30 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>متبقي لـ {remaining} شخص من {limit}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-blue-200 text-[10px] font-medium">
                          استخدام غير محدود
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        banner.active !== false ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {banner.active !== false ? 'مفعل' : 'معطل'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1 z-10 text-start">
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                      {banner.title}
                    </h3>
                    <p className="text-xs text-blue-100/90 leading-relaxed line-clamp-2">
                      {banner.description}
                    </p>
                  </div>

                  {/* Coupon & Usage Stats */}
                  <div className="z-10 pt-2 border-t border-white/15 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-dashed border-amber-300/60 flex items-center gap-1.5">
                        <span className="text-[10px] text-amber-300 font-bold">كود:</span>
                        <span className="font-mono font-black text-white tracking-wider text-xs">
                          {banner.code}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-1 rounded-lg">
                        خصم {banner.discountPercentage}%
                      </span>
                    </div>

                    <div className="text-[11px] text-blue-100">
                      <span>الاستخدامات: </span>
                      <strong className="text-white font-bold">{banner.usageCount || 0}</strong>
                      {hasLimit && <span> / {banner.usageLimit} شخص</span>}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="z-10 pt-2 border-t border-white/15 flex items-center justify-between">
                    {canEdit ? (
                      <button
                        onClick={() => handleToggle(banner.id, banner.code, banner.active !== false)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          banner.active !== false
                            ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                        }`}
                      >
                        {banner.active !== false ? 'تعطيل من الموقع' : 'تفعيل في الموقع'}
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => openEditHeroModal(banner)}
                          className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
                          title="تعديل البانر"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteOffer(banner.id, banner.code)}
                          className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-all cursor-pointer"
                          title="حذف البانر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section Divider */}
      <div className="pt-2">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Tag className="w-4 h-4 text-sky-500" />
          <span>كروت العروض والخصومات العامة (بطاقات الخدمات)</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          العروض التي تظهر كبطاقات خدمات مستقلة أسفل البانرات في صفحة العروض
        </p>
      </div>

      {/* Lifecycle Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'all', label: 'الكل', count: statusCounts.all },
              { key: 'active', label: 'مفعل ونشط', count: statusCounts.active },
              { key: 'scheduled', label: 'مجدول قادماً', count: statusCounts.scheduled },
              { key: 'expired', label: 'منتهي الصلاحية', count: statusCounts.expired },
              { key: 'disabled', label: 'معطل', count: statusCounts.disabled },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatusTab(tab.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                selectedStatusTab === tab.key
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                  selectedStatusTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالكود أو العنوان..."
              className="w-full ps-8 pe-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as CategoryFilter)}
            className="py-1.5 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">جميع القطاعات</option>
            <option value="car">خدمات السيارات</option>
            <option value="home">خدمات المنازل</option>
          </select>
        </div>
      </div>

      {/* Offers Grid */}
      {filteredOffers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <Tag className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد عروض ترويجية مطابقة</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            لم يتم العثور على أي عروض في هذا القسم. يمكنك إنشاء عرض ترويجي جديد ورفع صورته مباشرة.
          </p>
          {canCreate && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة عرض الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => {
            const status = computeStatus(offer);

            return (
              <div
                key={offer.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Image & Badges - Fixed 1:1 Aspect Ratio */}
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <CleanzoImage
                    src={offer.image}
                    alt={offer.title}
                    fit="cover"
                    position="center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 start-3 end-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-500 text-white shadow-md">
                      {offer.badge || `خصم ${offer.discountPercentage}%`}
                    </span>

                    {/* Lifecycle Status Badge */}
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-sm',
                        status === 'active' && 'bg-emerald-500 text-white',
                        status === 'scheduled' && 'bg-sky-500 text-white',
                        status === 'expired' && 'bg-amber-600 text-white',
                        status === 'disabled' && 'bg-rose-600 text-white'
                      )}
                    >
                      {status === 'active' && 'مفعل ونشط'}
                      {status === 'scheduled' && 'مجدول قادماً'}
                      {status === 'expired' && 'منتهي الصلاحية'}
                      {status === 'disabled' && 'معطل'}
                    </span>
                  </div>

                  {/* Category Pill at bottom of image */}
                  <div className="absolute bottom-2.5 start-3 text-white text-[10px] font-bold bg-slate-950/60 backdrop-blur-xs px-2.5 py-0.5 rounded-lg">
                    {offer.category === 'car' ? '🚗 خدمات السيارات' : '🏡 خدمات المنازل'}
                  </div>
                </div>

                {/* Offer Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {offer.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {offer.description}
                    </p>

                    {/* Dates & Code Box */}
                    <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold">كود الخصم (Coupon)</span>
                        <span className="font-mono font-black text-xs text-sky-600 dark:text-sky-400 tracking-wider">
                          {offer.code}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] text-slate-400 block font-semibold">الصلاحية</span>
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                          {offer.startDate ? `${offer.startDate} إلى ` : ''}
                          {offer.expiresAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    {canEdit ? (
                      <button
                        onClick={() => handleToggle(offer.id, offer.code, offer.active !== false)}
                        className={cn(
                          'text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors',
                          offer.active !== false
                            ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                        )}
                      >
                        {offer.active !== false ? 'تعطيل العرض' : 'تفعيل العرض'}
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-1">
                      {canCreate && (
                        <button
                          onClick={() => handleDuplicateOffer(offer.id, offer.code)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                          title="استنساخ"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(offer)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteOffer(offer.id, offer.code)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-500" />
                <span>{editingOfferId ? 'تعديل بيانات العرض الترويجي' : 'إنشاء عرض ترويجي جديد'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Title Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    عنوان العرض (بالعربية) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: باقة عطلة الأسبوع الملكية"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    عنوان العرض (بالإنجليزية)
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="Royal Weekend Package"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Code & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    كود الخصم (Coupon Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="CLEAN20"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-mono font-bold tracking-wider focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    نسبة الخصم (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    تاريخ البداية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    تاريخ الانتهاء <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    القطاع المستهدف <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="car">خدمات السيارات</option>
                    <option value="home">خدمات المنازل</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  وصف العرض والشروط
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف تفصيلي للخدمات المشمولة في العرض وشروط الاستخدام..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Usage Limit - تحديد لكم شخص */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="regHasUsageLimit"
                      checked={hasUsageLimit}
                      onChange={(e) => setHasUsageLimit(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="regHasUsageLimit" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      تحديد الحد الأقصى للمستفيدين (عدد الأشخاص)
                    </label>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                    {hasUsageLimit ? 'محدد بعدد أشخاص' : 'متاح للجميع'}
                  </span>
                </div>

                {hasUsageLimit && (
                  <div className="pt-1">
                    <input
                      type="number"
                      min="1"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      placeholder="مثال: 50 شخص"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* UNIFIED 1:1 IMAGE UPLOADER */}
              <ImageUploader
                value={previewUrl || existingImageUrl || ''}
                onChange={(url) => {
                  setExistingImageUrl(url);
                  setPreviewUrl(url);
                  setSelectedFile(null);
                  setImageError(null);
                }}
                label="صورة العرض الترويجي (المقاس القياسي: 1:1 مربع)"
                description="JPG, PNG, WEBP (حتى 15MB) • المقاس القياسي 1:1 مربع"
                defaultFit="cover"
                required
              />

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-black flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{uploadProgress ? 'جاري رفع الصورة...' : 'جاري الحفظ...'}</span>
                    </>
                  ) : (
                    <span>{editingOfferId ? 'حفظ التعديلات' : 'إطلاق العرض الترويجي'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HERO BANNER MODAL (إضافة / تعديل البانر الترويجي الحصري)                   */}
      {/* ========================================================================= */}
      {heroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0866C6] dark:text-sky-400" />
                <span>
                  {editingHeroBannerId
                    ? 'تعديل بيانات البانر الترويجي الحصري'
                    : 'إضافة بانر ترويجي حصري جديد'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setHeroModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Live Visual Preview of the Banner */}
            <div className="p-1 rounded-3xl border border-sky-200/60 dark:border-sky-900/60 bg-slate-50 dark:bg-slate-950/40">
              <p className="text-[10px] font-bold text-slate-400 mb-1 px-2 pt-1">معاينة شكل البانر الحقيقي في الموقع:</p>
              <div className="rounded-[28px] bg-gradient-to-br from-[#0866C6] via-[#0842A0] to-[#07345C] text-white p-5 shadow-md relative overflow-hidden border border-white/20 space-y-3 text-start">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-amber-300 text-[10px] font-black border border-white/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 fill-amber-300" />
                    <span>{heroBadge || 'عرض حصري'}</span>
                  </span>
                  {heroHasUsageLimit && heroUsageLimit && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-bold border border-amber-300/30">
                      متبقي لـ {heroUsageLimit} شخص فقط
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black text-white leading-tight">
                  {heroTitle || 'عنوان العرض الترويجي'}
                </h4>
                <p className="text-[11px] text-blue-100/90 leading-relaxed line-clamp-2">
                  {heroDescription || 'الوصف الترويجي للعرض وشروطه...'}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-white/15">
                  <div className="px-2.5 py-1 rounded-lg bg-white/10 border border-dashed border-amber-300/60 font-mono font-black text-xs text-white">
                    {heroCode || 'CLEANZO20'}
                  </div>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md">
                    خصم {heroDiscount}%
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveHeroBanner} className="space-y-4 text-xs">
              {/* Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    عنوان البانر الرئيسي (بالعربية) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="مثال: خصم 20% فوري على كل خدمات البخار"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    عنوان البانر (بالإنجليزية)
                  </label>
                  <input
                    type="text"
                    value={heroTitleEn}
                    onChange={(e) => setHeroTitleEn(e.target.value)}
                    placeholder="Instant 20% Off All Steam Services"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    نص الشارة العلوية (بالعربية)
                  </label>
                  <input
                    type="text"
                    value={heroBadge}
                    onChange={(e) => setHeroBadge(e.target.value)}
                    placeholder="عرض حصري من زو التميمة ✦"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    نص الشارة العلوية (بالإنجليزية)
                  </label>
                  <input
                    type="text"
                    value={heroBadgeEn}
                    onChange={(e) => setHeroBadgeEn(e.target.value)}
                    placeholder="Exclusive Mascot Offer ✦"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Code & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    كود الخصم (Coupon Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={heroCode}
                    onChange={(e) => setHeroCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="CLEANZO20"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-mono font-bold tracking-wider focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    نسبة الخصم (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={heroDiscount}
                    onChange={(e) => setHeroDiscount(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Usage Limit - تحديد لكم شخص */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="heroHasUsageLimit"
                      checked={heroHasUsageLimit}
                      onChange={(e) => setHeroHasUsageLimit(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="heroHasUsageLimit" className="font-bold text-slate-900 dark:text-white cursor-pointer">
                      تحديد الحد الأقصى للمستفيدين (عدد الأشخاص)
                    </label>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                    {heroHasUsageLimit ? 'محدد بعدد أشخاص' : 'متاح للجميع بدون حد'}
                  </span>
                </div>

                {heroHasUsageLimit && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      عدد الأشخاص المسموح لهم باستخدام الكوبون:
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        required={heroHasUsageLimit}
                        value={heroUsageLimit}
                        onChange={(e) => setHeroUsageLimit(e.target.value)}
                        placeholder="مثال: 50"
                        className="w-full ps-9 pe-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      عند وصول عدد المستفيدين لهذا الرقم، سيتوقف الكوبون تلقائياً ولن يتمكن أشخاص جدد من تطبيقه.
                    </p>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    تاريخ البداية
                  </label>
                  <input
                    type="date"
                    required
                    value={heroStartDate}
                    onChange={(e) => setHeroStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    تاريخ الانتهاء
                  </label>
                  <input
                    type="date"
                    required
                    value={heroExpiresAt}
                    onChange={(e) => setHeroExpiresAt(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  الوصف الترويجي للبانر (بالعربية)
                </label>
                <textarea
                  rows={2}
                  value={heroDescription}
                  onChange={(e) => setHeroDescription(e.target.value)}
                  placeholder="اغتنم كود الترحيب الخاص من زو صالح لجميع حجوزات غسيل السيارات والعناية بالمنزل حتى نهاية الشهر."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  الوصف الترويجي (بالإنجليزية)
                </label>
                <textarea
                  rows={2}
                  value={heroDescriptionEn}
                  onChange={(e) => setHeroDescriptionEn(e.target.value)}
                  placeholder="Claim Zo special welcome discount code valid on all mobile car detailing & home steam bookings."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  dir="ltr"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={heroIsSubmitting}
                  onClick={() => setHeroModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={heroIsSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#0753a1] text-white font-black flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {heroIsSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>{editingHeroBannerId ? 'حفظ تعديلات البانر' : 'إطلاق البانر الترويجي'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
