'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, X, Sparkles, Tag, HelpCircle, ArrowRight, Car, Home } from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useOfferStore } from '@/store/useOfferStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { ServiceCategory } from '@/types';
import { cn } from '@/lib/utils';
import { resolveCategoryInfo } from '@/lib/services/categoryUtils';
import { searchServices, normalizeArabicText } from '@/lib/search/arabicSearchUtils';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const pathname = usePathname();
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const faqs = useCMSStore((s) => s.faqs);
  const storeServices = useServiceStore((s) => s.services);
  const categories = useServiceStore((s) => s.categories);
  const fetchServices = useServiceStore((s) => s.fetchServices);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const storeOffers = useOfferStore((s) => s.offers);
  const fetchOffers = useOfferStore((s) => s.fetchOffers);
  const bookingCategory = useBookingStore((s) => s.category);

  // Derive initial category filter from current URL context
  const getContextualCategory = (): ServiceCategory | 'all' => {
    if (pathname.startsWith('/services/car')) return 'car';
    if (pathname.startsWith('/services/home')) return 'home';
    if (pathname.startsWith('/booking')) return bookingCategory || 'all';
    return 'all';
  };

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all');

  // Reset category filter and ensure store data is hydrated whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCategoryFilter(getContextualCategory());
      if (storeServices.length === 0) {
        fetchServices();
      }
      if (categories.length === 0) {
        fetchCategories();
      }
      if (storeOffers.length === 0) {
        fetchOffers();
      }
    }
  }, [isOpen, pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const q = query.trim();
  const normQ = normalizeArabicText(q);

  // Filter Services using Arabic linguistic normalization & scoring
  const matchedServices = q
    ? searchServices(storeServices || [], q, categoryFilter)
    : [];

  // Filter Offers (active and not archived only) with Arabic normalization
  const activeOffers = (storeOffers || []).filter(
    (o) => o.active !== false && !(o as any).isArchived
  );
  const matchedOffers = normQ
    ? activeOffers.filter((o) => {
        const titleNorm = normalizeArabicText(o.title);
        const titleEnNorm = (o.titleEn || '').toLowerCase();
        const codeNorm = (o.code || '').toLowerCase();
        const descNorm = normalizeArabicText(o.description);
        return (
          titleNorm.includes(normQ) ||
          titleEnNorm.includes(normQ) ||
          codeNorm.includes(normQ) ||
          descNorm.includes(normQ)
        );
      })
    : [];

  // Filter FAQs with Arabic normalization
  const matchedFaqs = normQ
    ? faqs.filter((f) => {
        const qNorm = normalizeArabicText(f.question);
        const qEnNorm = (f.questionEn || '').toLowerCase();
        const aNorm = normalizeArabicText(f.answer);
        const aEnNorm = (f.answerEn || '').toLowerCase();
        return (
          qNorm.includes(normQ) ||
          qEnNorm.includes(normQ) ||
          aNorm.includes(normQ) ||
          aEnNorm.includes(normQ)
        );
      })
    : [];

  const totalMatches = matchedServices.length + matchedOffers.length + matchedFaqs.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#072540] border border-[#DDE7EC] dark:border-[#133B61] shadow-2xl overflow-hidden animate-in zoom-in-95 space-y-3 font-sans">
        {/* Search Input Box */}
        <div className="p-4 border-b border-[#DDE7EC] dark:border-[#133B61] flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              categoryFilter === 'car'
                ? (isAr ? 'ابحث في خدمات باقات السيارات فقط...' : 'Search in car services only...')
                : categoryFilter === 'home'
                ? (isAr ? 'ابحث في خدمات باقات المنازل فقط...' : 'Search in home services only...')
                : (isAr ? 'ابحث عن خدمات، عروض، كود خصم، أو أسئلة شائعة...' : 'Search services, offers, coupons, or FAQs...')
            }
            className="w-full text-sm font-bold bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              مسح
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Chips for Strict Isolation */}
        <div className="px-4 pb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">
            {isAr ? 'نطاق البحث:' : 'Scope:'}
          </span>

          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0',
              categoryFilter === 'all'
                ? 'bg-[#07345C] text-white dark:bg-[#0866C6] dark:text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            )}
          >
            {isAr ? 'الكل' : 'All'}
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('car')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0',
              categoryFilter === 'car'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
            )}
          >
            <Car className="w-3.5 h-3.5" />
            <span>{isAr ? 'خدمات السيارات فقط' : 'Car Services Only'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('home')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0',
              categoryFilter === 'home'
                ? 'bg-[#07345C] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{isAr ? 'خدمات المنازل فقط' : 'Home Services Only'}</span>
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 text-start">
          {!q ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-sky-500 mx-auto opacity-40" />
              <p>
                {categoryFilter === 'car'
                  ? (isAr ? 'ابحث عن خدمات السيارات: "غسيل"، "تلميع"، "ديتيلينج"، "شمع"' : 'Search car services: "wash", "polish", "wax"')
                  : categoryFilter === 'home'
                  ? (isAr ? 'ابحث عن خدمات المنازل: "تنظيف عميق"، "كنب"، "سجاد"، "مطابخ"' : 'Search home services: "deep clean", "sofa", "carpet"')
                  : (isAr ? 'جرّب البحث عن: "ديتيلينج"، "غسيل بالبخار"، "كنب"، أو "خصم"' : 'Try searching for services, detailing, or coupons')
                }
              </p>
            </div>
          ) : totalMatches === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              لا توجد نتائج مطابقة لـ &quot;{query}&quot;
              {categoryFilter !== 'all' && (
                <span className="block mt-1 text-[11px] text-sky-600">
                  {isAr ? `(ضمن ${categoryFilter === 'car' ? 'خدمات السيارات' : 'خدمات المنازل'} فقط)` : `(within ${categoryFilter} services only)`}
                </span>
              )}
            </div>
          ) : (
            <>
              {/* Matched Services */}
              {matchedServices.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>الخدمات ({matchedServices.length})</span>
                  </span>
                      <div className="space-y-2">
                    {matchedServices.map((s) => {
                      const cat = resolveCategoryInfo(s.category, categories, isAr);
                      const targetUrl = `/services/${s.id}`;
                      const bookingUrl = `/booking?serviceId=${s.id}&category=${cat.isCar ? 'car' : cat.isHome ? 'home' : s.category}`;

                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-sky-500/5 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
                        >
                          <Link
                            href={targetUrl}
                            onClick={onClose}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            {s.image ? (
                              <img src={s.image} alt={s.title} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                <Sparkles className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600 truncate">
                                {isAr ? s.title : s.titleEn}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={cn(
                                    'text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block',
                                    cat.isCar
                                      ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300'
                                      : cat.isHome
                                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                      : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                  )}
                                >
                                  {cat.isCar ? '🚗 ' : cat.isHome ? '🏠 ' : '✨ '}
                                  {cat.name}
                                </span>
                                <span className="text-xs font-black text-sky-600">{s.price} ج.م</span>
                              </div>
                            </div>
                          </Link>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Link
                              href={targetUrl}
                              onClick={onClose}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              {isAr ? 'عرض الخدمة' : 'Details'}
                            </Link>
                            <Link
                              href={bookingUrl}
                              onClick={onClose}
                              className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-xs transition-colors flex items-center gap-1"
                            >
                              <span>{isAr ? 'احجز الآن' : 'Book Now'}</span>
                              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matched Offers */}
              {matchedOffers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>العروض ({matchedOffers.length})</span>
                  </span>
                  <div className="space-y-1">
                    {matchedOffers.map((o) => (
                      <Link
                        key={o.id}
                        href="/offers"
                        onClick={onClose}
                        className="p-2.5 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {isAr ? o.title : o.titleEn}
                          </p>
                          <span className="text-[10px] font-mono font-bold text-amber-600">كود: {o.code}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold">
                          {o.badge}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched FAQs */}
              {matchedFaqs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>الأسئلة الشائعة ({matchedFaqs.length})</span>
                  </span>
                  <div className="space-y-1">
                    {matchedFaqs.map((f) => (
                      <Link
                        key={f.id}
                        href="/faq"
                        onClick={onClose}
                        className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 block transition-colors"
                      >
                        <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {isAr ? f.question : f.questionEn}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {isAr ? f.answer : f.answerEn}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
