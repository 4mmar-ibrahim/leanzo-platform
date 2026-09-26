'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Phone,
  Star,
  UserCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useOrderStore } from '@/store/useOrderStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from 'sonner';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale, direction } = useLocaleStore();
  const { getOrderById, cancelOrder } = useOrderStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const orderId = params?.orderId as string;
  const order = getOrderById(orderId);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  if (!order) {
    return (
      <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <p className="text-sm text-slate-500">{isAr ? 'لم يتم العثور على هذا الطلب' : 'Order not found'}</p>
        <Link href="/account/orders">
          <Button variant="outline" size="sm">
            <span>{isAr ? 'العودة لقائمة الطلبات' : 'Back to orders'}</span>
          </Button>
        </Link>
      </div>
    );
  }

  const handleConfirmCancel = () => {
    cancelOrder(order.id);
    setIsCancelModalOpen(false);
    toast.success(isAr ? 'تم إلغاء الحجز بنجاح' : 'Booking cancelled');
  };

  const isCancellable = ['pending', 'confirmed', 'assigned'].includes(order.status);

  return (
    <div className="space-y-8 text-start">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/account/orders"
              className="text-xs text-sky-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <ArrowIcon className="w-3.5 h-3.5 rotate-180" />
              <span>{isAr ? 'الطلبات' : 'Orders'}</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
              {order.id}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {isAr
              ? order.service?.title || (order as any).serviceSnapshot?.title || (order as any).serviceName || 'خدمة كلينزو المتميزة'
              : order.service?.titleEn || (order as any).serviceSnapshot?.titleEn || (order as any).serviceNameEn || order.service?.title || 'Cleanzo Premium Service'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {isCancellable && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-xs"
            >
              {isAr ? 'إلغاء الحجز' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>

      {/* Visual Timeline Stepper */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {isAr ? 'مراحل تنفيذ الخدمة' : 'Service Execution Timeline'}
        </h3>

        <div className="relative ps-6 sm:ps-8 space-y-8 border-s-2 border-slate-200 dark:border-slate-800 ms-3 sm:ms-4">
          {order.timeline.map((event, idx) => (
            <div key={idx} className="relative group">
              {/* Dot Icon */}
              <div
                className={`absolute -start-[31px] sm:-start-[39px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                  event.completed
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400'
                }`}
              >
                {event.completed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4
                    className={`text-sm font-bold ${
                      event.completed
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {isAr ? event.label : event.labelEn}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {event.timestamp}
                  </span>
                </div>

                {(event.description || event.descriptionEn) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isAr ? event.description : event.descriptionEn}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Technician Info & Location/Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technician Card */}
        {order.technician && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t.account.technicianAssigned}
            </h3>

            <div className="flex items-center gap-4">
              <img
                src={order.technician.avatar}
                alt={order.technician.name}
                className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0"
              />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {order.technician.name}
                </h4>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                  {order.technician.specialty}
                </p>
                <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{order.technician.rating}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <a
                href={`tel:${order.technician.phone}`}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0866C6] dark:text-[#83AED0] hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">{order.technician.phone}</span>
              </a>
            </div>
          </div>
        )}

        {/* Location & Time Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isAr ? 'تفاصيل الموعد والمكان' : 'Schedule & Location'}
          </h3>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
              <span>{order.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0866C6] shrink-0" />
              <span>{order.time}</span>
            </div>
            <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{order.address?.label || (isAr ? 'العنوان' : 'Address')}</p>
                <p>{order.address?.governorate || ''} — {order.address?.city || ''}, {order.address?.area || ''}</p>
                {order.address?.details && <p className="italic text-slate-400">"{order.address.details}"</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800/60 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {isAr ? 'تفاصيل الفاتورة والدفع' : 'Billing & Payment Details'}
        </h3>

        {/* Selected Package Details */}
        {order.packageSnapshot && (
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'الباقة المختارة:' : 'Selected Package:'} {isAr ? order.packageSnapshot.name : (order.packageSnapshot.nameEn || order.packageSnapshot.name)}
              </span>
              <span className="font-black text-[#0866C6] dark:text-[#83AED0]">
                {order.packageSnapshot.price} {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
            {order.packageSnapshot.originalPrice && order.packageSnapshot.originalPrice > order.packageSnapshot.price && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {isAr
                  ? `وفرت ${order.packageSnapshot.originalPrice - order.packageSnapshot.price} ج.م مقارنة بالسعر الأصلي (${order.packageSnapshot.originalPrice} ج.م)`
                  : `Saved ${order.packageSnapshot.originalPrice - order.packageSnapshot.price} EGP vs original (${order.packageSnapshot.originalPrice} EGP)`}
              </p>
            )}
          </div>
        )}

        {/* Selected Add-ons Details */}
        {order.addons && order.addons.length > 0 && (
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 block">
              {isAr ? 'الإضافات الاختيارية:' : 'Optional Add-ons:'}
            </span>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.addons.map((addon: any, idx: number) => (
                <div key={addon.id || idx} className="py-1 flex justify-between items-center text-xs">
                  <span className="text-slate-700 dark:text-slate-300">
                    {isAr ? addon.name : (addon.nameEn || addon.name)}
                    {addon.durationMinutes > 0 && (
                      <span className="text-[10px] text-slate-400 mx-1">
                        (+{addon.durationMinutes} {isAr ? 'دقيقة' : 'min'})
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    +{addon.price} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>{order.packageSnapshot ? (isAr ? 'المجموع الأساسي' : 'Subtotal') : t.booking.basePrice}</span>
          <span className="font-bold">{order.basePrice} {isAr ? 'ج.م' : 'EGP'}</span>
        </div>

        {order.discount > 0 && (
          <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <span>{t.booking.discount}</span>
            <span>-{order.discount} {isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        )}

        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>{t.booking.serviceFee}</span>
          <span className="text-[#0866C6] dark:text-[#83AED0] font-bold">{t.booking.free}</span>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {t.booking.finalTotal}
          </span>
          <PriceDisplay price={order.finalPrice} size="lg" />
        </div>
      </div>

      {/* Cancel Order Modal */}
      <Dialog
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={isAr ? 'تأكيد إلغاء الحجز' : 'Confirm Booking Cancellation'}
        description={isAr ? 'هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟ يمكنك إعادة الحجز في أي وقت لاحقاً.' : 'Are you sure you want to cancel this booking? You can reschedule anytime.'}
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setIsCancelModalOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirmCancel}>
            {isAr ? 'نعم، إلغاء الحجز' : 'Yes, Cancel Booking'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
