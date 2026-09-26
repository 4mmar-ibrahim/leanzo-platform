'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Home, ArrowLeft, ArrowRight, Search, HelpCircle, Tag, Car } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="py-20 sm:py-28 bg-[#F8FAFD] dark:bg-[#041728] min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Error Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0866C6]/10 text-[#0866C6] dark:text-[#3894ec] border border-[#0866C6]/20 text-xs font-black shadow-xs">
          <Sparkles className="w-4 h-4 text-[#F0444C]" />
          <span>{isAr ? 'خطأ 404 • الصفحة غير موجودة' : 'Error 404 • Page Not Found'}</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black text-[#07345C] dark:text-white tracking-tight">
            {isAr ? 'عذراً، هذه الصفحة غير موجودة' : 'Oops! Page Not Found'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {isAr
              ? 'يبدو أن الرابط الذي طلبته غير صحيح أو تم نقله. يمكنك العودة بسهولة أو تصفح أحد الأقسام التالية:'
              : 'The link you requested might be broken or removed. Feel free to explore our popular sections below:'}
          </p>
        </div>

        {/* Quick Jump Links */}
        <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
          <Link
            href="/services"
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500 transition-colors text-center space-y-1"
          >
            <Car className="w-4 h-4 mx-auto text-sky-500" />
            <span className="text-[11px] font-bold block text-slate-800 dark:text-slate-200">الخدمات</span>
          </Link>

          <Link
            href="/offers"
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-colors text-center space-y-1"
          >
            <Tag className="w-4 h-4 mx-auto text-amber-500" />
            <span className="text-[11px] font-bold block text-slate-800 dark:text-slate-200">العروض</span>
          </Link>

          <Link
            href="/faq"
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 transition-colors text-center space-y-1"
          >
            <HelpCircle className="w-4 h-4 mx-auto text-purple-500" />
            <span className="text-[11px] font-bold block text-slate-800 dark:text-slate-200">الأسئلة</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/">
            <Button variant="primary" size="md" className="rounded-2xl font-bold">
              <Home className="w-4 h-4" />
              <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
            </Button>
          </Link>

          <Link href="/booking">
            <Button variant="outline" size="md" className="rounded-2xl font-bold">
              <span>{isAr ? 'احجز خدمة جديدة' : 'Book a Service'}</span>
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
