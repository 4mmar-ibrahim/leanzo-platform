'use client';

import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useCMSStore } from '@/store/useCMSStore';
import { SectionHeader } from '@/components/common/SectionHeader';
import { CMSPreviewBanner } from '@/components/common/CMSPreviewBanner';
import { Button } from '@/components/ui/Button';

export default function AboutPage() {
  const { t, locale, direction } = useLocaleStore();
  const about = useCMSStore((s) => s.about);
  const isLoading = useCMSStore((s) => s.isLoading);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const loadData = async () => {
    setIsInitialLoading(true);
    setLoadError(null);
    try {
      await fetchPublishedContent();
    } catch (err: any) {
      console.error('Failed to load about CMS content:', err);
      setLoadError(err?.message || (isAr ? 'فشل تحميل بيانات الصفحة' : 'Failed to load page content'));
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fetchPublishedContent]);

  const hasAboutContent = Boolean(
    about?.title?.trim() ||
    about?.description?.trim() ||
    about?.mission?.trim() ||
    about?.vision?.trim() ||
    about?.story?.trim()
  );

  const loading = isLoading || isInitialLoading;

  return (
    <div className="py-12 bg-[#EAF8FC] dark:bg-[#041728] min-h-screen space-y-16">
      {/* Admin Draft Preview Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CMSPreviewBanner section="about" />
      </div>

      {loading && !hasAboutContent ? (
        /* Skeleton Loading State to prevent empty-content flash */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 animate-pulse">
          {/* Hero Skeleton */}
          <div className="rounded-3xl bg-slate-200 dark:bg-slate-800 h-72 p-8 sm:p-16 flex flex-col items-center justify-center space-y-4">
            <div className="w-32 h-6 bg-slate-300 dark:bg-slate-700 rounded-full" />
            <div className="w-3/4 max-w-xl h-10 bg-slate-300 dark:bg-slate-700 rounded-xl" />
            <div className="w-1/2 max-w-md h-5 bg-slate-300 dark:bg-slate-700 rounded-md" />
          </div>

          {/* Mission & Vision Skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="space-y-2">
                <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-sm" />
                <div className="w-4/5 h-4 bg-slate-200 dark:bg-slate-800 rounded-sm" />
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="space-y-2">
                <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-sm" />
                <div className="w-4/5 h-4 bg-slate-200 dark:bg-slate-800 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Quality Badges Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 text-center flex flex-col items-center">
                <div className="w-16 h-8 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ) : loadError && !hasAboutContent ? (
        /* Error State with Retry Button */
        <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 mx-auto flex items-center justify-center shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isAr ? 'تعذر تحميل معلومات كلينزو' : 'Unable to load Cleanzo information'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {loadError}
          </p>
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="gap-2 mx-auto rounded-xl border-[#0866C6] text-[#0866C6] hover:bg-[#0866C6]/10"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isAr ? 'إعادة المحاولة' : 'Try Again'}</span>
          </Button>
        </div>
      ) : !hasAboutContent ? (
        /* Genuine Empty State */
        <div className="max-w-3xl mx-auto px-4 py-28 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-slate-900 border border-sky-100 dark:border-slate-800 text-[#0866C6] mx-auto flex items-center justify-center shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isAr ? 'نبذة عنا — المحتوى قيد التحديث' : 'About Us — Content Updating'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'يقوم فريق الإدارة حالياً بصياغة نبذة رسمية محدثة وموثقة لخدمات كلينزو. يرجى العودة لاحقاً أو استكشاف خدماتنا المتاحة.'
              : 'Our team is updating official platform documentation. Please explore our live services in the meantime.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/services"
              className="px-5 py-2.5 rounded-xl bg-[#0866C6] text-white text-xs font-bold shadow-xs hover:bg-[#0756a8] transition-all"
            >
              {isAr ? 'استكشف الخدمات' : 'Explore Services'}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#041728] via-[#07345C] to-[#041728] p-8 sm:p-16 text-white shadow-xl text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-[#3894ec]">
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'عن منصة كلينزو' : 'About Cleanzo'}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
                {isAr
                  ? about?.title || 'نعيد تعريف معايير النظافة والعناية الاحترافية في مصر'
                  : about?.titleEn || 'Redefining Professional Care & Cleanliness in Egypt'}
              </h1>

              <p className="text-sm sm:text-base text-slate-200 dark:text-slate-200 font-medium max-w-2xl mx-auto leading-relaxed">
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

          {/* Certified Quality Standards & Guarantees (No Fabricated Stats) */}
          <div className="bg-white dark:bg-slate-900 py-16 border-y border-slate-200/80 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {(about?.stats && about.stats.length > 0
                  ? about.stats
                  : [
                      { id: 'st-1', value: '100%', label: 'ضمان رضا تام أو إعادة مجانية', labelEn: '100% Satisfaction Guarantee' },
                      { id: 'st-2', value: 'ECO', label: 'مواد عضوية معتمدة وآمنة', labelEn: 'Eco-Friendly Certified' },
                      { id: 'st-3', value: 'PRO', label: 'فنيون مدربون ومفحوصون أمنياً', labelEn: 'Vetted & Trained Technicians' },
                      { id: 'st-4', value: 'DOORSTEP', label: 'خدمة متنقلة حتى باب بيتك', labelEn: 'Mobile Care at Doorstep' },
                    ]
                ).map((badge, idx) => {
                  const label = isAr ? badge.label : (badge.labelEn || badge.label);
                  return (
                    <div key={badge.id || idx} className="space-y-1.5">
                      <p className="text-2xl sm:text-3xl font-black text-[#0866C6] dark:text-[#83AED0] tracking-tight">
                        {badge.value}
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                        {label}
                      </p>
                    </div>
                  );
                })}
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

            {/* Bottom Call to Action */}
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#07345C] to-[#0866C6] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl text-center sm:text-start">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold">
                  {isAr ? 'جاهز لتجربة نظافة تليق بك؟' : 'Ready for a Pristine Experience?'}
                </h3>
                <p className="text-xs sm:text-sm text-sky-100 max-w-lg">
                  {isAr
                    ? 'اختر الخدمة المناسبة واحجز موعدك في دقائق معدودة مع ضمان الجودة الكامل.'
                    : 'Select the right package and schedule your service in minutes with complete guarantee.'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/booking"
                  className="px-6 py-3 rounded-2xl bg-white text-[#07345C] font-bold text-xs hover:bg-slate-100 transition-all shadow-md flex items-center gap-2"
                >
                  <span>{isAr ? 'احجز الآن' : 'Book Now'}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md transition-all"
                >
                  {isAr ? 'تواصل معنا' : 'Contact Us'}
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
