'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Sparkles,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RotateCcw,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { CustomerProfile } from '@/types';
import { AdminStepCustomerSelect } from '@/components/admin/orders/AdminStepCustomerSelect';
import { StepService } from '@/components/booking/StepService';
import { StepDateTime } from '@/components/booking/StepDateTime';
import { StepAddress } from '@/components/booking/StepAddress';
import { StepReview } from '@/components/booking/StepReview';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { validateEgyptianPhone } from '@/lib/validation/phoneValidation';
import { validateCustomerName } from '@/lib/validation/nameValidation';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { isSameService, isSameTime } from '@/lib/bookingEngine';

function AdminNewBookingContent() {
  const router = useRouter();
  const { t, locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowNext = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const ArrowBack = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const fetchAdminServices = useServiceStore((s) => s.fetchAdminServices);

  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    selectedServices,
    selectedService,
    selectedPackage,
    selectedAddons,
    category,
    selectedDate,
    selectedTime,
    selectedAddress,
    notes,
    promoCode,
    getFinalPrice,
    resetBooking,
    setGuestInfo,
    guestName,
    guestPhone,
  } = useBookingStore();

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize: Reset booking completely so the system never auto-selects any user or previous data
  useEffect(() => {
    setMounted(true);
    resetBooking();
    setSelectedCustomer(null);
    setStep(1);
    fetchCategories();
    fetchAdminServices();
  }, [fetchCategories, fetchAdminServices, resetBooking, setStep]);

  // 5 Clear Steps for Admin Order Creation
  const steps = [
    { num: 1, label: isAr ? 'اختيار العميل' : 'Select Customer', icon: Users },
    { num: 2, label: isAr ? 'اختيار الخدمة' : 'Service', icon: Sparkles },
    { num: 3, label: isAr ? 'الميعاد' : 'Date & Time', icon: Calendar },
    { num: 4, label: isAr ? 'العنوان وتفاصيل الزيارة' : 'Address & Details', icon: MapPin },
    { num: 5, label: isAr ? 'مراجعة وتأكيد' : 'Confirmation', icon: CheckCircle2 },
  ];

  const hasServices = (selectedServices && selectedServices.length > 0) || (
    !!selectedService &&
    selectedService.available !== false &&
    !(selectedService as any).isArchived &&
    (selectedService as any).active !== false
  );

  const canProceed = () => {
    // Step 1: Customer must be selected by admin
    if (currentStep === 1) return !!selectedCustomer;

    // Step 2: Service must be chosen
    if (currentStep === 2) return hasServices;

    // Step 3: Date & Time
    if (currentStep === 3) return !!selectedDate && !!selectedTime;

    // Step 4: Address
    if (currentStep === 4) {
      if (!selectedAddress) return false;
      // If customer is already selected by admin, do not block on strict regex (phone may be legacy/test)
      if (selectedCustomer) return true;
      const effectiveName = (guestName || (selectedAddress as any)?.customerName || '').trim();
      const effectivePhone = (guestPhone || selectedAddress?.customerPhone || '').trim();
      return !!effectiveName && (effectivePhone.length >= 8 || validateEgyptianPhone(effectivePhone).isValid);
    }

    return true;
  };

  // Scroll to top on step change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [currentStep]);

  const handleNext = () => {
    if (!canProceed()) {
      if (currentStep === 1) {
        toast.error(isAr ? 'يرجى اختيار العميل أولاً للمتابعة أو تسجيل عميل جديد' : 'Please select or register a customer first');
      } else if (currentStep === 2) {
        toast.error(isAr ? 'من فضلك اختر خدمة واحدة على الأقل للمتابعة' : 'Please select at least one service');
      } else if (currentStep === 3) {
        toast.error(isAr ? 'يرجى اختيار التاريخ والوقت المفضل للزيارة' : 'Please select date and time');
      } else if (currentStep === 4) {
        if (!selectedAddress) {
          toast.error(isAr ? 'يرجى تحديد أو إضافة عنوان الخدمة للعميل' : 'Please enter service address for the customer');
        } else if (!selectedCustomer) {
          const effectiveName = (guestName || (selectedAddress as any)?.customerName || '').trim();
          const effectivePhone = (guestPhone || selectedAddress?.customerPhone || '').trim();
          if (!effectiveName) {
            toast.error(isAr ? 'يرجى إدخال اسم العميل بشكل صحيح' : 'Please enter customer name');
          } else if (!effectivePhone || effectivePhone.length < 8) {
            toast.error(isAr ? 'يرجى إدخال رقم هاتف صحيح للتواصل' : 'Please enter valid phone');
          }
        }
      }
      return;
    }
    if (currentStep < 5) {
      setStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  };

  const handleSelectCustomer = (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setGuestInfo(customer.name, customer.phone);
    toast.success(isAr ? `تم اختيار العميل (${customer.name})` : `Selected ${customer.name}`);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setGuestInfo('', '');
  };

  const handleExecuteBooking = async () => {
    if (isSubmitting) return;

    if (!selectedCustomer) {
      toast.error(isAr ? 'يرجى اختيار العميل أولاً' : 'Please select customer');
      setStep(1);
      return;
    }

    const allItems = selectedServices && selectedServices.length > 0
      ? selectedServices
      : selectedService
      ? [{ service: selectedService, selectedPackage, selectedAddons }]
      : [];

    if (allItems.length === 0 || !selectedAddress) {
      toast.error(isAr ? 'يرجى تحديد الخدمات وعنوان تقديم الخدمة' : 'Please select services and address');
      return;
    }

    const primaryService = allItems[0].service;

    // Slot Conflict Check
    const existingOrders = useOrderStore.getState().orders || [];
    const isAlreadyBooked = existingOrders.some((o) => {
      if (o.status === 'cancelled') return false;
      if (o.date !== selectedDate) return false;
      const matchesAny = allItems.some((item) => isSameService(o, item.service.id, item.service.title));
      return matchesAny && isSameTime(o.time, selectedTime);
    });

    if (isAlreadyBooked) {
      toast.error(
        isAr
          ? `الموعد (${selectedTime}) محجوز بالفعل لإحدى الخدمات المختارة. يرجى اختيار موعد آخر.`
          : `(${selectedTime}) is already booked for one of the services.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const rawName = (selectedCustomer.name || guestName || (selectedAddress as any)?.customerName || '').trim();
      const rawPhone = (selectedCustomer.phone || guestPhone || selectedAddress?.customerPhone || '').trim();

      const servicesPayload = allItems.map((item) => ({
        serviceId: item.service.id,
        packageId: item.selectedPackage?.id,
        addonIds: item.selectedAddons?.map((a) => a.id) || [],
      }));

      const res = await cleanzoApi.bookings.create({
        serviceId: primaryService.id,
        services: servicesPayload,
        packageId: allItems[0]?.selectedPackage?.id,
        addonIds: allItems[0]?.selectedAddons?.map((a) => a.id) || [],
        category: primaryService.category || category,
        date: selectedDate,
        time: selectedTime,
        address: selectedAddress,
        notes: notes || undefined,
        promoCode: promoCode || undefined,
        guestName: rawName || undefined,
        guestPhone: rawPhone || undefined,
        customerId: selectedCustomer.id || undefined,
      } as any);

      if (res && res.id) {
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إنشاء حجز جديد يدويًا',
          module: 'orders',
          target: (res as any).orderNumber || res.id || 'طلب جديد',
          details: `تم إنشاء الحجز للعميل ${rawName} (${rawPhone}) بنجاح`,
        });

        toast.success(isAr ? 'تم إنشاء وتأكيد الحجز بنجاح!' : 'Order created successfully!');
        resetBooking();
        await useOrderStore.getState().fetchAdminOrders?.();
        router.push('/admin/orders');
      } else {
        toast.error(isAr ? 'فشل إنشاء الطلب' : 'Failed to create order');
      }
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'حدث خطأ أثناء إنشاء الطلب' : 'Error creating order'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPrice = getFinalPrice();

  if (!mounted) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#0866C6] animate-spin" />
        <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل خطوات الحجز...' : 'Loading booking steps...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/orders"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="العودة لقائمة الطلبات"
            >
              <ArrowRight className="w-5 h-5 rtl:rotate-0 ltr:rotate-180" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#0866C6]" />
              <span>إنشاء حجز / طلب جديد (لوحة الإدارة)</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            خطوات الحجز المتكاملة: 1. اختيار العميل ⬅️ 2. اختيار الخدمة ⬅️ 3. الميعاد ⬅️ 4. العنوان ⬅️ 5. التأكيد
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('هل تريد إلغاء وإعادة تعيين خطوات الحجز الحالية؟')) {
                resetBooking();
                setSelectedCustomer(null);
                setStep(1);
              }
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين الحجز</span>
          </button>
        </div>
      </div>

      {/* Selected Customer Sticky Badge (shows across steps 2-5) */}
      {selectedCustomer && currentStep > 1 && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-[#0866C6]/30 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0866C6] text-white flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-slate-500 text-[11px] block">العميل المختار:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {selectedCustomer.name}{' '}
                <span className="font-mono text-sky-600 dark:text-sky-400 dir-ltr text-xs">
                  ({selectedCustomer.phone})
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-xs font-bold text-[#0866C6] hover:underline shrink-0 cursor-pointer"
          >
            تغيير العميل ↺
          </button>
        </div>
      )}

      {/* 5-Step Progress Indicator */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {steps.map((st) => {
            const Icon = st.icon;
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            const isAccessible =
              st.num <= currentStep ||
              (st.num === 2 && !!selectedCustomer) ||
              (st.num === 3 && !!selectedCustomer && hasServices) ||
              (st.num === 4 && !!selectedCustomer && hasServices && !!selectedDate && !!selectedTime) ||
              (st.num === 5 && !!selectedCustomer && hasServices && !!selectedDate && !!selectedTime && !!selectedAddress);

            return (
              <button
                key={st.num}
                type="button"
                disabled={!isAccessible}
                onClick={() => {
                  if (isAccessible) setStep(st.num);
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 p-1.5 sm:p-3 rounded-xl transition-all text-center ${
                  isCurrent
                    ? 'bg-[#0866C6] text-white shadow-sm ring-2 ring-[#0866C6]/30'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer'
                    : isAccessible
                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 cursor-pointer'
                    : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0 ${
                    isCurrent
                      ? 'bg-white text-[#0866C6]'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : st.num}
                </div>
                <span className="text-[11px] sm:text-xs font-bold truncate hidden md:inline">{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step View Content */}
      <div className="min-h-[420px]">
        {currentStep === 1 && (
          <AdminStepCustomerSelect
            selectedCustomer={selectedCustomer}
            onSelectCustomer={handleSelectCustomer}
            onClearCustomer={handleClearCustomer}
            isAr={isAr}
          />
        )}
        {currentStep === 2 && <StepService />}
        {currentStep === 3 && <StepDateTime />}
        {currentStep === 4 && <StepAddress isAdminContext={true} targetCustomer={selectedCustomer} />}
        {currentStep === 5 && <StepReview />}
      </div>

      {/* Sticky Bottom Action Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#072540]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Back button */}
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowBack className="w-4 h-4" />
                <span>الخطوة السابقة</span>
              </button>
            ) : (
              <Link
                href="/admin/orders"
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                إلغاء والعودة
              </Link>
            )}
          </div>

          {/* Center Info: Total Price */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold">إجمالي الحجز الحالي:</span>
            <span className="text-base font-black text-[#0866C6] dark:text-sky-400">
              {totalPrice} ج.م
            </span>
          </div>

          {/* Next / Confirm Button */}
          <div>
            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                className="px-6 py-2.5 text-xs font-bold shadow-md shadow-[#0866C6]/20 flex items-center gap-2 cursor-pointer"
              >
                <span>الخطوة التالية: {steps[currentStep]?.label}</span>
                <ArrowNext className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                disabled={isSubmitting}
                onClick={handleExecuteBooking}
                className="px-8 py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تأكيد وإنشاء الحجز...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وإنشاء الحجز للعميل في النظام</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminNewOrderPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-400">جاري تحميل خطوات الحجز...</div>}>
      <AdminNewBookingContent />
    </Suspense>
  );
}
