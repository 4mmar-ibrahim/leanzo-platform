'use client';

import React from 'react';
import { Calendar, PhoneCall, Car, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';

export function ServiceHowItWorks() {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';

  const steps = [
    {
      step: '1',
      titleAr: 'احجز موعدك',
      titleEn: 'Book Your Slot',
      descAr: 'اختر الخدمة والوقت المناسب لك في أقل من دقيقة.',
      descEn: 'Pick the service and date that works for you in seconds.',
      icon: Calendar,
      color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    },
    {
      step: '2',
      titleAr: 'نؤكد الموعد',
      titleEn: 'We Confirm',
      descAr: 'نتواصل معك فوراً لتأكيد العنوان وتجهيز طاقم الخدمة.',
      descEn: 'Instant confirmation and dispatch preparation.',
      icon: PhoneCall,
      color: 'bg-[#07345C]/10 text-[#07345C] dark:text-[#83AED0] border-[#07345C]/20',
    },
    {
      step: '3',
      titleAr: 'الفني يصل لموقعك',
      titleEn: 'Specialist Arrives',
      descAr: 'تصل الوحدة المتنقلة بكامل المعدات والمياه والطاقة.',
      descEn: 'Self-powered mobile unit arrives at your doorstep on time.',
      icon: Car,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    },
    {
      step: '4',
      titleAr: 'تنفيذ الخدمة بدقة',
      titleEn: 'Flawless Execution',
      descAr: 'تنظيف عميق، تلميع، وتعقيم بمواد ألمانية معتمدة وآمنة.',
      descEn: 'Deep thermal steam cleaning and precision care.',
      icon: Sparkles,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      step: '5',
      titleAr: 'الانتهاء والاستلام',
      titleEn: 'Delivery & Joy',
      descAr: 'استلم عملك بجودة 5 نجوم وادفع بعد التأكد من رضاك التام.',
      descArPay: 'Payment on delivery after 100% satisfaction.',
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
  ];

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 text-start">
      <div className="space-y-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          {isAr ? 'تجربة سهلة ومضمونة' : 'Effortless Process'}
        </span>
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
          {isAr ? 'كيف تعمل الخدمة؟ (5 خطوات بسيطة)' : 'How It Works (5 Simple Steps)'}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2 text-start relative group hover:border-sky-400 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-black text-slate-300 dark:text-slate-700 font-mono">
                  0{item.step}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {isAr ? item.titleAr : item.titleEn}
              </h4>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr ? item.descAr : item.descEn}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
