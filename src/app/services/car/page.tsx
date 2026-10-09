'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Car, Sparkles, ShieldCheck, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useServiceStore } from '@/store/useServiceStore';
import { ServiceCard } from '@/components/services/ServiceCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { resolveCategoryInfo } from '@/lib/services/categoryUtils';

export default function CarServicesPage() {
  const { t, locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const storeServices = useServiceStore((s) => s.services);
  const categories = useServiceStore((s) => s.categories);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);

  useEffect(() => {
    fetchServices('car');
    fetchCategories();
  }, [fetchServices, fetchCategories]);

  const carServices = useMemo(() => {
    return (storeServices || []).filter((s) => {
      if (s.available === false || (s as any).isArchived) return false;
      const cat = resolveCategoryInfo(s.category, categories, isAr);
      return cat.isCar || s.category === 'car';
    });
  }, [storeServices, categories, isAr]);

  return (
    <div className="py-12 bg-[#EAF8FC] dark:bg-[#041728] min-h-screen space-y-12">
      {/* Category Hero Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#041728] via-[#07345C] to-[#041728] p-8 sm:p-14 text-white shadow-xl border border-[#0866C6]/20">
          <div className="relative z-10 max-w-2xl space-y-4 text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-xs font-bold text-sky-300">
              <Car className="w-4 h-4" />
              <span>{isAr ? 'عناية متخصصة بالسيارات' : 'Specialized Automotive Care'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {t.home.carCategoryTitle}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {t.home.carCategoryDesc}
            </p>

            <div className="pt-2 flex items-center gap-4 flex-wrap">
              <Link href="/booking?category=car">
                <Button variant="primary" size="md">
                  <span>{t.nav.bookNow}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Button>
              </Link>
              <span className="text-xs text-slate-400 font-medium">
                {isAr ? '• وحدات ديتيلينج متنقلة مجهزة بأحدث المعدات' : '• Fully equipped mobile detailing units'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isAr ? 'جميع باقات العناية بالسيارات' : 'All Car Care Packages'}
          </h2>
          <span className="text-xs text-slate-500">
            {carServices.length} {isAr ? 'خدمات متوفرة' : 'Available'}
          </span>
        </div>

        {carServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {carServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={isAr ? 'لا توجد خدمات سيارات متوفرة حالياً' : 'No car services available'}
            description={isAr ? 'نعمل على إضافة خدمات وتحديث الباقات قريباً.' : 'We are updating our catalog with new packages soon.'}
          />
        )}
      </div>
    </div>
  );
}
