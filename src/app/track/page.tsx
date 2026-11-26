'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Car,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { OrderTracker } from '@/components/orders/OrderTracker';
import { OrderReviewModal } from '@/components/reviews/OrderReviewModal';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

export default function OrderTrackPage() {
  const router = useRouter();
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const authStatus = useAuthStore(state => state.authStatus);
  const addOrder = useOrderStore((s) => s.addOrder);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus === 'AUTH_LOADING') return;
    const q = searchQuery.trim();
    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(false);

    try {
      const foundBooking = await cleanzoApi.bookings.trackOrder(q);
      if (foundBooking) {
        const mappedOrder: any = {
          ...foundBooking,
          id: foundBooking.id || q,
          service: foundBooking.service || (foundBooking as any).serviceSnapshot || {
            id: (foundBooking as any).serviceId || 'srv-cleanzo',
            title: (foundBooking as any).serviceTitle || (foundBooking as any).serviceSnapshot?.title || 'خدمة كلينزو',
            titleEn: (foundBooking as any).serviceSnapshot?.titleEn || 'Cleanzo Service',
            category: (foundBooking as any).category || (foundBooking as any).serviceSnapshot?.category || 'car',
            price: foundBooking.finalPrice || (foundBooking as any).serviceSnapshot?.price || 0,
          },
        };
        setSearchedOrder(mappedOrder);
        addOrder(mappedOrder);
      } else {
        setSearchedOrder(null);
      }
    } catch (err: any) {
      setSearchedOrder(null);
      setErrorMessage(err?.code === 'ORDER_NOT_FOUND'
        ? (isAr ? 'سجّل الدخول أو استخدم نفس المتصفح اللي حجزت منه.' : 'Sign in or use the browser where you booked.')
        : (err?.message || (isAr ? 'تعذر تحميل الحجز.' : 'Could not load booking.')));
    } finally {
      setHasSearched(true);
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 max-w-4xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-black">
          <Car className="w-3.5 h-3.5" />
          <span>{isAr ? 'نظام التتبع المباشر للطلبات' : 'Live Order Tracking'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
          {isAr ? 'تتبع مسار وحالة طلبك مباشرة' : 'Track Your Cleaning Service Live'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {isAr
            ? 'أدخل رقم الطلب لمعرفة موقع الفني الحالي، زمن الوصول التقريبي، ومراحل التنفيذ خطوة بخطوة.'
            : 'Enter your booking reference to check technician location, ETA, and real-time progress.'}
        </p>
      </div>

      {/* Tracking Search Input Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-sky-500/5">
        <form onSubmit={handleTrackSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1 text-start">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'رقم الطلب (Order ID) *' : 'Order ID *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="مثال: CLZ-2026-000124"
                  className="w-full ps-10 pe-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSearching || authStatus === 'AUTH_LOADING'}
            className="w-full justify-center rounded-2xl font-bold shadow-lg shadow-sky-500/25 text-xs sm:text-sm"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              <>
                <span>{isAr ? 'تتبع حالة الطلب الآن' : 'Track Order Status'}</span>
                <ArrowIcon className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Result Section */}
      {hasSearched && (
        <div className="pt-2 animate-in fade-in">
          {searchedOrder ? (
            <OrderTracker
              order={searchedOrder}
              onOpenReview={() => setReviewModalOpen(true)}
              onOrderUpdate={setSearchedOrder}
            />
          ) : (
            <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {errorMessage || (isAr ? `لم يتم العثور على طلب برقم: "${searchQuery}"` : `No booking found with ID: "${searchQuery}"`)}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isAr
                  ? 'تأكد من كتابة رقم الحجز بشكل صحيح.'
                  : 'Check your booking reference.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Review Modal if triggered */}
      {searchedOrder && (
        <OrderReviewModal
          order={searchedOrder}
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
        />
      )}
    </div>
  );
}
