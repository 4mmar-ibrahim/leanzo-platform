'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Eye, FileText, ArrowRight } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';

export default function PrivacyPage() {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen py-12 sm:py-20 px-4 max-w-4xl mx-auto space-y-8 text-start">
      <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>الأمان والخصوصية</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
          {isAr ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy & Data Protection Policy'}
        </h1>
        <p className="text-xs text-slate-400">آخر تحديث: سبتمبر 2026</p>
      </div>

      <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-6 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. المعلومات التي نقوم بجمعها</h2>
          <p>
            نحن في كلينزو نقدر ثقتكم ونلتزم بحماية بياناتكم الشخصية. تشمل البيانات التي نجمعها: الاسم، رقم الهاتف، عنوان تقديم الخدمة، وتفاصيل السيارة أو المنزل المراد تنظيفه لغرض تنفيذ الخدمة على أكمل وجه.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. كيف نستخدم معلوماتك</h2>
          <p>
            تُستخدم بياناتك فقط لتأكيد مواعيد الحجز، توجيه وحدة الخدمة المتنقلة إلى موقعك الجغرافي، وإرسال إشعارات حالة الطلب عبر الرسائل وواتساب. نحن لا نقوم ببيع أو مشاركة بياناتك مع أي طرف ثالث لأغراض إعلانية.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">3. أمان وحماية البيانات</h2>
          <p>
            نطبق أعلى معايير التشفير (SSL/TLS) لحماية بيانات الحجز والمدفوعات، ويخضع جميع أفراد الطاقم والفنيين لاتفاقيات سرية وحماية خصوصية العملاء وممتلكاتهم.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">4. تواصل معنا بخصوص الخصوصية</h2>
          <p>
            إذا كان لديك أي استفسار حول سياسة الخصوصية، يمكنك التواصل مباشرة مع فريق الامتثال لدينا عبر البريد الإلكتروني <span className="font-mono text-sky-600">privacy@cleanzo.app</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
