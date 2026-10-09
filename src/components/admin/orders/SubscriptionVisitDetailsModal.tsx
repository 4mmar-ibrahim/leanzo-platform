'use client';

import React from 'react';
import {
  X,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Gift,
  HardHat,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface SubscriptionVisitDetailsModalProps {
  visit: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionVisitDetailsModal({
  visit,
  isOpen,
  onClose,
}: SubscriptionVisitDetailsModalProps) {
  if (!isOpen || !visit) return null;

  const sub = visit.subscription || {};
  const plan = sub.plan || sub.planSnapshot || {};
  const service = visit.service || sub.service || {};
  const vehicle = visit.vehicleDetails || sub.vehicleDetails;
  const address = visit.address || sub.address || {};
  const tech = visit.technician;

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'قيد الانتظار', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    confirmed: { label: 'مؤكد', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
    assigned: { label: 'تم تعيين فني', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    completed: { label: 'مكتمل', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    cancelled: { label: 'ملغي', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  };

  const currentStatus = statusLabels[visit.status] || {
    label: visit.status,
    color: 'bg-muted text-foreground/60 border-border',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-card w-full max-w-3xl rounded-3xl border border-border shadow-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
                زيارة اشتراك دوري
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground mt-2">
              تفاصيل زيارة الاشتراك #{visit.id}
            </h2>
            <div className="text-xs text-foreground/60 mt-1 flex items-center gap-2">
              <span>رقم الاشتراك الرئيسي:</span>
              <Link
                href={`/admin/subscriptions/${visit.subscriptionId}`}
                className="font-mono font-bold text-primary hover:underline"
              >
                {visit.subscriptionId}
              </Link>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-foreground/40 hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 24 Detailed Fields Grid (TASK 06) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Customer Card */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
            <div className="font-bold text-primary flex items-center gap-1.5 text-sm">
              <User className="w-4 h-4" />
              <span>بيانات المشترك</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">اسم العميل:</span>
              <span className="font-bold text-foreground">{visit.customerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">رقم الهاتف:</span>
              <span className="font-mono font-bold text-foreground">{visit.customerPhone}</span>
            </div>
            {sub.customerId && (
              <div className="flex justify-between py-1">
                <span className="text-foreground/60">معرف العميل (ID):</span>
                <span className="font-mono text-foreground/70">{sub.customerId}</span>
              </div>
            )}
          </div>

          {/* Service & Plan Card */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
            <div className="font-bold text-primary flex items-center gap-1.5 text-sm">
              <Layers className="w-4 h-4" />
              <span>الخدمة والباقة</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">الخدمة:</span>
              <span className="font-bold text-foreground">{service.title || 'خدمة كلينزو'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">باقة الاشتراك:</span>
              <span className="font-bold text-foreground">{plan.name || 'باقة محددة'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-foreground/60">قيمة الاشتراك:</span>
              <span className="font-bold text-primary font-mono">{sub.price || 0} ج.م</span>
            </div>
          </div>

          {/* Appointment & Timing Card */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
            <div className="font-bold text-primary flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4" />
              <span>توقيت الزيارة والمدة</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">تاريخ الموعد:</span>
              <span className="font-bold text-foreground font-mono">{visit.date}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">الوقت:</span>
              <span className="font-bold text-foreground font-mono">{visit.time}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">فترة البدء والانتهاء:</span>
              <span className="font-mono text-foreground">
                {visit.scheduledStart || visit.timeSlotStart} – {visit.scheduledEnd || 'نهاية الموعد'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-foreground/60">مدة الخدمة + الانتقال:</span>
              <span className="font-mono text-foreground font-bold">
                {visit.serviceDurationMinutes || 45} دقيقة + {visit.travelTimeMinutes || 15} دقيقة انتقال
              </span>
            </div>
          </div>

          {/* Technician & Assignment */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
            <div className="font-bold text-primary flex items-center gap-1.5 text-sm">
              <HardHat className="w-4 h-4" />
              <span>الفني المعين</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">اسم الفني:</span>
              <span className="font-bold text-foreground">{tech?.name || 'لم يتم التعيين بعد'}</span>
            </div>
            {tech?.phone && (
              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-foreground/60">رقم الفني:</span>
                <span className="font-mono font-bold text-foreground">{tech.phone}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-foreground/60">حالة التعيين:</span>
              <span className="font-bold text-foreground">
                {visit.assignedTechnicianId ? 'تم الإسناد بنجاح' : 'في انتظار التعيين'}
              </span>
            </div>
          </div>

          {/* Subscription Balance & Renewal */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
            <div className="font-bold text-primary flex items-center gap-1.5 text-sm">
              <RefreshCw className="w-4 h-4" />
              <span>رصيد الزيارات ودورة الاشتراك</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">رقم هذه الزيارة:</span>
              <span className="font-bold text-foreground">الزيارة رقم {visit.visitIndex || 1}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">إجمالي زيارات الاشتراك:</span>
              <span className="font-bold font-mono">{sub.totalVisits || 0} زيارات</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">الزيارات المستهلكة / المتبقية:</span>
              <span className="font-bold font-mono text-emerald-500">
                {sub.usedVisits || 0} منتهية / {sub.remainingVisits || 0} متبقية
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-foreground/60">التجديد التلقائي:</span>
              <span className="font-bold text-foreground">
                {sub.autoRenew ? 'مفعل (Auto-Renew Enabled)' : 'غير مفعل'}
              </span>
            </div>
          </div>

          {/* Cancellation & Rescheduling History */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
            <div className="font-bold text-primary flex items-center gap-1.5 text-sm">
              <Shield className="w-4 h-4" />
              <span>حالة الإلغاء والتعديل</span>
            </div>
            {visit.rescheduledFrom ? (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-1">
                <div className="font-bold">تمت إعادة الجدولة</div>
                <div className="text-[11px]">الموعد السابق: {visit.rescheduledFrom}</div>
                {visit.rescheduledAt && (
                  <div className="text-[10px] opacity-75 font-mono">
                    بتاريخ: {new Date(visit.rescheduledAt).toLocaleString('ar-SA')}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-foreground/60">إعادة الجدولة:</span>
                <span className="text-foreground/75">الموعد الأصلي لم يتغير</span>
              </div>
            )}

            {visit.status === 'cancelled' ? (
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-1">
                <div className="font-bold">الموعد ملغي</div>
                <div className="text-[11px]">السبب: {visit.cancellationReason || 'إلغاء الموعد'}</div>
                <div className="text-[10px] opacity-75">
                  بواسطة: {visit.cancellationSource === 'admin' ? 'الإدارة' : 'العميل'}
                </div>
              </div>
            ) : (
              <div className="flex justify-between py-1">
                <span className="text-foreground/60">حالة الإلغاء:</span>
                <span className="text-emerald-500 font-bold">غير ملغي (قائم)</span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle & Address details if present */}
        {(vehicle || address.area) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {vehicle && (
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50">
                <div className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-primary" />
                  <span>بيانات المركبة</span>
                </div>
                <div className="text-foreground/80 font-medium">
                  {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}{' '}
                  {vehicle.plateNumber && `| اللوحة: ${vehicle.plateNumber}`}{' '}
                  {vehicle.color && `| اللون: ${vehicle.color}`}
                </div>
              </div>
            )}
            {address.area && (
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50">
                <div className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>عنوان تقديم الخدمة</span>
                </div>
                <div className="text-foreground/80 font-medium">
                  {address.area} {address.street && `- شارع ${address.street}`}{' '}
                  {address.building && `- عمارة ${address.building}`}{' '}
                  {address.details && `(${address.details})`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Timeline */}
        {Array.isArray(visit.timeline) && visit.timeline.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              <span>سجل النشاط والتعديلات (Activity History)</span>
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-muted/20 border border-border/40 text-[11px]">
              {visit.timeline.map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 py-1 border-b border-border/10 last:border-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-foreground">{item.label || item.status}</div>
                    {item.description && <div className="text-foreground/60">{item.description}</div>}
                    <div className="text-[10px] text-foreground/40 font-mono mt-0.5">
                      {item.timestamp} {item.changedBy && `بواسطة: ${item.changedBy}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/40 text-xs">
          <Link
            href={`/admin/subscriptions/${visit.subscriptionId}`}
            className="px-4 py-2 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition flex items-center gap-1.5"
          >
            <span>فتح صفحة الاشتراك الكاملة</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-muted hover:bg-muted/80 text-foreground"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
