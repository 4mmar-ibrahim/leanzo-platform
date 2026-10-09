'use client';

import React, { useState } from 'react';
import {
  Tag,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Car,
  Home,
  CheckCircle,
  Loader2,
  TicketPercent,
  X,
  BadgePercent,
  Receipt,
  Layers,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useServiceStore } from '@/store/useServiceStore';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import { formatTimeTo12Hour } from '@/lib/timeUtils';
import { toast } from 'sonner';
import { resolveCategoryInfo } from '@/lib/services/categoryUtils';

export function StepReview() {
  const { t, locale } = useLocaleStore();
  const {
    selectedServices,
    selectedService,
    selectedPackage,
    selectedAddons,
    category,
    selectedDate,
    selectedTime,
    selectedAddress,
    notes,
    setNotes,
    promoCode,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    getBasePrice,
    getPackageBasePrice,
    getAddonsTotal,
    getTotalDuration,
    getDiscountAmount,
    getServiceFee,
    getFinalPrice,
    guestName,
    guestPhone,
    getItemizedPricing,
    getItemizedServicesList,
  } = useBookingStore();
  const user = useAuthStore((s) => s.user);
  const categories = useServiceStore((s) => s.categories);
  const isAr = locale === 'ar';

  const [inputCode, setInputCode] = useState(promoCode);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) {
      toast.error(isAr ? 'يرجى إدخال كود الكوبون' : 'Please enter coupon code');
      return;
    }

    setIsApplying(true);
    try {
      const customerPhone = user?.phone || (selectedAddress as any)?.customerPhone || guestPhone || '';
      const res = await applyCoupon(clean, customerPhone);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemovePromo = () => {
    removeCoupon();
    setInputCode('');
    toast.info(isAr ? 'تم إزالة كود الخصم' : 'Promo code removed');
  };

  const itemizedServices = getItemizedServicesList();
  const pricing = getItemizedPricing();
  const displayTime = formatTimeTo12Hour(selectedTime);

  return (
    <div className="space-y-3.5 sm:space-y-5 text-start">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
          <Receipt className="w-4 h-4 text-[#0866C6]" />
          <span>{t.booking.summaryTitle}</span>
        </h3>
        <span className="text-[10px] sm:text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-full">
          {isAr ? 'مراجعة وتأكيد' : 'Review & Confirm'}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Services & Schedule Box */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0866C6]" />
              <span>
                {isAr
                  ? `الخدمات المختارة (${itemizedServices.length})`
                  : `Selected Services (${itemizedServices.length})`}
              </span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-500" />
              <span>{getTotalDuration()} {isAr ? 'د' : 'min'}</span>
            </span>
          </div>

          {/* Itemized Services List */}
          <div className="space-y-1.5">
            {itemizedServices.map((item, idx) => (
              <div
                key={item.serviceId}
                className="p-2 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#0866C6] text-white">
                        #{idx + 1}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">
                        {isAr ? item.title : item.titleEn}
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                        {resolveCategoryInfo(item.category, categories, isAr).name}
                      </span>
                    </div>

                    {item.selectedPackage ? (
                      <p className="text-[10px] sm:text-[11px] font-bold text-[#0866C6] dark:text-sky-400 mt-0.5">
                        {isAr ? `الباقة: ${item.selectedPackage.name}` : `Package: ${item.selectedPackage.nameEn || item.selectedPackage.name}`}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {isAr ? 'الخدمة الأساسية' : 'Standard Service'}
                      </p>
                    )}
                  </div>

                  <div className="text-end shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {item.itemSubtotal} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      {item.durationMinutes} {isAr ? 'د' : 'min'}
                    </span>
                  </div>
                </div>

                {/* Addons for this service */}
                {item.selectedAddons && item.selectedAddons.length > 0 && (
                  <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-1">
                    {item.selectedAddons.map((addon) => (
                      <span
                        key={addon.id}
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      >
                        +{isAr ? addon.name : addon.nameEn || addon.name} ({addon.price} {isAr ? 'ج.م' : 'E'})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Schedule Row */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="font-mono font-semibold text-slate-900 dark:text-white">{selectedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
              <span className="font-mono font-semibold text-slate-900 dark:text-white">{displayTime}</span>
            </div>
          </div>
        </div>

        {/* Address Box */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>{isAr ? 'موقع تقديم الخدمة' : 'Service Location'}</span>
          </div>

          {selectedAddress ? (
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">{selectedAddress.label}</p>
              <p className="text-[11px] text-slate-500">
                {selectedAddress.governorate} — {selectedAddress.city} — {selectedAddress.area}
              </p>
              {(selectedAddress.building || selectedAddress.apartment) && (
                <p className="text-[10px] text-slate-400">
                  {[selectedAddress.building, selectedAddress.floor, selectedAddress.apartment]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{guestName || user?.name || (isAr ? 'عميل كلينزو' : 'Customer')}</span>
                <span className="font-mono dir-ltr">{guestPhone || user?.phone || selectedAddress?.customerPhone || ''}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-rose-500">{isAr ? 'لم يتم تحديد عنوان' : 'No address selected'}</p>
          )}
        </div>
      </div>

      {/* Prominent Coupon / Promo Code Box */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-sky-200/70 dark:border-sky-900/50 bg-gradient-to-r from-sky-50/40 via-white to-sky-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <TicketPercent className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'كوبون الخصم' : 'Discount Coupon'}</span>
          </label>
        </div>

        {promoCode && appliedCoupon ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 transition-all text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-mono tracking-wider font-black">{promoCode}</span>
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-md font-bold">
                {isAr ? `وفرت ${pricing.couponDiscount} ج.م` : `Saved ${pricing.couponDiscount} EGP`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemovePromo}
              className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg font-bold cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Remove'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyPromo} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isAr ? 'أدخل كود الكوبون' : 'Enter coupon'}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                disabled={isApplying}
                className="w-full h-9 sm:h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono uppercase tracking-wider disabled:opacity-50 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <BadgePercent className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 sm:top-3 pointer-events-none" />
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={isApplying || !inputCode.trim()}
              className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-black shadow-2xs cursor-pointer"
            >
              {isApplying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
              ) : (
                <span>{isAr ? 'تطبيق' : 'Apply'}</span>
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Customer Notes */}
      <div className="space-y-1">
        <label className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">
          {isAr ? 'ملاحظات لفريق التنفيذ (اختياري)' : 'Notes for Crew (Optional)'}
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            isAr
              ? 'أي إرشادات خاصة بالدخول أو أماكن محددة للتركيز عليها...'
              : 'Any special gate instructions or requests...'
          }
          className="w-full rounded-xl border border-[#DDE7EC] dark:border-[#133B61] bg-white dark:bg-[#051C30] p-2.5 text-xs text-[#162631] dark:text-[#F6F8FA] placeholder:text-[#60717C] focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]/20 focus:border-[#0866C6] font-sans"
        />
      </div>

      {/* Authoritative Financial Breakdown Table */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#F6F8FA] dark:bg-[#072540] border border-[#DDE7EC] dark:border-[#133B61] space-y-2 shadow-2xs font-sans">
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>{isAr ? 'سعر الخدمات الأساسي' : 'Base Services Price'}</span>
          <div className="flex items-center gap-1 font-mono">
            {pricing.catalogDiscount > 0 && (
              <span className="text-[10px] text-slate-400 line-through">
                {pricing.baseOriginalPrice} {isAr ? 'ج.م' : 'EGP'}
              </span>
            )}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {pricing.baseSellingPrice} {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>
        </div>

        {pricing.catalogDiscount > 0 && (
          <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>{isAr ? 'خصم العرض المباشر' : 'Catalog Savings'}</span>
            <span className="font-mono">
              -{pricing.catalogDiscount} {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>
        )}

        {pricing.addonsTotal > 0 && (
          <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold">
            <span>{isAr ? 'إجمالي الإضافات' : 'Add-ons'}</span>
            <span className="font-bold font-mono">+{pricing.addonsTotal} {isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        )}

        {/* Subtotal */}
        <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
          <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
          <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
            {pricing.subtotal} {isAr ? 'ج.م' : 'EGP'}
          </span>
        </div>

        {/* Coupon Discount Row */}
        {pricing.couponDiscount > 0 && (
          <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="flex items-center gap-1">
              <TicketPercent className="w-3 h-3" />
              <span>
                {t.booking.discount}
                {promoCode ? ` (${promoCode})` : ''}
              </span>
            </span>
            <span className="font-mono">-{pricing.couponDiscount} {isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        )}

        {/* Fees */}
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>{t.booking.serviceFee}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {pricing.serviceFee > 0 ? `${pricing.serviceFee} ${isAr ? 'ج.م' : 'EGP'}` : t.booking.free}
          </span>
        </div>

        {/* Final Total */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
          <div>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
              {t.booking.finalTotal}
            </span>
            <span className="text-[9px] text-slate-400">
              {isAr ? 'شامل الضريبة والمصاريف' : 'VAT inclusive'}
            </span>
          </div>
          <PriceDisplay price={pricing.finalPrice} size="md" />
        </div>
      </div>
    </div>
  );
}
