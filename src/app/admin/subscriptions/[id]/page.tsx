'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Car,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Wrench,
  DollarSign,
  Gift,
  RefreshCw,
  Edit3,
  CalendarClock,
  Shield,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminSubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const subscriptionId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Modal states
  const [activeModal, setActiveModal] = useState<'status' | 'assign' | 'reschedule' | 'cancel' | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  // Form states
  const [newSubStatus, setNewSubStatus] = useState('');
  const [selectedTechId, setSelectedTechId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      let res: any;
      try {
        res = await apiGet(`/subscriptions/admin/${subscriptionId}`);
      } catch {
        try {
          res = await apiGet(`/admin/subscriptions/${subscriptionId}`);
        } catch {
          res = await apiGet(`/subscriptions/${subscriptionId}`);
        }
      }
      if (res?.data) {
        const subData = res.data.subscription || res.data;
        setSub(subData);
        setNewSubStatus(subData.status);
      }
    } catch (err: any) {
      console.warn('Failed to load subscription details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await apiGet('/technicians');
      if (res.data) {
        setTechnicians(Array.isArray(res.data) ? res.data : res.data.technicians || []);
      }
    } catch (err) {
      console.warn('Could not load technicians');
    }
  };

  useEffect(() => {
    fetchSubscription();
    fetchTechnicians();
  }, [subscriptionId]);

  const handleUpdateSubStatus = async () => {
    if (!newSubStatus) return;
    try {
      setIsSubmitting(true);
      await apiPut(`/subscriptions/admin/${subscriptionId}/status`, { status: newSubStatus });
      toast.success('تم تحديث حالة الاشتراك بنجاح');
      setActiveModal(null);
      fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث الحالة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedVisit) return;
    try {
      setIsSubmitting(true);
      await apiPut(`/subscriptions/admin/visits/${selectedVisit.id}/assign`, { technicianId: selectedTechId || null });
      toast.success('تم تعيين الفني للزيارة بنجاح');
      setActiveModal(null);
      fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || 'فشل تعيين الفني');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateVisitStatus = async (visitId: string, status: string) => {
    try {
      await apiPut(`/subscriptions/admin/visits/${visitId}/status`, { status });
      toast.success(`تم تغيير حالة الزيارة إلى ${status}`);
      fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث حالة الزيارة');
    }
  };

  const handleRescheduleVisit = async () => {
    if (!selectedVisit || !rescheduleDate || !rescheduleTime) {
      toast.error('يرجى اختيار التاريخ والوقت الجديدين');
      return;
    }
    try {
      setIsSubmitting(true);
      await apiPost(`/subscriptions/admin/visits/${selectedVisit.id}/reschedule`, {
        date: rescheduleDate,
        time: rescheduleTime,
      });
      toast.success('تمت إعادة جدولة الزيارة بنجاح');
      setActiveModal(null);
      fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || 'فشل إعادة الجدولة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVisit = async () => {
    if (!selectedVisit) return;
    try {
      setIsSubmitting(true);
      await apiPost(`/subscriptions/admin/visits/${selectedVisit.id}/cancel`, {
        reason: cancelReason,
      });
      toast.success('تم إلغاء الزيارة بنجاح');
      setActiveModal(null);
      fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || 'فشل إلغاء الزيارة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-foreground/60">جاري تحميل بيانات الاشتراك...</p>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">الاشتراك غير موجود</h2>
        <Link href="/admin/subscriptions" className="inline-block mt-4 text-primary hover:underline text-sm">
          العودة لقائمة الاشتراكات
        </Link>
      </div>
    );
  }

  const percentUsed = sub.totalVisits > 0 ? Math.round((sub.usedVisits / sub.totalVisits) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/subscriptions" className="text-xs text-foreground/60 hover:text-primary flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              الاشتراكات
            </Link>
            <span className="text-foreground/40">/</span>
            <span className="text-xs text-foreground/80 font-mono">{sub.id}</span>
          </div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
            تفاصيل الاشتراك
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              sub.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                : sub.status === 'completed'
                ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                : sub.status === 'cancelled'
                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
            }`}>
              {sub.status === 'active' ? 'نشط' : sub.status === 'completed' ? 'مكتمل' : sub.status === 'cancelled' ? 'ملغي' : 'معلق'}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModal('status')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition shadow-sm"
          >
            <Edit3 className="w-4 h-4" />
            تعديل حالة الاشتراك
          </button>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Card */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <User className="w-4 h-4" />
            العميل والمعلومات
          </div>
          <div>
            <div className="text-base font-black text-foreground">{sub.customerName}</div>
            <div className="text-xs text-foreground/60 flex items-center gap-1.5 mt-1 font-mono" dir="ltr">
              <Phone className="w-3.5 h-3.5 text-primary" />
              {sub.customerPhone}
            </div>
            {sub.vehicleDetails && (
              <div className="mt-3 p-2.5 rounded-xl bg-muted/40 text-xs flex items-center gap-2 text-foreground/80">
                <Car className="w-4 h-4 text-primary" />
                <span>
                  {sub.vehicleDetails.make} {sub.vehicleDetails.model} - {sub.vehicleDetails.plateNumber || 'بدون لوحة'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Plan & Pricing */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Layers className="w-4 h-4" />
            الباقة والخدمة
          </div>
          <div>
            <div className="text-base font-black text-foreground">{sub.plan?.name || 'باقة اشتراك'}</div>
            <div className="text-xs text-foreground/60 mt-1">
              الخدمة: <span className="font-semibold text-foreground/90">{sub.service?.title || 'خدمة مخصصة'}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-primary">{sub.price}</span>
              <span className="text-xs font-bold text-foreground/60">جنيه / شهر</span>
            </div>
          </div>
        </div>

        {/* Balance & Progress */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Calendar className="w-4 h-4" />
              رصيد الزيارات
            </div>
            <span className="text-xs font-bold font-mono text-foreground/70">{sub.usedVisits} / {sub.totalVisits}</span>
          </div>
          <div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs mt-2 font-medium">
              <span className="text-emerald-500">تم استخدام: {sub.usedVisits}</span>
              <span className="text-primary font-bold">المتبقي: {sub.remainingVisits}</span>
            </div>
          </div>
          <div className="text-[11px] text-foreground/50 border-t border-border/40 pt-2 flex justify-between">
            <span>البداية: {new Date(sub.startDate).toLocaleDateString('ar-SA')}</span>
            <span>الانتهاء: {new Date(sub.endDate).toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
      </div>

      {/* Visits Table */}
      <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/40 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">جدول زيارات الاشتراك</h3>
            <p className="text-xs text-foreground/60 mt-0.5">
              جميع المواعيد المحجوزة للعميل والتحكم بكل زيارة
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-primary/10 text-primary rounded-full font-bold">
            {sub.visits?.length || 0} زيارات مجدولة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 text-foreground/70 border-b border-border/40">
              <tr>
                <th className="py-3 px-4 font-bold"># الزيارة</th>
                <th className="py-3 px-4 font-bold">التاريخ والوقت</th>
                <th className="py-3 px-4 font-bold">الحالة</th>
                <th className="py-3 px-4 font-bold">الفني المعين</th>
                <th className="py-3 px-4 font-bold">المدة المقدرة</th>
                <th className="py-3 px-4 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sub.visits && sub.visits.length > 0 ? (
                sub.visits.map((visit: any, idx: number) => {
                  return (
                    <tr key={visit.id} className="hover:bg-muted/20 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {visit.visitNumber || `VIS-${idx + 1}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">{visit.date}</div>
                        <div className="text-foreground/60 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-primary" />
                          {visit.time}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          visit.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : visit.status === 'cancelled'
                            ? 'bg-rose-500/15 text-rose-500'
                            : visit.status === 'in_progress'
                            ? 'bg-blue-500/15 text-blue-500'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}>
                          {visit.status === 'completed'
                            ? 'مكتملة'
                            : visit.status === 'cancelled'
                            ? 'ملغاة'
                            : visit.status === 'in_progress'
                            ? 'قيد التنفيذ'
                            : 'مجدولة'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {visit.technician ? (
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Wrench className="w-3.5 h-3.5 text-primary" />
                            {visit.technician.name || visit.technician.fullName}
                          </div>
                        ) : (
                          <span className="text-foreground/40 italic">لم يعين فني</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-foreground/70">
                        {visit.serviceDuration || 30} دقيقة
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Assign Tech */}
                          <button
                            onClick={() => {
                              setSelectedVisit(visit);
                              setSelectedTechId(visit.technicianId || '');
                              setActiveModal('assign');
                            }}
                            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground/70 hover:text-primary transition"
                            title="تعيين فني"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>

                          {/* Reschedule */}
                          {visit.status !== 'completed' && visit.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setSelectedVisit(visit);
                                setRescheduleDate(visit.date);
                                setRescheduleTime(visit.time);
                                setActiveModal('reschedule');
                              }}
                              className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground/70 hover:text-amber-500 transition"
                              title="إعادة جدولة"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel */}
                          {visit.status !== 'completed' && visit.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setSelectedVisit(visit);
                                setCancelReason('');
                                setActiveModal('cancel');
                              }}
                              className="p-1.5 rounded-lg bg-muted hover:bg-rose-500/10 text-foreground/70 hover:text-rose-500 transition"
                              title="إلغاء الزيارة"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Complete action */}
                          {visit.status === 'scheduled' && (
                            <button
                              onClick={() => handleUpdateVisitStatus(visit.id, 'completed')}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition font-bold"
                              title="تحديد كمكتملة"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-foreground/50">
                    لا توجد زيارات مسجلة لهذا الاشتراك
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renewals & Cashback Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Renewals History */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <RefreshCw className="w-4 h-4" />
            سجل التجديدات (Renewal History)
          </div>
          {sub.renewals && sub.renewals.length > 0 ? (
            <div className="space-y-2">
              {sub.renewals.map((ren: any) => (
                <div key={ren.id} className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold">دورة رقم {ren.cycleNumber}</div>
                    <div className="text-[11px] text-foreground/50 font-mono">{new Date(ren.createdAt).toLocaleDateString('ar-SA')}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">{ren.amountPaid} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-foreground/50">هذا هو الاشتراك الأولي ولم يتم تجديده بعد.</p>
          )}
        </div>

        {/* Cashback Summary */}
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Gift className="w-4 h-4" />
            الكاش باك المرتبط (Cashback)
          </div>
          {sub.cashbacks && sub.cashbacks.length > 0 ? (
            <div className="space-y-2">
              {sub.cashbacks.map((cb: any) => (
                <div key={cb.id} className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold">كاش باك زيارة مكتملة</div>
                    <div className="text-[11px] text-foreground/50 font-mono">{new Date(cb.createdAt).toLocaleDateString('ar-SA')}</div>
                  </div>
                  <div className="font-bold text-emerald-500">+{cb.amount} ج.م</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-foreground/50">لا توجد عمليات كاش باك مسجلة على هذا الاشتراك حتى الآن.</p>
          )}
        </div>
      </div>

      {/* MODALS */}

      {/* 1. Subscription Status Modal */}
      {activeModal === 'status' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">تعديل حالة الاشتراك</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/70">اختر الحالة الجديدة</label>
              <select
                value={newSubStatus}
                onChange={(e) => setNewSubStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background border border-border text-sm"
              >
                <option value="active">نشط (Active)</option>
                <option value="completed">مكتمل (Completed)</option>
                <option value="cancelled">ملغي (Cancelled)</option>
                <option value="paused">معلق / متوقف (Paused)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground"
              >
                إلغاء
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleUpdateSubStatus}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحالة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Assign Technician Modal */}
      {activeModal === 'assign' && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">تعيين فني للزيارة</h3>
            <p className="text-xs text-foreground/60">
              الزيارة: <span className="font-bold">{selectedVisit.visitNumber}</span> ({selectedVisit.date} - {selectedVisit.time})
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/70">اختر الفني</label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background border border-border text-sm"
              >
                <option value="">بدون فني (إلغاء التعيين)</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.fullName} - {t.phone}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground"
              >
                إلغاء
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleAssignTechnician}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'تأكيد التعيين'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reschedule Visit Modal */}
      {activeModal === 'reschedule' && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">إعادة جدولة موعد الزيارة</h3>
            <p className="text-xs text-foreground/60">
              تغيير موعد الزيارة: <span className="font-bold">{selectedVisit.visitNumber}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground/70">التاريخ الجديد</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-background border border-border text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground/70">الوقت الجديد</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-background border border-border text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground"
              >
                إلغاء
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleRescheduleVisit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري التحقق...' : 'تأكيد الجدولة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Cancel Visit Modal */}
      {activeModal === 'cancel' && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-rose-500">إلغاء الزيارة</h3>
            <p className="text-xs text-foreground/60">
              هل أنت متأكد من إلغاء الزيارة <span className="font-bold">{selectedVisit.visitNumber}</span>؟ لن تستهلك رصيد الزيارات وستصبح بحالة ملغاة.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground/70">سبب الإلغاء (اختياري)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="اكتب سبب الإلغاء..."
                className="w-full p-2.5 rounded-xl bg-background border border-border text-xs"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground"
              >
                تراجع
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleCancelVisit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
