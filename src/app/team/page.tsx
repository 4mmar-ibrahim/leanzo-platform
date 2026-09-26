'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, Award, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Users } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { Button } from '@/components/ui/Button';

export default function TeamPage() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const technicians = useTechnicianStore((s) => s.technicians);
  const isLoading = useTechnicianStore((s) => s.isLoading);
  const fetchPublicTechnicians = useTechnicianStore((s) => s.fetchPublicTechnicians);

  useEffect(() => {
    fetchPublicTechnicians();
  }, [fetchPublicTechnicians]);

  return (
    <div className="min-h-screen py-12 sm:py-20 px-4 max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-black">
          <Award className="w-3.5 h-3.5" />
          <span>{isAr ? 'خبراء العناية المتخصصون' : 'Certified Professionals'}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {isAr ? 'تعرف على فريق عمل كلينزو' : 'Meet the Cleanzo Crew'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {isAr
            ? 'فريق من الفنيين المعتمدين والمجهزين بأعلى المعايير الأوروبية لضمان أفضل رعاية لسيارتك ومنزلك.'
            : 'Certified, rigorously vetted specialists equipped with the latest technology.'}
        </p>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && technicians.length === 0 && (
        <div className="text-center py-16 space-y-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isAr ? 'لا يوجد فنيون متاحون حالياً' : 'No technicians available currently'}
          </h3>
          <p className="text-xs text-slate-500">
            {isAr ? 'يتم تحديث قائمة الخبراء الفنيين بانتظام' : 'Our team roster is being updated.'}
          </p>
          <Link href="/booking">
            <Button variant="primary" size="sm">
              <span>{isAr ? 'احجز موعدك الآن' : 'Book Appointment'}</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Team Cards Grid */}
      {!isLoading && technicians.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-sky-500/50 hover:shadow-xl transition-all p-6 text-start space-y-4 group"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                    <img
                      src={tech.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'}
                      alt={tech.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-sky-500/20 group-hover:scale-105 transition-transform overflow-hidden"
                    />
                  <span className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white">
                    ✓
                  </span>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {isAr ? tech.name : tech.nameEn || tech.name}
                  </h3>
                  <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold truncate">
                    {isAr ? tech.specialty : tech.specialtyEn || tech.specialty}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{tech.rating || 5.0} / 5.0</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0866C6] shrink-0" />
                  <span>{isAr ? 'فحص أمني معتمد وتدريب احترافي' : 'Certified security clearance & training'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {isAr
                      ? `خبرة معتمدة (${tech.experienceYears || 3}+ سنوات) في العناية المتنقلة`
                      : `Certified (${tech.experienceYears || 3}+ yrs) experience`}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/booking">
                  <Button variant="outline" size="sm" className="w-full justify-center text-xs font-bold rounded-xl">
                    <span>{isAr ? 'طلب حجز الخدمة معه' : 'Book With Specialist'}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
