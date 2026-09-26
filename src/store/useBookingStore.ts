'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Service, ServicePackage, ServiceAddon, ServiceCategory, Address, CouponDiscountType } from '@/types';
import { useServiceStore } from '@/store/useServiceStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

export interface AppliedCouponState {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  actualDiscountAmount: number;
  originalPrice: number;
  finalPrice: number;
}

interface BookingState {
  category: ServiceCategory;
  selectedService: Service | null;
  selectedPackage: ServicePackage | null;
  selectedAddons: ServiceAddon[];
  selectedDate: string;
  selectedTime: string;
  selectedAddress: Address | null;
  notes: string;
  currentStep: number;
  promoCode: string;
  appliedCoupon: AppliedCouponState | null;
  guestName: string;
  guestPhone: string;

  setCategory: (cat: ServiceCategory) => void;
  selectService: (service: Service) => void;
  selectServiceById: (serviceId: string) => void;
  selectPackage: (pkg: ServicePackage | null) => void;
  toggleAddon: (addon: ServiceAddon) => void;
  clearAddons: () => void;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setAddress: (address: Address) => void;
  setNotes: (notes: string) => void;
  setStep: (step: number) => void;
  setGuestInfo: (name: string, phone: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  applyCoupon: (
    code: string,
    customerPhone?: string
  ) => Promise<{ success: boolean; message: string; discountAmount: number }>;
  removeCoupon: () => void;
  // Legacy aliases
  applyPromoCode: (code: string) => Promise<{ success: boolean; message: string; discountPercent: number }>;
  removePromoCode: () => void;
  resetBooking: () => void;

  // Computed pricing & duration getters (Authoritative)
  getBasePrice: () => number;
  getPackageBasePrice: () => number;
  getAddonsTotal: () => number;
  getTotalDuration: () => number;
  getDiscountAmount: () => number;
  getServiceFee: () => number;
  getFinalPrice: () => number;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      category: 'car',
      selectedService: null,
      selectedPackage: null,
      selectedAddons: [],
      selectedDate: '',
      selectedTime: '',
      selectedAddress: null,
      notes: '',
      currentStep: 1,
      promoCode: '',
      appliedCoupon: null,
      guestName: '',
      guestPhone: '',

      setGuestInfo: (name, phone) => set({ guestName: name, guestPhone: phone }),

      setCategory: (cat) => {
        const prevCategory = get().category;
        const currentService = get().selectedService;
        set({ category: cat });
        // If category changed or the currently selected service doesn't belong to the new category,
        // strictly clear downstream state! No auto-selection.
        if (prevCategory !== cat || (currentService && currentService.category !== cat)) {
          set({
            selectedService: null,
            selectedPackage: null,
            selectedAddons: [],
            selectedDate: '',
            selectedTime: '',
            appliedCoupon: null,
            promoCode: '',
          });
        }
      },

      selectService: (service) => {
        if (!service || service.available === false || (service as any).isArchived || (service as any).active === false) {
          set({
            selectedService: null,
            selectedPackage: null,
            selectedAddons: [],
            appliedCoupon: null,
            promoCode: '',
          });
          return;
        }
        // Packages are strictly OPTIONAL alternative pricing tiers: default to null (base service active)
        set({
          selectedService: service,
          selectedPackage: null,
          selectedAddons: [],
          category: service.category,
          appliedCoupon: null,
          promoCode: '',
        });
      },

      selectServiceById: (serviceId) => {
        const allServices = useServiceStore.getState().services || [];
        const found = allServices.find(
          (s) => s.id === serviceId && s.available !== false && !(s as any).isArchived
        );
        if (found) {
          get().selectService(found);
        }
      },

      selectPackage: (pkg) => {
        set({ selectedPackage: pkg, appliedCoupon: null, promoCode: '' });
      },

      toggleAddon: (addon) => {
        const current = get().selectedAddons || [];
        const exists = current.some((a) => a.id === addon.id);
        const updated = exists ? current.filter((a) => a.id !== addon.id) : [...current, addon];
        set({ selectedAddons: updated, appliedCoupon: null, promoCode: '' });
      },

      clearAddons: () => {
        set({ selectedAddons: [], appliedCoupon: null, promoCode: '' });
      },

      setDate: (date) => set({ selectedDate: date }),
      setTime: (time) => set({ selectedTime: time }),
      setAddress: (address) => set({ selectedAddress: address }),
      setNotes: (notes) => set({ notes }),
      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

      applyCoupon: async (code, customerPhone) => {
        try {
          const totalAmount = get().getBasePrice();
          const sId = get().selectedService?.id;

          const res = await cleanzoApi.coupons.validate({
            code,
            basePrice: totalAmount,
            customerPhone,
            serviceId: sId,
          });

          if (!res || !res.code) {
            set({ appliedCoupon: null, promoCode: '' });
            return {
              success: false,
              message: 'كود الكوبون غير صالح',
              discountAmount: 0,
            };
          }

          set({
            promoCode: res.code,
            appliedCoupon: {
              code: res.code,
              discountType: res.discountType,
              discountValue: res.discountValue,
              actualDiscountAmount: res.actualDiscountAmount,
              originalPrice: totalAmount,
              finalPrice: Math.max(0, totalAmount - res.actualDiscountAmount),
            },
          });

          return {
            success: true,
            message: `تم تطبيق الكوبون (${res.code}) بنجاح! خصم ${res.actualDiscountAmount} ج.م`,
            discountAmount: res.actualDiscountAmount,
          };
        } catch (err: any) {
          set({ appliedCoupon: null, promoCode: '' });
          return {
            success: false,
            message: err?.message || 'كود الكوبون غير صالح أو منتهي الصلاحية',
            discountAmount: 0,
          };
        }
      },

      removeCoupon: () => {
        set({ promoCode: '', appliedCoupon: null });
      },

      applyPromoCode: async (code) => {
        const res = await get().applyCoupon(code);
        return {
          success: res.success,
          message: res.message,
          discountPercent: 0,
        };
      },

      removePromoCode: () => {
        get().removeCoupon();
      },

      resetBooking: () => {
        set({
          category: 'car',
          selectedService: null,
          selectedPackage: null,
          selectedAddons: [],
          selectedDate: '',
          selectedTime: '',
          selectedAddress: null,
          notes: '',
          currentStep: 1,
          promoCode: '',
          appliedCoupon: null,
          guestName: '',
          guestPhone: '',
        });
      },

      getPackageBasePrice: () => {
        const pkg = get().selectedPackage;
        if (pkg) return Number(pkg.price) || 0;
        return Number(get().selectedService?.price) || 0;
      },

      getAddonsTotal: () => {
        const addons = get().selectedAddons || [];
        return addons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
      },

      getBasePrice: () => {
        return get().getPackageBasePrice() + get().getAddonsTotal();
      },

      getTotalDuration: () => {
        const pkg = get().selectedPackage;
        const s = get().selectedService;
        const baseDuration =
          pkg && Number(pkg.durationMinutes) > 0
            ? Number(pkg.durationMinutes)
            : Number(s?.serviceDurationMinutes || s?.duration) || 45;
        const addonsDuration = (get().selectedAddons || []).reduce(
          (sum, a) => sum + (Number(a.durationMinutes) || 0),
          0
        );
        return baseDuration + addonsDuration;
      },

      getDiscountAmount: () => {
        const applied = get().appliedCoupon;
        if (applied) {
          return applied.actualDiscountAmount;
        }
        // Direct catalog discount if no package selected
        const pkg = get().selectedPackage;
        if (!pkg) {
          const s = get().selectedService;
          if (s?.discount && s.discount > 0) {
            const base = Number(s.price) || 0;
            return Math.round((base * s.discount) / 100);
          }
        }
        return 0;
      },

      getServiceFee: () => {
        return 0; // Free transport promo
      },

      getFinalPrice: () => {
        const base = get().getBasePrice();
        const discount = get().getDiscountAmount();
        const fee = get().getServiceFee();
        return Math.max(0, base - discount + fee);
      },
    }),
    {
      name: 'cleanzo-booking-draft',
    }
  )
);
