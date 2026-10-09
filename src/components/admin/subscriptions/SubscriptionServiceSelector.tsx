'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, CheckCircle2, Car, Home, Layers, X, AlertCircle, Sparkles, Package } from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { Service } from '@/types';

interface SubscriptionServiceSelectorProps {
  services: any[];
  selectedServiceId: string;
  onSelectService: (service: any) => void;
  disabled?: boolean;
}

export function SubscriptionServiceSelector({
  services,
  selectedServiceId,
  onSelectService,
  disabled = false,
}: SubscriptionServiceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useServiceStore((s) => s.categories);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filter to active, non-archived services only (TASK 08 & 12)
  const activeServices = useMemo(() => {
    return (Array.isArray(services) ? services : []).filter(
      (s: any) => s.available !== false && !s.isArchived && s.active !== false
    );
  }, [services]);

  // Dynamic categories combined from store and any active service category slugs
  const dynamicCategories = useMemo(() => {
    const list = Array.isArray(categories) && categories.length > 0
      ? categories.filter((c) => c.active !== false)
      : [];

    const existingSlugs = new Set(list.map((c) => c.slug));
    const orphanSlugs = Array.from(new Set(activeServices.map((s: any) => s.category))).filter(
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
        icon: 'Sparkles',
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
  }, [categories, activeServices]);

  // Filtered by Search & Category
  const filteredServices = useMemo(() => {
    return activeServices.filter((s: any) => {
      // Dynamic Category Filter
      if (selectedCategory !== 'all' && s.category !== selectedCategory) {
        return false;
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

  const selectedService = useMemo(() => {
    return activeServices.find((s) => s.id === selectedServiceId);
  }, [activeServices, selectedServiceId]);

  const getCategoryIcon = (slug: string, iconStr?: string) => {
    const s = (slug || '').toLowerCase();
    const ic = (iconStr || '').toLowerCase();
    if (s === 'car' || ic === 'car') return <Car className="w-3 h-3" />;
    if (s === 'home' || ic === 'home') return <Home className="w-3 h-3" />;
    if (ic === 'package') return <Package className="w-3 h-3" />;
    return <Sparkles className="w-3 h-3" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="font-bold text-foreground/80 text-xs flex items-center gap-1.5">
          <span>الخدمة المرتبطة بالباقة *</span>
          {selectedService && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              تم اختيار: {selectedService.title}
            </span>
          )}
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
            const count = activeServices.filter((s: any) => s.category === cat.slug).length;
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

      {/* Search Input (TASK 09) */}
      <div className="relative">
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

      {/* Services Grid (TASK 08 & 11) - Shows ONLY Name & Description, NO Price */}
      <div className="max-h-56 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-2 divide-y divide-border/20">
        {filteredServices.length === 0 ? (
          <div className="py-6 text-center text-foreground/50 text-xs flex flex-col items-center gap-1.5">
            <AlertCircle className="w-5 h-5 text-amber-500/70" />
            <span>لا توجد خدمات مطابقة لبحثك في هذا القسم</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredServices.map((service: any) => {
              const isSelected = selectedServiceId === service.id;
              const description =
                service.description ||
                service.shortDescription ||
                service.descriptionEn ||
                'خدمة نظافة وعناية احترافية من كلينزو';

              return (
                <div
                  key={service.id}
                  onClick={() => !disabled && onSelectService(service)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-right relative ${
                    isSelected
                      ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'bg-card border-border/60 hover:border-primary/40 hover:bg-muted/40'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-foreground text-xs leading-snug">
                        {service.title}
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
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
