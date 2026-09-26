'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  LayoutDashboard,
  Calendar,
  Layers,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const TOUR_STEPS = [
  {
    title: 'مرحبًا بك في لوحة تحكم CLEANZO 🚀',
    desc: 'تم ترقية اللوحة بنجاح لدعم كامل العمليات التشغيلية، تتبع الفنيين المباشر، وتجربة الموبايل الأولى.',
    icon: Sparkles,
  },
  {
    title: 'تنبيهات العمليات الذكية (Smart Alerts) ⚡',
    desc: 'في أعلى الصفحة الرئيسية، ستشاهد شريط التنبيهات الفوري الذي يوضح لك عدد الطلبات الجديدة، الطلبات قيد التنفيذ، والطلبات التي تحتاج اهتماماً.',
    icon: LayoutDashboard,
  },
  {
    title: 'التوزيع ومتابعة الفنيين (Order Tracking) 🚗',
    desc: 'يمكنك تعيين الفنيين وتحديث مرحلة الطلب لحظياً ليراها العميل مباشرة في تايم لاين تتبع الطلب مع مؤقت الوصول 15 دقيقة.',
    icon: Calendar,
  },
  {
    title: 'إدارة المحتوى والأسئلة الشائعة (CMS & FAQ) 📝',
    desc: 'تحكم كامل بصفحات الموقع، الأسئلة الشائعة، الترتيب بالسحب والإفلات، وإمكانية المعاينة الحية فور التعديل.',
    icon: Layers,
  },
  {
    title: 'تجربة الموبايل والهوية (Mobile & Branding) 🎨',
    desc: 'من قائمة الإعدادات، يمكنك تخصيص واجهة الموبايل الشبيهة بالتطبيقات، تفعيل الحجز السريع، وتعديل ألوان الهوية والشريط الترويجي.',
    icon: Smartphone,
  },
];

export function AdminTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('cleanzo_admin_tour_seen');
    if (!hasSeenTour) {
      // Small delay on first login
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('cleanzo_admin_tour_seen', 'true');
  };

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (!isOpen) return null;

  const current = TOUR_STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-start">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-xs font-bold">
              خطوة {step + 1} من {TOUR_STEPS.length}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0866C6] to-[#07345C] flex items-center justify-center text-white shadow-lg shadow-[#0866C6]/25">
            <Icon className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {current.title}
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {current.desc}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-sky-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 0}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-slate-500"
          >
            السابق
          </button>

          <Button variant="primary" size="sm" onClick={handleNext} className="gap-1.5">
            <span>{step === TOUR_STEPS.length - 1 ? 'فهمت، ابدأ العمل' : 'التالي'}</span>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
