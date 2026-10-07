'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Calendar,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderStore } from '@/store/useOrderStore';
import { StepService } from '@/components/booking/StepService';
import { StepDateTime } from '@/components/booking/StepDateTime';
import { StepAddress } from '@/components/booking/StepAddress';
import { StepReview } from '@/components/booking/StepReview';
import { AuthModalPrompt } from '@/components/booking/AuthModalPrompt';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { Button } from '@/components/ui/Button';
import { generateOrderId, formatDuration } from '@/lib/utils';
import { Order, OrderStatus, ServiceCategory } from '@/types';
import { toast } from 'sonner';
import { useZoStudioStore } from '@/store/useZoStudioStore';
import { validateEgyptianPhone } from '@/lib/validation/phoneValidation';
import { validateCustomerName } from '@/lib/validation/nameValidation';
import { useCustomerStore } from '@/store/useCustomerStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { isSameService, isSameTime } from '@/lib/bookingEngine';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale, direction } = useLocaleStore();
  const bookingConfig = useZoStudioStore((s) => s.publishedConfigs['booking']);
  const { isAuthenticated, user } = useAuthStore();
  const { addOrder } = useOrderStore();
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
    setCategory,
    selectServiceById,
    selectedDate,
    selectedTime,
    selectedAddress,
    notes,
    promoCode,
    getBasePrice,
    getOriginalPrice,
    getCatalogSavings,
    getDiscountAmount,
    getServiceFee,
    getFinalPrice,
    getItemizedPricing,
    resetBooking,
    guestName,
    guestPhone,
  } = useBookingStore();

  const queryCat = searchParams.get('category');
  const queryServiceId = searchParams.get('serviceId');

  // Synchronize category or direct service from URL search params
  useEffect(() => {
    if (queryCat === 'car' || queryCat === 'home') {
      setCategory(queryCat);
    }
    if (queryServiceId) {
      selectServiceById(queryServiceId);
    }
  }, [queryCat, queryServiceId, setCategory, selectServiceById]);

  const isAr = locale === 'ar';
  const ArrowNext = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const ArrowBack = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

  const steps = [
    { num: 1, label: t.booking.step1, icon: Sparkles },
    { num: 2, label: t.booking.step2, icon: Calendar },
    { num: 3, label: t.booking.step3, icon: MapPin },
    { num: 4, label: t.booking.step4, icon: CheckCircle2 },
  ];

  const hasServices = (selectedServices && selectedServices.length > 0) || (
    !!selectedService &&
    selectedService.available !== false &&
    !(selectedService as any).isArchived &&
    (selectedService as any).active !== false
  );

  const canProceed = () => {
    if (currentStep === 1) return hasServices;
    if (currentStep === 2) return !!selectedDate && !!selectedTime;
    if (currentStep === 3) {
      if (!selectedAddress) return false;
      const effectiveName = (!isAuthenticated ? guestName : (user?.name || guestName || '')).trim();
      const isNameValid = validateCustomerName(effectiveName, isAr).isValid;
      const effectivePhone = (!isAuthenticated ? guestPhone : (user?.phone || guestPhone || selectedAddress?.customerPhone || '')).trim();
      const isPhoneValid = validateEgyptianPhone(effectivePhone).isValid;
      return isNameValid && isPhoneValid;
    }
    return true;
  };

  // Scroll to top whenever step changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [currentStep]);

  // Step Guards: Protect direct URLs, refresh, and state corruption
  useEffect(() => {
    const effectiveName = (!isAuthenticated ? guestName : (user?.name || guestName || '')).trim();
    const isNameValid = validateCustomerName(effectiveName, isAr).isValid;
    const effectivePhone = (!isAuthenticated ? guestPhone : (user?.phone || guestPhone || selectedAddress?.customerPhone || '')).trim();
    const isPhoneValid = validateEgyptianPhone(effectivePhone).isValid;

    if (currentStep > 1 && !hasServices) {
      setStep(1);
    } else if (currentStep > 2 && (!selectedDate || !selectedTime)) {
      setStep(2);
    } else if (currentStep > 3 && (!selectedAddress || !isNameValid || !isPhoneValid)) {
      setStep(3);
    }
  }, [currentStep, hasServices, selectedDate, selectedTime, selectedAddress, isAuthenticated, user?.name, user?.phone, guestName, guestPhone, isAr, setStep]);

  const handleNext = () => {
    if (!canProceed()) {
      if (currentStep === 1) {
        if (!selectedService) {
          toast.error(isAr ? 'من فضلك اختر خدمة أولًا للمتابعة.' : 'Please select a service to continue.');
        } else if (selectedService.category !== category) {
          toast.error(
            isAr
              ? 'الخدمة المختارة لا تتوافق مع قسم الحجز المحدد'
              : 'Selected service does not match the chosen category'
          );
        } else {
          toast.error(
            isAr ? 'الخدمة المختارة غير متاحة حالياً' : 'Selected service is currently unavailable'
          );
        }
      }
      if (currentStep === 2) toast.error(isAr ? 'يرجى اختيار التاريخ والوقت' : 'Please select date and time');
      if (currentStep === 3) {
        const effectiveName = (!isAuthenticated ? guestName : (user?.name || guestName || '')).trim();
        const nameVal = validateCustomerName(effectiveName, isAr);
        const effectivePhone = (!isAuthenticated ? guestPhone : (user?.phone || guestPhone || selectedAddress?.customerPhone || '')).trim();
        const phoneVal = validateEgyptianPhone(effectivePhone);
        if (!selectedAddress) {
          toast.error(isAr ? 'يرجى اختيار وتأكيد عنوان الخدمة' : 'Please select and confirm service address');
        } else if (!nameVal.isValid) {
          toast.error(nameVal.message || (isAr ? 'يرجى إدخال اسم العميل للمتابعة' : 'Please enter customer name to proceed'));
        } else if (!phoneVal.isValid) {
          toast.error(phoneVal.message || (isAr ? 'يرجى إدخال رقم الهاتف للتواصل للمتابعة' : 'Please enter contact phone number to proceed'));
        }
      }
      return;
    }
    const next = currentStep + 1;
    nextStep();

    // Trigger Zo contextual reaction for next step
    if (next === 2) {
      useZoStudioStore.getState().emitTrigger('step_change', {
        priority: 3,
        customExpression: 'booking',
        customPose: 'holding_calendar',
        customMessage: 'اختر اليوم والوقت الأنسب ليك، وفريقنا هيكون عندك بالثانية! ⏰',
        customMessageEn: 'Pick the date and time that works best, we will be there on the dot! ⏰',
      });
    } else if (next === 3) {
      useZoStudioStore.getState().emitTrigger('step_change', {
        priority: 3,
        customExpression: 'helpful',
        customPose: 'holding_location',
        customMessage: 'حدد موقعك أو عنوانك عشان الكابتن يوصلك مباشرة وبدون تأخير 📍',
        customMessageEn: 'Set your address or pin so our captain reaches you directly 📍',
      });
    } else if (next === 4) {
      useZoStudioStore.getState().emitTrigger('step_change', {
        priority: 3,
        customExpression: 'confident',
        customPose: 'holding_checkmark',
        customMessage: 'راجع تفاصيل طلبك قبل التأكيد، وضمان كلينزو الذهبي معاك 100%! 🛡️',
        customMessageEn: 'Review your booking details, backed 100% by Cleanzo Gold Guarantee! 🛡️',
      });
    }
  };

  const executeOrderCreation = async () => {
    // Duplicate submission guard (Idempotency)
    if (isSubmitting) return;

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

    // Per-Service Slot Conflict Prevention:
    // Disallow booking if an active order already exists for any of these services at the chosen date and time
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
          ? `عذراً، موعد (${selectedTime}) محجوز بالفعل لإحدى الخدمات المختارة. يرجى اختيار موعد آخر.`
          : `Sorry, (${selectedTime}) is already booked for one of the selected services. Please choose another time.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const rawName = (!isAuthenticated ? guestName : (user?.name || guestName || '')).trim();
      const nameVal = validateCustomerName(rawName, isAr);
      if (!nameVal.isValid) {
        toast.error(nameVal.message || (isAr ? 'يرجى إدخال اسم العميل للمتابعة.' : 'Please provide customer name to proceed.'));
        setIsSubmitting(false);
        return;
      }
      const effectiveName = rawName;
      const rawPhone = (user?.phone || guestPhone || selectedAddress?.customerPhone || '').trim();

      if (!rawPhone) {
        toast.error(
          isAr
            ? 'يرجى إدخال رقم الهاتف للتواصل لإتمام الحجز.'
            : 'Please enter contact phone number to complete booking.'
        );
        setIsSubmitting(false);
        return;
      }

      const phoneVal = validateEgyptianPhone(rawPhone);
      if (!phoneVal.isValid) {
        toast.error(
          phoneVal.message ||
            (isAr
              ? 'يرجى إدخال رقم هاتف مصري صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015).'
              : 'Please enter a valid Egyptian phone number.')
        );
        setIsSubmitting(false);
        return;
      }
      const effectivePhone = rawPhone;

      // Check if customer account is deactivated by admin
      if (effectivePhone) {
        try {
          const customerStore = useCustomerStore.getState();
          const matched = customerStore.customers.find((c) => c.phone === effectivePhone.trim());
          if (matched && (matched.status === 'inactive' || matched.status === 'suspended')) {
            toast.error(
              isAr
                ? 'تم تعطيل هذا الحساب من قِبل إدارة كلينزو. يرجى التواصل مع خدمة العملاء.'
                : 'This account has been deactivated by Cleanzo admin. Please contact customer support.'
            );
            setIsSubmitting(false);
            return;
          }
        } catch {
          // Continue
        }
      }

      const servicesPayload = allItems.map((item) => ({
        serviceId: item.service.id,
        packageId: item.selectedPackage?.id,
        addonIds: item.selectedAddons?.map((a) => a.id) || [],
      }));

      const createdBooking = await cleanzoApi.bookings.create({
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
        guestName: effectiveName,
        guestPhone: effectivePhone,
      });

      if (!createdBooking || !createdBooking.id) {
        throw new Error(isAr ? 'لم يتم استلام تأكيد الحجز من الخادم' : 'Did not receive booking confirmation from server');
      }

      // Save authoritative server booking to store
      addOrder(createdBooking);

      // Trigger celebratory reaction
      useZoStudioStore.getState().emitTrigger('action', {
        priority: 2,
        customExpression: 'happy',
        customPose: 'celebrating',
        customMessage: 'ألف مبروك! حجزك اتسجل بنجاح، وفريق كلينزو في طريقه إليك 🎉',
        customMessageEn: 'Congratulations! Your booking is confirmed, Cleanzo team is on the way 🎉',
      });

      toast.success(isAr ? `تم تسجيل طلبك بنجاح برقم #${createdBooking.id}` : `Booking created successfully #${createdBooking.id}`);

      resetBooking();
      router.push(`/booking/success?orderId=${createdBooking.id}`);
    } catch (err: any) {
      console.error('[Booking Submit Error]:', err);
      toast.error(err?.message || (isAr ? 'فشل إتمام الحجز، يرجى المحاولة مجدداً' : 'Failed to complete booking'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalConfirm = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    executeOrderCreation();
  };

  return (
    <div className="py-3 sm:py-8 pb-32 sm:pb-16 bg-slate-50 dark:bg-[#0B1120] min-h-screen">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 sm:space-y-6">
        {/* Wizard Header & Progress Bar */}
        <div className="space-y-2.5 sm:space-y-4">
          <div className="text-center space-y-1 sm:space-y-1.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {t.booking.wizardTitle}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              {isAr
                ? 'أكمل الخطوات التالية لتثبيت موعد الخدمة بكل سهولة وسرعة'
                : 'Complete the steps below to secure your appointment'}
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="relative">
            <div className="grid grid-cols-4 gap-1 sm:gap-3 max-w-xl mx-auto">
              {steps.map((step) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.num;
                const isCurrent = currentStep === step.num;

                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => {
                      if (step.num < currentStep) {
                        setStep(step.num);
                      } else if (step.num > currentStep) {
                        if (!hasServices) {
                          toast.error(isAr ? 'من فضلك اختر خدمة أولًا للمتابعة.' : 'Please select a service to continue.');
                        } else if (currentStep === 1) {
                          handleNext();
                        }
                      }
                    }}
                    className={`flex flex-col items-center gap-1 sm:gap-1.5 p-1 sm:p-2 rounded-xl transition-all ${
                      isCurrent
                        ? 'text-sky-600 dark:text-sky-400 font-bold'
                        : isCompleted
                        ? 'text-[#0866C6] dark:text-[#83AED0] cursor-pointer'
                        : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 scale-105'
                          : isCompleted
                          ? 'bg-[#0866C6] text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <span className="text-[10px] sm:text-xs text-center line-clamp-1 font-medium">
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wizard Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
          {/* Active Step Panel */}
          <div className="lg:col-span-8 p-3 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {currentStep === 1 && <StepService />}
            {currentStep === 2 && <StepDateTime />}
            {currentStep === 3 && <StepAddress />}
            {currentStep === 4 && <StepReview />}

            {/* Stepper Action Buttons */}
            <div className="pt-4 mt-4 sm:pt-6 sm:mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" size="sm" onClick={prevStep} className="h-10 sm:h-11 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold">
                  <ArrowBack className="w-4 h-4" />
                  <span>{t.booking.back}</span>
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <div
                  onClick={() => {
                    if (!canProceed()) {
                      handleNext();
                    }
                  }}
                  className={!canProceed() ? 'cursor-not-allowed inline-block' : 'inline-block'}
                >
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!canProceed()}
                    onClick={handleNext}
                    className={`h-10 sm:h-11 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all ${
                      !canProceed()
                        ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500 shadow-none pointer-events-none'
                        : 'shadow-sky-500/20 bg-[#0866C6] hover:bg-[#07345C] text-white'
                    }`}
                  >
                    <span>{t.booking.continue}</span>
                    <ArrowNext className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  onClick={handleFinalConfirm}
                  className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl text-xs sm:text-sm shadow-xl shadow-[#0866C6]/30 font-bold bg-[#F0444C] hover:bg-[#c91219] text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.booking.confirmBooking}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Persistent Mini Summary & Mascot Guide (Right Rail on Desktop) */}
          <div className="lg:col-span-4 space-y-3 sm:space-y-4">
            
            {/* Interactive Step Guide with Living Zo Character */}
            {bookingConfig?.enabled !== false && (() => {
              const zoStepConfig = {
                1: {
                  pose: 'pointing' as const,
                  expression: 'curious' as const,
                  message: isAr ? 'اختر الباقة الأنسب لعربيتك أو بيتك 💧' : 'Select the best package for your car or home 💧',
                },
                2: {
                  pose: 'holding_calendar' as const,
                  expression: 'booking' as const,
                  message: isAr ? 'حدد اليوم والوقت الأنسب ليك.. أسطولنا بيوصل في الميعاد تماماً ⏱️' : 'Choose date & time. Our fleet is 100% punctual ⏱️',
                },
                3: {
                  pose: 'holding_pin' as const,
                  expression: 'location' as const,
                  message: isAr ? 'اكتب عنوانك وهنجيلك بعربيتنا المجهزة بأحدث أجهزة البخار 📍' : 'Set your address and our mobile van will arrive ready 📍',
                },
                4: {
                  pose: 'celebrating' as const,
                  expression: 'happy' as const,
                  message: isAr ? 'راجع بيانات حجزك ودوس تأكيد.. واستمتع بنتيجة تفرحك 🎉' : 'Review details and confirm. Enjoy pristine cleanliness 🎉',
                },
              }[currentStep as 1 | 2 | 3 | 4] || {
                pose: 'waving' as const,
                expression: 'happy' as const,
                message: isAr ? 'خطوات بسيطة وحجزك يكتمل!' : 'Simple steps to complete your booking!',
              };

              const StepIcon = steps[currentStep - 1]?.icon || Sparkles;

              return (
                <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-[#0866C6]/10 via-white to-[#F0444C]/5 dark:from-[#082845] dark:via-[#07345C] dark:to-[#041728] border border-[#0866C6]/25 shadow-sm flex items-center gap-3 text-start">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0866C6]/15 dark:bg-[#0866C6]/30 text-[#0866C6] dark:text-[#3894ec] flex items-center justify-center shrink-0 shadow-xs border border-[#0866C6]/30">
                    <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#0866C6]/10 text-[#0866C6] dark:text-[#3894ec] text-[9px] font-black">
                      <Sparkles className="w-2 h-2" />
                      <span>{isAr ? `خطوة ${currentStep} من 4` : `Step ${currentStep} of 4`}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs font-bold text-[#07345C] dark:text-white leading-snug">
                      {zoStepConfig.message}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#082845] border border-slate-200/80 dark:border-[#133B61] shadow-xs space-y-2.5 sm:space-y-3.5 text-start">
              <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-slate-100 dark:border-[#133B61]/80">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-[#07345C] dark:text-white">
                    {t.booking.summaryTitle}
                  </h3>
                  {selectedService && (
                    <span className="lg:hidden text-xs font-black text-[#0866C6] dark:text-sky-400 font-mono">
                      • {getItemizedPricing().finalPrice} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSummaryOpen((prev) => !prev)}
                  className="lg:hidden text-[11px] font-semibold text-[#0866C6] dark:text-sky-400 flex items-center gap-1 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <span>{isMobileSummaryOpen ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'التفاصيل' : 'Details')}</span>
                  {isMobileSummaryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              <div className={`${isMobileSummaryOpen ? 'block' : 'hidden lg:block'} space-y-2.5 sm:space-y-3`}>
                {selectedServices && selectedServices.length > 1 && (
                  <div className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-[#133B61]/80">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      {isAr ? 'الخدمات المختارة' : 'Selected Services'} ({selectedServices.length}):
                    </span>
                    <div className="space-y-1">
                      {selectedServices.map((item) => (
                        <div key={item.service.id} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="truncate max-w-[150px]">• {isAr ? item.service.title : item.service.titleEn}</span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">{item.service.price} {isAr ? 'ج.م' : 'EGP'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {selectedService ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedService.image ? (
                      <img
                        src={selectedService.image}
                        alt={selectedService.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-500 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {isAr ? selectedService.title : selectedService.titleEn}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatDuration(selectedService.duration, isAr)}
                      </p>
                    </div>
                  </div>

                  {/* Service Price & Package Breakdown (Authoritative Itemized Pricing Engine) */}
                  {(() => {
                    const pricing = getItemizedPricing();
                    return (
                      <>
                        <div className="pt-2 border-t border-slate-100 dark:border-[#133B61]/80 space-y-1.5 text-xs">
                          {selectedPackage ? (
                            <>
                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>{isAr ? 'الباقة المختارة:' : 'Package:'}</span>
                                <span className="font-bold text-[#0866C6] dark:text-[#3894ec]">
                                  {selectedPackage.name}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>{isAr ? 'سعر الباقة:' : 'Package Price:'}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  {pricing.catalogDiscount > 0 && (
                                    <span className="text-[11px] text-slate-400 line-through">
                                      {pricing.baseOriginalPrice} {isAr ? 'ج.م' : 'EGP'}
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {pricing.baseSellingPrice} {isAr ? 'ج.م' : 'EGP'}
                                  </span>
                                </div>
                              </div>
                              {pricing.catalogDiscount > 0 && (
                                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                  <span>{isAr ? 'وفّرت في الباقة:' : 'Package Savings:'}</span>
                                  <span className="font-mono">
                                    -{pricing.catalogDiscount} {isAr ? 'ج.م' : 'EGP'}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>
                                  {pricing.catalogDiscount > 0
                                    ? isAr
                                      ? 'السعر الأصلي للخدمة:'
                                      : 'Original Price:'
                                    : isAr
                                    ? 'السعر الأساسي:'
                                    : 'Base Price:'}
                                </span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  {pricing.catalogDiscount > 0 && (
                                    <span className="text-[11px] text-slate-400 line-through">
                                      {pricing.baseOriginalPrice} {isAr ? 'ج.م' : 'EGP'}
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {pricing.baseSellingPrice} {isAr ? 'ج.م' : 'EGP'}
                                  </span>
                                </div>
                              </div>
                              {pricing.catalogDiscount > 0 && (
                                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                  <span>
                                    {isAr ? 'وفرت بالعرض المباشر:' : 'Catalog Savings:'}
                                    {pricing.catalogDiscountPercent > 0 ? ` (${pricing.catalogDiscountPercent}%)` : ''}
                                  </span>
                                  <span className="font-mono">
                                    -{pricing.catalogDiscount} {isAr ? 'ج.م' : 'EGP'}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                                <span>{isAr ? 'الباقة:' : 'Package:'}</span>
                                <span className="text-slate-400 dark:text-slate-500">
                                  {isAr ? 'بدون باقة (السعر الأساسي)' : 'None (Base Service)'}
                                </span>
                              </div>
                            </>
                          )}

                          {selectedAddons && selectedAddons.length > 0 && (
                            <div className="pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-800 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {isAr ? 'الإضافات:' : 'Add-ons:'}
                              </span>
                              {selectedAddons.map((addon) => (
                                <div key={addon.id} className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400">
                                  <span className="truncate max-w-[130px]">+{isAr ? addon.name : addon.nameEn || addon.name}</span>
                                  <span className="font-mono font-bold">+{addon.price} {isAr ? 'ج.م' : 'EGP'}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {(selectedAddons.length > 0 || pricing.catalogDiscount > 0) && (
                            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-dashed border-slate-100 dark:border-slate-800">
                              <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                              <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                                {pricing.subtotal} {isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                          )}

                          {pricing.couponDiscount > 0 && (
                            <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-800">
                              <span>
                                {pricing.appliedCouponCode
                                  ? isAr
                                    ? `خصم الكوبون (${pricing.appliedCouponCode}):`
                                    : `Coupon (${pricing.appliedCouponCode}):`
                                  : isAr
                                  ? 'خصم الكوبون:'
                                  : 'Coupon Discount:'}
                              </span>
                              <span className="font-mono">-{pricing.couponDiscount} {isAr ? 'ج.م' : 'EGP'}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                            <span>{isAr ? 'رسوم الخدمة والانتقال:' : 'Service Fee:'}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {pricing.serviceFee > 0 ? `${pricing.serviceFee} ${isAr ? 'ج.م' : 'EGP'}` : isAr ? 'مجاناً' : 'Free'}
                            </span>
                          </div>
                        </div>

                        {selectedDate && (
                          <div className="pt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                            <span>{isAr ? 'الموعد:' : 'Schedule:'}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {selectedDate} • {selectedTime || '--:--'}
                            </span>
                          </div>
                        )}

                        {selectedAddress && (
                          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                            <span>{isAr ? 'العنوان:' : 'Address:'}</span>
                            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                              {selectedAddress.city}
                            </span>
                          </div>
                        )}

                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                              {isAr ? 'المبلغ النهائي المستحق' : 'Final Total'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isAr ? 'شامل الضريبة والمصاريف' : 'VAT inclusive'}
                            </span>
                          </div>
                          <span className="text-sm sm:text-base font-black text-[#0866C6] dark:text-sky-400 font-mono">
                            {pricing.finalPrice} {isAr ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  {isAr ? 'لم يتم اختيار خدمة بعد' : 'No service selected'}
                </p>
              )}
              </div>
            </div>

            {/* Quick Guarantee Badge (Cleanzo Livery colors) */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-[#0866C6]/5 dark:bg-[#0866C6]/10 border border-[#0866C6]/20 flex items-center gap-2.5 text-xs text-[#0866C6] dark:text-[#3B82F6]">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F0444C]/10 text-[#F0444C] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                {isAr
                  ? 'ضمان كلينزو الذهبي 100%: لا تدفع إلا بعد فحص ومعاينة النتيجة النهائية بنفسك.'
                  : 'Cleanzo 100% Gold Guarantee: You only pay after inspecting the finished result.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Auth Prompt Modal */}
      <AuthModalPrompt
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          // Once authenticated, proceed immediately with the order creation!
          executeOrderCreation();
        }}
      />
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="py-32 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            جاري تهيئة صفحة الحجز...
          </p>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
