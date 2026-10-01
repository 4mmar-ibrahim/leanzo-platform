'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Phone,
  Car,
  Wrench,
  CheckCircle2,
  XCircle,
  CalendarClock,
  ArrowRight,
  RefreshCw,
  Eye,
  Sliders
} from 'lucide-react';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminSubscriptionVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<'assign' | 'reschedule' | 'cancel' | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/subscriptions/admin/visits/all');
      const rawVisits = Array.isArray(res.data) ? res.data : res.data?.visits || [];
      setVisits(rawVisits);
    } catch (err: any) {
      toast.error(err.message || 'فشل تحميل قائمة الزيارات');
      setVisits([]);
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
    fetchVisits();
    fetchTechnicians();
  }, []);

  const handleAssignTechnician = async () => {
    if (!selectedVisit) return;
    try {
      setSubmitting(true);
      await apiPut(`/subscriptions/admin/visits/${selectedVisit.id}/assign`, { technicianId: selectedTechId || null });
      toast.success('تم تعيين الفني بنجاح');
      setActiveModal(null);
      fetchVisits();
    } catch (err: any) {
      toast.error(err.message || 'فشل تعيين الفني');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (visitId: string, status: string) => {
    try {
      await apiPut(`/subscriptions/admin/visits/${visitId}/status`, { status });
      toast.success(`تم تحديث حالة الزيارة إلى ${status}`);
      fetchVisits();
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث الحالة');
    }
  };

  const handleReschedule = async () => {
    if (!selectedVisit || !rescheduleDate || !rescheduleTime) {
      toast.error('يرجى تحديد التاريخ والوقت');
      return;
    }
    try {
      setSubmitting(true);
      await apiPost(`/subscriptions/admin/visits/${selectedVisit.id}/reschedule`, {
        date: rescheduleDate,
        time: rescheduleTime,
      });
      toast.success('تمت إعادة جدولة موعد الزيارة');
      setActiveModal(null);
      fetchVisits();
    } catch (err: any) {
      toast.error(err.message || 'فشل إعادة الجدولة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedVisit) return;
    try {
      setSubmitting(true);
      await apiPost(`/subscriptions/admin/visits/${selectedVisit.id}/cancel`, {
        reason: cancelReason,
      });
      toast.success('تم إلغاء الزيارة');
      setActiveModal(null);
      fetchVisits();
    } catch (err: any) {
      toast.error(err.message || 'فشل إلغاء الزيارة');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered visits with absolute array safety
  const visitsList = Array.isArray(visits) ? visits : (visits as any)?.visits || [];
  const filteredVisits = visitsList.filter((v: any) => {
    if (!v) return false;
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (dateFilter && v.date !== dateFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCustomer = v.customerName?.toLowerCase().includes(q) || v.customerPhone?.includes(q);
      const matchNumber = v.visitNumber?.toLowerCase().includes(q);
      const matchTech = v.technician?.name?.toLowerCase().includes(q);
      if (!matchCustomer && !matchNumber && !matchTech) return false;
    }
    return true;
  });

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
            <span className="text-xs text-foreground/80">جدول الزيارات</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">
            زيارات الاشتراكات المجدولة
          </h1>
          <p className="text-xs text-foreground/60 mt-1">
            متابعة وتوزيع مواعيد غسيل الاشتراكات، تعيين الفنيين وإدارة الحالات اليومية
          </p>
        </div>

        <button
          onClick={fetchVisits}
          className="p-2 rounded-xl bg-card border border-border/50 text-foreground/70 hover:text-primary transition"
          title="تحديث القائمة"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-foreground/40 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم العميل، الهاتف، أو رقم الزيارة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-background border border-border text-xs focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="p-2 rounded-xl bg-background border border-border text-xs font-mono"
            title="تصفية حسب التاريخ"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-[11px] text-primary hover:underline font-bold"
            >
              مسح التاريخ
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 rounded-xl bg-background border border-border text-xs"
        >
          <option value="all">جميع الحالات</option>
          <option value="scheduled">مجدولة</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="completed">مكتملة</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 text-foreground/70 border-b border-border/40">
              <tr>
                <th className="py-3 px-4 font-bold"># الزيارة</th>
                <th className="py-3 px-4 font-bold">العميل والسيارة</th>
                <th className="py-3 px-4 font-bold">الموعد المحدد</th>
                <th className="py-3 px-4 font-bold">الخدمة</th>
                <th className="py-3 px-4 font-bold">الفني المكلف</th>
                <th className="py-3 px-4 font-bold">الحالة</th>
                <th className="py-3 px-4 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-foreground/50">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    جاري تحميل الزيارات...
                  </td>
                </tr>
              ) : filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-foreground/50">
                    لا توجد زيارات مطابقة للشروط
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit: any) => (
                  <tr key={visit.id} className="hover:bg-muted/20 transition">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/subscriptions/${visit.subscriptionId}`}
                        className="font-mono font-bold text-primary hover:underline"
                      >
                        {visit.visitNumber || visit.id.slice(0, 8)}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{visit.customerName}</div>
                      <div className="text-[11px] text-foreground/60 font-mono" dir="ltr">
                        {visit.customerPhone}
                      </div>
                      {visit.vehicleDetails && (
                        <div className="text-[10px] text-foreground/50 flex items-center gap-1 mt-0.5">
                          <Car className="w-3 h-3 text-primary" />
                          {visit.vehicleDetails.make} {visit.vehicleDetails.model}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold font-mono text-foreground">{visit.date}</div>
                      <div className="text-[11px] text-foreground/60 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-primary" />
                        {visit.time}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {visit.service?.title || 'خدمة غسيل'}
                    </td>

                    <td className="py-3.5 px-4">
                      {visit.technician ? (
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <Wrench className="w-3.5 h-3.5 text-primary" />
                          {visit.technician.name || visit.technician.fullName}
                        </div>
                      ) : (
                        <span className="text-foreground/40 italic">لم يعين فني</span>
                      )}
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
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Assign */}
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

                        {/* Complete Status */}
                        {visit.status === 'scheduled' && (
                          <button
                            onClick={() => handleUpdateStatus(visit.id, 'completed')}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition"
                            title="إتمام الزيارة"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View Sub */}
                        <Link
                          href={`/admin/subscriptions/${visit.subscriptionId}`}
                          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground/70 hover:text-primary transition"
                          title="عرض تفاصيل الاشتراك"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {/* 1. Assign Modal */}
      {activeModal === 'assign' && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">تعيين فني للزيارة</h3>
            <p className="text-xs text-foreground/60">
              الزيارة: <span className="font-bold">{selectedVisit.visitNumber}</span>
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/70">اختر الفني</label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-background border border-border text-sm"
              >
                <option value="">بدون فني</option>
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
                disabled={submitting}
                onClick={handleAssignTechnician}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'جاري الحفظ...' : 'تأكيد التعيين'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Reschedule Modal */}
      {activeModal === 'reschedule' && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">إعادة جدولة موعد الزيارة</h3>
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
                disabled={submitting}
                onClick={handleReschedule}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? 'جاري التحقق...' : 'تأكيد الجدولة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Cancel Modal */}
      {activeModal === 'cancel' && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-rose-500">إلغاء الزيارة</h3>
            <p className="text-xs text-foreground/60">
              هل أنت متأكد من إلغاء الزيارة <span className="font-bold">{selectedVisit.visitNumber}</span>؟
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground/70">سبب الإلغاء</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="سبب الإلغاء..."
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
                disabled={submitting}
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {submitting ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
