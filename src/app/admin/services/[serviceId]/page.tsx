'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Save,
  Trash2,
  Sparkles,
  Eye,
  Plus,
  X,
  Check,
  Package as PackageIcon,
  Clock,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Percent,
  Layers,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { ServiceCategory, ServicePackage, ServiceAddon } from '@/types';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { PriceDisplay } from '@/components/common/PriceDisplay';

export default function AdminServiceEditPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = params.serviceId as string;
  const isNew = serviceId === 'new';
  const urlCategory = searchParams.get('category') || searchParams.get('cat');

  const services = useServiceStore((s) => s.services);
  const categories = useServiceStore((s) => s.categories);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const fetchAdminServices = useServiceStore((s) => s.fetchAdminServices);
  const addService = useServiceStore((s) => s.addService);
  const updateService = useServiceStore((s) => s.updateService);
  const deleteService = useServiceStore((s) => s.deleteService);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const existingService = services.find((s) => s.id === serviceId);

  // Form State
  const [title, setTitle] = useState(existingService?.title || '');
  const [titleEn, setTitleEn] = useState(existingService?.titleEn || '');
  const [category, setCategory] = useState<ServiceCategory>(
    existingService?.category || (urlCategory as ServiceCategory) || ''
  );
  const [shortDesc, setShortDesc] = useState(existingService?.shortDescription || '');
  const [shortDescEn, setShortDescEn] = useState(existingService?.shortDescriptionEn || '');
  const [desc, setDesc] = useState(existingService?.description || '');
  const [descEn, setDescEn] = useState(existingService?.descriptionEn || '');
  const [price, setPrice] = useState(existingService?.price?.toString() || '300');
  const [basePrice, setBasePrice] = useState(
    existingService?.originalPrice && existingService.originalPrice > existingService.price
      ? existingService.originalPrice.toString()
      : existingService?.price?.toString() || '300'
  );
  const [discount, setDiscount] = useState(
    existingService?.discount ? existingService.discount.toString() : '0'
  );
  const [serviceDurationMinutes, setServiceDurationMinutes] = useState(
    existingService?.serviceDurationMinutes?.toString() || existingService?.duration?.toString() || '45'
  );
  const [travelTimeMinutes, setTravelTimeMinutes] = useState(
    existingService?.travelTimeMinutes?.toString() || '15'
  );
  const [image, setImage] = useState(isNew ? '' : (existingService?.image || ''));
  const [hasInitializedExisting, setHasInitializedExisting] = useState(false);
  const [available, setAvailable] = useState(existingService?.available ?? true);
  const [popular, setPopular] = useState(existingService?.popular ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    fetchCategories();
    if (!isNew && services.length === 0) {
      fetchAdminServices(true);
    }
  }, [fetchCategories, fetchAdminServices, isNew, services.length]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      if (isNew) {
        if (urlCategory && categories.some((c) => c.slug === urlCategory)) {
          setCategory(urlCategory as ServiceCategory);
        } else if (!category || !categories.some((c) => c.slug === category)) {
          setCategory(categories[0].slug as ServiceCategory);
        }
      } else if (existingService?.category) {
        setCategory(existingService.category as ServiceCategory);
      }
    }
  }, [categories, isNew, urlCategory, existingService?.category]);

  useEffect(() => {
    if (!isNew && existingService && !hasInitializedExisting) {
      setTitle(existingService.title);
      setTitleEn(existingService.titleEn || '');
      setCategory(existingService.category || 'car');
      setShortDesc(existingService.shortDescription || '');
      setShortDescEn(existingService.shortDescriptionEn || '');
      setDesc(existingService.description || '');
      setDescEn(existingService.descriptionEn || '');
      const orig = Number(existingService.originalPrice);
      const curr = Number(existingService.price);
      const disc = Number(existingService.discount);

      if (orig && orig > curr) {
        setBasePrice(orig.toString());
        setDiscount(disc > 0 ? disc.toString() : Math.round(((orig - curr) / orig) * 100).toString());
      } else if (disc > 0 && curr > 0) {
        const calculatedBase = Math.round(curr / (1 - disc / 100));
        setBasePrice(calculatedBase.toString());
        setDiscount(disc.toString());
      } else {
        setBasePrice(curr ? curr.toString() : '300');
        setDiscount('0');
      }
      setPrice(curr ? curr.toString() : '300');
      setServiceDurationMinutes(
        existingService.serviceDurationMinutes?.toString() || existingService.duration?.toString() || '45'
      );
      setTravelTimeMinutes(existingService.travelTimeMinutes?.toString() || '15');
      if (existingService.image) setImage(existingService.image);
      if (existingService.features) setFeatures(existingService.features);
      setAvailable(existingService.available ?? true);
      setPopular(existingService.popular ?? false);
      setHasInitializedExisting(true);
    }
  }, [existingService, isNew, hasInitializedExisting]);

  const [features, setFeatures] = useState<string[]>(
    existingService?.features || ['غسيل رغوي نانو', 'شفط أتربة للمقصورة']
  );
  const [newFeatureText, setNewFeatureText] = useState('');

  // Packages & Add-ons state
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

  // Package Modal State
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [pkgEditId, setPkgEditId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgNameEn, setPkgNameEn] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgDescEn, setPkgDescEn] = useState('');
  const [pkgPrice, setPkgPrice] = useState('150');
  const [pkgOriginalPrice, setPkgOriginalPrice] = useState('200');
  const [pkgDuration, setPkgDuration] = useState('45');
  const [pkgActive, setPkgActive] = useState(true);
  const [pkgOrder, setPkgOrder] = useState('0');

  // Add-on Modal State
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [addonEditId, setAddonEditId] = useState<string | null>(null);
  const [addonName, setAddonName] = useState('');
  const [addonNameEn, setAddonNameEn] = useState('');
  const [addonDesc, setAddonDesc] = useState('');
  const [addonDescEn, setAddonDescEn] = useState('');
  const [addonPrice, setAddonPrice] = useState('50');
  const [addonDuration, setAddonDuration] = useState('15');
  const [addonActive, setAddonActive] = useState(true);
  const [addonOrder, setAddonOrder] = useState('0');

  // Fetch Packages and Add-ons from backend
  const loadPackagesAndAddons = useCallback(async () => {
    if (isNew) return;
    setIsLoadingPackages(true);
    try {
      const [pkgs, adds] = await Promise.all([
        cleanzoApi.services.getPackages(serviceId),
        cleanzoApi.services.getAddons(serviceId),
      ]);
      setPackages(pkgs || []);
      setAddons(adds || []);
    } catch (err: any) {
      console.error('Failed to load packages/addons:', err);
    } finally {
      setIsLoadingPackages(false);
    }
  }, [isNew, serviceId]);

  useEffect(() => {
    loadPackagesAndAddons();
  }, [loadPackagesAndAddons]);

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFeatures([...features, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  // ==========================================
  // PACKAGE ACTIONS
  // ==========================================
  const handleOpenNewPackage = () => {
    setPkgEditId(null);
    setPkgName('');
    setPkgNameEn('');
    setPkgDesc('');
    setPkgDescEn('');
    setPkgPrice('150');
    setPkgOriginalPrice('200');
    setPkgDuration('45');
    setPkgActive(true);
    setPkgOrder(packages.length.toString());
    setIsPkgModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: ServicePackage) => {
    setPkgEditId(pkg.id);
    setPkgName(pkg.name);
    setPkgNameEn(pkg.nameEn || '');
    setPkgDesc(pkg.description || '');
    setPkgDescEn(pkg.descriptionEn || '');
    setPkgPrice(pkg.price.toString());
    setPkgOriginalPrice(pkg.originalPrice ? pkg.originalPrice.toString() : '');
    setPkgDuration(pkg.durationMinutes.toString());
    setPkgActive(pkg.active !== false);
    setPkgOrder((pkg.order ?? 0).toString());
    setIsPkgModalOpen(true);
  };

  const handleSavePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(pkgPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('يرجى إدخال سعر صحيح للباقة');
      return;
    }
    const numOriginal = pkgOriginalPrice ? Number(pkgOriginalPrice) : undefined;
    const numDuration = Math.max(1, Number(pkgDuration) || 45);
    const numOrder = Number(pkgOrder) || 0;

    const payload = {
      name: pkgName.trim(),
      nameEn: pkgNameEn.trim(),
      description: pkgDesc.trim(),
      descriptionEn: pkgDescEn.trim(),
      price: numPrice,
      originalPrice: numOriginal,
      durationMinutes: numDuration,
      active: pkgActive,
      order: numOrder,
    };

    if (isNew) {
      if (pkgEditId) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkgEditId ? { ...p, ...payload, id: pkgEditId } : p))
        );
        toast.success('تم تحديث بيانات الباقة');
      } else {
        const tempPkg: ServicePackage = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          serviceId: 'new',
          ...payload,
        };
        setPackages((prev) => [...prev, tempPkg]);
        toast.success('تمت إضافة الباقة للقائمة (سيتم حفظها مع الخدمة)');
      }
      setIsPkgModalOpen(false);
      return;
    }

    try {
      if (pkgEditId) {
        await cleanzoApi.services.updatePackage(serviceId, pkgEditId, payload);
        toast.success('تم تحديث الباقة بنجاح');
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل باقة خدمة',
          module: 'services',
          target: pkgName,
          details: `سعر الباقة: ${numPrice} ج.م | المدة: ${numDuration} دقيقة`,
        });
      } else {
        await cleanzoApi.services.createPackage(serviceId, payload);
        toast.success('تمت إضافة الباقة بنجاح');
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إنشاء باقة خدمة جديدة',
          module: 'services',
          target: pkgName,
          details: `سعر الباقة: ${numPrice} ج.م | المدة: ${numDuration} دقيقة`,
        });
      }
      setIsPkgModalOpen(false);
      await loadPackagesAndAddons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حفظ بيانات الباقة');
    }
  };

  const handleTogglePackageStatus = async (pkg: ServicePackage) => {
    if (isNew) {
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, active: !p.active } : p))
      );
      toast.success(pkg.active ? 'تم تعطيل الباقة' : 'تم تفعيل الباقة');
      return;
    }

    try {
      await cleanzoApi.services.updatePackage(serviceId, pkg.id, { active: !pkg.active });
      toast.success(pkg.active ? 'تم تعطيل الباقة' : 'تم تفعيل الباقة');
      await loadPackagesAndAddons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تغيير حالة الباقة');
    }
  };

  const handleDeletePackage = async (pkg: ServicePackage) => {
    if (!confirm(`هل أنت متأكد من حذف/تعطيل باقة "${pkg.name}"؟`)) return;
    if (isNew) {
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      toast.success('تم حذف الباقة من القائمة');
      return;
    }

    try {
      const res = await cleanzoApi.services.deletePackage(serviceId, pkg.id);
      if (res.deactivated) {
        toast.info('تم تعطيل الباقة لحماية سجلات الطلبات التاريخية');
      } else {
        toast.success('تم حذف الباقة بنجاح');
      }
      await loadPackagesAndAddons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حذف الباقة');
    }
  };

  // ==========================================
  // ADD-ON ACTIONS
  // ==========================================
  const handleOpenNewAddon = () => {
    setAddonEditId(null);
    setAddonName('');
    setAddonNameEn('');
    setAddonDesc('');
    setAddonDescEn('');
    setAddonPrice('50');
    setAddonDuration('15');
    setAddonActive(true);
    setAddonOrder(addons.length.toString());
    setIsAddonModalOpen(true);
  };

  const handleOpenEditAddon = (addon: ServiceAddon) => {
    setAddonEditId(addon.id);
    setAddonName(addon.name);
    setAddonNameEn(addon.nameEn || '');
    setAddonDesc(addon.description || '');
    setAddonDescEn(addon.descriptionEn || '');
    setAddonPrice(addon.price.toString());
    setAddonDuration(addon.durationMinutes.toString());
    setAddonActive(addon.active !== false);
    setAddonOrder((addon.order ?? 0).toString());
    setIsAddonModalOpen(true);
  };

  const handleSaveAddonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(addonPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('يرجى إدخال سعر صحيح للإضافة');
      return;
    }
    const numDuration = Math.max(0, Number(addonDuration) || 0);
    const numOrder = Number(addonOrder) || 0;

    const payload = {
      name: addonName.trim(),
      nameEn: addonNameEn.trim(),
      description: addonDesc.trim(),
      descriptionEn: addonDescEn.trim(),
      price: numPrice,
      durationMinutes: numDuration,
      active: addonActive,
      order: numOrder,
    };

    if (isNew) {
      if (addonEditId) {
        setAddons((prev) =>
          prev.map((a) => (a.id === addonEditId ? { ...a, ...payload, id: addonEditId } : a))
        );
        toast.success('تم تحديث بيانات الإضافة');
      } else {
        const tempAddon: ServiceAddon = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          serviceId: 'new',
          ...payload,
        };
        setAddons((prev) => [...prev, tempAddon]);
        toast.success('تمت إضافة الإضافة للقائمة (سيتم حفظها مع الخدمة)');
      }
      setIsAddonModalOpen(false);
      return;
    }

    try {
      if (addonEditId) {
        await cleanzoApi.services.updateAddon(serviceId, addonEditId, payload);
        toast.success('تم تحديث الإضافة بنجاح');
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل إضافة خدمة',
          module: 'services',
          target: addonName,
          details: `سعر الإضافة: +${numPrice} ج.م | مدة إضافية: +${numDuration} دقيقة`,
        });
      } else {
        await cleanzoApi.services.createAddon(serviceId, payload);
        toast.success('تمت إضافة الإضافة بنجاح');
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إنشاء إضافة خدمة جديدة',
          module: 'services',
          target: addonName,
          details: `سعر الإضافة: +${numPrice} ج.م | مدة إضافية: +${numDuration} دقيقة`,
        });
      }
      setIsAddonModalOpen(false);
      await loadPackagesAndAddons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حفظ بيانات الإضافة');
    }
  };

  const handleToggleAddonStatus = async (addon: ServiceAddon) => {
    if (isNew) {
      setAddons((prev) =>
        prev.map((a) => (a.id === addon.id ? { ...a, active: !a.active } : a))
      );
      toast.success(addon.active ? 'تم تعطيل الإضافة' : 'تم تفعيل الإضافة');
      return;
    }

    try {
      await cleanzoApi.services.updateAddon(serviceId, addon.id, { active: !addon.active });
      toast.success(addon.active ? 'تم تعطيل الإضافة' : 'تم تفعيل الإضافة');
      await loadPackagesAndAddons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تغيير حالة الإضافة');
    }
  };

  const handleDeleteAddon = async (addon: ServiceAddon) => {
    if (!confirm(`هل أنت متأكد من حذف/تعطيل إضافة "${addon.name}"؟`)) return;
    if (isNew) {
      setAddons((prev) => prev.filter((a) => a.id !== addon.id));
      toast.success('تم حذف الإضافة من القائمة');
      return;
    }

    try {
      await cleanzoApi.services.deleteAddon(serviceId, addon.id);
      toast.success('تم تعطيل/حذف الإضافة بنجاح');
      await loadPackagesAndAddons();
    } catch (err: any) {
      toast.error(err?.message || 'فشل حذف الإضافة');
    }
  };

  // ==========================================
  // SERVICE SAVE
  // ==========================================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) return;

    if (!category || !String(category).trim()) {
      toast.error('يرجى اختيار قطاع أو تصنيف للخدمة');
      return;
    }
    const numBasePrice = Math.max(0, Number(basePrice) || 0);
    const numDiscount = Math.max(0, Math.min(99, Number(discount) || 0));
    const finalPrice = numDiscount > 0
      ? Math.round(numBasePrice * (1 - numDiscount / 100))
      : numBasePrice;
    const finalOriginalPrice = numDiscount > 0 ? numBasePrice : undefined;

    const numServiceDuration = Math.max(1, Number(serviceDurationMinutes) || 45);
    const numTravelTime = Math.max(0, Number(travelTimeMinutes) || 0);
    const totalOccupancy = numServiceDuration + numTravelTime;

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      if (isNew) {
        const created = await addService({
          category: String(category).trim() as ServiceCategory,
          title,
          titleEn: titleEn || title,
          shortDescription: shortDesc,
          shortDescriptionEn: shortDescEn || shortDesc,
          description: desc,
          image:
            image ||
            (category === 'home'
              ? 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
              : 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80'),
          price: finalPrice,
          originalPrice: finalOriginalPrice,
          discount: numDiscount,
          duration: numServiceDuration,
          serviceDurationMinutes: numServiceDuration,
          travelTimeMinutes: numTravelTime,
          totalOccupiedMinutes: totalOccupancy,
          available,
          popular,
          features,
          featuresEn: features,
          inclusions: ['شامل جميع المنظفات والأجهزة المعقمة بالبخار'],
          inclusionsEn: ['All equipment and detergents included'],
          packages: packages.map((p) => ({
            name: p.name,
            nameEn: p.nameEn,
            description: p.description,
            descriptionEn: p.descriptionEn,
            price: p.price,
            originalPrice: p.originalPrice,
            durationMinutes: p.durationMinutes,
            active: p.active,
            order: p.order,
          })) as any,
          addons: addons.map((a) => ({
            name: a.name,
            nameEn: a.nameEn,
            description: a.description,
            descriptionEn: a.descriptionEn,
            price: a.price,
            durationMinutes: a.durationMinutes,
            active: a.active,
            order: a.order,
          })) as any,
        });

        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إنشاء خدمة جديدة',
          module: 'services',
          target: title,
          details: `السعر: ${finalPrice} ج.م ${numDiscount > 0 ? `(قبل الخصم: ${numBasePrice} ج.م | خصم: ${numDiscount}%)` : ''} | باقات مضافة: ${packages.length} | إضافات مضافة: ${addons.length}`,
        });

        toast.success('تم إنشاء الخدمة وباقاتها وإضافاتها بنجاح!');
        router.push('/admin/services');
      } else {
        await updateService(serviceId, {
          category: String(category).trim() as ServiceCategory,
          title,
          titleEn,
          shortDescription: shortDesc,
          shortDescriptionEn: shortDescEn,
          description: desc,
          descriptionEn: descEn,
          image,
          price: finalPrice,
          originalPrice: finalOriginalPrice,
          discount: numDiscount,
          duration: numServiceDuration,
          serviceDurationMinutes: numServiceDuration,
          travelTimeMinutes: numTravelTime,
          totalOccupiedMinutes: totalOccupancy,
          available,
          popular,
          features,
        });

        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تحديث بيانات الخدمة',
          module: 'services',
          target: title,
          details: `السعر: ${finalPrice} ج.م ${numDiscount > 0 ? `(قبل الخصم: ${numBasePrice} ج.م | خصم: ${numDiscount}%)` : ''} | مدة الخدمة: ${numServiceDuration} دقيقة + تنقل: ${numTravelTime} دقيقة = إشغال: ${totalOccupancy} دقيقة`,
        });

        toast.success('تم حفظ تعديلات الخدمة فوراً!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشل حفظ الخدمة');
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/services"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لكافة الخدمات
        </Link>
        {!isNew && (
          <Link
            href={`/services/${category}/${serviceId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-500 hover:underline"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة الخدمة في موقع العملاء</span>
          </Link>
        )}
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          {isNew ? 'إضافة خدمة جديدة' : `تعديل خدمة: ${title}`}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          التعديلات المحفوظة هنا تنعكس فوراً على موقع العملاء ومحرك الحجز وقاعدة البيانات PostgreSQL
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Titles & Descriptions */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">البيانات التعريفية واللغات</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">اسم الخدمة (عربي)</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Service Title (English)</label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">الوصف المختصر (عربي)</label>
                <input
                  type="text"
                  required
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">الوصف التفصيلي الكامل</label>
                <textarea
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 leading-relaxed"
                />
              </div>
            </div>

            {/* Pricing & Duration */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">التسعير الأساسي ونظام المواعيد والإشغال (Occupancy)</h3>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
                  إجمالي وقت الإشغال الأساسي: {(Number(serviceDurationMinutes) || 0) + (Number(travelTimeMinutes) || 0)} دقيقة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                    السعر الأساسي (ج.م) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="مثال: 100"
                    className="w-full p-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    السعر الأساسي للخدمة قبل تطبيق أي خصم
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
                    نسبة الخصم (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-full p-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-rose-600 dark:text-rose-400"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    اكتب نسبة الخصم (مثلاً 10%) أو اتركها 0 إذا كانت بدون خصم
                  </p>
                </div>
              </div>

              {/* Live Price Summary Box */}
              {(() => {
                const bPrice = Math.max(0, Number(basePrice) || 0);
                const dPercent = Math.max(0, Math.min(99, Number(discount) || 0));
                const finalP = dPercent > 0 ? Math.round(bPrice * (1 - dPercent / 100)) : bPrice;
                return (
                  <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        معاينة السعر كما يظهر للعميل في الموقع وصفحة الحجز:
                      </span>
                      <div className="flex items-center gap-2 pt-1">
                        <PriceDisplay
                          price={finalP}
                          originalPrice={dPercent > 0 ? bPrice : undefined}
                          size="md"
                        />
                        {dPercent > 0 && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            (توفير للعميل: {bPrice - finalP} ج.م)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left font-mono text-xs">
                      <span className="text-slate-400 text-[10px] block font-sans">السعر النهائي للدفع:</span>
                      <span className="text-base font-black text-[#0866C6] dark:text-sky-400">
                        {finalP} ج.م
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold mb-1">مدة تنفيذ الخدمة الأساسية (دقائق)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={serviceDurationMinutes}
                    onChange={(e) => setServiceDurationMinutes(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">وقت انتقال سيارة الخدمة Buffer (دقائق)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={travelTimeMinutes}
                    onChange={(e) => setTravelTimeMinutes(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* PACKAGES SECTION (ADMIN MANAGEMENT) */}
            {/* ========================================== */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PackageIcon className="w-4 h-4 text-sky-500" />
                    <span>الباقات المتعددة (Service Packages)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    باقات اختيارية بديلة عن السعر الأساسي للخدمة (يستبدل سعر الباقة السعر الأساسي للخدمة عند اختيار العميل لها)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenNewPackage}
                  className="py-1.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة باقة</span>
                </button>
              </div>

              {isNew && packages.length > 0 && (
                <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300 flex items-center justify-between">
                  <span>✨ لديك ({packages.length}) باقة جاهزة وسيتم حفظها تلقائياً مع الخدمة عند الضغط على "حفظ الخدمة".</span>
                </div>
              )}

              {packages.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <PackageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">لا توجد باقات مضافة لهذه الخدمة حتى الآن</p>
                  <p className="text-[11px] text-slate-400">
                    يمكن للعملاء حجز الخدمة بالسعر الأساسي ({price} ج.م)، أو يمكنك إضافة باقات متعددة الآن لحفظها مباشرة مع الخدمة.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNewPackage}
                    className="mt-2 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300 font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة أول باقة</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {packages.map((pkg) => {
                    const hasDiscount = pkg.originalPrice && pkg.originalPrice > pkg.price;
                    const savings = hasDiscount ? pkg.originalPrice! - pkg.price : 0;

                    return (
                      <div
                        key={pkg.id}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          pkg.active
                            ? 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                            : 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 opacity-70'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {pkg.name}
                            </span>
                            {pkg.nameEn && (
                              <span className="text-[11px] text-slate-400">({pkg.nameEn})</span>
                            )}
                            {hasDiscount && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                                وفر {savings} ج.م
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                pkg.active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {pkg.active ? 'فعالة' : 'معطلة'}
                            </span>
                          </div>

                          {pkg.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">{pkg.description}</p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-sky-500" />
                              <span>{pkg.durationMinutes} دقيقة</span>
                            </span>
                            <span>•</span>
                            <span>الترتيب: {pkg.order ?? 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <div className="text-end">
                            <span className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">
                              {pkg.price} ج.م
                            </span>
                            {pkg.originalPrice && (
                              <span className="block text-[10px] text-slate-400 line-through font-mono">
                                {pkg.originalPrice} ج.م
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 border-s border-slate-200 dark:border-slate-700 ps-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePackageStatus(pkg)}
                              title={pkg.active ? 'تعطيل الباقة' : 'تفعيل الباقة'}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              {pkg.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditPackage(pkg)}
                              title="تعديل الباقة"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePackage(pkg)}
                              title="حذف الباقة"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ========================================== */}
            {/* ADD-ONS SECTION (ADMIN MANAGEMENT) */}
            {/* ========================================== */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>الإضافات الاختيارية (Service Add-ons)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    خدمات إضافية تكميلية يختارها العميل وقت الحجز (مثل: تنشيف احترافي، تلميع داخلي)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenNewAddon}
                  className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة إضافة</span>
                </button>
              </div>

              {isNew && addons.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
                  <span>✨ لديك ({addons.length}) إضافة جاهزة وسيتم حفظها تلقائياً مع الخدمة عند الضغط على "حفظ الخدمة".</span>
                </div>
              )}

              {addons.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">لا توجد إضافات اختيارية مضافة لهذه الخدمة حتى الآن</p>
                  <p className="text-[11px] text-slate-400">
                    أضف خيارات إضافية ذات عائد مرتفع للعملاء لزيادة متوسط قيمة الطلب (Average Order Value).
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNewAddon}
                    className="mt-2 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة أول خدمة إضافية</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {addons.map((addon) => (
                    <div
                      key={addon.id}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        addon.active
                          ? 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                          : 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 opacity-70'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {addon.name}
                          </span>
                          {addon.nameEn && (
                            <span className="text-[11px] text-slate-400">({addon.nameEn})</span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              addon.active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {addon.active ? 'فعالة' : 'معطلة'}
                          </span>
                        </div>

                        {addon.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{addon.description}</p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {addon.durationMinutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>+{addon.durationMinutes} دقيقة إضافية</span>
                            </span>
                          )}
                          <span>•</span>
                          <span>الترتيب: {addon.order ?? 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                          +{addon.price} ج.م
                        </span>

                        <div className="flex items-center gap-1 border-s border-slate-200 dark:border-slate-700 ps-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAddonStatus(addon)}
                            title={addon.active ? 'تعطيل الإضافة' : 'تفعيل الإضافة'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            {addon.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditAddon(addon)}
                            title="تعديل الإضافة"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAddon(addon)}
                            title="حذف الإضافة"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Features List */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">المميزات والتفاصيل المشملة</h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="أضف ميزة جديدة للخدمة..."
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                  className="flex-1 p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 py-1 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <span>{feat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Category, Image & Visibility Flags */}
          <div className="space-y-6">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">التصنيف وصورة الخدمة</h3>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold">القطاع / التصنيف *</label>
                  <Link
                    href="/admin/services/categories"
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>إدارة التصنيفات</span>
                    <span className="text-[10px]">↗</span>
                  </Link>
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  {!category && (
                    <option value="" disabled>
                      -- اختر التصنيف --
                    </option>
                  )}
                  {categories && categories.length > 0 ? (
                    categories
                      .filter((c) => c.active !== false || c.slug === category)
                      .map((cat) => (
                        <option key={cat.id || cat.slug} value={cat.slug}>
                          {cat.name} ({cat.slug}) {cat.active === false ? '- معطل' : ''}
                        </option>
                      ))
                  ) : (
                    <>
                      <option value="car">خدمات السيارات (car)</option>
                      <option value="home">خدمات المنازل (home)</option>
                    </>
                  )}
                  {category && categories.length > 0 && !categories.some((c) => c.slug === category) && (
                    <option value={category}>
                      {category === 'car'
                        ? 'خدمات السيارات (car)'
                        : category === 'home'
                        ? 'خدمات المنازل (home)'
                        : `${category} (مخصص)`}
                    </option>
                  )}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  اختر التصنيف المناسب الذي ستظهر تحته هذه الخدمة في الموقع وصفحات الحجز
                </p>
              </div>

              <div>
                <ImageUploader
                  value={image}
                  onChange={(url) => setImage(url)}
                  label="صورة الخدمة (1:1 مربع)"
                  description="ارفع صورة عالية الدقة بنسبة 1:1 أو استوردها من رابط خارجي أو اخترها من المكتبة"
                  defaultFit="cover"
                  allowFitToggle
                  allowPosition
                />
              </div>
            </div>

            {/* Visibility Settings */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">خيارات الظهور والترويج</h3>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">معروض في الموقع</span>
                  <span className="text-[10px] text-slate-400">إظهار الخدمة لعملاء الموقع والبحث</span>
                </div>
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-sky-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">تمييز كخدمة شائعة (Popular)</span>
                  <span className="text-[10px] text-slate-400">إضافة شارة &quot;الأكثر طلباً&quot;</span>
                </div>
                <input
                  type="checkbox"
                  checked={popular}
                  onChange={(e) => setPopular(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-sky-500"
                />
              </label>
            </div>

            {/* Submit Action Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isNew ? 'نشر الخدمة الآن' : 'حفظ تعديلات الخدمة'}</span>
                  </>
                )}
              </button>

              {!isNew && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('هل أنت متأكد من حذف هذه الخدمة نهائياً من الموقع؟')) {
                      deleteService(serviceId);
                      toast.success('تم حذف الخدمة بنجاح');
                      router.push('/admin/services');
                    }
                  }}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف الخدمة</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* ========================================== */}
      {/* PACKAGE EDIT / ADD MODAL */}
      {/* ========================================== */}
      {isPkgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-sky-500" />
                <span>{pkgEditId ? 'تعديل بيانات الباقة' : 'إضافة باقة جديدة'}</span>
              </h3>
              <button
                onClick={() => setIsPkgModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePackageSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">اسم الباقة (عربي) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: غسيل عربيتين"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Package Name (English)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 Cars Package"
                    value={pkgNameEn}
                    onChange={(e) => setPkgNameEn(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">وصف الباقة (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر لما تشمله الباقة..."
                  value={pkgDesc}
                  onChange={(e) => setPkgDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    سعر الباقة (ج.م) *
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 block font-normal">
                      (يستبدل السعر الأساسي للخدمة)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">السعر الأصلي (قبل الخصم)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="200"
                    value={pkgOriginalPrice}
                    onChange={(e) => setPkgOriginalPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">مدة الباقة (دقائق) *</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={pkgDuration}
                    onChange={(e) => setPkgDuration(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              {pkgOriginalPrice && Number(pkgOriginalPrice) > Number(pkgPrice) && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                  <span>الخصم المحسوب تلقائياً للعميل:</span>
                  <span>وفر {Number(pkgOriginalPrice) - Number(pkgPrice)} ج.م (خصم {Math.round(((Number(pkgOriginalPrice) - Number(pkgPrice)) / Number(pkgOriginalPrice)) * 100)}%)</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block font-semibold mb-1">ترتيب العرض</label>
                  <input
                    type="number"
                    value={pkgOrder}
                    onChange={(e) => setPkgOrder(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={pkgActive}
                      onChange={(e) => setPkgActive(e.target.checked)}
                      className="w-4 h-4 rounded-sm text-sky-500"
                    />
                    <span>باقة فعالة ومتاحة للطلب</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPkgModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  {pkgEditId ? 'حفظ التعديلات' : 'إضافة الباقة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ADD-ON EDIT / ADD MODAL */}
      {/* ========================================== */}
      {isAddonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{addonEditId ? 'تعديل بيانات الإضافة' : 'إضافة إضافة جديدة'}</span>
              </h3>
              <button
                onClick={() => setIsAddonModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddonSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">اسم الإضافة (عربي) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تنشيف احترافي"
                    value={addonName}
                    onChange={(e) => setAddonName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Add-on Name (English)</label>
                  <input
                    type="text"
                    placeholder="e.g. Pro Drying"
                    value={addonNameEn}
                    onChange={(e) => setAddonNameEn(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">وصف الإضافة (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر لمزايا الإضافة..."
                  value={addonDesc}
                  onChange={(e) => setAddonDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">سعر الإضافة (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addonPrice}
                    onChange={(e) => setAddonPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">المدة الإضافية في جدول المواعيد (دقائق)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={addonDuration}
                    onChange={(e) => setAddonDuration(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block font-semibold mb-1">ترتيب العرض</label>
                  <input
                    type="number"
                    value={addonOrder}
                    onChange={(e) => setAddonOrder(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={addonActive}
                      onChange={(e) => setAddonActive(e.target.checked)}
                      className="w-4 h-4 rounded-sm text-amber-500"
                    />
                    <span>إضافة فعالة ومتاحة للطلب</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddonModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  {addonEditId ? 'حفظ التعديلات' : 'إضافة الإضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
