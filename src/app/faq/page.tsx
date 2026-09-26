'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  HelpCircle,
  Car,
  Home,
  Calendar,
  CreditCard,
  MessageCircle,
  PhoneCall,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { FAQAccordion } from '@/components/faq/FAQAccordion';
import { Button } from '@/components/ui/Button';

export default function FAQPage() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const faqs = useCMSStore((s) => s.faqs);
  const contact = useCMSStore((s) => s.contact);
  const fetchFAQs = useCMSStore((s) => s.fetchFAQs);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);

  React.useEffect(() => {
    fetchFAQs();
    fetchPublishedContent();
  }, [fetchFAQs, fetchPublishedContent]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'car' | 'home' | 'booking' | 'general'>('all');

  // Filter visible faqs
  const visibleFaqs = useMemo(() => {
    return faqs
      .filter((f) => f.visible !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [faqs]);

  // Categories config
  const categories = [
    { id: 'all', labelAr: 'جميع الأسئلة', labelEn: 'All Questions', icon: Layers },
    { id: 'car', labelAr: 'خدمات السيارات', labelEn: 'Car Services', icon: Car },
    { id: 'home', labelAr: 'خدمات المنازل', labelEn: 'Home Services', icon: Home },
    { id: 'booking', labelAr: 'الحجز والمواعيد', labelEn: 'Booking & Timing', icon: Calendar },
    { id: 'general', labelAr: 'الأسئلة العامة والدفع', labelEn: 'General & Payment', icon: CreditCard },
  ];

  // Filter based on search & category
  const filteredFaqs = useMemo(() => {
    return visibleFaqs.filter((f) => {
      const matchCat = selectedCategory === 'all' || f.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchCat;

      const inAr = (f.question + ' ' + f.answer).toLowerCase().includes(q);
      const inEn = (f.questionEn + ' ' + f.answerEn).toLowerCase().includes(q);
      return matchCat && (inAr || inEn);
    });
  }, [visibleFaqs, selectedCategory, searchQuery]);

  // Related / Popular questions preview
  const popularFaqs = useMemo(() => {
    return visibleFaqs.slice(0, 3);
  }, [visibleFaqs]);

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Top Banner / Hero with Living Zo Character */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0866C6]/10 via-slate-50/50 to-transparent dark:from-[#0866C6]/15 dark:via-[#0B1120] dark:to-[#0B1120] py-12 sm:py-16 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-start">
            {/* Headline & Search */}
            <div className="space-y-4 max-w-2xl flex-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0866C6]/10 dark:bg-[#0866C6]/20 border border-[#0866C6]/20 text-[#0866C6] dark:text-[#3B82F6] text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'مركز المساعدة والمعلومات' : 'Help & Information Center'}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {isAr ? 'الأسئلة الشائعة والأكثر تكراراً' : 'Frequently Asked Questions'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? 'كل ما تود معرفته عن خدمات كلينزو لغسيل وتلميع السيارات وتنظيف المنازل بالبخار وطرق الحجز والدفع.'
                  : 'Everything you need to know about Cleanzo mobile car wash, home steam cleaning, booking procedures, and payment.'}
              </p>

              {/* Search Bar */}
              <div className="pt-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isAr ? 'ابحث عن سؤال أو معلومة (مثال: مدة الغسيل، التعقيم، الإلغاء)...' : 'Search questions or keywords...'}
                    className="w-full ps-11 pe-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 shadow-lg shadow-[#0866C6]/5 focus:outline-hidden focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/20 transition-all"
                  />
                  <Search className="w-5 h-5 text-slate-400 absolute start-3.5 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute end-3 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      مسح
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main FAQ Content Area */}
      <section className="py-12 sm:py-16 bg-slate-50/50 dark:bg-[#0B1120]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Category Chips Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const label = isAr ? cat.labelAr : cat.labelEn;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-200 shadow-xs ${
                    isSelected
                      ? 'bg-[#0866C6] text-white shadow-md shadow-[#0866C6]/25 scale-[1.02]'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-[#0866C6]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Results Summary if Searching */}
          {searchQuery && (
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                {isAr
                  ? `نتائج البحث عن "${searchQuery}": (${filteredFaqs.length} سؤال)`
                  : `Search results for "${searchQuery}": (${filteredFaqs.length} questions)`}
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-sky-600 dark:text-sky-400 hover:underline"
              >
                {isAr ? 'عرض الكل' : 'Show all'}
              </button>
            </div>
          )}

          {/* Accordion Component */}
          <FAQAccordion items={filteredFaqs} isAr={isAr} defaultOpenId={filteredFaqs[0]?.id} />

          {/* Related / Highlighted Questions */}
          {selectedCategory !== 'all' && popularFaqs.length > 0 && (
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{isAr ? 'أسئلة شائعة أخرى قد تهمك' : 'Other frequently asked questions'}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {popularFaqs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery(isAr ? item.question : item.questionEn);
                    }}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-start hover:border-sky-400 dark:hover:border-sky-600 transition-colors group"
                  >
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-500 transition-colors">
                      {isAr ? item.question : item.questionEn}
                    </p>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-1 inline-block">
                      {isAr ? 'عرض الإجابة ←' : 'View answer →'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Support CTA Box */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-tr from-[#07345C] via-[#0866C6] to-[#07345C] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 text-start">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[11px] font-bold">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{isAr ? 'الدعم الفوري والمباشر' : 'Instant Live Support'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                {isAr ? 'لم تجد إجابة لسؤالك؟' : 'Didn\'t find what you are looking for?'}
              </h2>
              <p className="text-xs sm:text-sm text-sky-100 max-w-md leading-relaxed">
                {isAr
                  ? 'فريق خدمة عملاء كلينزو متواجد وجاهز للرد على كافة استفساراتك وتحديد المواعيد الخاصة عبر واتساب.'
                  : 'Cleanzo support team is ready to answer questions and help arrange specialized bookings on WhatsApp.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto shrink-0">
              <a
                href={contact?.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/\+/g, '')}` : 'https://wa.me/201012345678'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 shadow-lg transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'محادثة عبر واتساب' : 'Chat on WhatsApp'}</span>
              </a>

              <Link href="/contact">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full justify-center border-white/40 text-white hover:bg-white/10 rounded-2xl text-xs font-bold"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{isAr ? 'اتصل بنا' : 'Contact Us'}</span>
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
