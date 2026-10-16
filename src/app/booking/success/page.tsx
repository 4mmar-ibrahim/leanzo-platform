'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Layers,
  Wrench,
  Truck,
  FileText,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useServiceStore } from '@/store/useServiceStore';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { TimeRangeDisplay } from '@/components/common/TimeRangeDisplay';
import { Button } from '@/components/ui/Button';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { Order } from '@/types';
import { toast } from 'sonner';

function SuccessSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-pulse">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-4 w-80 bg-slate-100 dark:bg-slate-850 rounded-lg" />
      </div>
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-850 rounded" />
        </div>
      </div>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const { t, locale, direction } = useLocaleStore();
  const { getOrderById, addOrder } = useOrderStore();
  const getServiceById = useServiceStore((s) => s.getServiceById);
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const orderId = searchParams.get('orderId')?.trim() || '';
  const phoneParam = searchParams.get('phone')?.trim() || '';

  // Initial local state from store cache
  const cachedOrder = (orderId ? getOrderById(orderId) : null) || null;
  const [order, setOrder] = useState<Order | null>(cachedOrder);
  const [loading, setLoading] = useState<boolean>(!cachedOrder && Boolean(orderId));
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Authoritative server fetch
  const fetchAuthoritativeOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);

      let fetched: Order | null = null;
      try {
        fetched = await cleanzoApi.bookings.getBookingById(orderId);
      } catch (err: any) {
        // Fallback to public track endpoint if guest or 401/403
        const fallbackPhone = cachedOrder?.customerPhone || phoneParam;
        if (fallbackPhone) {
          try {
            fetched = await cleanzoApi.bookings.trackOrder(orderId, fallbackPhone);
          } catch {}
        }
      }

      if (fetched && fetched.id) {
        setOrder(fetched);
        addOrder(fetched);
      } else if (!cachedOrder) {
        // If server failed and no local cache
        setFetchError(
          isAr
            ? 'تعذر تحميل بيانات الطلب من الخادم. يرجى التحقق من رقم الحجز أو مراجعته في حسابك.'
            : 'Could not load order details from the server. Please verify the order number or check your account.'
        );
      }
    } catch (err: any) {
      if (!cachedOrder) {
        setFetchError(
          err?.message ||
            (isAr
              ? 'حدث خطأ في جلب بيانات الحجز.'
              : 'An error occurred while fetching booking details.')
        );
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, phoneParam, cachedOrder, isAr, addOrder]);

  useEffect(() => {
    fetchAuthoritativeOrder();
  }, [orderId]);

  const handleCopyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    toast.success(isAr ? 'تم نسخ رقم الطلب بنجاح' : 'Order number copied');
    setTimeout(() => setCopied(false), 2000);
  };

  // Missing orderId state
  if (!orderId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isAr ? 'لم يتم تحديد رقم الطلب' : 'No Order Number Specified'}
          </h2>
          <p className="text-xs text-slate-500">
            {isAr
              ? 'يرجى الانتقال إلى قائمة طلباتك لمتابعة حالة حجوزاتك الحالية.'
              : 'Please visit your orders list to track your active bookings.'}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/account/orders">
            <Button variant="primary" size="md">
              <span>{isAr ? 'طلباتي' : 'My Orders'}</span>
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="md">
              <span>{isAr ? 'الرئيسية' : 'Home'}</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !order) {
    return <SuccessSkeleton />;
  }

  // Error state (No cached order and server fetch failed)
  if (fetchError && !order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isAr ? 'تعذر جلب تفاصيل الطلب' : 'Failed to Load Order Details'}
          </h2>
          <p className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
            #{orderId}
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {fetchError}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={fetchAuthoritativeOrder}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isAr ? 'إعادة المحاولة' : 'Try Again'}</span>
          </Button>
          <Link href={`/account/orders/${orderId}`} className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full sm:w-auto">
              <span>{isAr ? 'صفحة تفاصيل الطلب' : 'Order Details Page'}</span>
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Compute composite services if available
  const compositeServices: any[] =
    Array.isArray((order as any)?.serviceSnapshot?.services) && (order as any)!.serviceSnapshot!.services.length > 0
      ? (order as any)!.serviceSnapshot!.services
      : Array.isArray((order as any)?.metadata?.services) && (order as any)!.metadata!.services.length > 0
      ? (order as any)!.metadata!.services
      : [];

  const isMulti = compositeServices.length > 1;

  // Primary service title
  const resolvedService = order?.service || (order?.serviceId ? getServiceById(order.serviceId) : undefined);
  const primaryTitle = isAr
    ? resolvedService?.title || (order as any)?.serviceSnapshot?.title || (order as any)?.serviceName || 'خدمة كلينزو المتميزة'
    : resolvedService?.titleEn || (order as any)?.serviceSnapshot?.titleEn || (order as any)?.serviceNameEn || resolvedService?.title || 'Cleanzo Premium Service';

  // Format verified address text
  const addressText = order?.address
    ? `${order.address.governorate || ''} — ${order.address.city || ''}${
        order.address.area ? `, ${order.address.area}` : ''
      }${(order.address as any).street ? ` — شارع ${(order.address as any).street}` : ''}${
        order.address.building ? ` (عمارة ${order.address.building})` : ''
      }`.trim()
    : (isAr ? 'العنوان المعتمد للطلب' : 'Verified Order Address');

  // Authoritative status configuration
  const status = order?.status || 'pending';
  const getStatusBadge = () => {
    switch (status) {
      case 'confirmed':
        return {
          label: isAr ? 'تم تأكيد الحجز' : 'Booking Confirmed',
          classes: 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          icon: CheckCircle2,
          description: isAr
            ? 'تم تأكيد حجزك رسمياً وتثبيت الموعد في جدول التشغيل.'
            : 'Your booking has been officially confirmed and scheduled in operations.',
        };
      case 'assigned':
        return {
          label: isAr ? 'تم إسناد الفريق الفني' : 'Technician Assigned',
          classes: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          icon: Wrench,
          description: isAr
            ? 'تم تعيين الفريق الفني المختص وسيتم التنفيذ في الموعد المحدد.'
            : 'The dedicated technician team has been assigned to your order.',
        };
      case 'on_the_way':
        return {
          label: isAr ? 'الفريق في الطريق إليك' : 'Team On The Way',
          classes: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: Truck,
          description: isAr
            ? 'الفريق الفني تحرك بالفعل وهو في طريقه لموقعك الآن.'
            : 'The field crew has dispatched and is on the way to your location.',
        };
      case 'in_progress':
        return {
          label: isAr ? 'الخدمة قيد التنفيذ' : 'Service In Progress',
          classes: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: RefreshCw,
          description: isAr
            ? 'الفريق يباشر تقديم الخدمة حالياً وفق أعلى معايير الجودة.'
            : 'The service is actively being carried out according to quality standards.',
        };
      case 'completed':
        return {
          label: isAr ? 'مكتمل' : 'Completed',
          classes: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: ShieldCheck,
          description: isAr
            ? 'تم إكمال تنفيذ الخدمة بنجاح.'
            : 'The service has been completed successfully.',
        };
      case 'pending':
      default:
        return {
          label: isAr ? 'تم استلام الطلب وبانتظار المراجعة' : 'Request Received - Pending Review',
          classes: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: Clock,
          description: isAr
            ? 'تم تسجيل طلبك بنجاح في النظام، ويقوم فريق العمليات بمراجعة تفاصيل الموعد وتعيين الفريق الفني المناسب.'
            : 'Your request has been registered in the system. Operations is reviewing the schedule and assigning the technician.',
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  // Billing breakdown calculation
  const basePrice = Number(order?.basePrice) || 0;
  const finalPrice = Number(order?.finalPrice ?? (order as any)?.totalPrice ?? basePrice);
  const totalDiscount = Number(order?.discount) || 0;
  const coupon = order?.couponSnapshot || (order as any)?.coupon;
  const couponDiscount = Number(coupon?.actualDiscountAmount || coupon?.discountAmount) || 0;
  const catalogDiscount = Math.max(0, totalDiscount - couponDiscount);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8 text-center">
      {/* Top Header Card */}
      <div className="flex flex-col items-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 ring-8 ring-emerald-50 dark:ring-emerald-950/30 animate-scale-up">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {t.success.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {t.success.subtitle}
          </p>
        </div>
      </div>

      {/* Main Order Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-6 text-start">
        {/* Order ID & Status Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
              {t.success.orderNumber}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-mono font-black text-sky-600 dark:text-sky-400">
                #{orderId}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderId}
                aria-label={isAr ? 'نسخ رقم الطلب' : 'Copy order number'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusBadge.classes}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusBadge.label}</span>
          </span>
        </div>

        {/* Operational Status Explanatory Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2.5">
          <StatusIcon className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <p>{statusBadge.description}</p>
        </div>

        {/* Services Breakdown Section */}
        {order && (
          <div className="space-y-4">
            {isMulti ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-sky-500" />
                    <span>
                      {isAr
                        ? `الخدمات المشمولة بالطلب (${compositeServices.length} خدمات)`
                        : `Included Services (${compositeServices.length} services)`}
                    </span>
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                  {compositeServices.map((subSrv: any, idx: number) => {
                    const itemTitle = isAr ? subSrv.title : subSrv.titleEn || subSrv.title;
                    const pkg = subSrv.packageSnapshot || subSrv.package;
                    const itemAddons = subSrv.addons || [];
                    const itemPrice = subSrv.itemTotal ?? subSrv.price ?? subSrv.subtotal;
                    const itemDur = subSrv.duration || 0;

                    return (
                      <div key={idx} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {itemTitle}
                            </span>
                          </div>

                          {pkg && (
                            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 block ps-7">
                              {isAr ? 'الباقة:' : 'Package:'} {pkg.name || pkg.title}
                              {pkg.price ? ` (${pkg.price} ${isAr ? 'ج.م' : 'EGP'})` : ''}
                            </span>
                          )}

                          {itemAddons.length > 0 && (
                            <div className="ps-7 text-[10px] text-amber-600 dark:text-amber-400">
                              <span>{isAr ? 'الإضافات: ' : 'Add-ons: '}</span>
                              <span>{itemAddons.map((a: any) => a.name || a.title).join('، ')}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-end font-mono shrink-0">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {itemPrice} {isAr ? 'ج.م' : 'EGP'}
                          </span>
                          {itemDur > 0 && (
                            <span className="text-[10px] text-slate-400">
                              {itemDur} {isAr ? 'دقيقة' : 'min'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Single Service Details */
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{isAr ? 'الخدمة المطلوبة' : 'Service'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{primaryTitle}</span>
                </div>

                {order.packageSnapshot && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{isAr ? 'الباقة المختارة' : 'Selected Package'}</span>
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
              </div>
            )}

            {/* Schedule & Timing Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isAr ? 'تاريخ الموعد' : 'Booking Date'}</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white ps-5">
                  {order.date || '—'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isAr ? 'وقت الزيارة والمدة' : 'Time & Duration'}</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white ps-5 flex items-center gap-2">
                  <TimeRangeDisplay time={order.time} locale={locale} format12 />
                  {order.duration ? (
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({order.duration} {isAr ? 'دقيقة' : 'min'})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{isAr ? 'العنوان المعتمد للزيارة' : 'Service Address'}</span>
              </div>
              <p className="font-medium text-slate-900 dark:text-white ps-5 leading-relaxed">
                {addressText}
              </p>
              {order.address?.details && (
                <p className="text-[11px] text-slate-400 italic ps-5">
                  "{order.address.details}"
                </p>
              )}
            </div>

            {/* Financial Summary */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>{isAr ? 'المجموع الأساسي' : 'Subtotal'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {basePrice} {isAr ? 'ج.م' : 'EGP'}
                </span>
              </div>

              {catalogDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>{isAr ? 'خصم مباشر' : 'Direct Discount'}</span>
                  <span>-{catalogDiscount} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>
                    {isAr ? 'كوبون الخصم' : 'Promo Code'}{' '}
                    {coupon?.couponCode || order.promoCode ? `(${coupon?.couponCode || order.promoCode})` : ''}
                  </span>
                  <span>-{couponDiscount} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>{isAr ? 'رسوم الانتقال والخدمة' : 'Service & Travel Fee'}</span>
                <span className="text-emerald-600 font-bold">{isAr ? 'مجاناً' : 'Free'}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-slate-900 dark:text-white font-bold text-sm block">
                    {isAr ? 'المبلغ الإجمالي المستحق' : 'Total Due'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isAr ? '(الدفع عند الاستلام أو عبر المحفظة)' : '(Pay upon completion)'}
                  </span>
                </div>
                <PriceDisplay price={finalPrice} size="lg" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href={`/account/orders/${orderId}`} className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto shadow-lg shadow-sky-500/25">
            <FileText className="w-4 h-4" />
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
    <Suspense fallback={<SuccessSkeleton />}>
      <SuccessContent />
    </Suspense>
  );
}
