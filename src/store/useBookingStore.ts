'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Service, ServicePackage, ServiceAddon, ServiceCategory, Address, CouponDiscountType } from '@/types';
import { useServiceStore } from '@/store/useServiceStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { calculateItemizedPricing, ItemizedPricingCalculation } from '@/lib/pricing';

export interface AppliedCouponState {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  actualDiscountAmount: number;
  originalPrice: number;
  finalPrice: number;
}

export interface SelectedServiceItem {
  service: Service;
  selectedPackage: ServicePackage | null;
  selectedAddons: ServiceAddon[];
}

export interface ItemizedServiceBreakdown {
  serviceId: string;
  title: string;
  titleEn: string;
  category: ServiceCategory;
  image: string;
  baseOriginalPrice: number;
  baseSellingPrice: number;
  catalogDiscount: number;
  selectedPackage: ServicePackage | null;
  selectedAddons: ServiceAddon[];
  addonsTotal: number;
  durationMinutes: number;
  itemSubtotal: number;
  itemOriginalTotal: number;
}

interface BookingState {
  category: ServiceCategory;
  selectedServices: SelectedServiceItem[];
  // Legacy aliases synced to selectedServices[0] for backward compatibility
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
  // Multi-service actions
  addService: (service: Service) => void;
  removeService: (serviceId: string) => void;
  toggleService: (service: Service) => void;
  isServiceSelected: (serviceId: string) => boolean;
  selectPackageForService: (serviceId: string, pkg: ServicePackage | null) => void;
  toggleAddonForService: (serviceId: string, addon: ServiceAddon) => void;
  clearServices: () => void;

  // Single-service backward compatible aliases
  selectService: (service: Service) => void;
  selectServiceById: (serviceId: string) => void;
  selectPackage: (pkg: ServicePackage | null) => void;
  toggleAddon: (addon: ServiceAddon) => void;
  clearAddons: () => void;

  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setAddress: (address: Address | null) => void;
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
  applyPromoCode: (code: string) => Promise<{ success: boolean; message: string; discountPercent: number }>;
  removePromoCode: () => void;
  resetBooking: () => void;
  startNewBooking: (cat?: ServiceCategory) => void;
  clearCustomerInfo: () => void;

  // Computed pricing & duration getters (Authoritative)
  getBasePrice: () => number;
  getPackageBasePrice: () => number;
  getOriginalPrice: () => number;
  getCatalogSavings: () => number;
  getAddonsTotal: () => number;
  getTotalDuration: () => number;
  getDiscountAmount: () => number;
  getServiceFee: () => number;
  getFinalPrice: () => number;
  getItemizedPricing: () => ItemizedPricingCalculation;
  getItemizedServicesList: () => ItemizedServiceBreakdown[];
}

function syncLegacy(items: SelectedServiceItem[]) {
  const primary = items[0] || null;
  return {
    selectedServices: items,
    selectedService: primary ? primary.service : null,
    selectedPackage: primary ? primary.selectedPackage : null,
    selectedAddons: primary ? primary.selectedAddons : [],
  };
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      category: 'car',
      selectedServices: [],
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
        // Switching category tabs allows browsing other services without clearing chosen services
        set({ category: cat });
      },

      addService: (service) => {
        if (!service || service.available === false || (service as any).isArchived || (service as any).active === false) {
          return;
        }
        const current = get().selectedServices || [];
        if (current.some((item) => item.service.id === service.id)) {
          return; // already added
        }
        const updated = [...current, { service, selectedPackage: null, selectedAddons: [] }];
        set({
          ...syncLegacy(updated),
          appliedCoupon: null,
          promoCode: '',
        });
      },

      removeService: (serviceId) => {
        const current = get().selectedServices || [];
        const updated = current.filter((item) => item.service.id !== serviceId);
        set({
          ...syncLegacy(updated),
          appliedCoupon: null,
          promoCode: '',
        });
      },

      toggleService: (service) => {
        if (!service || service.available === false || (service as any).isArchived || (service as any).active === false) {
          return;
        }
        const current = get().selectedServices || [];
        const exists = current.some((item) => item.service.id === service.id);
        if (exists) {
          get().removeService(service.id);
        } else {
          get().addService(service);
        }
      },

      isServiceSelected: (serviceId) => {
        const current = get().selectedServices || [];
        return current.some((item) => item.service.id === serviceId);
      },

      selectPackageForService: (serviceId, pkg) => {
        const current = get().selectedServices || [];
        const updated = current.map((item) => {
          if (item.service.id === serviceId) {
            return { ...item, selectedPackage: pkg };
          }
          return item;
        });
        set({
          ...syncLegacy(updated),
          appliedCoupon: null,
          promoCode: '',
        });
      },

      toggleAddonForService: (serviceId, addon) => {
        const current = get().selectedServices || [];
        const updated = current.map((item) => {
          if (item.service.id === serviceId) {
            const hasAddon = item.selectedAddons.some((a) => a.id === addon.id);
            const newAddons = hasAddon
              ? item.selectedAddons.filter((a) => a.id !== addon.id)
              : [...item.selectedAddons, addon];
            return { ...item, selectedAddons: newAddons };
          }
          return item;
        });
        set({
          ...syncLegacy(updated),
          appliedCoupon: null,
          promoCode: '',
        });
      },

      clearServices: () => {
        set({
          selectedServices: [],
          selectedService: null,
          selectedPackage: null,
          selectedAddons: [],
          selectedDate: '',
          selectedTime: '',
          currentStep: 1,
          appliedCoupon: null,
          promoCode: '',
        });
      },

      // Single-service backward compatible aliases
      selectService: (service) => {
        if (!service || service.available === false || (service as any).isArchived || (service as any).active === false) {
          get().clearServices();
          return;
        }
        const updated = [{ service, selectedPackage: null, selectedAddons: [] }];
        set({
          category: service.category,
          ...syncLegacy(updated),
          currentStep: 1,
          selectedDate: '',
          selectedTime: '',
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
        const current = get().selectedServices;
        if (current.length > 0) {
          get().selectPackageForService(current[0].service.id, pkg);
        } else {
          set({ selectedPackage: pkg, appliedCoupon: null, promoCode: '' });
        }
      },

      toggleAddon: (addon) => {
        const current = get().selectedServices;
        if (current.length > 0) {
          get().toggleAddonForService(current[0].service.id, addon);
        } else {
          const legacyAddons = get().selectedAddons || [];
          const exists = legacyAddons.some((a) => a.id === addon.id);
          const updated = exists ? legacyAddons.filter((a) => a.id !== addon.id) : [...legacyAddons, addon];
          set({ selectedAddons: updated, appliedCoupon: null, promoCode: '' });
        }
      },

      clearAddons: () => {
        const current = get().selectedServices;
        if (current.length > 0) {
          const updated = current.map((i) => ({ ...i, selectedAddons: [] }));
          set({ ...syncLegacy(updated), appliedCoupon: null, promoCode: '' });
        } else {
          set({ selectedAddons: [], appliedCoupon: null, promoCode: '' });
        }
      },

      setDate: (date) => set({ selectedDate: date }),
      setTime: (time) => set({ selectedTime: time }),
      setAddress: (address) => set({ selectedAddress: address }),
      setNotes: (notes) => set({ notes }),
      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 5) })),
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
          selectedServices: [],
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
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('cleanzo_booking_store');
          } catch {}
        }
      },

      startNewBooking: (cat) => {
        set({
          category: cat || 'car',
          selectedServices: [],
          selectedService: null,
          selectedPackage: null,
          selectedAddons: [],
          selectedDate: '',
          selectedTime: '',
          notes: '',
          currentStep: 1,
          promoCode: '',
          appliedCoupon: null,
          selectedAddress: null,
          guestName: '',
          guestPhone: '',
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('cleanzo_booking_store');
          } catch {}
        }
      },

      clearCustomerInfo: () => {
        set({
          selectedAddress: null,
          guestName: '',
          guestPhone: '',
        });
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('cleanzo_booking_store');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state) {
                parsed.state.selectedAddress = null;
                parsed.state.guestName = '';
                parsed.state.guestPhone = '';
                localStorage.setItem('cleanzo_booking_store', JSON.stringify(parsed));
              }
            }
          } catch {}
        }
      },

      getItemizedServicesList: () => {
        const items = get().selectedServices || [];
        return items.map((item) => {
          const s = item.service;
          const pkg = item.selectedPackage;
          const addons = item.selectedAddons || [];

          const baseSelling = pkg ? Number(pkg.price) || 0 : Number(s.price) || 0;
          const baseOriginal = pkg
            ? (pkg.originalPrice !== undefined && pkg.originalPrice !== null ? Number(pkg.originalPrice) : baseSelling)
            : baseSelling;

          const catalogDisc = Math.max(0, baseOriginal - baseSelling);
          const addonsTot = addons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
          const addonsDur = addons.reduce((sum, a) => sum + (Number(a.durationMinutes) || 0), 0);
          const baseDur = pkg
            ? Number(pkg.durationMinutes) || 45
            : Number(s.serviceDurationMinutes || s.duration) || 45;

          return {
            serviceId: s.id,
            title: s.title,
            titleEn: s.titleEn || s.title,
            category: s.category,
            image: s.image,
            baseOriginalPrice: baseOriginal,
            baseSellingPrice: baseSelling,
            catalogDiscount: catalogDisc,
            selectedPackage: pkg,
            selectedAddons: addons,
            addonsTotal: addonsTot,
            durationMinutes: baseDur + addonsDur,
            itemSubtotal: baseSelling + addonsTot,
            itemOriginalTotal: baseOriginal + addonsTot,
          };
        });
      },

      getItemizedPricing: () => {
        const list = get().getItemizedServicesList();
        if (list.length === 0) {
          return {
            baseOriginalPrice: 0,
            catalogDiscount: 0,
            catalogDiscountPercent: 0,
            baseSellingPrice: 0,
            isPackageSelected: false,
            packagePrice: undefined,
            packageOriginalPrice: undefined,
            addonsTotal: 0,
            originalTotal: 0,
            subtotal: 0,
            couponDiscount: 0,
            appliedCouponCode: undefined,
            serviceFee: 0,
            totalDiscount: 0,
            finalPrice: 0,
          };
        }

        const combinedSubtotal = list.reduce((sum, i) => sum + i.itemSubtotal, 0);
        const combinedOriginal = list.reduce((sum, i) => sum + i.itemOriginalTotal, 0);
        const combinedCatalogDiscount = list.reduce((sum, i) => sum + i.catalogDiscount, 0);
        const combinedAddons = list.reduce((sum, i) => sum + i.addonsTotal, 0);

        const coupon = get().appliedCoupon;
        const couponDisc = coupon ? coupon.actualDiscountAmount : 0;
        const totalDisc = combinedCatalogDiscount + couponDisc;
        const finalP = Math.max(0, combinedSubtotal - couponDisc);

        return {
          baseOriginalPrice: combinedOriginal,
          catalogDiscount: combinedCatalogDiscount,
          catalogDiscountPercent: combinedOriginal > 0 ? Math.round((combinedCatalogDiscount / combinedOriginal) * 100) : 0,
          baseSellingPrice: combinedSubtotal,
          isPackageSelected: list.some((i) => !!i.selectedPackage),
          packagePrice: undefined,
          packageOriginalPrice: undefined,
          addonsTotal: combinedAddons,
          originalTotal: combinedOriginal,
          subtotal: combinedSubtotal,
          couponDiscount: couponDisc,
          appliedCouponCode: coupon?.code,
          serviceFee: 0,
          totalDiscount: totalDisc,
          finalPrice: finalP,
        };
      },

      getPackageBasePrice: () => {
        return get().getItemizedPricing().baseSellingPrice;
      },

      getAddonsTotal: () => {
        return get().getItemizedPricing().addonsTotal;
      },

      getBasePrice: () => {
        return get().getItemizedPricing().subtotal;
      },

      getTotalDuration: () => {
        const list = get().getItemizedServicesList();
        if (list.length === 0) return 45;
        return list.reduce((sum, i) => sum + i.durationMinutes, 0);
      },

      getOriginalPrice: () => {
        return get().getItemizedPricing().originalTotal;
      },

      getCatalogSavings: () => {
        return get().getItemizedPricing().catalogDiscount;
      },

      getDiscountAmount: () => {
        return get().getItemizedPricing().totalDiscount;
      },

      getServiceFee: () => {
        return get().getItemizedPricing().serviceFee;
      },

      getFinalPrice: () => {
        return get().getItemizedPricing().finalPrice;
      },
    }),
    {
      name: 'cleanzo_booking_store',
      partialize: (state) => ({
        category: state.category,
        selectedServices: state.selectedServices,
        selectedService: state.selectedService,
        selectedPackage: state.selectedPackage,
        selectedAddons: state.selectedAddons,
        notes: state.notes,
        promoCode: state.promoCode,
      }),
    }
  )
);
