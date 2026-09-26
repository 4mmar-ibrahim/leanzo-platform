'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Award,
  Users,
  Target,
  Eye,
  CheckCircle2,
  Clock,
  Car,
  Home,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useCMSStore } from '@/store/useCMSStore';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Button } from '@/components/ui/Button';

export default function AboutPage() {
  const { t, locale, direction } = useLocaleStore();
  const about = useCMSStore((s) => s.about);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  React.useEffect(() => {
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  const hasAboutContent = Boolean(
    about?.title?.trim() ||
    about?.description?.trim() ||
    about?.mission?.trim() ||
    about?.vision?.trim() ||
    about?.story?.trim()
  );

  return (
    <div className="py-12 bg-[#F8FAFD] dark:bg-[#041728] min-h-screen space-y-20">
      {!hasAboutContent ? (
        <div className="max-w-3xl mx-auto px-4 py-28 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-slate-800 text-[#0866C6] mx-auto flex items-center justify-center shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isAr ? 'نبذة عنا — لم تتم إضافة محتوى بعد' : 'About Us — No content added yet'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'يمكن لمشرف الموقع إضافة وتعديل نبذة عن الشركة، الرؤية، والرسالة من خلال لوحة الإدارة (قسم إدارة المحتوى > نبذة عنا).'
              : 'The site administrator can add the company story, vision, and mission from the admin dashboard.'}
          </p>
        </div>
      ) : (
        <>
          {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#041728] via-[#07345C] to-[#041728] p-8 sm:p-16 text-white shadow-xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-[#3894ec]">
            <Sparkles className="w-4 h-4" />
            <span>{isAr ? 'عن منصة كلينزو' : 'About Cleanzo'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
            {isAr
              ? about?.title || 'نعيد تعريف معايير النظافة والعناية الاحترافية في مصر'
              : about?.titleEn || 'Redefining Professional Care & Cleanliness in Egypt'}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isAr ? about?.description || t.brand.shortDescription : about?.descriptionEn || t.brand.shortDescription}
          </p>
        </div>
      </div>

      {/* Mission & Vision Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 text-start">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isAr ? 'رسالتنا' : 'Our Mission'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? about?.mission || 'توفير تجربة خدمة راقية وموثوقة بنقرة زر واحدة، تجمع بين دقة المواعيد وأحدث تقنيات البخار والنانو.'
                : about?.missionEn || 'To deliver a seamless, reliable on-demand service experience combining punctuality with advanced eco-friendly steam technologies.'}
            </p>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 text-start">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-[#07345C]/30 text-[#0866C6] flex items-center justify-center">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {isAr ? 'رؤيتنا' : 'Our Vision'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? about?.vision || 'أن نكون العلامة التجارية الرائدة والمفضلة والأكثر ثقة لخدمات العناية المتخصصة في المنطقة.'
                : about?.visionEn || 'To be the most trusted and preferred on-demand home & auto care platform in the region.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-slate-900 py-16 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-sky-600 dark:text-sky-400">+2,500</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                {isAr ? 'خدمة مكتملة' : 'Completed Bookings'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-[#0866C6] dark:text-[#83AED0]">+1,800</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                {isAr ? 'عميل دائم' : 'Happy Customers'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-amber-500">+15</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                {isAr ? 'خدمة وباقة معتمدة' : 'Specialized Packages'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-indigo-500">4.9 / 5</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                {isAr ? 'متوسط التقييم العام' : 'Average Rating'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pillars of Quality */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <SectionHeader
          badge={isAr ? 'ركائز التميز' : 'Pillars of Excellence'}
          title={isAr ? 'لماذا تضع ثقتك في كلينزو؟' : 'Why Cleanzo Stands Apart'}
          subtitle={isAr ? 'نلتزم بمنهجية عمل احترافية تضمن الأمان التام والنتائج الفائقة.' : 'We adhere to uncompromising standards of safety, quality and modern hygiene.'}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: isAr ? 'أحدث معدات البخار والنانو' : 'Industrial Steam & Nano',
              desc: isAr ? 'معدات متنقلة أوروبية الصنع تقتل 99.9% من الميكروبات بدرجات حرارة تعقيم قصوى دون إتلاف الأسطح.' : 'European-grade mobile equipment eliminating 99.9% of bacteria without damaging delicate surfaces.',
              icon: Sparkles,
            },
            {
              title: isAr ? 'فريق مدرب وفحص أمني شامل' : 'Vetted & Trained Staff',
              desc: isAr ? 'يخضع جميع الفنيين لبرامج تدريب مستمرة وفحوصات أمنية دورية لضمان راحة بالك التامة داخل منزلك.' : 'Rigorous background checks and continual technical certifications for peace of mind.',
              icon: Users,
            },
            {
              title: isAr ? 'ضمان رضا تام 100%' : '100% Satisfaction Guarantee',
              desc: isAr ? 'إذا لم تكن راضياً تماماً عن النتيجة، نعيد تنفيذ الخدمة فوراً أو نصلح الملاحظات بدون أي تكلفة إضافية.' : 'If you are not thrilled with the outcome, we will re-clean or address concerns immediately free of charge.',
              icon: ShieldCheck,
            },
          ].map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 text-start"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-500 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {pillar.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
