'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Car,
  Home,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Phone,
  Layers,
  Info,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api';
import { CleanzoImage } from '@/components/common/CleanzoImage';

interface IService {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  image: string;
  price: number;
  duration: number;
}

interface IPlan {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  image?: string;
  serviceId: string;
  visitCount: number;
  price: number;
  durationDays: number;
  status: string;
  features?: string[];
  featuresEn?: string[];
  terms?: string;
  termsEn?: string;
  cancellationNoticeHours: number;
  rescheduleNoticeHours: number;
  service?: IService;
}

interface ISlot {
  time: string;
  start: string;
  end: string;
  available: boolean;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [services, setServices] = useState<IService[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'car' | 'home'>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<IPlan | null>(null);

  // Flow Step: 1 = Service & Plan, 2 = Dates & Schedule, 3 = Address & Vehicle, 4 = Review & Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Schedule state: array of { date: string, time: string } for each visit
  const [visitSchedules, setVisitSchedules] = useState<Array<{ date: string; time: string }>>([]);
  const [activeVisitIndex, setActiveVisitIndex] = useState<number>(0);
  const [availableSlots, setAvailableSlots] = useState<Record<number, ISlot[]>>({});
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Vehicle Details (Optional)
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  // Address
  const [governorate, setGovernorate] = useState('القاهرة');
  const [city, setCity] = useState('القاهرة الجديدة');
  const [area, setArea] = useState('');
  const [building, setBuilding] = useState('');
  const [notes, setNotes] = useState('');

  // Customer contact info (preloaded if authenticated)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name || '');
      if (!customerPhone) setCustomerPhone(user.phone || '');
    }
  }, [user, customerName, customerPhone]);

  // Load plans & services from backend
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [plansRes, servicesRes] = await Promise.all([
          apiGet<IPlan[]>('/subscriptions/plans'),
          apiGet<IService[]>('/services'),
        ]);

        if (plansRes?.data) {
          const raw = Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data as any)?.plans || [];
          setPlans(raw);
        }
        if (servicesRes?.data) {
          const rawServices = Array.isArray(servicesRes.data) ? servicesRes.data : (servicesRes.data as any)?.services || [];
          const activeServices = rawServices.filter(
            (s: any) => s.available !== false && !s.isArchived
          );
          setServices(activeServices);
        }
      } catch (err: any) {
        console.error('Failed to load subscriptions data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter plans by category and service
  const filteredPlans = plans.filter((p) => {
    if (selectedCategory !== 'all' && p.service?.category && p.service.category !== selectedCategory) {
      return false;
    }
    if (selectedServiceId && p.serviceId !== selectedServiceId) {
      return false;
    }
    return true;
  });

  // Handle Plan selection
  const handleSelectPlan = (plan: IPlan) => {
    setSelectedPlan(plan);
    setSelectedServiceId(plan.serviceId);

    // Initialize visit schedules with empty dates/times for plan.visitCount
    const initialVisits: Array<{ date: string; time: string }> = [];
    const today = new Date();
    for (let i = 0; i < plan.visitCount; i++) {
      // Stagger default dates weekly
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + 1 + i * 7);
      const dateStr = nextDate.toISOString().split('T')[0];
      initialVisits.push({ date: dateStr, time: '' });
    }
    setVisitSchedules(initialVisits);
    setActiveVisitIndex(0);
    setCurrentStep(2);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Fetch available slots for active visit index when date changes
  useEffect(() => {
    if (currentStep === 2 && selectedPlan && visitSchedules[activeVisitIndex]?.date) {
      const dateStr = visitSchedules[activeVisitIndex].date;
      const srvId = selectedPlan.serviceId;

      async function fetchSlots() {
        setLoadingSlots(true);
        try {
          const res = await apiGet<{ slots: ISlot[] }>(`/availability?date=${dateStr}&serviceId=${srvId}`);
          if (res?.data?.slots) {
            setAvailableSlots((prev) => ({
              ...prev,
              [activeVisitIndex]: res.data.slots.filter((s) => s.available),
            }));
          } else {
            setAvailableSlots((prev) => ({ ...prev, [activeVisitIndex]: [] }));
          }
        } catch (err) {
          console.error('Error fetching slots:', err);
          setAvailableSlots((prev) => ({ ...prev, [activeVisitIndex]: [] }));
        } finally {
          setLoadingSlots(false);
        }
      }

      fetchSlots();
    }
  }, [currentStep, selectedPlan, activeVisitIndex, visitSchedules]);

  // Update a visit date
  const handleDateChange = (visitIdx: number, newDate: string) => {
    setVisitSchedules((prev) => {
      const copy = [...prev];
      copy[visitIdx] = { date: newDate, time: '' };
      return copy;
    });
  };

  // Select a visit slot
  const handleSlotSelect = (visitIdx: number, timeStr: string) => {
    setVisitSchedules((prev) => {
      const copy = [...prev];
      copy[visitIdx] = { ...copy[visitIdx], time: timeStr };
      return copy;
    });

    // Automatically advance to next visit if not last
    if (selectedPlan && visitIdx < selectedPlan.visitCount - 1) {
      setActiveVisitIndex(visitIdx + 1);
    }
  };

  // Submit Subscription
  const handleConfirmSubscription = async () => {
    if (!selectedPlan) return;
    setErrorMsg('');

    if (!customerPhone || !customerPhone.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال رقم الهاتف للتواصل' : 'Please enter your phone number');
      toast.error(isAr ? 'رقم الهاتف مطلوب' : 'Phone number is required');
      return;
    }

    if (!area || !area.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال العنوان بالتفصيل' : 'Please enter your address details');
      toast.error(isAr ? 'العنوان مطلوب' : 'Address is required');
      return;
    }

    // Verify all visits have time selected
    const unselected = visitSchedules.findIndex((v) => !v.time);
    if (unselected !== -1) {
      setErrorMsg(isAr ? `يرجى اختيار موعد للزيارة رقم (${unselected + 1})` : `Please select time for visit #${unselected + 1}`);
      toast.error(isAr ? 'بعض الزيارات لم يتم تحديد وقتها' : 'Incomplete visit times');
      setCurrentStep(2);
      setActiveVisitIndex(unselected);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        planId: selectedPlan.id,
        serviceId: selectedPlan.serviceId,
        guestName: customerName || (isAr ? 'عميل كلينزو' : 'Cleanzo Customer'),
        guestPhone: customerPhone.trim(),
        address: {
          governorate,
          city,
          area: area.trim(),
          building: building.trim(),
          label: isAr ? 'مقر تقديم الخدمة' : 'Service Address',
        },
        vehicleDetails: vehicleMake || plateNumber ? {
          make: vehicleMake,
          model: vehicleModel,
          plateNumber,
          color: vehicleColor,
        } : undefined,
        visits: visitSchedules.map((v) => ({ date: v.date, time: v.time })),
        notes,
      };

      const res = await apiPost('/subscriptions', payload);

      if (res && res.success) {
        toast.success(isAr ? '🎉 تم تفعيل اشتراكك بنجاح!' : 'Subscription created successfully!');
        router.push('/account/subscriptions');
      } else {
        const msg = res?.message || (isAr ? 'تعذر إتمام الاشتراك، يرجى المحاولة مجدداً' : 'Failed to create subscription');
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err?.message || (isAr ? 'الموعد المحدد لم يعد متاحًا، يرجى اختيار موعد آخر.' : 'Slot unavailable, please choose another');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const ArrowNext = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const ArrowPrev = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-[#EAF8FC] dark:bg-[#041728] text-slate-900 dark:text-slate-100 py-8 sm:py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* ================= HERO HEADER ================= */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0866C6] via-[#074780] to-[#041F39] text-white p-8 sm:p-12 shadow-xl shadow-sky-950/20 border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isAr ? 'عناية مستمرة وتوفير مضمون حتى 30%' : 'Continuous Care & Save up to 30%'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {isAr ? 'باقات الاشتراكات الدورية الذكية' : 'Smart Periodic Subscriptions'}
            </h1>
            <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed font-normal">
              {isAr
                ? 'اختر باقة الغسيل والعناية المناسبة لك، وحدد مواعيد زياراتك الشهرية بمرونة تامة مع التزامنا بأعلى معايير النظافة.'
                : 'Choose the ideal care package, schedule your monthly visits flexibly, and enjoy priority service with showroom shine.'}
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/15 grid grid-cols-4 gap-2 sm:gap-4 text-center">
            {[
              { step: 1, label: isAr ? 'اختيار الباقة' : 'Choose Plan' },
              { step: 2, label: isAr ? 'جدولة المواعيد' : 'Schedule Visits' },
              { step: 3, label: isAr ? 'العنوان والبيانات' : 'Address & Vehicle' },
              { step: 4, label: isAr ? 'تأكيد الاشتراك' : 'Confirmation' },
            ].map((s) => (
              <div
                key={s.step}
                className={`flex flex-col items-center gap-1.5 transition-all ${
                  currentStep >= s.step ? 'text-white font-bold' : 'text-white/40 font-medium'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${
                    currentStep === s.step
                      ? 'bg-amber-400 text-slate-900 font-black shadow-lg shadow-amber-400/30 ring-2 ring-white/50'
                      : currentStep > s.step
                      ? 'bg-emerald-400 text-slate-950 font-bold'
                      : 'bg-white/10 border border-white/20'
                  }`}
                >
                  {currentStep > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                </div>
                <span className="text-[10px] sm:text-xs tracking-tight line-clamp-1">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert Display */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-semibold">{errorMsg}</div>
          </div>
        )}

        {/* ================= STEP 1: PLAN SELECTION ================= */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fadeIn">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 text-xs sm:text-sm font-bold">
                {[
                  { key: 'all', label: isAr ? 'جميع الباقات' : 'All Plans', icon: Layers },
                  { key: 'car', label: isAr ? 'اشتراكات السيارات' : 'Car Plans', icon: Car },
                  { key: 'home', label: isAr ? 'اشتراكات المنازل' : 'Home Plans', icon: Home },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = selectedCategory === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setSelectedCategory(tab.key as any);
                        setSelectedServiceId('');
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        active
                          ? 'bg-white dark:bg-slate-900 text-[#0866C6] dark:text-sky-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Service Filter (if services available) */}
              {services.length > 0 && (
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="text-slate-500 font-medium">{isAr ? 'الخدمة:' : 'Service:'}</span>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]"
                  >
                    <option value="">{isAr ? 'كل الخدمات' : 'All Services'}</option>
                    {services
                      .filter((s) => selectedCategory === 'all' || s.category === selectedCategory)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {isAr ? s.title : s.titleEn || s.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Plans Grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-[#0866C6]/20 border-t-[#0866C6] rounded-full animate-spin" />
                <p className="text-xs sm:text-sm text-slate-500 font-semibold">
                  {isAr ? 'جاري تحميل باقات الاشتراكات...' : 'Loading subscription plans...'}
                </p>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
                <Layers className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'لا توجد باقات اشتراك متاحة في هذا القسم حالياً' : 'No plans currently available in this category'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'يرجى اختيار قسم آخر أو التواصل مع فريق خدمة العملاء' : 'Please check another category or contact support'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredPlans.map((plan) => {
                  const visitPrice = Math.round(plan.price / (plan.visitCount || 1));
                  const isSelected = selectedPlan?.id === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border transition-all duration-300 ${
                        isSelected
                          ? 'border-[#0866C6] ring-2 ring-[#0866C6]/20 shadow-xl shadow-[#0866C6]/10'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-sky-500/50 hover:shadow-lg'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] dark:text-sky-400 mb-2 border border-sky-200/60 dark:border-sky-800/60">
                              {plan.service?.title || (isAr ? 'خدمة كلينزو' : 'Cleanzo Service')}
                            </span>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                              {isAr ? plan.name : plan.nameEn || plan.name}
                            </h3>
                          </div>
                          {/* Circular Visual Style (TASK 01) */}
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 shrink-0">
                            {plan.image || plan.service?.image ? (
                              <CleanzoImage
                                src={plan.image || plan.service?.image || ''}
                                alt={plan.name}
                                className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0866C6] to-[#07345C] text-white">
                                <Sparkles className="w-5 h-5 text-amber-300" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price Tag */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-black text-[#0866C6] dark:text-sky-400">
                              {plan.price}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-500">
                              {isAr ? 'ج.م / شهرياً' : 'EGP / month'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            {isAr
                              ? `${plan.visitCount} زيارات (بمتوسط ${visitPrice} ج.م للزيارة الواحدة)`
                              : `${plan.visitCount} visits (~${visitPrice} EGP per visit)`}
                          </p>
                        </div>

                        {/* Description */}
                        {plan.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                            {isAr ? plan.description : plan.descriptionEn || plan.description}
                          </p>
                        )}

                        {/* Features List */}
                        {plan.features && plan.features.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {plan.features.map((feat, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Select CTA Button */}
                      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleSelectPlan(plan)}
                          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0866C6] to-[#07345C] hover:from-[#0759AE] hover:to-[#05294A] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#0866C6]/20 transition-all flex items-center justify-center gap-2 group"
                        >
                          <span>{isAr ? 'اختيار الباقة والجدولة' : 'Select Plan & Schedule'}</span>
                          <ArrowNext className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: SCHEDULE VISITS ================= */}
        {currentStep === 2 && selectedPlan && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header info */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#0866C6] dark:text-sky-400">
                  {isAr ? 'الباقة المختارة:' : 'Selected Plan:'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {selectedPlan.name} • {selectedPlan.visitCount} {isAr ? 'زيارات' : 'Visits'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isAr ? 'يرجى تحديد موعد لكل زيارة وفقاً لجدولك المفضل' : 'Please choose date and time for each scheduled visit'}
                </p>
              </div>

              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 self-start sm:self-auto"
              >
                {isAr ? 'تغيير الباقة' : 'Change Plan'}
              </button>
            </div>

            {/* Visit Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {visitSchedules.map((v, idx) => {
                const isSelectedTab = activeVisitIndex === idx;
                const hasTime = Boolean(v.time);

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveVisitIndex(idx)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                      isSelectedTab
                        ? 'bg-[#0866C6] text-white shadow-md shadow-[#0866C6]/20'
                        : hasTime
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span>{isAr ? `الزيارة ${idx + 1}` : `Visit ${idx + 1}`}</span>
                    {hasTime && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>

            {/* Active Visit Schedule Picker */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] dark:text-sky-400 flex items-center justify-center font-black">
                    #{activeVisitIndex + 1}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {isAr ? `تحديد موعد الزيارة رقم (${activeVisitIndex + 1})` : `Schedule Visit #${activeVisitIndex + 1}`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {visitSchedules[activeVisitIndex]?.time
                        ? `${isAr ? 'الموعد المحدد:' : 'Selected:'} ${visitSchedules[activeVisitIndex].date} (${visitSchedules[activeVisitIndex].time})`
                        : isAr
                        ? 'اختر التاريخ ثم حدد الفترة الزمنية المتاحة'
                        : 'Choose date then pick an available slot'}
                    </p>
                  </div>
                </div>

                {/* Date Picker Input */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {isAr ? 'تاريخ الزيارة:' : 'Date:'}
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={visitSchedules[activeVisitIndex]?.date || ''}
                    onChange={(e) => handleDateChange(activeVisitIndex, e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]"
                  />
                </div>
              </div>

              {/* Slot Options Grid */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {isAr ? 'الفترات الزمنية المتاحة (محسوبة ديناميكياً):' : 'Available continuous slots:'}
                </span>

                {loadingSlots ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 border-[#0866C6]/20 border-t-[#0866C6] rounded-full animate-spin" />
                    <span className="text-xs text-slate-500">
                      {isAr ? 'جاري فحص المواعيد المتاحة...' : 'Checking availability...'}
                    </span>
                  </div>
                ) : !availableSlots[activeVisitIndex] || availableSlots[activeVisitIndex].length === 0 ? (
                  <div className="py-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {isAr ? 'لا توجد مواعيد متاحة في هذا اليوم، يرجى اختيار تاريخ آخر' : 'No available slots for this date. Please pick another date.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {availableSlots[activeVisitIndex].map((slot, sIdx) => {
                      const isChosen = visitSchedules[activeVisitIndex]?.time === slot.time;

                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleSlotSelect(activeVisitIndex, slot.time)}
                          className={`p-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border ${
                            isChosen
                              ? 'bg-[#0866C6] text-white border-[#0866C6] shadow-md shadow-[#0866C6]/20 ring-2 ring-[#0866C6]/30'
                              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#0866C6]'
                          }`}
                        >
                          <Clock className={`w-3.5 h-3.5 ${isChosen ? 'text-amber-300' : 'text-slate-400'}`} />
                          <span>{slot.time}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <ArrowPrev className="w-4 h-4" />
                <span>{isAr ? 'رجوع للباقات' : 'Back to Plans'}</span>
              </button>

              <button
                onClick={() => {
                  const unselected = visitSchedules.findIndex((v) => !v.time);
                  if (unselected !== -1) {
                    toast.error(isAr ? `يرجى تحديد موعد للزيارة رقم (${unselected + 1})` : `Please pick a time for visit #${unselected + 1}`);
                    setActiveVisitIndex(unselected);
                    return;
                  }
                  setCurrentStep(3);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0866C6] to-[#07345C] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#0866C6]/20 flex items-center gap-2"
              >
                <span>{isAr ? 'متابعة إلى العنوان والبيانات' : 'Next: Address & Info'}</span>
                <ArrowNext className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: ADDRESS & VEHICLE ================= */}
        {currentStep === 3 && selectedPlan && (
          <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {isAr ? 'بيانات العميل والعنوان' : 'Customer Info & Location'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isAr ? 'أدخل معلومات الاتصال وعنوان تقديم الخدمة' : 'Enter your contact and address details'}
                </p>
              </div>

              {/* Customer Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'اسم العميل' : 'Customer Name'} *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isAr ? 'الاسم بالكامل' : 'Full Name'}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'رقم الهاتف (واتساب)' : 'Phone Number (WhatsApp)'} *
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]"
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0866C6]" />
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {isAr ? 'عنوان تنفيذ الخدمة' : 'Service Address'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'المحافظة' : 'Governorate'}
                    </label>
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                    >
                      <option value="القاهرة">القاهرة (Cairo)</option>
                      <option value="الجيزة">الجيزة (Giza)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'المدينة / الحي' : 'City / District'}
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={isAr ? 'مثل: القاهرة الجديدة، التجمع الخامس' : 'e.g. New Cairo'}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'المنطقة والشارع بالتفصيل' : 'Street & Area Details'} *
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder={isAr ? 'اسم الشارع، رقم العمارة، علامة مميزة' : 'Street name, landmark'}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Vehicle Details */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#0866C6]" />
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {isAr ? 'بيانات السيارة (اختياري)' : 'Vehicle Info (Optional)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isAr ? 'يمكنك ربط أي عدد من الاشتراكات بالسيارة' : 'Subscriptions are independent from vehicles'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder={isAr ? 'الماركة (e.g. BMW)' : 'Make'}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder={isAr ? 'الموديل (e.g. X5)' : 'Model'}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder={isAr ? 'رقم اللوحة' : 'Plate No.'}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder={isAr ? 'اللون' : 'Color'}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Extra Notes */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {isAr ? 'ملاحظات إضافية لفريق العمل (اختياري)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? 'أي تعليمات خاصة لدخول الموقع أو الوصول...' : 'Special instructions...'}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <ArrowPrev className="w-4 h-4" />
                <span>{isAr ? 'رجوع للمواعيد' : 'Back to Schedule'}</span>
              </button>

              <button
                onClick={() => {
                  if (!customerPhone || !customerPhone.trim()) {
                    toast.error(isAr ? 'رقم الهاتف مطلوب' : 'Phone is required');
                    return;
                  }
                  if (!area || !area.trim()) {
                    toast.error(isAr ? 'يرجى إدخال تفاصيل العنوان' : 'Address is required');
                    return;
                  }
                  setCurrentStep(4);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0866C6] to-[#07345C] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#0866C6]/20 flex items-center gap-2"
              >
                <span>{isAr ? 'مراجعة وتأكيد الاشتراك' : 'Review & Confirm'}</span>
                <ArrowNext className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: REVIEW & CONFIRM ================= */}
        {currentStep === 4 && selectedPlan && (
          <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-xs font-bold text-[#0866C6] dark:text-sky-400">
                  {isAr ? 'المرحلة الأخيرة' : 'Final Step'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {isAr ? 'ملخص وتأكيد الاشتراك' : 'Subscription Summary'}
                </h2>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Plan Info */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2">
                  <span className="text-xs text-slate-500 font-medium">{isAr ? 'تفاصيل الباقة' : 'Plan Details'}</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">{selectedPlan.name}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {selectedPlan.service?.title} • {selectedPlan.visitCount} {isAr ? 'زيارات شهرية' : 'Visits/month'}
                  </p>
                  <div className="pt-2 text-xl font-black text-[#0866C6] dark:text-sky-400">
                    {selectedPlan.price} {isAr ? 'ج.م' : 'EGP'}
                  </div>
                </div>

                {/* Customer & Address */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2">
                  <span className="text-xs text-slate-500 font-medium">{isAr ? 'العميل ومكان الخدمة' : 'Customer & Location'}</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">{customerName || 'عميل كلينزو'}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400" dir="ltr">
                    {customerPhone}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {governorate}، {city} - {area}
                  </p>
                </div>
              </div>

              {/* Scheduled Visits Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {isAr ? 'جدول المواعيد المحجوزة:' : 'Scheduled Visit Appointments:'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visitSchedules.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-[#0866C6] dark:text-sky-400 flex items-center justify-center text-xs font-black">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{v.date}</div>
                          <div className="text-[11px] text-slate-500">{v.time}</div>
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 12-Hour Cancellation Policy Alert */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 flex items-start gap-3 text-xs leading-relaxed">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <strong className="font-bold">{isAr ? 'سياسة الإلغاء وتعديل المواعيد:' : 'Cancellation & Reschedule Policy:'}</strong>{' '}
                  {isAr
                    ? 'يمكنك إلغاء أو تغيير موعد أي زيارة مجاناً قبل الموعد بـ 12 ساعة على الأقل. في حال كان المتبقي أقل من 12 ساعة، يرجى التواصل مع فريق الدعم للمساعدة.'
                    : 'Visits can be cancelled or rescheduled up to 12 hours before the appointment. Less than 12 hours requires contacting support.'}
                </div>
              </div>

              {/* Confirm CTA Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={submitting}
                  className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  {isAr ? 'تعديل البيانات' : 'Edit Info'}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSubscription}
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#0866C6] to-[#07345C] hover:opacity-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-[#0866C6]/25 transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>{isAr ? 'جاري تأكيد وحجز المواعيد...' : 'Confirming Appointments...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      <span>{isAr ? 'تأكيد وحجز الاشتراك الآن' : 'Confirm Subscription Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
