'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Car,
  Sparkles,
  MapPin,
  Phone,
  MessageCircle,
  RotateCcw,
  Star,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatTimeTo12Hour } from '@/lib/timeUtils';
import { toast } from 'sonner';
import {
  CANONICAL_TIMELINE_STEPS,
  getOrderStepIndex,
  getAuthoritativeStatusBanner,
} from '@/lib/orderStatusConfig';

interface OrderTrackerProps {
  order: Order;
  onOpenReview?: () => void;
}

export function OrderTracker({ order, onOpenReview }: OrderTrackerProps) {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const router = useRouter();

  const { selectService, setAddress, setCategory } = useBookingStore();

  // Authoritative single-source status mapping
  const currentStepIndex = getOrderStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const banner = getAuthoritativeStatusBanner(order, isAr);
  const BannerIcon = banner.icon;

  // Quick Rebook Action
  const handleRebook = () => {
    if (order.category) setCategory(order.category);
    if (order.service) {
      selectService(order.service);
    }
    if (order.address) {
      setAddress(order.address);
    }
    toast.success(
      isAr
        ? 'تم نسخ بيانات الطلب! يمكنك الآن تحديد الموعد الجديد.'
        : 'Order details copied to new booking.'
    );
    router.push('/booking');
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. SYNCHRONIZED TOP STATUS BANNER                             */}
      {/* ------------------------------------------------------------- */}
      <div
        className={cn(
          'p-4 sm:p-5 rounded-3xl border text-start animate-in fade-in flex items-center justify-between gap-4 transition-all shadow-xs',
          banner.gradientClass,
          banner.borderClass
        )}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform',
              banner.iconBgClass
            )}
          >
            <BannerIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black',
                  banner.isLive
                    ? 'bg-sky-500 text-white animate-pulse'
                    : isCancelled
                    ? 'bg-rose-500 text-white'
                    : order.status === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : order.status === 'assigned'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-sky-600 text-white'
                )}
              >
                {banner.isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                <span>{banner.badge}</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-400">#{order.id}</span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              {banner.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
              {banner.description}
            </p>
          </div>
        </div>

        {/* Action Button on Banner (Call tech if assigned, or rebook if cancelled) */}
        <div className="hidden sm:block shrink-0">
          {banner.showCallButton && order.technician?.phone && (
            <a
              href={`tel:${order.technician.phone}`}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>اتصال بالفني</span>
            </a>
          )}
          {isCancelled && (
            <button
              onClick={handleRebook}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة الحجز</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SYNCHRONIZED TIMELINE STEPPER                              */}
      {/* ------------------------------------------------------------- */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 text-start">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              مراحل تقدم وتنفيذ الخدمة
            </h3>
            <p className="text-xs text-slate-400">
              رقم الحجز:{' '}
              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                #{order.id}
              </span>
            </p>
          </div>

          {/* Rebook Button */}
          <button
            type="button"
            onClick={handleRebook}
            className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-500 hover:text-white border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة نفس الطلب (Rebook)</span>
          </button>
        </div>

        {/* Vertical Stepper */}
        <div className="relative ps-6 sm:ps-8 space-y-6 sm:space-y-8 border-s-2 border-slate-200 dark:border-slate-800 ms-3 sm:ms-4">
          {CANONICAL_TIMELINE_STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isDone = !isCancelled && currentStepIndex >= idx;
            const isCurrent = !isCancelled && currentStepIndex === idx;

            return (
              <div key={s.status} className="relative group">
                {/* Node circle */}
                <div
                  className={cn(
                    'absolute -start-[31px] sm:-start-[39px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-105'
                      : isCurrent
                      ? 'border-sky-500 bg-sky-500 text-white ring-4 ring-sky-500/20'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400'
                  )}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4
                      className={cn(
                        'text-xs sm:text-sm font-black',
                        isDone || isCurrent
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {isAr ? s.labelAr : s.labelEn}
                    </h4>

                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500 text-white animate-pulse">
                        الوضع الحالي
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                    {isAr ? s.descAr(order) : s.descEn(order)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* If completed, prompt for review */}
        {order.status === 'completed' && onOpenReview && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400 font-bold">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500 shrink-0" />
              <span>هل أعجبتك الخدمة؟ شاركنا رأيك وساعدنا في تقديم الأفضل دائماً!</span>
            </div>
            <button
              type="button"
              onClick={onOpenReview}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0 shadow-sm"
            >
              ★★★★★ تقييم الخدمة
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TECHNICIAN & APPOINTMENT DETAILS                           */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
        {/* Assigned Technician Details */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            فني الخدمة المكلف
          </span>
          <div className="flex items-center gap-3">
            <img
              src={
                order.technician?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
              }
              alt={order.technician?.name || 'فني كلينزو'}
              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
            />
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {order.technician?.name || (isAr ? 'فني معتمد من كلينزو' : 'Certified Technician')}
              </h4>
              <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                {order.technician?.specialty || (isAr ? 'تلميع وبخار متنقل' : 'Mobile Detailing Specialist')}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{order.technician?.rating || '4.9'} (فني معتمد)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <a
              href={`tel:${order.technician?.phone || '01012345678'}`}
              className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>اتصال بالفني</span>
            </a>
            <a
              href={`https://wa.me/201012345678?text=${encodeURIComponent(`مرحباً، أود متابعة طلبي رقم #${order.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب</span>
            </a>
          </div>
        </div>

        {/* Location & Summary Receipt */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            بيانات الموقع والموعد
          </span>
          <div className="space-y-1.5">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>
                {order.address?.area || 'المنيا'}
                {order.address?.city ? `، ${order.address.city}` : ''}
                {order.address?.governorate ? `، ${order.address.governorate}` : ''}
              </span>
            </p>
            <p className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
              <span>التاريخ: {order.date} — الوقت: {formatTimeTo12Hour(order.time)}</span>
            </p>
          </div>

          {(order.packageSnapshot || (order.addons && order.addons.length > 0)) && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              {order.packageSnapshot && (
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    باقة: {order.packageSnapshot.name}
                  </span>
                  <span className="font-bold">{order.packageSnapshot.price} ج.م</span>
                </div>
              )}
              {order.addons &&
                order.addons.length > 0 &&
                order.addons.map((a: any, i: number) => (
                  <div
                    key={a.id || i}
                    className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400"
                  >
                    <span>+ {a.name}</span>
                    <span>+{a.price} ج.م</span>
                  </div>
                ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">المبلغ المطلوب عند الاستلام:</span>
            <span className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400">
              {order.finalPrice} ج.م
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
