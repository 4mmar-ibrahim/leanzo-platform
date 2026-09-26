'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  ShoppingBag,
  Users,
  Sparkles,
  Tag,
  HardHat,
  ArrowLeft,
} from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useOfferStore } from '@/store/useOfferStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { useAdminStore } from '@/store/useAdminStore';
import { hasPermission } from '@/lib/permissions';

interface AdminSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSearchModal({ open, onClose }: AdminSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const orders = useOrderStore((s) => s.orders);
  const customers = useCustomerStore((s) => s.customers);
  const services = useServiceStore((s) => s.services);
  const offers = useOfferStore((s) => s.offers);
  const technicians = useTechnicianStore((s) => s.technicians);

  const canViewOrders = hasPermission(currentAdmin, 'orders.view');
  const canViewCustomers = hasPermission(currentAdmin, 'customers.view');
  const canViewServices = hasPermission(currentAdmin, 'services.view');
  const canViewOffers = hasPermission(currentAdmin, 'offers.view');
  const canViewTechnicians = hasPermission(currentAdmin, 'orders.view');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = query.trim().toLowerCase();

  const filteredOrders = (trimmed && canViewOrders)
    ? orders.filter(
        (o) =>
          o.id.toLowerCase().includes(trimmed) ||
          o.service.title.toLowerCase().includes(trimmed) ||
          o.address.area.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const filteredCustomers = (trimmed && canViewCustomers)
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmed) ||
          c.phone.includes(trimmed) ||
          (c.email && c.email.toLowerCase().includes(trimmed))
      ).slice(0, 3)
    : [];

  const filteredServices = (trimmed && canViewServices)
    ? services.filter(
        (s) =>
          s.title.toLowerCase().includes(trimmed) ||
          s.titleEn.toLowerCase().includes(trimmed) ||
          s.shortDescription.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const filteredOffers = (trimmed && canViewOffers)
    ? offers.filter(
        (o) =>
          o.title.toLowerCase().includes(trimmed) ||
          o.code.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const filteredTechnicians = (trimmed && canViewTechnicians)
    ? technicians.filter(
        (t) =>
          t.name.toLowerCase().includes(trimmed) ||
          t.phone.includes(trimmed) ||
          t.specialty.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const hasResults =
    filteredOrders.length > 0 ||
    filteredCustomers.length > 0 ||
    filteredServices.length > 0 ||
    filteredOffers.length > 0 ||
    filteredTechnicians.length > 0;

  const navigateTo = (url: string) => {
    router.push(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#072540] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-[#133B61] overflow-hidden flex flex-col max-h-[80vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-[#133B61] bg-slate-50/80 dark:bg-[#041728]/70">
          <Search className="w-5 h-5 text-[#0866C6] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث برقم الطلب، اسم العميل، رقم الهاتف، اسم الخدمة، الفني..."
            className="flex-1 bg-transparent border-none outline-hidden text-sm text-[#07345C] dark:text-white placeholder:text-slate-400 font-medium"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md bg-slate-200/80 dark:bg-[#0A2E50] text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-[#133B61] font-mono"
          >
            Esc
          </button>
        </div>

        {/* Search Content */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {!query.trim() && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs">ابدأ بالكتابة للبحث الفوري في قاعدة بيانات كلينزو.</p>
              <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#041728] border border-slate-200/60 dark:border-[#133B61]">رقم طلب</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#041728] border border-slate-200/60 dark:border-[#133B61]">عميل</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#041728] border border-slate-200/60 dark:border-[#133B61]">خدمة</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#041728] border border-slate-200/60 dark:border-[#133B61]">فني</span>
              </div>
            </div>
          )}

          {query.trim() && !hasResults && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs">لا توجد نتائج مطابقة لـ &quot;{query}&quot;</p>
            </div>
          )}

          {/* Orders */}
          {filteredOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#0866C6] dark:text-sky-400 mb-1.5 px-2">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>الطلبات والحجوزات</span>
              </div>
              <div className="space-y-1">
                {filteredOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => navigateTo(`/admin/orders/${o.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#0A2E50]/70 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#07345C] dark:text-white">{o.id}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{o.service.title} — {o.date} {o.time}</p>
                    </div>
                    <span className="text-xs font-bold text-[#0866C6] dark:text-sky-400">{o.finalPrice} ج.م</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {filteredCustomers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5 px-2">
                <Users className="w-3.5 h-3.5" />
                <span>العملاء المسجلين</span>
              </div>
              <div className="space-y-1">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigateTo(`/admin/customers/${c.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#0A2E50]/70 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#07345C] dark:text-white">{c.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.phone} — {c.ordersCount} طلبات</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {filteredServices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#0866C6] dark:text-sky-400 mb-1.5 px-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>الخدمات المتاحة</span>
              </div>
              <div className="space-y-1">
                {filteredServices.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigateTo(`/admin/services/${s.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#0A2E50]/70 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#07345C] dark:text-white">{s.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.category === 'car' ? 'خدمات السيارات' : 'خدمات المنازل'}</p>
                    </div>
                    <span className="text-xs font-bold text-[#07345C] dark:text-slate-200">{s.price} ج.م</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technicians */}
          {filteredTechnicians.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5 px-2">
                <HardHat className="w-3.5 h-3.5" />
                <span>الفنيين الميدانيين</span>
              </div>
              <div className="space-y-1">
                {filteredTechnicians.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigateTo(`/admin/technicians`)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#0A2E50]/70 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#07345C] dark:text-white">{t.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.specialty} — تقييم {t.rating} ⭐</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
