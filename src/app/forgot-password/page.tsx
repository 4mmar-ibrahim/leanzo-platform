'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Phone,
  Headphones,
  ShieldCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useCMSStore } from '@/store/useCMSStore';

export default function ForgotPasswordPage() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const contact = useCMSStore((s) => s.contact);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);

  useEffect(() => {
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  // Clean formatted phone and whatsapp numbers
  const rawPhone = contact?.phone || '01012345678';
  const rawWhatsApp = contact?.whatsapp || '201012345678';

  const cleanWhatsAppDigits = rawWhatsApp.replace(/[^0-9]/g, '') || '201012345678';
  const whatsappPreFilledMessage = encodeURIComponent(
    isAr
      ? 'مرحباً خدمة عملاء كلينزو، نسيت كلمة المرور لحسابي وأرغب في المساعدة لإنشاء كلمة مرور جديدة.'
      : 'Hello Cleanzo Support, I forgot my account password and need assistance to set a new password.'
  );

  const whatsappUrl = rawWhatsApp.startsWith('http')
    ? rawWhatsApp
    : `https://wa.me/${cleanWhatsAppDigits}?text=${whatsappPreFilledMessage}`;

  const phoneUrl = `tel:${rawPhone.replace(/[^0-9+]/g, '')}`;

  return (
    <div className="py-16 bg-slate-50 dark:bg-[#0B1120] min-h-[85vh] flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-8 animate-in fade-in duration-300">
        {/* Cleanzo Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0866C6] to-[#07345C] flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#0866C6] to-[#07345C] bg-clip-text text-transparent">
              CLEANZO
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isAr ? 'استعادة كلمة المرور' : 'Password Recovery'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {isAr
              ? 'إجراءات الأمان وحماية حسابك في منصة كلينزو لخدمات النظافة الذكية'
              : 'Security procedures and account protection for Cleanzo platform'}
          </p>
        </div>

        {/* Main Instruction Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 text-start relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-sky-500 via-emerald-500 to-[#07345C]" />

          {/* Primary Clear Directive Notice */}
          <div className="p-5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/80 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0866C6] to-[#07345C] text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-600/20">
              <Headphones className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-sky-950 dark:text-sky-200 leading-snug">
                {isAr
                  ? 'لإنشاء كلمة مرور جديدة، يرجى التواصل مع الدعم.'
                  : 'To create a new password, please contact support.'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {isAr
                  ? 'حفاظاً على أمان وسرية بيانات حسابك وعناوينك وطلباتك السابقة، يتم تعيين وتأكيد كلمة المرور الجديدة مباشرة من خلال فريق الدعم الفني وخدمة العملاء المعتمد.'
                  : 'To safeguard your account data, addresses, and order history, new passwords are securely verified and issued directly through our verified customer support team.'}
              </p>
            </div>
          </div>

          {/* Primary Contact CTA Button */}
          <div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all transform active:scale-[0.99] group cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>{isAr ? 'تواصل مع الدعم عبر واتساب' : 'Contact Support via WhatsApp'}</span>
              <ArrowIcon className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Secondary Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Phone Hotline Option */}
            <a
              href={phoneUrl}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-sky-500/50 hover:bg-sky-50/50 dark:hover:bg-slate-800 transition-all flex items-center gap-3 text-start group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                  {isAr ? 'الاتصال المباشر' : 'Direct Call'}
                </p>
                <p dir="ltr" className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white truncate">
                  {rawPhone}
                </p>
              </div>
            </a>

            {/* Support Center Link */}
            <Link
              href="/contact"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-sky-500/50 hover:bg-sky-50/50 dark:hover:bg-slate-800 transition-all flex items-center gap-3 text-start group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                  {isAr ? 'مركز المساعدة' : 'Help Center'}
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white truncate">
                  {isAr ? 'صفحة اتصل بنا' : 'Contact Page'}
                </p>
              </div>
            </Link>
          </div>

          {/* Security & Response Info */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{isAr ? 'حماية بيانات مشددة' : 'High Security Encryption'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-500 shrink-0" />
              <span>{isAr ? 'الرد الفوري على مدار الساعة' : '24/7 Dedicated Support'}</span>
            </div>
          </div>

          {/* Back to Login Link */}
          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
            >
              <ArrowIcon className="w-4 h-4 rotate-180" />
              <span>{isAr ? 'العودة إلى صفحة تسجيل الدخول' : 'Back to Login'}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
