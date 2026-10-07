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
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import { toast } from 'sonner';

export function StepReview() {
  const { t, locale } = useLocaleStore();
  const {
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
  } = useBookingStore();
  const user = useAuthStore((s) => s.user);
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
      const customerPhone = user?.phone || (selectedAddress as any)?.phone || '';
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

  const basePrice = getBasePrice();
  const discountAmount = getDiscountAmount();
  const serviceFee = getServiceFee();
  const finalPrice = getFinalPrice();

  return (
    <div className="space-y-6 text-start">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-sky-500" />
          <span>{t.booking.summaryTitle}</span>
        </h3>
        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-full">
          {isAr ? 'مراجعة الحجز وتأكيد الدفع' : 'Review & Confirm'}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Service & Schedule Box */}
        <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            {selectedService?.image ? (
              <img
                src={selectedService.image}
                alt={selectedService?.title}
                className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 overflow-hidden"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sky-500 shadow-xs shrink-0 overflow-hidden">
                <Sparkles className="w-6 h-6" />
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                {category === 'car' ? t.nav.carServices : t.nav.homeServices}
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {isAr ? selectedService?.title : selectedService?.titleEn}
              </h4>
              {selectedPackage ? (
                <p className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                  {isAr ? `الباقة: ${selectedPackage.name}` : `Package: ${selectedPackage.nameEn || selectedPackage.name}`}
                </p>
              ) : (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAr ? 'الباقة: بدون باقة (الخدمة الأساسية)' : 'Package: None (Base Service)'}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>
                  {isAr ? `المدة المتوقعة: ${getTotalDuration()} دقيقة` : `Est. Duration: ${getTotalDuration()} min`}
                </span>
              </p>
            </div>
          </div>

          {selectedAddons && selectedAddons.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {isAr ? 'الإضافات المختارة:' : 'Selected Add-ons:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedAddons.map((addon) => (
                  <span
                    key={addon.id}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  >
                    +{isAr ? addon.name : addon.nameEn || addon.name} ({addon.price} {isAr ? 'ج.م' : 'EGP'})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
              <span>
                {isAr ? 'التاريخ:' : 'Date:'}{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{selectedDate}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0866C6] shrink-0" />
              <span>
                {isAr ? 'الموعد:' : 'Time:'}{' '}
                <strong className="text-slate-900 dark:text-white font-mono">{selectedTime}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Address Box */}
        <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>{isAr ? 'موقع تقديم الخدمة' : 'Service Location'}</span>
          </div>

          {selectedAddress ? (
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">{selectedAddress.label}</p>
              <p>
                {selectedAddress.governorate} — {selectedAddress.city}
              </p>
              <p>{selectedAddress.area}</p>
              {(selectedAddress.building || selectedAddress.apartment) && (
                <p className="text-[11px] text-slate-400">
                  {[selectedAddress.building, selectedAddress.floor, selectedAddress.apartment]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <p>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'اسم العميل: ' : 'Customer: '}</span>
                  {guestName || user?.name || (isAr ? 'غير محدد' : 'N/A')}
                </p>
                <p>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'رقم الهاتف: ' : 'Phone: '}</span>
                  <span className="font-mono dir-ltr inline-block">{guestPhone || user?.phone || selectedAddress?.customerPhone || (isAr ? 'غير محدد' : 'N/A')}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-rose-500">{isAr ? 'لم يتم تحديد عنوان' : 'No address selected'}</p>
          )}
        </div>
      </div>

      {/* Prominent Coupon / Promo Code Box */}
      <div className="p-5 rounded-3xl border border-sky-200/70 dark:border-sky-900/50 bg-linear-to-r from-sky-50/40 via-white to-sky-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TicketPercent className="w-4 h-4 text-amber-500" />
            <span>{isAr ? 'هل لديك كوبون خصم؟' : 'Have a Discount Coupon?'}</span>
          </label>
          <span className="text-[10px] font-semibold text-slate-400">
            {isAr ? 'خصومات فورية معتمدة' : 'Instant Verified Discounts'}
          </span>
        </div>

        {promoCode && appliedCoupon ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 transition-all">
            <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="font-mono tracking-wider text-sm font-black">{promoCode}</span>
                <span className="mx-2 text-emerald-300 dark:text-emerald-700">|</span>
                <span>
                  {appliedCoupon.discountType === 'percentage'
                    ? `${appliedCoupon.discountValue}% ${isAr ? 'خصم مئوي' : 'OFF'}`
                    : `${appliedCoupon.discountValue} ${isAr ? 'ج.م خصم ثابت' : 'EGP OFF'}`}
                </span>
                <span className="inline-block text-[11px] bg-emerald-500 text-white px-2 py-0.5 rounded-md mr-2 font-bold shadow-xs">
                  {isAr ? `وفرت ${discountAmount} ج.م` : `Saved ${discountAmount} EGP`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemovePromo}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-2.5 py-1.5 transition-colors font-bold"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isAr ? 'إلغاء الكوبون' : 'Remove'}</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyPromo} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isAr ? 'أدخل كود الكوبون مثل: CLEANZO20' : 'Enter coupon e.g. CLEANZO20'}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                disabled={isApplying}
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono uppercase tracking-wider disabled:opacity-50 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <BadgePercent className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="md"
              disabled={isApplying || !inputCode.trim()}
              className="h-11 px-5 rounded-2xl text-xs font-black shadow-xs"
            >
              {isApplying ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
              ) : (
                <span>{isAr ? 'تطبيق الخصم' : 'Apply'}</span>
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Customer Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-900 dark:text-white">
          {isAr ? 'ملاحظات إضافية لفريق التنفيذ (اختياري)' : 'Additional Notes for the Crew (Optional)'}
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            isAr
              ? 'أي إرشادات خاصة بالدخول أو حالة السيارة أو أماكن محددة للتركيز عليها...'
              : 'Any gate codes, parking instructions, or special requests...'
          }
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
        />
      </div>

      {/* Authoritative Financial Breakdown Table (Phase 4 Itemized Display) */}
      {(() => {
        const pricing = getItemizedPricing();
        return (
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-xs">
            {/* Service or Package Row */}
            {selectedPackage ? (
              <>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>{isAr ? `سعر الباقة (${selectedPackage.name})` : `Package (${selectedPackage.nameEn || selectedPackage.name})`}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    {pricing.catalogDiscount > 0 && (
                      <span className="text-[11px] text-slate-400 line-through">
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
                    <span>{isAr ? 'وفّرت في الباقة' : 'Package Savings'}</span>
                    <span className="font-mono">
                      -{pricing.catalogDiscount} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>{pricing.catalogDiscount > 0 ? (isAr ? 'السعر الأصلي للخدمة' : 'Original Service Price') : t.booking.basePrice}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    {pricing.catalogDiscount > 0 && (
                      <span className="text-[11px] text-slate-400 line-through">
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
                    <span>
                      {isAr ? 'خصم الخدمة المباشر' : 'Direct Service Discount'}
                      {pricing.catalogDiscountPercent > 0 ? ` (${pricing.catalogDiscountPercent}%)` : ''}
                    </span>
                    <span className="font-mono">
                      -{pricing.catalogDiscount} {isAr ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Add-ons Rows */}
            {selectedAddons && selectedAddons.map((addon) => (
              <div key={addon.id} className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
                <span>+{isAr ? `إضافة: ${addon.name}` : `Add-on: ${addon.nameEn || addon.name}`}</span>
                <span className="font-bold font-mono">+{addon.price} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            ))}

            {/* Subtotal Row (displayed if add-ons or catalog discount exist) */}
            {(selectedAddons.length > 0 || pricing.catalogDiscount > 0) && (
              <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                  {pricing.subtotal} {isAr ? 'ج.م' : 'EGP'}
                </span>
              </div>
            )}

            {/* Coupon Discount Row */}
            {pricing.couponDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <TicketPercent className="w-3.5 h-3.5" />
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
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-black text-slate-900 dark:text-white block">
                  {t.booking.finalTotal}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isAr ? 'شامل ضريبة القيمة المضافة والمصاريف' : 'Inclusive of VAT and fees'}
                </span>
              </div>
              <PriceDisplay price={pricing.finalPrice} size="lg" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
