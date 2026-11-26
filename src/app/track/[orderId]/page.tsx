'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { OrderTracker } from '@/components/orders/OrderTracker';
import { OrderReviewModal } from '@/components/reviews/OrderReviewModal';
import { Button } from '@/components/ui/Button';

export default function DirectOrderTrackPage() {
  const params = useParams();
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const orderId = params?.orderId as string;
  const addOrder = useOrderStore((s) => s.addOrder);
  const authStatus = useAuthStore((s) => s.authStatus);
  const [order, setOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (authStatus === 'AUTH_LOADING') return;
    let active = true;
    setIsLoading(true);
    setOrder(null);
    setErrorMsg(null);
    cleanzoApi.bookings.trackOrder(orderId)
      .then((booking) => {
        if (!active) return;
        const mapped = {
          ...booking,
          service: booking.service || booking.serviceSnapshot || {
            id: booking.serviceId,
            title: isAr ? 'خدمة كلينزو' : 'Cleanzo Service',
            titleEn: 'Cleanzo Service',
            category: booking.category,
            price: booking.finalPrice,
          },
        };
        setOrder(mapped);
        addOrder(mapped);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMsg(error?.code === 'ORDER_NOT_FOUND'
          ? (isAr ? 'سجّل الدخول أو استخدم نفس المتصفح اللي حجزت منه.' : 'Sign in or use the browser where you booked.')
          : error?.message);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [orderId, authStatus, isAr, addOrder]);

  if (isLoading || authStatus === 'AUTH_LOADING') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          {isAr ? `جارٍ استرجاع بيانات الطلب #${orderId} من قاعدة البيانات...` : `Fetching order #${orderId}...`}
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {isAr ? `الطلب #${orderId} غير متوفر` : `Order #${orderId} not found`}
        </h2>
        <p className="text-xs text-slate-400">
          {errorMsg || (isAr ? 'تأكد من صحة رقم الطلب أو تتبع عبر صفحة التتبع العامة.' : 'Check your order reference.')}
        </p>
        <Link href="/track">
          <Button variant="primary" size="sm">
            <span>{isAr ? 'البحث عن طلب' : 'Search Order'}</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/track"
          className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 hover:underline"
        >
          <ArrowIcon className="w-4 h-4 rotate-180" />
          <span>{isAr ? 'البحث عن طلب آخر' : 'Track another order'}</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500">#{order.id}</span>
        </div>
      </div>

      <OrderTracker
        order={order}
        onOpenReview={() => setReviewOpen(true)}
        onOrderUpdate={(updated) => setOrder({ ...updated })}
      />

      <OrderReviewModal
        order={order}
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
