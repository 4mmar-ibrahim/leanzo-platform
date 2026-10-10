'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Clock, Car, Home, ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Service } from '@/types';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useServiceStore } from '@/store/useServiceStore';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { Button } from '@/components/ui/Button';
import { formatDuration, getServiceTotalMinutes, cn } from '@/lib/utils';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { getServiceDisplayPrice } from '@/lib/pricing';
import { resolveCategoryInfo } from '@/lib/services/categoryUtils';
import { autoTranslate } from '@/lib/i18n/autoTranslate';

interface ServiceCardProps {
  service: Service;
  featured?: boolean;
}

export function ServiceCard({ service, featured = false }: ServiceCardProps) {
  const router = useRouter();
  const { locale, direction } = useLocaleStore();
  const { selectService } = useBookingStore();
  const categories = useServiceStore((s) => s.categories);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);

  React.useEffect(() => {
    if (!categories || categories.length === 0) {
      fetchCategories();
    }
  }, [categories, fetchCategories]);

  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const pricing = getServiceDisplayPrice(service);

  const catInfo = React.useMemo(() => {
    return resolveCategoryInfo(service.category, categories, isAr);
  }, [service.category, categories, isAr]);

  const targetDetailUrl =
    service.category === 'car'
      ? `/services/car/${service.id}`
      : service.category === 'home'
      ? `/services/home/${service.id}`
      : `/services/${service.id}`;

  const handleBookNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectService(service);
    router.push(`/booking?category=${service.category}&serviceId=${service.id}`);
  };

  return (
    <div
      onClick={() => router.push(targetDetailUrl)}
      className="group relative flex flex-col cursor-pointer transition-all duration-300"
    >
      {/* Clean Circular Service Image — 100% Round, Independent, Zero Square/Card behind it */}
      <div className="flex items-center justify-center pb-2">
        <div
          style={{ borderRadius: '50%' }}
          className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden group-hover:scale-105 transition-all duration-300 shrink-0 bg-transparent"
        >
          <CleanzoImage
            src={service.image}
            alt={isAr ? service.title : service.titleEn}
            fit="cover"
            position="center"
            containerClassName="rounded-full !bg-transparent"
            className="w-full h-full object-cover rounded-full"
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Existing Service Information Card — Clean and borderless, no background rectangle */}
      <div className="bg-transparent border-0 shadow-none overflow-hidden transition-all duration-300 flex-1 flex flex-col justify-between">
        {/* Card Header: Category & Popular / Discount Badges */}
        {/* Card Header: Category & Popular / Discount Badges */}
        <div className="pt-2 px-1 flex items-center justify-center gap-2 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors',
              catInfo.isCar
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60'
                : catInfo.isHome
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
            )}
          >
            {catInfo.isCar ? (
              <Car className="w-3.5 h-3.5 text-sky-500" />
            ) : catInfo.isHome ? (
              <Home className="w-3.5 h-3.5 text-[#07345C] dark:text-[#83AED0]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>{catInfo.name}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {service.popular && (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
                {isAr ? 'الأكثر طلباً' : 'Most Popular'}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-2 pt-3 flex-1 flex flex-col justify-between space-y-3 items-center text-center">
          <div className="space-y-2 w-full text-center">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1 text-center">
              {isAr ? service.title : (service.titleEn || autoTranslate(service.title, 'en'))}
            </h3>

            {/* Rating & Duration */}
            <div className="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 pb-1">
              <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{service.rating}</span>
                <span className="text-slate-400 font-normal">({service.reviewCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>{formatDuration(getServiceTotalMinutes(service), isAr)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed text-center">
              {isAr ? service.shortDescription : (service.shortDescriptionEn || autoTranslate(service.shortDescription, 'en'))}
            </p>

            {/* Quick Feature Highlights (first 2) */}
            <ul className="pt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 flex flex-col items-center">
              {(isAr
                ? (service.features || [])
                : ((service.featuresEn && service.featuresEn.length > 0)
                    ? service.featuresEn
                    : (service.features || []).map((f) => autoTranslate(f, 'en')))
              ).slice(0, 2).map((feat, idx) => (
                <li key={idx} className="flex items-center justify-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                  <span className="truncate">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer: Price + CTAs */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-2.5 w-full">
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] text-slate-400 font-medium">
                {isAr ? 'يبدأ من' : 'Starting from'}
              </span>
              <PriceDisplay
                price={Number(service.price) || 0}
                originalPrice={service.originalPrice && service.originalPrice > service.price ? service.originalPrice : undefined}
                size="sm"
              />
            </div>

            <div className="w-full flex items-center justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBookNow}
                className="w-full max-w-[200px] justify-center px-3.5 py-2 text-xs shadow-md shadow-sky-500/20"
              >
                <span>{isAr ? 'احجز الآن' : 'Book'}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
