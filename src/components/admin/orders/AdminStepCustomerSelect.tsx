'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  Sparkles,
  Loader2,
  X,
  UserCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { CustomerProfile } from '@/types';
import { useCustomerStore } from '@/store/useCustomerStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { normalizePhoneInput, validateEgyptianPhone } from '@/lib/validation/phoneValidation';
import { validateCustomerName } from '@/lib/validation/nameValidation';
import { toast } from 'sonner';

interface AdminStepCustomerSelectProps {
  selectedCustomer: CustomerProfile | null;
  onSelectCustomer: (customer: CustomerProfile) => void;
  onClearCustomer: () => void;
  isAr?: boolean;
}

export function AdminStepCustomerSelect({
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  isAr = true,
}: AdminStepCustomerSelectProps) {
  const storeCustomers = useCustomerStore((s) => s.customers);
  const addStoreCustomer = useCustomerStore((s) => s.addCustomer);

  const [apiCustomers, setApiCustomers] = useState<CustomerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'frequent'>('all');

  // Modal for creating a new customer
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch customers from API and merge with store
  useEffect(() => {
    let isMounted = true;
    const fetchAllCustomers = async () => {
      setIsLoading(true);
      try {
        const res = await cleanzoApi.admin.getCustomers({ limit: 100 });
        if (isMounted && res && res.customers) {
          setApiCustomers(res.customers);
        }
      } catch {
        // Fallback to local store
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAllCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Merge unique customers by ID or Phone
  const allCustomers = useMemo(() => {
    const map = new Map<string, CustomerProfile>();

    // 1. Add store customers
    (storeCustomers || []).forEach((c) => {
      const key = (c.phone || c.id || '').trim();
      if (key) map.set(key, c);
    });

    // 2. Add API customers (override if exists)
    (apiCustomers || []).forEach((c: any) => {
      const normalized: CustomerProfile = {
        id: String(c.id || c._id || `usr-${Date.now()}`),
        name: c.name || 'عميل كلينزو',
        phone: c.phone || '',
        email: c.email || undefined,
        status: (c.status as any) || 'active',
        source: c.source || 'website',
        totalSpent: Number(c.totalSpent) || 0,
        ordersCount: Number(c.ordersCount) || 0,
        completedOrdersCount: Number(c.completedOrdersCount) || 0,
        cancelledOrdersCount: Number(c.cancelledOrdersCount) || 0,
        createdAt: c.createdAt || new Date().toISOString(),
        avatar: c.avatar || '',
        addresses: c.addresses || [],
        notes: c.notes || [],
        tags: c.tags || [],
      };
      const key = (normalized.phone || normalized.id).trim();
      if (key) map.set(key, normalized);
    });

    return Array.from(map.values()).sort((a, b) => {
      // Prioritize customers with orders
      return (b.ordersCount || 0) - (a.ordersCount || 0);
    });
  }, [storeCustomers, apiCustomers]);

  // Filtered customers based on search and tab
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allCustomers.filter((c) => {
      // Tab filter
      if (filterTab === 'active' && c.status !== 'active') return false;
      if (filterTab === 'frequent' && (c.ordersCount || 0) === 0) return false;

      // Search query
      if (!q) return true;
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);

      return matchName || matchPhone || matchEmail;
    });
  }, [allCustomers, searchQuery, filterTab]);

  // Quick Customer Registration Submit
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameVal = validateCustomerName(newName, isAr);
    if (!nameVal.isValid) {
      setNameError(nameVal.message || 'يرجى إدخال اسم العميل بشكل صحيح');
      toast.error(nameVal.message || 'يرجى إدخال اسم العميل');
      return;
    }
    setNameError('');

    const phoneVal = validateEgyptianPhone(newPhone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح');
      toast.error(phoneVal.message || 'يرجى إدخال رقم هاتف صحيح');
      return;
    }
    setPhoneError('');

    setIsCreating(true);
    try {
      const res = await cleanzoApi.admin.createCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        source: 'whatsapp',
      });

      const createdCust = (res as any)?.customer || res;
      const newCustomerObj: CustomerProfile = {
        id: String(createdCust?.id || createdCust?._id || `usr-${Date.now()}`),
        name: createdCust?.name || newName.trim(),
        phone: createdCust?.phone || newPhone.trim(),
        email: createdCust?.email || (newEmail.trim() ? newEmail.trim() : undefined),
        status: 'active',
        source: 'whatsapp',
        totalSpent: 0,
        ordersCount: 0,
        completedOrdersCount: 0,
        cancelledOrdersCount: 0,
        createdAt: new Date().toISOString(),
        avatar: '',
        addresses: [],
        notes: [],
        tags: ['جديد'],
      };

      addStoreCustomer(newCustomerObj as any);
      setApiCustomers((prev) => [newCustomerObj, ...prev]);

      // Automatically select the newly created customer
      onSelectCustomer(newCustomerObj);

      toast.success(isAr ? `تم تسجيل واختيار العميل (${newCustomerObj.name}) بنجاح!` : 'Customer created and selected!');
      setIsAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'فشل تسجيل العميل الجديد' : 'Failed to create customer'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-5 text-start animate-in fade-in">
      {/* Selected Customer Highlight Card (if any selected) */}
      {selectedCustomer ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-sky-50 dark:from-sky-950/40 dark:via-slate-900 dark:to-sky-950/20 border-2 border-[#0866C6] dark:border-sky-500 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#0866C6] text-white flex items-center justify-center font-black text-lg shadow-md shadow-[#0866C6]/30 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-[#0866C6] dark:text-sky-400">
                    {isAr ? 'العميل المختار لهذا الطلب ✓' : 'Selected Customer ✓'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold">
                    {isAr ? 'نشط' : 'Active'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {selectedCustomer.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                    <Phone className="w-3.5 h-3.5 text-sky-500" />
                    {selectedCustomer.phone}
                  </span>
                  {selectedCustomer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCustomer.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                    {selectedCustomer.ordersCount || 0} {isAr ? 'طلبات سابقة' : 'orders'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearCustomer}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5 self-end sm:self-center shrink-0 cursor-pointer shadow-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isAr ? 'تغيير العميل' : 'Change Customer'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center gap-3 text-amber-800 dark:text-amber-200 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            {isAr
              ? 'يرجى اختيار العميل المسجل من القائمة أدناه، أو النقر على "تسجيل عميل جديد" لإضافة بياناته ومتابعة خطوات الحجز.'
              : 'Please select a registered customer below, or click "Register New Customer" to proceed.'}
          </p>
        </div>
      )}

      {/* Control Bar: Search + Tabs + Register New Customer Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث باسم العميل، رقم الهاتف (01...)، أو البريد...' : 'Search by name, phone, or email...'}
            className="w-full h-11 ps-10 pe-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]/30 focus:border-[#0866C6] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-[#0866C6] dark:text-sky-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {isAr ? 'جميع العملاء' : 'All'} ({allCustomers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('frequent')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterTab === 'frequent'
                ? 'bg-white dark:bg-slate-900 text-[#0866C6] dark:text-sky-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {isAr ? 'لهم طلبات سابقة' : 'With Orders'}
          </button>
        </div>

        {/* Button to Open New Customer Modal */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#0756A6] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-[#0866C6]/30 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isAr ? 'تسجيل عميل جديد' : 'Register New Customer'}</span>
        </button>
      </div>

      {/* Customer Cards Grid */}
      <div>
        {isLoading && allCustomers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-6 h-6 text-[#0866C6] animate-spin mx-auto" />
            <p className="text-xs text-slate-500">{isAr ? 'جاري تحميل قائمة العملاء...' : 'Loading customers...'}</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-14 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'لم يتم العثور على أي عميل مطابق للبحث' : 'No customers found'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'يمكنك تسجيل هذا العميل الآن مباشرة وتحديد بياناته.'
                  : 'You can register this customer right now.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (searchQuery && /^[0-9]+$/.test(searchQuery)) {
                  setNewPhone(searchQuery);
                } else if (searchQuery) {
                  setNewName(searchQuery);
                }
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold hover:bg-sky-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAr ? 'تسجيل هذا العميل الآن' : 'Register This Customer'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id || selectedCustomer?.phone === cust.phone;
              const initials = (cust.name || 'ع')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('');

              return (
                <div
                  key={cust.id || cust.phone}
                  onClick={() => onSelectCustomer(cust)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 text-start relative ${
                    isSelected
                      ? 'border-[#0866C6] bg-sky-50/70 dark:bg-sky-950/40 shadow-md ring-2 ring-[#0866C6]/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Customer Initials Avatar */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#0866C6] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight break-words">
                          {cust.name}
                        </h4>
                        {cust.status === 'inactive' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 font-bold shrink-0">
                            معطل
                          </span>
                        )}
                      </div>

                      {/* Phone */}
                      <p className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 mt-1 flex items-center gap-1 dir-ltr text-end">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{cust.phone}</span>
                      </p>

                      {/* Email if any */}
                      {cust.email && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5" title={cust.email}>
                          {cust.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Stats & Selection Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>{cust.ordersCount || 0} طلبات</span>
                      {cust.totalSpent ? (
                        <>
                          <span>•</span>
                          <span className="font-mono">{cust.totalSpent} ج.م</span>
                        </>
                      ) : null}
                    </div>

                    <div
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-[#0866C6] text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>مختار ✓</span>
                        </>
                      ) : (
                        <span>اختيار</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Quick Register New Customer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-start">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {isAr ? 'تسجيل عميل جديد' : 'Register New Customer'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'سيتم حفظ العميل واختياره فوراً لمتابعة الحجز' : 'Customer will be created and selected'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-white block">
                  {isAr ? 'اسم العميل بالكامل' : 'Full Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder={isAr ? 'مثال: محمد عبد الرحمن' : 'e.g. Mohamed Abdelrahman'}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]/30 focus:border-[#0866C6]"
                />
                {nameError && <p className="text-[10px] text-rose-500 font-medium">{nameError}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-white block">
                  {isAr ? 'رقم الهاتف للتواصل' : 'Phone Number'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  maxLength={11}
                  required
                  value={newPhone}
                  onChange={(e) => {
                    const clean = normalizePhoneInput(e.target.value);
                    setNewPhone(clean);
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder="01012345678"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white text-end font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]/30 focus:border-[#0866C6]"
                />
                {phoneError && <p className="text-[10px] text-rose-500 font-medium">{phoneError}</p>}
              </div>

              {/* Email (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 dark:text-white block">
                  {isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white text-end focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]/30 focus:border-[#0866C6]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#0756A6] text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-[#0866C6]/30 disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{isAr ? 'حفظ واختيار العميل' : 'Save & Select'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
