'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Calendar, Clock, MapPin, Sparkles, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import type { Order } from '@/types';
import { useServiceStore } from '@/store/useServiceStore';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { Button } from '@/components/ui/Button';
import { formatTimeTo12Hour } from '@/lib/timeUtils';

function SuccessContent() {
  const searchParams = useSearchParams();
  const { t, locale, direction } = useLocaleStore();
  const authStatus = useAuthStore(state => state.authStatus);
  const getServiceById = useServiceStore((s) => s.getServiceById);
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const orderId = searchParams.get('orderId')?.trim() || '';
  const [result, setResult] = useState<{ id: string; order: Order | null } | null>(null);
  useEffect(() => {
    if (!orderId || authStatus === 'AUTH_LOADING') return;
    let active = true;
    cleanzoApi.bookings.trackOrder(orderId)
      .then(order => { if (active) setResult({ id: orderId, order: order?.id === orderId ? order : null }); })
      .catch(() => { if (active) setResult({ id: orderId, order: null }); });
    return () => { active = false; };
  }, [orderId, authStatus]);

  if (orderId && (authStatus === 'AUTH_LOADING' || result?.id !== orderId)) {
    return <p role="status" className="py-20 text-center">{isAr ? 'جارٍ التحقق من الطلب…' : 'Verifying the booking…'}</p>;
  }
  const order = orderId ? result?.order : null;
  if (!order) {
    return (
      <div className="py-20 px-4 space-y-4 text-center">
        <h1>{isAr ? 'تعذر التحقق من الطلب' : 'Could not verify the booking'}</h1>
        <Link href="/track" className="text-sky-600 underline">{isAr ? 'تتبّع طلبًا' : 'Track a booking'}</Link>
      </div>
    );
  }

  const resolvedService = order?.service || (order?.serviceId ? getServiceById(order.serviceId) : undefined);
  const serviceTitle = isAr
    ? resolvedService?.title || order.serviceSnapshot?.title || (order as any)?.serviceName || 'خدمة كلينزو المتميزة'
    : resolvedService?.titleEn || order.serviceSnapshot?.titleEn || (order as any)?.serviceNameEn || resolvedService?.title || 'Cleanzo Premium Service';

  const addressText = order?.address
    ? `${order.address.governorate || ''} — ${order.address.city || ''}${order.address.area ? `, ${order.address.area}` : ''}`.trim()
    : (isAr ? 'العنوان المحدد' : 'Selected Address');

  const finalPrice = order?.finalPrice ?? order?.basePrice ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-center">
      {/* Success Animated Icon */}
      <div className="flex flex-col items-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 ring-8 ring-emerald-50 dark:ring-emerald-950/30 animate-scale-up">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isAr ? 'تم تسجيل طلبك' : 'Your booking was received'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {isAr ? 'تقدر تتابع حالة طلبك من صفحة التتبع.' : 'You can follow its status on the tracking page.'}
          </p>
        </div>
      </div>

      {/* Order Badge Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-6 text-start">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">
              {t.success.orderNumber}
            </span>
            <p className="text-lg font-mono font-black text-sky-600 dark:text-sky-400">
              {orderId}
            </p>
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Sparkles className="w-3.5 h-3.5" />
            {isAr ? 'طلب مسجّل' : 'Booking received'}
          </span>
        </div>

        {order ? (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{isAr ? 'الخدمة المختارة' : 'Service'}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {serviceTitle}
              </span>
            </div>

            {order.packageSnapshot && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isAr ? 'الباقة المختارة' : 'Package'}</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {order.packageSnapshot.name} ({order.packageSnapshot.price} {isAr ? 'ج.م' : 'EGP'})
                </span>
              </div>
            )}

            {order.addons && order.addons.length > 0 && (
              <div className="flex items-start justify-between">
                <span className="text-slate-400 shrink-0">{isAr ? 'الإضافات المختارة' : 'Add-ons'}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-end">
                  {order.addons.map((a: any) => a.name).join('، ')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-400">{isAr ? 'الموعد المحدد' : 'Date & Time'}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {order.date || '—'} • {formatTimeTo12Hour(order.time)}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-400 shrink-0">{isAr ? 'موقع الخدمة' : 'Location'}</span>
              <span className="font-medium text-slate-900 dark:text-white text-end">
                {addressText}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
              <span className="text-slate-900 dark:text-white font-bold text-sm">
                {isAr ? 'المبلغ الإجمالي عند التسليم' : 'Total on Delivery'}
              </span>
              <PriceDisplay price={finalPrice} size="lg" />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {isAr
              ? 'تم تسجيل طلبك ويمكنك مراجعته ومتابعته في أي وقت من خلال لوحة التحكم الخاصة بحسابك.'
              : 'Your booking has been registered and can be tracked anytime in your dashboard.'}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href={`/track/${encodeURIComponent(orderId)}`} className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto shadow-lg shadow-sky-500/25">
            <span>{t.success.viewOrder}</span>
            <ArrowIcon className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/" className="w-full sm:w-auto">
          <Button variant="outline" size="md" className="w-full sm:w-auto">
            <span>{t.success.backHome}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-400">جاري التحميل...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
