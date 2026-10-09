'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  Sliders,
  DollarSign,
  Calendar,
  Clock,
  ShieldCheck,
  Check,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/api';
import { toast } from 'sonner';
import { MediaUploadZone } from '@/components/media/MediaUploadZone';
import { SubscriptionServiceSelector } from '@/components/admin/subscriptions/SubscriptionServiceSelector';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { useServiceStore } from '@/store/useServiceStore';

interface IPlan {
  id: string;
  name: string;
  description: string;
  image?: string;
  serviceId: string;
  visitCount: number;
  price: number;
  duration: number;
  status: string;
  allowRenewal: boolean;
  allowCancellation: boolean;
  allowRescheduling: boolean;
  cancellationNoticeHours: number;
  rescheduleNoticeHours: number;
  cashbackPercentage: number;
  terms?: string;
  service?: {
    id: string;
    title: string;
    category: string;
    image?: string;
  };
  _count?: {
    subscriptions: number;
  };
}

export default function AdminSubscriptionPlansPage() {
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<IPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    serviceId: '',
    visitCount: 4,
    price: 500,
    duration: 30,
    status: 'active',
    allowRenewal: true,
    allowCancellation: true,
    allowRescheduling: true,
    cancellationNoticeHours: 12,
    rescheduleNoticeHours: 12,
    cashbackPercentage: 5,
    terms: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansResult, servicesResult] = await Promise.allSettled([
        apiGet('/subscriptions/plans/admin'),
        apiGet('/services'),
      ]);

      // Plans
      if (plansResult.status === 'fulfilled') {
        const plansRes = plansResult.value;
        const rawPlans = Array.isArray(plansRes.data)
          ? plansRes.data
          : plansRes.data?.plans || [];
        setPlans(rawPlans);
      } else {
        console.warn('Failed to fetch subscription plans:', plansResult.reason);
      }

      // Services
      let fetchedServices: any[] = [];
      if (servicesResult.status === 'fulfilled') {
        const servicesRes = servicesResult.value;
        fetchedServices = Array.isArray(servicesRes.data)
          ? servicesRes.data
          : servicesRes.data?.services || servicesRes.data?.data || [];
      }

      if (fetchedServices.length === 0) {
        try {
          const fallback = await apiGet('/services/admin/all');
          fetchedServices = Array.isArray(fallback.data)
            ? fallback.data
            : fallback.data?.services || fallback.data?.data || [];
        } catch {
          // Admin endpoint failed, fallback to store
        }
      }

      if (fetchedServices.length === 0) {
        try {
          const storeServices = useServiceStore.getState().services;
          if (storeServices && storeServices.length > 0) {
            fetchedServices = storeServices;
          } else {
            const adminSvcs = await useServiceStore.getState().fetchAdminServices();
            if (adminSvcs && adminSvcs.length > 0) {
              fetchedServices = adminSvcs;
            }
          }
        } catch {
          // Store fetch failed
        }
      }

      setServices(fetchedServices);
    } catch (err: any) {
      toast.error(err.message || 'فشل تحميل بيانات باقات الاشتراك');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      serviceId: services[0]?.id || '',
      visitCount: 4,
      price: 500,
      duration: 30,
      status: 'active',
      allowRenewal: true,
      allowCancellation: true,
      allowRescheduling: true,
      cancellationNoticeHours: 12,
      rescheduleNoticeHours: 12,
      cashbackPercentage: 5,
      terms: 'تطبق الشروط والأحكام العامة لخدمات كلينزو.',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: IPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      image: (plan as any).image || '',
      serviceId: plan.serviceId,
      visitCount: plan.visitCount,
      price: plan.price,
      duration: plan.duration,
      status: plan.status,
      allowRenewal: plan.allowRenewal,
      allowCancellation: plan.allowCancellation,
      allowRescheduling: plan.allowRescheduling,
      cancellationNoticeHours: plan.cancellationNoticeHours || 12,
      rescheduleNoticeHours: plan.rescheduleNoticeHours || 12,
      cashbackPercentage: plan.cashbackPercentage || 0,
      terms: plan.terms || '',
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (plan: IPlan) => {
    try {
      await apiPatch(`/subscriptions/plans/${plan.id}/status`, {});
      toast.success('تم تغيير حالة الباقة بنجاح');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'فشل تغيير حالة الباقة');
    }
  };

  const handleDeletePlan = async (plan: IPlan) => {
    if (!confirm(`هل أنت متأكد من حذف الباقة "${plan.name}"؟`)) return;
    try {
      await apiDelete(`/subscriptions/plans/${plan.id}`);
      toast.success('تم حذف الباقة بنجاح');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'فشل حذف الباقة (قد تكون مرتبطة باشتراكات قائمة)');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.serviceId || formData.visitCount < 1 || formData.price < 0) {
      toast.error('يرجى التأكد من ملء جميع الحقول الإلزامية بشكل صحيح');
      return;
    }

    try {
      setSubmitting(true);
      if (editingPlan) {
        await apiPut(`/subscriptions/plans/${editingPlan.id}`, formData);
        toast.success('تم تحديث الباقة بنجاح');
      } else {
        await apiPost('/subscriptions/plans', formData);
        toast.success('تم إنشاء باقة الاشتراك بنجاح');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ الباقة');
    } finally {
      setSubmitting(false);
    }
  };

  const plansList: IPlan[] = Array.isArray(plans) ? plans : (plans as any)?.plans || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/subscriptions" className="text-xs text-foreground/60 hover:text-primary flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الاشتراكات
            </Link>
            <span className="text-foreground/40">/</span>
            <span className="text-xs text-foreground/80">الباقات</span>
          </div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            باقات الاشتراكات الشهرية
          </h1>
          <p className="text-xs text-foreground/60 mt-1">
            إدارة وتخصيص باقات الغسيل الشهري، الأسعار، شروط الإلغاء ونسب الكاش باك
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة باقة جديدة
        </button>
      </div>

      {/* Grid of Plans */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-xs text-foreground/60">جاري تحميل الباقات...</p>
        </div>
      ) : plansList.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/50 rounded-2xl p-8">
          <Layers className="w-12 h-12 text-primary/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">لا توجد باقات اشتراك بعد</h3>
          <p className="text-xs text-foreground/60 max-w-sm mx-auto mt-1 mb-6">
            قم بإنشاء باقة اشتراك شهرية جديدة وربطها بإحدى خدمات كلينزو لتمكين العملاء من الاشتراك.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white"
          >
            <Plus className="w-4 h-4" />
            إضافة أول باقة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plansList.map((plan: IPlan) => {
            const isActive = plan.status === 'active';
            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 bg-card border transition-all duration-200 flex flex-col justify-between ${
                  isActive ? 'border-border/60 hover:border-primary/50 shadow-sm' : 'border-rose-500/30 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-xs bg-muted shrink-0">
                        {plan.image || plan.service?.image ? (
                          <CleanzoImage
                            src={plan.image || plan.service?.image || ''}
                            alt={plan.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                            <Sparkles className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                        }`}>
                          {isActive ? 'نشطة للعملاء' : 'معطلة'}
                        </span>
                        <h3 className="text-base font-black text-foreground mt-1.5">{plan.name}</h3>
                        <div className="text-xs text-primary font-semibold mt-0.5">
                          {plan.service?.title || 'خدمة غير محددة'}
                        </div>
                      </div>
                    </div>
                    <div className="text-left font-mono shrink-0">
                      <div className="text-xl font-black text-primary">{plan.price}</div>
                      <div className="text-[10px] text-foreground/50">ريال / {plan.duration} يوم</div>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/60 line-clamp-2 mb-4 leading-relaxed">
                    {plan.description || 'لا يوجد وصف مخصص للباقة.'}
                  </p>

                  <div className="space-y-2 border-t border-border/40 pt-3 text-xs text-foreground/75">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground/60">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> عدد الزيارات الشهري:
                      </span>
                      <span className="font-bold font-mono">{plan.visitCount} زيارات</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground/60">
                        <Clock className="w-3.5 h-3.5 text-primary" /> مهلة الإلغاء المسبق:
                      </span>
                      <span className="font-bold font-mono">{plan.cancellationNoticeHours || 12} ساعة</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground/60">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" /> مهلة إعادة الجدولة:
                      </span>
                      <span className="font-bold font-mono">{plan.rescheduleNoticeHours || 12} ساعة</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground/60">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> نسبة الكاش باك:
                      </span>
                      <span className="font-bold font-mono text-emerald-500">%{plan.cashbackPercentage || 0}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground/60">
                        <Layers className="w-3.5 h-3.5 text-primary" /> عدد المشتركين:
                      </span>
                      <span className="font-bold font-mono">{plan._count?.subscriptions || 0} مشترك</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-4 mt-5">
                  <button
                    onClick={() => handleToggleStatus(plan)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-muted hover:bg-rose-500/10 text-foreground/70 hover:text-rose-500'
                        : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isActive ? 'تعطيل' : 'تفعيل'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 text-foreground/70 hover:text-primary transition"
                      title="تعديل الباقة"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan)}
                      className="p-1.5 rounded-lg bg-muted hover:bg-rose-500/10 text-foreground/70 hover:text-rose-500 transition"
                      title="حذف الباقة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 shadow-2xl my-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {editingPlan ? 'تعديل باقة الاشتراك' : 'إنشاء باقة اشتراك جديدة'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-foreground/40 hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Plan Image: Upload from Device OR Image URL (TASK 01) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-muted/30 border border-border/60">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground/80 flex items-center gap-1.5 text-xs">
                    <Upload className="w-4 h-4 text-primary" />
                    <span>صورة باقة الاشتراك (Upload / URL)</span>
                  </label>
                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="text-[11px] text-rose-500 hover:underline font-bold"
                    >
                      إزالة الصورة
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Circular Preview (TASK 01) */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-800 shadow-md bg-muted flex items-center justify-center">
                      {formData.image ? (
                        <CleanzoImage
                          src={formData.image}
                          alt="Plan preview"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="text-foreground/40 text-[10px] text-center px-1 font-semibold">
                          معاينة دائرية
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-foreground/50 font-mono">1:1 Circular</span>
                  </div>

                  {/* Media Upload Zone */}
                  <div className="flex-1 w-full">
                    <MediaUploadZone
                      value={formData.image}
                      onChange={(url) => setFormData({ ...formData, image: url })}
                      accept="image"
                      placeholder="اختر صورة من جهازك أو أدخل رابط مباشر للصورة..."
                    />
                  </div>
                </div>
              </div>

              {/* Service Selector Component (TASK 08, 09, 10, 11) */}
              <SubscriptionServiceSelector
                services={services}
                selectedServiceId={formData.serviceId}
                onSelectService={(s) => setFormData({ ...formData, serviceId: s.id })}
              />

              <div className="space-y-1">
                <label className="font-bold text-foreground/70">اسم الباقة *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: باقة كلينزو بلس"
                  className="w-full p-2.5 rounded-xl bg-background border border-border"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground/70">عدد الزيارات شهرياً *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.visitCount}
                    onChange={(e) => setFormData({ ...formData, visitCount: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground/70">السعر الشهري (ريال) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground/70">صلاحية الباقة (أيام) *</label>
                  <input
                    type="number"
                    min={7}
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground/70">مهلة الإلغاء (ساعات) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.cancellationNoticeHours}
                    onChange={(e) => setFormData({ ...formData, cancellationNoticeHours: parseInt(e.target.value) || 12 })}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground/70">مهلة إعادة الجدولة (ساعات) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.rescheduleNoticeHours}
                    onChange={(e) => setFormData({ ...formData, rescheduleNoticeHours: parseInt(e.target.value) || 12 })}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground/70">نسبة الكاش باك (%) *</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.cashbackPercentage}
                    onChange={(e) => setFormData({ ...formData, cashbackPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground/70">الوصف الترويجي للباقة</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مميزات الباقة وتفاصيل ما يحصل عليه العميل..."
                  className="w-full p-2.5 rounded-xl bg-background border border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground/70">الشروط والأحكام الخاصة بالباقة</label>
                <textarea
                  rows={2}
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="الشروط الخاصة بالإلغاء والتجديد..."
                  className="w-full p-2.5 rounded-xl bg-background border border-border"
                />
              </div>

              {/* Independent Policy Toggles (TASK 02) */}
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2.5">
                <div className="font-bold text-foreground/80 text-xs">إعدادات وسياسات الباقة المستقلة (Plan Settings)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/50 transition">
                    <div>
                      <div className="font-bold text-xs">التجديد التلقائي</div>
                      <div className="text-[10px] text-foreground/50">
                        {formData.allowRenewal ? 'مفعل (ON)' : 'معطل (OFF)'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.allowRenewal}
                      onChange={(e) => setFormData({ ...formData, allowRenewal: e.target.checked })}
                      className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/50 transition">
                    <div>
                      <div className="font-bold text-xs">إلغاء الزيارات</div>
                      <div className="text-[10px] text-foreground/50">
                        {formData.allowCancellation ? 'مسموح (ON)' : 'محظور (OFF)'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.allowCancellation}
                      onChange={(e) => setFormData({ ...formData, allowCancellation: e.target.checked })}
                      className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/50 transition">
                    <div>
                      <div className="font-bold text-xs">إعادة الجدولة</div>
                      <div className="text-[10px] text-foreground/50">
                        {formData.allowRescheduling ? 'مسموح (ON)' : 'محظور (OFF)'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.allowRescheduling}
                      onChange={(e) => setFormData({ ...formData, allowRescheduling: e.target.checked })}
                      className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold bg-muted hover:bg-muted/80 text-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : editingPlan ? 'حفظ التعديلات' : 'إنشاء الباقة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
