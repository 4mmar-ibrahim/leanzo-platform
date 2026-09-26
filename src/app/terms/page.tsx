'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2 } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';

export default function TermsPage() {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen py-12 sm:py-20 px-4 max-w-4xl mx-auto space-y-8 text-start">
      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0866C6]/10 text-[#0866C6] text-xs font-bold">
          <FileText className="w-3.5 h-3.5" />
          <span>الشروط والأحكام</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
          {isAr ? 'شروط وأحكام استخدام منصة كلينزو' : 'Terms & Conditions'}
        </h1>
        <p className="text-xs text-slate-400">آخر تحديث: سبتمبر 2026</p>
      </div>

      <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-6 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. اتفاقية الخدمة</h2>
          <p>
            باستخدامك لموقع أو تطبيق كلينزو وحجز أي من خدمات تنظيف السيارات أو المنازل، فإنك توافق على الالتزام بالشروط والأحكام المبينة هنا.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. المواعيد والإلغاء</h2>
          <p>
            يلتزم فريق كلينزو بالوصول في الموعد المحدد بدقة. في حال رغبة العميل في إلغاء أو تأجيل الموعد، يُرجى إجراء التعديل قبل ساعتين على الأقل مجاناً من خلال الحساب أو التواصل عبر واتساب.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">3. ضمان الجودة ورضا العملاء</h2>
          <p>
            تضمن كلينزو جودة الخدمة ورضا العميل بنسبة 100%. في حال وجود أي ملاحظة على نظافة جزء معين، يقوم الفني بإعادة تنظيفه فورياً قبل مغادرة الموقع بدون أي تكلفة إضافية.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">4. الدفع والأسعار</h2>
          <p>
            الأسعار المعلنة في المنصة هي الأسعار النهائية والشاملة لمصاريف الانتقال والمعدات. يتم الدفع نقداً عند استلام الخدمة أو عبر المحافظ الإلكترونية والبطاقات البنكية المعتمدة.
          </p>
        </section>
      </div>
    </div>
  );
}
