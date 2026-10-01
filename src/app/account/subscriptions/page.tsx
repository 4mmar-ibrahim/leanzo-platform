'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  PhoneCall,
  MapPin,
  Car,
  ChevronDown,
  ChevronUp,
  X,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { apiGet, apiPost } from '@/lib/api';
import { toast } from 'sonner';

interface ISubscriptionVisit {
  id: string;
  visitIndex: number;
  date: string;
  time: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  rescheduledFrom?: string;
  cancellationReason?: string;
  serviceSnapshot?: any;
  technician?: any;
}

interface ISubscription {
  id: string;
  status: string;
  totalVisits: number;
  usedVisits: number;
  remainingVisits: number;
  price: number;
  startDate: string;
  endDate: string;
  renewalCycle: number;
  planSnapshot: any;
  serviceSnapshot: any;
  vehicleDetails?: any;
  address?: any;
  visits: ISubscriptionVisit[];
  renewals: any[];
}

export default function AccountSubscriptionsPage() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const { user } = useAuthStore();
  const settings = useSettingsStore((s) => s.settings);
  const supportPhone = settings?.social?.whatsapp || '01012345678';

  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<ISubscription[]>([]);

  // Modals state
  const [rescheduleModalVisit, setRescheduleModalVisit] = useState<{
    visit: ISubscriptionVisit;
    sub: ISubscription;
  } | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Cancel Modal
  const [cancelModalVisit, setCancelModalVisit] = useState<{
    visit: ISubscriptionVisit;
    sub: ISubscription;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Load subscriptions
  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiGet<ISubscription[]>('/subscriptions/my');
      if (res?.data) {
        const rawSubs = Array.isArray(res.data) ? res.data : (res.data as any)?.subscriptions || [];
        setSubscriptions(rawSubs);
      }
    } catch (err: any) {
      console.error('Failed to load customer subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // Check if remaining notice >= 12 hours for appointment
  const check12HourRule = (dateStr: string, timeStr: string) => {
    try {
      const rawTime = String(timeStr || '').trim();
      const startPart = rawTime.split(/[-–—]/)[0].trim();
      const clean = startPart.replace(/(AM|PM|مساءً|صباحاً|مساء|صباح)/gi, '').trim();
      const [hStr, mStr] = clean.split(':');
      let hours = parseInt(hStr || '0', 10);
      const mins = parseInt(mStr || '0', 10);

      const isPM = rawTime.toUpperCase().includes('PM') || rawTime.includes('مساء');
      const isAM = rawTime.toUpperCase().includes('AM') || rawTime.includes('صباح');
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;

      const [year, month, day] = dateStr.split('-').map(Number);
      const aptDate = new Date(year, month - 1, day, hours, mins, 0);
      const now = new Date();

      const diffHours = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours >= 12;
    } catch {
      return false;
    }
  };

  // Fetch slots when reschedule date changes
  useEffect(() => {
    if (rescheduleModalVisit && newDate) {
      const srvId = rescheduleModalVisit.sub.serviceSnapshot?.id;
      async function loadSlots() {
        setLoadingSlots(true);
        try {
          const res = await apiGet<any>(`/availability?date=${newDate}&serviceId=${srvId}`);
          if (res?.data?.slots) {
            setAvailableSlots(res.data.slots.filter((s: any) => s.available));
          } else {
            setAvailableSlots([]);
          }
        } catch {
          setAvailableSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      }
      loadSlots();
    }
  }, [rescheduleModalVisit, newDate]);

  // Handle Reschedule submit
  const handleConfirmReschedule = async () => {
    if (!rescheduleModalVisit || !newDate || !newTime) {
      toast.error(isAr ? 'يرجى اختيار التاريخ والوقت الجديد' : 'Please select date and time');
      return;
    }

    setRescheduling(true);
    try {
      const res = await apiPost(`/subscriptions/visits/${rescheduleModalVisit.visit.id}/reschedule`, {
        newDate,
        newTime,
      });

      if (res && res.success) {
        toast.success(isAr ? 'تم إعادة جدولة الموعد بنجاح' : 'Visit rescheduled successfully');
        setRescheduleModalVisit(null);
        fetchSubscriptions();
      } else {
        toast.error(res?.message || (isAr ? 'تعذر إعادة الجدولة' : 'Failed to reschedule'));
      }
    } catch (err: any) {
      toast.error(err?.message || (isAr ? 'الموعد المحدد غير متاح' : 'Selected slot unavailable'));
    } finally {
      setRescheduling(false);
    }
  };

  // Handle Cancel submit
  const handleConfirmCancel = async () => {
    if (!cancelModalVisit) return;

    setCancelling(true);
    try {
      const res = await apiPost(`/subscriptions/visits/${cancelModalVisit.visit.id}/cancel`, {
        reason: cancelReason,
      });

      if (res && res.success) {
        toast.success(isAr ? 'تم إلغاء موعد الزيارة بنجاح' : 'Visit cancelled successfully');
        setCancelModalVisit(null);
        fetchSubscriptions();
      } else {
        toast.error(res?.message || (isAr ? 'تعذر إلغاء الموعد' : 'Failed to cancel'));
      }
    } catch (err: any) {
      toast.error(err?.message || (isAr ? 'تعذر إلغاء الموعد' : 'Failed to cancel'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#0866C6] dark:text-sky-400">
            {isAr ? 'إدارة الاشتراكات والمواعيد' : 'Subscription & Visit Management'}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'اشتراكاتي الشهرية' : 'My Subscriptions'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAr ? 'متابعة رصيد الزيارات، تعديل المواعيد، وتجديد الباقات' : 'Track visit balances, reschedule visits, and renew plans'}
          </p>
        </div>

        <Link href="/subscriptions">
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0866C6] to-[#07345C] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#0866C6]/20 hover:opacity-95 transition-opacity flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isAr ? 'اشتراك في باقة جديدة' : 'New Subscription'}</span>
          </button>
        </Link>
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-[#0866C6]/20 border-t-[#0866C6] rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-bold">{isAr ? 'جاري تحميل الاشتراكات...' : 'Loading subscriptions...'}</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-4">
          <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'ليس لديك أي اشتراكات نشطة حالياً' : 'No active subscriptions'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isAr
                ? 'استمتع بعناية دورية لسيارتك أو منزلك مع خصومات حصرية وجدولة مواعيد مرنة'
                : 'Enjoy recurring care with exclusive discounts and flexible appointment scheduling'}
            </p>
          </div>
          <Link href="/subscriptions">
            <button className="px-6 py-2.5 rounded-xl bg-[#0866C6] text-white text-xs font-bold shadow-md shadow-[#0866C6]/20">
              {isAr ? 'استعراض الباقات المتاحة' : 'Browse Available Plans'}
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {subscriptions.map((sub) => {
            const planName = sub.planSnapshot?.name || (isAr ? 'باقة كلينزو' : 'Cleanzo Plan');
            const percentUsed = Math.min(100, Math.round((sub.usedVisits / (sub.totalVisits || 1)) * 100));
            const isFinished = sub.usedVisits >= sub.totalVisits || sub.status === 'completed' || sub.status === 'expired';

            return (
              <div
                key={sub.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Subscription Card Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
                        #{sub.id}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          sub.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {sub.status === 'active'
                          ? isAr ? 'اشتراك نشط' : 'Active'
                          : isAr ? 'مكتمل / منتهي' : 'Completed / Expired'}
                      </span>
                      {sub.renewalCycle > 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                          {isAr ? `تجديد (الدورة ${sub.renewalCycle})` : `Cycle ${sub.renewalCycle}`}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {planName} • {sub.serviceSnapshot?.title || ''}
                    </h3>

                    {sub.vehicleDetails && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <Car className="w-3.5 h-3.5" />
                        <span>
                          {sub.vehicleDetails.make} {sub.vehicleDetails.model} ({sub.vehicleDetails.plateNumber || ''})
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Visit Balance Metric & Progress Indicator */}
                  <div className="min-w-[240px] p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        {isAr
                          ? `استخدمت ${sub.usedVisits} من أصل ${sub.totalVisits} غسلات`
                          : `${sub.usedVisits} of ${sub.totalVisits} visits used`}
                      </span>
                      <span className="text-[#0866C6] dark:text-sky-400 font-black">{percentUsed}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#0866C6] to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span>{isAr ? `المتبقي: ${sub.remainingVisits} زيارات` : `Remaining: ${sub.remainingVisits} visits`}</span>
                      <span>{sub.price} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Expiration or Renewal Notice Banner */}
                {isFinished && (
                  <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>{isAr ? 'انتهى اشتراكك الحالي. لقد تم استهلاك جميع الزيارات المخصصة.' : 'Your subscription has ended. All visits have been completed.'}</span>
                    </div>
                    <Link href={`/subscriptions?serviceId=${sub.serviceSnapshot?.id || ''}`}>
                      <button className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 self-start sm:self-auto">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>{isAr ? 'تجديد الاشتراك الآن' : 'Renew Subscription'}</span>
                      </button>
                    </Link>
                  </div>
                )}

                {/* Visits List */}
                <div className="p-6 sm:p-8 space-y-4">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0866C6]" />
                    <span>{isAr ? 'جدول الزيارات والمواعيد' : 'Visits & Schedule'}</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sub.visits.map((visit) => {
                      const isCompleted = visit.status === 'completed';
                      const isCancelled = visit.status === 'cancelled';
                      const isAllowed = check12HourRule(visit.date, visit.scheduledStart || visit.time);

                      return (
                        <div
                          key={visit.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isCompleted
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                              : isCancelled
                              ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30 opacity-70'
                              : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                  #{visit.visitIndex}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCompleted
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                      : isCancelled
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                      : 'bg-sky-100 text-[#0866C6] dark:bg-sky-950 dark:text-sky-300'
                                  }`}
                                >
                                  {isCompleted
                                    ? isAr ? 'مكتملة' : 'Completed'
                                    : isCancelled
                                    ? isAr ? 'ملغاة' : 'Cancelled'
                                    : isAr ? 'مؤكدة' : 'Confirmed'}
                                </span>
                              </div>

                              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white pt-1">
                                {visit.date}
                              </div>
                              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{visit.time}</span>
                              </div>

                              {visit.rescheduledFrom && (
                                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                  {isAr ? `(تم تعديل الموعد من: ${visit.rescheduledFrom})` : `(Rescheduled from: ${visit.rescheduledFrom})`}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons for upcoming visits */}
                            {!isCompleted && !isCancelled && (
                              <div className="flex flex-col gap-1.5 shrink-0">
                                {isAllowed ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRescheduleModalVisit({ visit, sub });
                                        setNewDate(visit.date);
                                        setNewTime('');
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0866C6] dark:text-sky-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs"
                                    >
                                      {isAr ? 'تغيير الموعد' : 'Reschedule'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelModalVisit({ visit, sub });
                                        setCancelReason('');
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs"
                                    >
                                      {isAr ? 'إلغاء' : 'Cancel'}
                                    </button>
                                  </>
                                ) : (
                                  <div className="text-end space-y-1">
                                    <span className="inline-block text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
                                      {isAr ? 'أقل من 12 ساعة' : '< 12h remaining'}
                                    </span>
                                    <div>
                                      <a
                                        href={`https://wa.me/${supportPhone.replace(/\+/g, '')}?text=${encodeURIComponent(
                                          `مرحباً، أود المساعدة في تعديل أو إلغاء موعد الزيارة رقم (${visit.visitIndex}) في اشتراكي #${sub.id}`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-[#0866C6] hover:underline font-bold"
                                      >
                                        <PhoneCall className="w-3 h-3" />
                                        <span>{isAr ? 'تواصل مع الدعم' : 'Contact Support'}</span>
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= RESCHEDULE MODAL ================= */}
      {rescheduleModalVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'تعديل موعد الزيارة' : 'Reschedule Visit'}
              </h3>
              <button
                onClick={() => setRescheduleModalVisit(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'اختر التاريخ الجديد:' : 'New Date:'}
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    setNewTime('');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'اختر الوقت المتاح:' : 'Available Slots:'}
                </label>

                {loadingSlots ? (
                  <div className="py-6 flex justify-center">
                    <div className="w-6 h-6 border-2 border-[#0866C6]/20 border-t-[#0866C6] rounded-full animate-spin" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    {isAr ? 'لا توجد فترات شاغرة في هذا اليوم، يرجى اختيار تاريخ آخر.' : 'No slots available on this date.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewTime(slot.time)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                          newTime === slot.time
                            ? 'bg-[#0866C6] text-white border-[#0866C6]'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#0866C6]'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRescheduleModalVisit(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={rescheduling || !newDate || !newTime}
                className="px-5 py-2.5 rounded-xl bg-[#0866C6] text-white text-xs font-bold shadow-md shadow-[#0866C6]/20 disabled:opacity-50"
              >
                {rescheduling ? (isAr ? 'جاري الحجز...' : 'Rescheduling...') : isAr ? 'تأكيد الموعد الجديد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CANCEL MODAL ================= */}
      {cancelModalVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'تأكيد إلغاء موعد الزيارة' : 'Confirm Cancellation'}
              </h3>
              <button
                onClick={() => setCancelModalVisit(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {isAr
                ? `هل أنت متأكد من رغبتك في إلغاء موعد الزيارة رقم (${cancelModalVisit.visit.visitIndex}) بتاريخ ${cancelModalVisit.visit.date}؟`
                : `Are you sure you want to cancel visit #${cancelModalVisit.visit.visitIndex} on ${cancelModalVisit.visit.date}?`}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'سبب الإلغاء (اختياري):' : 'Reason (Optional):'}
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={isAr ? 'أدخل السبب إن وُجد...' : 'Enter reason...'}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalVisit(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                {isAr ? 'تراجع' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {cancelling ? (isAr ? 'جاري الإلغاء...' : 'Cancelling...') : isAr ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
