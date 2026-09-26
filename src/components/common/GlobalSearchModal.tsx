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
  const storeOffers = useOfferStore((s) => s.offers);
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

  // Reset category filter to match context whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCategoryFilter(getContextualCategory());
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

  const q = query.trim().toLowerCase();

  // Filter Services (active and not archived only) strictly adhering to selected category
  const activeServices = (storeServices || []).filter(
    (s) => s.available !== false && !(s as any).isArchived
  );

  const matchedServices = q
    ? activeServices
        .filter((s) => {
          if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
          return (
            s.title.toLowerCase().includes(q) ||
            s.titleEn.toLowerCase().includes(q) ||
            s.shortDescription.toLowerCase().includes(q) ||
            s.shortDescriptionEn.toLowerCase().includes(q)
          );
        })
    : [];

  // Filter Offers (active and not archived only)
  const activeOffers = (storeOffers || []).filter(
    (o) => o.active !== false && !(o as any).isArchived
  );
  const matchedOffers = q
    ? activeOffers.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q)
      )
    : [];

  // Filter FAQs
  const matchedFaqs = q
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.questionEn.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      )
    : [];

  const totalMatches = matchedServices.length + matchedOffers.length + matchedFaqs.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 space-y-3">
        {/* Search Input Box */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
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
                  <div className="space-y-1">
                    {matchedServices.map((s) => (
                      <Link
                        key={s.id}
                        href={`/services/${s.category}/${s.id}`}
                        onClick={onClose}
                        className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-sky-500/10 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          {s.image ? (
                            <img src={s.image} alt={s.title} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600">
                              {isAr ? s.title : s.titleEn}
                            </p>
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.2 rounded-md',
                              s.category === 'car' ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            )}>
                              {s.category === 'car' ? (isAr ? '🚗 سيارات' : 'Car') : (isAr ? '🏡 منازل' : 'Home')}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-sky-600">{s.price} ج.م</span>
                      </Link>
                    ))}
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
