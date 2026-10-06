'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Clock, Car, Home, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Service } from '@/types';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { getServiceDisplayPrice } from '@/lib/pricing';

interface ServiceCardProps {
  service: Service;
  featured?: boolean;
}

export function ServiceCard({ service, featured = false }: ServiceCardProps) {
  const router = useRouter();
  const { locale, direction } = useLocaleStore();
  const { selectService } = useBookingStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const pricing = getServiceDisplayPrice(service);

  const handleBookNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectService(service);
    router.push(`/booking?category=${service.category}&serviceId=${service.id}`);
  };

  return (
    <div
      onClick={() => router.push(`/services/${service.category}/${service.id}`)}
      className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-sky-300 dark:hover:border-sky-900 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Card Header: Category & Popular / Discount Badges (Cleanly Outside Image) */}
      <div className="pt-4 px-5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs">
          {service.category === 'car' ? (
            <>
              <Car className="w-3.5 h-3.5 text-sky-500" />
              <span>{isAr ? 'سيارات' : 'Car'}</span>
            </>
          ) : (
            <>
              <Home className="w-3.5 h-3.5 text-[#07345C] dark:text-[#83AED0]" />
              <span>{isAr ? 'منازل' : 'Home'}</span>
            </>
          )}
        </span>

        <div className="flex items-center gap-1.5">
          {service.popular && (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
              {isAr ? 'الأكثر طلباً' : 'Most Popular'}
            </span>
          )}
          {service.discount && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500 text-white shadow-2xs">
              {isAr ? `خصم ${service.discount}%` : `${service.discount}% OFF`}
            </span>
          )}
        </div>
      </div>

      {/* Clean Circular Service Image Presentation — No Overlays */}
      <div className="py-4 px-5 flex items-center justify-center">
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 shrink-0">
          <CleanzoImage
            src={service.image}
            alt={isAr ? service.title : service.titleEn}
            fit="cover"
            position="center"
            className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
            {isAr ? service.title : service.titleEn}
          </h3>

          {/* Rating & Duration */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
            <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{service.rating}</span>
              <span className="text-slate-400 font-normal">({service.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>{formatDuration(service.duration, isAr)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {isAr ? service.shortDescription : service.shortDescriptionEn}
          </p>

          {/* Quick Feature Highlights (first 2) */}
          <ul className="pt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
            {(isAr ? service.features : service.featuresEn).slice(0, 2).map((feat, idx) => (
              <li key={idx} className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                <span className="truncate">{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer: Price + CTAs */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">
              {isAr ? 'يبدأ من' : 'Starting from'}
            </span>
            <PriceDisplay price={pricing.sellingPrice} originalPrice={pricing.hasDiscount ? pricing.originalPrice : undefined} size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleBookNow}
              className="px-3.5 py-1.5 text-xs shadow-md shadow-sky-500/20"
            >
              <span>{isAr ? 'احجز الآن' : 'Book'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
