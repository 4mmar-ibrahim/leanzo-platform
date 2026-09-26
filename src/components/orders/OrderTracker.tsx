'use client';

import React, { useState } from 'react';
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
import { toast } from 'sonner';

interface OrderTrackerProps {
  order: Order;
  onOpenReview?: () => void;
}

export function OrderTracker({ order, onOpenReview }: OrderTrackerProps) {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const router = useRouter();

  const { selectService, setAddress, setCategory } = useBookingStore();

  // 6 Defined standard tracking steps
  const steps: {
    status: OrderStatus | 'on_the_way';
    labelAr: string;
    labelEn: string;
    descAr: string;
    descEn: string;
    icon: any;
  }[] = [
    {
      status: 'pending',
      labelAr: 'تم إنشاء الطلب',
      labelEn: 'Order Created',
      descAr: 'تم استلام طلبك بنجاح وجارٍ مراجعته من الفريق.',
      descEn: 'Your booking has been received and is queued for review.',
      icon: Clock,
    },
    {
      status: 'confirmed',
      labelAr: 'تم تأكيد الطلب',
      labelEn: 'Order Confirmed',
      descAr: 'تم تأكيد الموعد وحجز وحدة الخدمة المتنقلة.',
      descEn: 'Appointment confirmed and slot booked.',
      icon: CheckCircle2,
    },
    {
      status: 'assigned',
      labelAr: 'تم تعيين الفني المختص',
      labelEn: 'Technician Assigned',
      descAr: order.technician
        ? `تم إسناد الطلب للكابتن ${order.technician.name} (${order.technician.specialty}).`
        : 'تم تعيين فني معتمد مجهز بالكامل.',
      descEn: order.technician
        ? `Assigned to specialist ${order.technician.name}.`
        : 'Assigned to certified specialist.',
      icon: ShieldCheck,
    },
    {
      status: 'on_the_way',
      labelAr: 'الفني في الطريق إليك 🚗',
      labelEn: 'Technician on the way 🚗',
      descAr: 'تحركت الوحدة المتنقلة وهي متجهة إلى موقعك الآن (الفني سيصل خلال 15 دقيقة تقريباً).',
      descEn: 'Mobile service unit has departed. Arriving in approx 15 minutes.',
      icon: Car,
    },
    {
      status: 'in_progress',
      labelAr: 'جاري تنفيذ الخدمة 🧹',
      labelEn: 'Service in progress 🧹',
      descAr: 'يتم الآن تنفيذ أعمال التنظيف والديتيلينج بأحدث أجهزة البخار والمواد المعتمدة.',
      descEn: 'Specialist is actively performing the cleaning with professional steam equipment.',
      icon: Sparkles,
    },
    {
      status: 'completed',
      labelAr: 'تم الانتهاء بنجاح ✅',
      labelEn: 'Completed Successfully ✅',
      descAr: 'انتهت الخدمة بالكامل وتم تسليم الموقع بأعلى معايير النظافة والتعقيم.',
      descEn: 'Service completed to 5-star perfection and customer satisfaction.',
      icon: CheckCircle2,
    },
  ];

  // Helper to determine current step index based on order status
  const getStepIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'pending':
        return 0;
      case 'confirmed':
        return 1;
      case 'assigned':
        return 2; // Can show on_the_way or assigned
      case 'in_progress':
        return 4;
      case 'completed':
        return 5;
      case 'cancelled':
        return -1;
      default:
        return 1;
    }
  };

  const currentStepIndex = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  // Quick Rebook Action
  const handleRebook = () => {
    if (order.category) setCategory(order.category);
    if (order.service) {
      selectService(order.service);
    }
    if (order.address) {
      setAddress(order.address);
    }
    toast.success(isAr ? 'تم نسخ بيانات الطلب! يمكنك الآن تحديد الموعد الجديد.' : 'Order details copied to new booking.');
    router.push('/booking');
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Status Notification Banner */}
      {!isCancelled && (currentStepIndex >= 2 && currentStepIndex <= 4) && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#0866C6]/15 via-[#07345C]/15 to-[#0866C6]/10 border border-[#0866C6]/30 text-start animate-in fade-in flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/25 animate-bounce">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>مباشر LIVE</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1">
                الفني في الطريق إليك (سيصل خلال 15 دقيقة) 🚗
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                الوحدة المتنقلة مجهزة بالكامل وتتجه حالياً إلى: {order.address.area}, {order.address.city}.
              </p>
            </div>
          </div>

          <div className="hidden sm:block">
            <a
              href={`tel:${order.technician?.phone || '01012345678'}`}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>اتصال بالفني</span>
            </a>
          </div>
        </div>
      )}

      {/* Cancelled Banner if cancelled */}
      {isCancelled && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>هذا الطلب ملغي. يمكنك إعادة الحجز في أي وقت بنقرة واحدة.</span>
        </div>
      )}

      {/* 6-Stage Visual Timeline Stepper */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 text-start">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              مراحل تقدم وتنفيذ الخدمة
            </h3>
            <p className="text-xs text-slate-400">
              رقم الحجز: <span className="font-mono font-bold text-sky-600 dark:text-sky-400">#{order.id}</span>
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
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isDone = !isCancelled && currentStepIndex >= idx;
            const isCurrent = !isCancelled && currentStepIndex === idx;

            return (
              <div key={idx} className="relative group">
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
                    {isAr ? s.descAr : s.descEn}
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

      {/* Technician & Appointment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
        {/* Assigned Technician Details */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            فني الخدمة المكلف
          </span>
          <div className="flex items-center gap-3">
            <img
              src={order.technician?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={order.technician?.name || 'فني كلينزو'}
              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
            />
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {order.technician?.name || 'كابتن محمود (وحدة المنيا 01)'}
              </h4>
              <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                {order.technician?.specialty || 'تلميع وبخار متنقل'}
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
              <span>{order.address.area}, {order.address.city}, {order.address.governorate}</span>
            </p>
            <p className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
              <span>التاريخ: {order.date} — الوقت: {order.time}</span>
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
              {order.addons && order.addons.length > 0 && order.addons.map((a: any, i: number) => (
                <div key={a.id || i} className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
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
