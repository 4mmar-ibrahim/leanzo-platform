'use client';

import React, { useState, useRef } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useOfferStore } from '@/store/useOfferStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { toast } from 'sonner';
import {
  normalizePhoneInput,
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
} from '@/lib/validation/phoneValidation';

interface QuickActionModalProps {
  type: 'service' | 'offer' | 'technician' | null;
  onClose: () => void;
}

export function QuickActionModal({ type, onClose }: QuickActionModalProps) {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  // Form states
  const [serviceTitle, setServiceTitle] = useState('');
  const [servicePrice, setServicePrice] = useState('250');
  const [serviceCategory, setServiceCategory] = useState<'car' | 'home'>('car');
  const [isSubmittingService, setIsSubmittingService] = useState(false);
  const isSubmittingServiceRef = useRef(false);

  const [offerCode, setOfferCode] = useState('');
  const [offerDiscount, setOfferDiscount] = useState('20');
  const [offerTitle, setOfferTitle] = useState('');

  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [techSpecialty, setTechSpecialty] = useState('تلميع وبخار سيارات');

  const addService = useServiceStore((s) => s.addService);
  const addOffer = useOfferStore((s) => s.addOffer);
  const addTechnician = useTechnicianStore((s) => s.addTechnician);

  if (!type) return null;

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle || isSubmittingServiceRef.current || isSubmittingService) return;

    isSubmittingServiceRef.current = true;
    setIsSubmittingService(true);

    try {
      await addService({
        category: serviceCategory,
        title: serviceTitle,
        titleEn: serviceTitle,
        shortDescription: 'خدمة جديدة مضافة من لوحة التحكم.',
        shortDescriptionEn: 'Newly created service from admin dashboard.',
        description: 'تفاصيل الخدمة الشاملة والميزات المتوفرة.',
        descriptionEn: 'Detailed service description.',
        image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
        price: Number(servicePrice) || 200,
        duration: 60,
        available: true,
        features: ['تنظيف احترافي', 'أجهزة معتمدة'],
        featuresEn: ['Professional service', 'Certified equipment'],
        inclusions: ['شامل المواد والتعقيم'],
        inclusionsEn: ['Includes materials and sanitization'],
      });

      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'إضافة خدمة جديدة',
        module: 'services',
        target: serviceTitle,
        details: `السعر: ${servicePrice} ج.م، التصنيف: ${serviceCategory}`,
      });

      toast.success('تمت إضافة الخدمة الجديدة وستظهر فوراً في موقع العملاء!');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'فشل إنشاء الخدمة');
    } finally {
      setIsSubmittingService(false);
      isSubmittingServiceRef.current = false;
    }
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle || !offerCode) return;

    addOffer({
      title: offerTitle,
      titleEn: offerTitle,
      description: `وفر ${offerDiscount}% عند استخدام الكود ${offerCode}`,
      descriptionEn: `Save ${offerDiscount}% with promo code ${offerCode}`,
      discountPercentage: Number(offerDiscount) || 10,
      code: offerCode.toUpperCase(),
      expiresAt: '2026-12-31',
      badge: `خصم ${offerDiscount}%`,
      badgeEn: `${offerDiscount}% OFF`,
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
      active: true,
    });

    addLog({
      adminName: currentAdmin?.name || 'Admin',
      adminRole: currentAdmin?.role || 'owner',
      action: 'إطلاق عرض ترويجي',
      module: 'offers',
      target: offerCode.toUpperCase(),
      details: `العنوان: ${offerTitle}، نسبة الخصم: ${offerDiscount}%`,
    });

    toast.success('تم إطلاق العرض بنجاح وسيظهر في صفحة العروض!');
    onClose();
  };

  const handleCreateTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName.trim()) {
      toast.error('يرجى إدخال اسم الفني');
      return;
    }

    const phoneVal = validateEgyptianPhone(techPhone);
    if (!phoneVal.isValid) {
      toast.error(phoneVal.message || CANONICAL_PHONE_ERROR_MESSAGE);
      return;
    }

    addTechnician({
      name: techName.trim(),
      phone: techPhone.trim(),
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
      specialty: techSpecialty,
      status: 'available',
      active: true,
      specialtiesList: ['car', 'home', 'steam'],
    });

    addLog({
      adminName: currentAdmin?.name || 'Admin',
      adminRole: currentAdmin?.role || 'owner',
      action: 'إضافة فني جديد',
      module: 'technicians',
      target: techName,
      details: `الهاتف: ${techPhone}، التخصص: ${techSpecialty}`,
    });

    toast.success('تمت إضافة الفني إلى طاقم العمل بنجاح!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#072540] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-[#133B61] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#133B61] bg-slate-50/80 dark:bg-[#041728]/70">
          <h3 className="text-sm font-black text-[#07345C] dark:text-white">
            {type === 'service' && 'إضافة خدمة جديدة إلى الكتالوج'}
            {type === 'offer' && 'إطلاق عرض ترويجي جديد'}
            {type === 'technician' && 'إضافة فني جديد لطاقم كلينزو'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ORDER FORM */}
        {type === 'service' && (
          <form onSubmit={handleCreateService} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">اسم الخدمة</label>
              <input
                type="text"
                required
                placeholder="مثال: تلميع شمعي نانو فائق"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">التصنيف</label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                >
                  <option value="car">خدمات السيارات (Car)</option>
                  <option value="home">خدمات المنازل (Home)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">السعر (ج.م)</label>
                <input
                  type="number"
                  required
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#133B61]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmittingService}
                className="px-4 py-2 text-xs font-black rounded-xl bg-[#0866C6] hover:bg-[#0652A0] text-white shadow-md shadow-[#0866C6]/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmittingService && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmittingService ? 'جارٍ النشر...' : 'نشر الخدمة'}</span>
              </button>
            </div>
          </form>
        )}

        {/* OFFER FORM */}
        {type === 'offer' && (
          <form onSubmit={handleCreateOffer} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">عنوان العرض</label>
              <input
                type="text"
                required
                placeholder="مثال: خصم بداية الشهر على غسيل السيارات"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">كود الخصم (Coupon)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: CLEAN25"
                  value={offerCode}
                  onChange={(e) => setOfferCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs uppercase rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] font-mono transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">نسبة الخصم (%)</label>
                <input
                  type="number"
                  required
                  value={offerDiscount}
                  onChange={(e) => setOfferDiscount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] font-mono transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#133B61]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-black rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              >
                تفعيل العرض
              </button>
            </div>
          </form>
        )}

        {/* TECHNICIAN FORM */}
        {type === 'technician' && (
          <form onSubmit={handleCreateTechnician} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">اسم الفني</label>
              <input
                type="text"
                required
                placeholder="مثال: كابتن حسام حسن"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  placeholder="010XXXXXXXX"
                  value={techPhone}
                  onChange={(e) => setTechPhone(normalizePhoneInput(e.target.value))}
                  style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'isolate' }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white font-mono text-left [direction:ltr] [unicode-bidi:isolate] focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">التخصص</label>
                <input
                  type="text"
                  required
                  value={techSpecialty}
                  onChange={(e) => setTechSpecialty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#133B61]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-black rounded-xl bg-[#0866C6] hover:bg-[#0652A0] text-white shadow-md shadow-[#0866C6]/20 transition-all cursor-pointer"
              >
                إضافة الفني
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
