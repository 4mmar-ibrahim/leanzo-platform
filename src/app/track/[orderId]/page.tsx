'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Phone, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { OrderTracker } from '@/components/orders/OrderTracker';
import { OrderReviewModal } from '@/components/reviews/OrderReviewModal';
import { Button } from '@/components/ui/Button';
import { validateEgyptianPhone } from '@/lib/validation/phoneValidation';

export default function DirectOrderTrackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const orderId = params?.orderId as string;
  const getOrderById = useOrderStore((s) => s.getOrderById);
  const addOrder = useOrderStore((s) => s.addOrder);
  const currentUser = useAuthStore((s) => s.user);

  const localOrder = getOrderById(orderId);
  const [order, setOrder] = useState<any | null>(localOrder || null);
  const [isLoading, setIsLoading] = useState<boolean>(!localOrder);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState<boolean>(false);
  const [verifyPhoneInput, setVerifyPhoneInput] = useState<string>(searchParams?.get('phone') || currentUser?.phone || '');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [reviewOpen, setReviewOpen] = useState<boolean>(false);

  // Sync state if local order appears or changes
  useEffect(() => {
    if (localOrder) {
      setOrder(localOrder);
      setIsLoading(false);
    }
  }, [localOrder]);

  // Always fetch fresh authoritative status from backend
  useEffect(() => {
    let isMounted = true;
    async function loadOrderLive() {
      if (!localOrder) {
        setIsLoading(true);
      }
      setErrorMsg(null);

      // 1. If user is logged in, try authenticated getBookingById
      if (currentUser) {
        try {
          const fetched = await cleanzoApi.bookings.getBookingById(orderId);
          if (fetched && isMounted) {
            const mappedOrder: any = {
              ...fetched,
              service: fetched.service || (fetched as any).serviceSnapshot || {
                id: (fetched as any).serviceId || 'srv-unknown',
                title: (fetched as any).serviceSnapshot?.title || 'خدمة كلينزو',
                titleEn: (fetched as any).serviceSnapshot?.titleEn || 'Cleanzo Service',
                category: (fetched as any).category || (fetched as any).serviceSnapshot?.category || 'car',
                price: fetched.finalPrice || (fetched as any).serviceSnapshot?.price || 0,
              },
            };
            setOrder(mappedOrder);
            addOrder(mappedOrder);
            setIsLoading(false);
            setNeedsPhoneVerification(false);
            return;
          }
        } catch {
          // Proceed to public track check
        }
      }

      // 2. If phone is known via search params, profile, or cached order, try public tracking
      const phoneToTry = searchParams?.get('phone') || currentUser?.phone || localOrder?.customerPhone;
      if (phoneToTry) {
        try {
          const tracked = await cleanzoApi.bookings.trackOrder(orderId, phoneToTry);
          if (tracked && isMounted) {
            const mappedOrder: any = {
              ...tracked,
              id: tracked.id || orderId,
              customerPhone: phoneToTry,
              service: tracked.service || (tracked as any).serviceSnapshot || {
                id: (tracked as any).serviceId || 'srv-cleanzo',
                title: (tracked as any).serviceTitle || (tracked as any).serviceSnapshot?.title || 'خدمة كلينزو',
                titleEn: (tracked as any).serviceSnapshot?.titleEn || 'Cleanzo Service',
                category: (tracked as any).category || (tracked as any).serviceSnapshot?.category || 'car',
                price: tracked.finalPrice || (tracked as any).serviceSnapshot?.price || 0,
              },
            };
            setOrder(mappedOrder);
            addOrder(mappedOrder);
            setIsLoading(false);
            setNeedsPhoneVerification(false);
            return;
          }
        } catch (err: any) {
          if (isMounted) {
            if (err?.code === 'FORBIDDEN_PHONE_MISMATCH') {
              setNeedsPhoneVerification(true);
              setErrorMsg(isAr ? 'رقم الهاتف غير مطابق لبيانات هذا الحجز' : 'Phone number does not match this booking');
            }
          }
        }
      }

      // 3. Needs phone verification to protect customer privacy if not already loaded
      if (isMounted && !localOrder) {
        setNeedsPhoneVerification(true);
        setIsLoading(false);
      }
    }

    loadOrderLive();

    return () => {
      isMounted = false;
    };
  }, [orderId, currentUser, searchParams, isAr, addOrder]);

  const handlePhoneVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVerify = verifyPhoneInput.trim();
    if (!cleanVerify) return;

    const phoneVal = validateEgyptianPhone(cleanVerify);
    if (!phoneVal.isValid) {
      setErrorMsg(phoneVal.message || (isAr ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)' : 'Please enter a valid Egyptian phone number'));
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const res = await cleanzoApi.bookings.trackOrder(orderId, cleanVerify);
      if (res) {
        const mappedOrder: any = {
          ...res,
          id: res.id || orderId,
          service: res.service || {
            id: 'srv-cleanzo',
            title: (res as any).serviceTitle || 'خدمة كلينزو',
            titleEn: 'Cleanzo Service',
            category: 'car',
            price: res.finalPrice || 0,
          },
        };
        setOrder(mappedOrder);
        addOrder(mappedOrder);
        setNeedsPhoneVerification(false);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isAr
            ? 'تعذر التحقق من بيانات الطلب، يرجى التأكد من رقم الهاتف وصحة رقم الحجز'
            : 'Verification failed. Please check your phone number and order ID.')
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          {isAr ? `جارٍ استرجاع بيانات الطلب #${orderId} من قاعدة البيانات...` : `Fetching order #${orderId}...`}
        </p>
      </div>
    );
  }

  if (needsPhoneVerification && !order) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isAr ? 'تأكيد هوية متابعة الطلب' : 'Verify Order Access'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr
                ? `لحماية خصوصيتك وأمان بيانات حجزك (#${orderId})، يرجى إدخال رقم الهاتف المسجل بالحجز لعرض تفاصيل التتبع الحي.`
                : `To protect booking privacy (#${orderId}), enter the phone number registered with this order.`}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handlePhoneVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'رقم الهاتف المسجل بالطلب' : 'Registered Phone Number'}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  dir="ltr"
                  required
                  placeholder="01012345678"
                  value={verifyPhoneInput}
                  onChange={(e) => setVerifyPhoneInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full justify-center" disabled={isVerifying}>
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                <span>{isAr ? 'عرض بيانات التتبع' : 'Track Order'}</span>
              )}
            </Button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/track"
              className="text-xs font-bold text-slate-500 hover:text-sky-600 dark:hover:text-sky-400"
            >
              {isAr ? 'الرجوع إلى صفحة البحث' : 'Back to Search'}
            </Link>
          </div>
        </div>
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

      <OrderTracker order={order} onOpenReview={() => setReviewOpen(true)} />

      <OrderReviewModal
        order={order}
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
