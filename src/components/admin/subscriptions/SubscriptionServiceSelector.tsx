'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, Car, Home, Layers, X, AlertCircle, Sparkles, Package } from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { Service } from '@/types';

interface SubscriptionServiceSelectorProps {
  services: any[];
  selectedServiceId?: string;
  selectedServiceIds?: string[];
  onSelectService?: (service: any) => void;
  onSelectServices?: (services: any[]) => void;
  disabled?: boolean;
}

export function SubscriptionServiceSelector({
  services,
  selectedServiceId = '',
  selectedServiceIds,
  onSelectService,
  onSelectServices,
  disabled = false,
}: SubscriptionServiceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useServiceStore((s) => s.categories);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const storeServices = useServiceStore((s) => s.services);
  const fetchAdminServices = useServiceStore((s) => s.fetchAdminServices);
  const fetchStoreServices = useServiceStore((s) => s.fetchServices);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // If services prop is empty, fetch from store (admin first, then public) as fallback
  useEffect(() => {
    if ((!services || services.length === 0) && (!storeServices || storeServices.length === 0)) {
      fetchAdminServices().catch(() => {
        fetchStoreServices().catch(() => {});
      });
    }
  }, [services, storeServices, fetchAdminServices, fetchStoreServices]);

  // Helper to extract category key regardless of whether category is string, object, or slug
  const getServiceCategoryKey = useCallback((s: any): string => {
    if (!s) return '';
    if (typeof s.category === 'string') return s.category.toLowerCase();
    if (typeof s.category === 'object' && s.category !== null) {
      return (s.category.slug || s.category.id || s.category._id || '').toLowerCase();
    }
    return (s.categoryId || '').toLowerCase();
  }, []);

  // Use services prop if available, otherwise fall back to store services
  const effectiveServices = useMemo(() => {
    if (services && services.length > 0) return services;
    return storeServices || [];
  }, [services, storeServices]);

  // Filter to active, non-archived services only (TASK 08 & 12)
  const activeServices = useMemo(() => {
    return (Array.isArray(effectiveServices) ? effectiveServices : []).filter(
      (s: any) => s && s.available !== false && !s.isArchived && s.active !== false
    );
  }, [effectiveServices]);

  // Dynamic categories combined from store and any active service category slugs
  const dynamicCategories = useMemo(() => {
    const list = Array.isArray(categories) && categories.length > 0
      ? categories.filter((c) => c.active !== false)
      : [];

    const existingSlugs = new Set(list.map((c) => (c.slug || '').toLowerCase()));
    const orphanSlugs = Array.from(new Set(activeServices.map((s: any) => getServiceCategoryKey(s)))).filter(
      (slug): slug is string => Boolean(slug) && !existingSlugs.has(slug)
    );

    const merged = [...list];
    for (const orphan of orphanSlugs) {
      merged.push({
        id: `cat-${orphan}`,
        slug: orphan,
        name: orphan === 'car' ? 'خدمات السيارات' : orphan === 'home' ? 'خدمات المنازل' : orphan,
        nameEn: orphan === 'car' ? 'Car Services' : orphan === 'home' ? 'Home Services' : orphan,
        description: '',
        descriptionEn: '',
        icon: orphan === 'car' ? 'Car' : orphan === 'home' ? 'Home' : 'Sparkles',
        image: '',
        active: true,
        order: 999,
      });
    }

    // If still empty (e.g. initial load without backend), provide sensible defaults
    if (merged.length === 0) {
      return [
        { id: 'cat-car', slug: 'car', name: 'خدمات السيارات', nameEn: 'Car Services', icon: 'Car', image: '', active: true, order: 1, description: '', descriptionEn: '' },
        { id: 'cat-home', slug: 'home', name: 'خدمات المنازل', nameEn: 'Home Services', icon: 'Home', image: '', active: true, order: 2, description: '', descriptionEn: '' },
      ];
    }

    return merged.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [categories, activeServices, getServiceCategoryKey]);

  // Filtered by Search & Category
  const filteredServices = useMemo(() => {
    return activeServices.filter((s: any) => {
      // Dynamic Category Filter
      if (selectedCategory !== 'all') {
        const catKey = getServiceCategoryKey(s);
        const matchesCat =
          catKey === selectedCategory.toLowerCase() ||
          catKey === selectedCategory ||
          s.categoryId === selectedCategory;
        if (!matchesCat) {
          return false;
        }
      }

      // Search Filter (TASK 09): Name & Description (Arabic and English)
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const titleAr = (s.title || '').toLowerCase();
        const titleEn = (s.titleEn || '').toLowerCase();
        const descAr = (s.description || s.shortDescription || '').toLowerCase();
        const descEn = (s.descriptionEn || s.shortDescriptionEn || '').toLowerCase();

        const match =
          titleAr.includes(q) ||
          titleEn.includes(q) ||
          descAr.includes(q) ||
          descEn.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [activeServices, selectedCategory, searchTerm]);

  // Multi-selection resolution: handle array of selected services
  const currentSelectedIds = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(selectedServiceIds) && selectedServiceIds.length > 0) {
      list.push(...selectedServiceIds.filter(Boolean));
    }
    if (selectedServiceId && !list.includes(selectedServiceId)) {
      list.unshift(selectedServiceId);
    }
    return Array.from(new Set(list));
  }, [selectedServiceId, selectedServiceIds]);

  const selectedServicesList = useMemo(() => {
    return activeServices.filter((s: any) =>
      currentSelectedIds.includes(s.id || s._id)
    );
  }, [activeServices, currentSelectedIds]);

  const handleToggleService = (service: any) => {
    if (disabled) return;
    const sId = service.id || service._id;
    const isCurrentlySelected = currentSelectedIds.includes(sId);

    let nextIds: string[];
    if (isCurrentlySelected) {
      nextIds = currentSelectedIds.filter((id) => id !== sId);
    } else {
      nextIds = [...currentSelectedIds, sId];
    }

    const nextServices = activeServices.filter((s: any) =>
      nextIds.includes(s.id || s._id)
    );

    if (onSelectServices) {
      onSelectServices(nextServices);
    }
    if (onSelectService) {
      onSelectService(nextServices[0] || null);
    }
  };

  const handleSelectAllInCurrentCategory = () => {
    if (disabled || filteredServices.length === 0) return;
    const currentFilteredIds = filteredServices.map((s: any) => s.id || s._id);
    const combinedIds = Array.from(new Set([...currentSelectedIds, ...currentFilteredIds]));
    const nextServices = activeServices.filter((s: any) =>
      combinedIds.includes(s.id || s._id)
    );
    if (onSelectServices) onSelectServices(nextServices);
    if (onSelectService) onSelectService(nextServices[0] || null);
  };

  const handleClearSelection = () => {
    if (disabled) return;
    if (onSelectServices) onSelectServices([]);
    if (onSelectService) onSelectService(null);
  };

  const handleRemoveSingleService = (sId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const nextIds = currentSelectedIds.filter((id) => id !== sId);
    const nextServices = activeServices.filter((s: any) =>
      nextIds.includes(s.id || s._id)
    );
    if (onSelectServices) onSelectServices(nextServices);
    if (onSelectService) onSelectService(nextServices[0] || null);
  };

  const getCategoryIcon = (slug: string, iconStr?: string) => {
    const s = (slug || '').toLowerCase();
    const ic = (iconStr || '').toLowerCase();
    if (s === 'car' || s === 'cars' || ic === 'car') return <Car className="w-3 h-3" />;
    if (s === 'home' || s === 'homes' || ic === 'home') return <Home className="w-3 h-3" />;
    if (ic === 'package') return <Package className="w-3 h-3" />;
    return <Sparkles className="w-3 h-3" />;
  };

  return (
    <div className="space-y-3">
      {/* Header & Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="font-bold text-foreground/80 text-xs flex items-center gap-1.5 flex-wrap">
          <span>الخدمات المرتبطة بالباقة *</span>
          <span className="text-[11px] font-semibold text-foreground/50">
            (يمكنك اختيار أكثر من خدمة لإدراجها في الباقة)
          </span>
        </label>

        {/* Dynamic Category Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 text-[11px] font-bold self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>الكل ({activeServices.length})</span>
          </button>

          {dynamicCategories.map((cat) => {
            const count = activeServices.filter((s: any) => {
              const catKey = getServiceCategoryKey(s);
              return catKey === (cat.slug || '').toLowerCase() || catKey === (cat.id || '').toLowerCase();
            }).length;
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id || cat.slug}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-card text-primary shadow-xs'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                {getCategoryIcon(cat.slug, cat.icon)}
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Services Summary Badges Bar */}
      {selectedServicesList.length > 0 && (
        <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-primary">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تم اختيار ({selectedServicesList.length}) خدمات مشمولة في الباقة:</span>
            </span>
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={disabled}
              className="text-[10px] text-foreground/50 hover:text-rose-500 transition underline underline-offset-2"
            >
              إلغاء التحديد بالكامل
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedServicesList.map((svc: any) => {
              const sId = svc.id || svc._id;
              return (
                <span
                  key={sId}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-card border border-primary/30 text-foreground shadow-2xs"
                >
                  <span className="truncate max-w-[180px] sm:max-w-[260px]">{svc.title || svc.name}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveSingleService(sId, e)}
                    disabled={disabled}
                    className="p-0.5 text-foreground/40 hover:text-rose-500 rounded-full"
                    title="إزالة الخدمة من الباقة"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-foreground/40 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الخدمة أو تفاصيلها (مثال: غسيل، بخار، تعقيم)..."
            className="w-full ps-9 pe-8 py-2 text-xs rounded-xl bg-background border border-border/70 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition"
            disabled={disabled}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 p-0.5 text-foreground/40 hover:text-foreground rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filteredServices.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAllInCurrentCategory}
            disabled={disabled}
            className="px-3 py-2 text-[11px] font-bold rounded-xl bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/60 transition whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5" />
            <span>تحديد الكل بهذا القسم ({filteredServices.length})</span>
          </button>
        )}
      </div>

      {/* Services Grid - Multi-Selectable Cards */}
      <div className="max-h-60 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-2">
        {filteredServices.length === 0 ? (
          <div className="py-6 text-center text-foreground/50 text-xs flex flex-col items-center gap-1.5">
            <AlertCircle className="w-5 h-5 text-amber-500/70" />
            <span>لا توجد خدمات مطابقة لبحثك في هذا القسم</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredServices.map((service: any) => {
              const serviceId = service.id || service._id;
              const isSelected = currentSelectedIds.includes(serviceId);
              const title = service.title || service.name || 'خدمة كلينزو';
              const description =
                service.description ||
                service.shortDescription ||
                service.descriptionEn ||
                'خدمة نظافة وعناية احترافية من كلينزو';

              return (
                <div
                  key={serviceId}
                  onClick={() => handleToggleService(service)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-right relative ${
                    isSelected
                      ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'bg-card border-border/60 hover:border-primary/40 hover:bg-muted/40'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-foreground text-xs leading-snug">
                        {title}
                      </div>
                      {isSelected ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-md">
                            مشمولة
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        </div>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-border/80 shrink-0" />
                      )}
                    </div>
                    {/* Strictly Name & Description only - NO PRICE DISPLAYED */}
                    <p className="text-[11px] text-foreground/60 line-clamp-2 leading-relaxed font-normal">
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
