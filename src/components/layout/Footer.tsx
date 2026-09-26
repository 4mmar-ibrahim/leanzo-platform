'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { usePathname } from 'next/navigation';

export function Footer() {
  const { t, locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const pathname = usePathname();
  const contact = useCMSStore((s) => s.contact);
  const social = useCMSStore((s) => s.social);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const branding = useSettingsStore((s) => s.settings.branding);
  const logoText = branding?.logoText || 'CLEANZO';
  const footerText = isAr ? (branding?.footerText || `جميع الحقوق محفوظة © ${logoText}`) : (branding?.footerTextEn || `All rights reserved © ${logoText}`);

  React.useEffect(() => {
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="w-full bg-[#04213B] text-slate-300 border-t border-[#072C4F] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" aria-label={logoText} className="inline-flex items-center">
              <div className="relative h-11 w-auto flex items-center justify-center shrink-0">
                <img
                  src={branding?.logoUrl || '/brand/zo/cleanzo-logo.png'}
                  alt={logoText}
                  className="h-full w-auto max-h-11 object-contain transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/brand/zo/cleanzo-logo.png';
                  }}
                />
              </div>
            </Link>

            <p className="text-sm text-slate-200 leading-relaxed max-w-sm">
              {isAr
                ? 'CLEANZO — مساحات نظيفة، أيام أسعد. حلول تنظيف احترافية متنقلة للعناية بالسيارات والمنازل بالبخار والتعقيم بأعلى معايير الجودة والضمان.'
                : 'CLEANZO — Cleaner Spaces, Happier Days. Premier mobile car detailing and steam home care.'}
            </p>

            <div className="flex items-center gap-3 text-xs text-[#3B82F6] font-medium">
              <ShieldCheck className="w-4 h-4 text-[#F0444C]" />
              <span>
                {locale === 'ar'
                  ? 'ضمان جودة 100% ورضا تام عن كل زيارة'
                  : '100% Quality & Satisfaction Guarantee'}
              </span>
            </div>

            {/* Social links */}
            {(social?.whatsapp || social?.facebook || social?.instagram) && (
              <div className="flex items-center gap-3 pt-2">
                {social?.whatsapp && (
                  <a
                    href={social.whatsapp.startsWith('http') ? social.whatsapp : `https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    aria-label="WhatsApp"
                  >
                    <span className="font-bold text-xs">WA</span>
                  </a>
                )}
                {social?.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    aria-label="Facebook"
                  >
                    <span className="font-bold text-xs">FB</span>
                  </a>
                )}
                {social?.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    aria-label="Instagram"
                  >
                    <span className="font-bold text-xs">IG</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white tracking-wider uppercase">
              {locale === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-sky-400 transition-colors">
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-sky-400 transition-colors">
                  {t.nav.services}
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-sky-400 transition-colors">
                  {t.nav.offers}
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-sky-400 transition-colors">
                  {t.nav.gallery}
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-sky-400 transition-colors">
                  {locale === 'ar' ? 'آراء العملاء' : 'Customer Reviews'}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-sky-400 transition-colors">
                  {t.nav.about}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-sky-400 transition-colors">
                  {locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-sky-400 transition-colors">
                  {t.nav.contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services Col */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white tracking-wider uppercase">
              {locale === 'ar' ? 'فئات الخدمات' : 'Service Categories'}
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <li>
                <Link href="/services/car" className="hover:text-sky-400 transition-colors">
                  {t.nav.carServices}
                </Link>
              </li>
              <li>
                <Link href="/services/home" className="hover:text-sky-400 transition-colors">
                  {t.nav.homeServices}
                </Link>
              </li>
              <li>
                <Link href="/services/car-full-detailing" className="hover:text-sky-400 transition-colors">
                  {locale === 'ar' ? 'ديتيلينج سيارات VIP' : 'VIP Car Detailing'}
                </Link>
              </li>
              <li>
                <Link href="/services/home-deep-clean" className="hover:text-sky-400 transition-colors">
                  {locale === 'ar' ? 'التنظيف العميق للمنازل' : 'Deep Home Cleaning'}
                </Link>
              </li>
              <li>
                <Link href="/services/home-upholstery-steam" className="hover:text-sky-400 transition-colors">
                  {locale === 'ar' ? 'غسيل المفروشات والكنب' : 'Upholstery Steam Clean'}
                </Link>
              </li>
            </ul>
          </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white tracking-wider uppercase">
                {locale === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </h4>
              <ul className="space-y-3 text-sm text-slate-400">
                {contact?.phone && (
                  <li className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                    <a href={`tel:${contact.phone}`} dir="ltr" className="hover:text-white transition-colors">
                      {contact.phone}
                    </a>
                  </li>
                )}
                {contact?.email && (
                  <li className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#83AED0] shrink-0" />
                    <a href={`mailto:${contact.email}`} className="hover:text-white transition-colors">
                      {contact.email}
                    </a>
                  </li>
                )}
                {(contact?.address || contact?.addressEn) && (
                  <li className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      {isAr ? (contact?.address || contact?.addressEn) : (contact?.addressEn || contact?.address)}
                    </span>
                  </li>
                )}
                {(contact?.workingHours || contact?.workingHoursEn) && (
                  <li className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isAr ? (contact?.workingHours || contact?.workingHoursEn) : (contact?.workingHoursEn || contact?.workingHours)}
                    </span>
                  </li>
                )}
                {!contact?.phone && !contact?.email && !contact?.address && !contact?.workingHours && (
                  <li className="text-xs text-slate-500 py-1">
                    {locale === 'ar' ? 'لم يتم تعيين بيانات تواصل بعد' : 'No contact details configured yet'}
                  </li>
                )}
              </ul>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-slate-500">
          <p className="order-2 md:order-1 text-center md:text-start">© {new Date().getFullYear()} {footerText}</p>

          {/* Developer Terminal Signature */}
          <div
            dir="ltr"
            className="order-1 md:order-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#03172c]/90 border border-slate-800/90 hover:border-sky-500/40 hover:shadow-[0_0_18px_rgba(56,189,248,0.12)] transition-all duration-300 font-mono group/sig select-none"
          >
            <span className="text-slate-500 text-[11px] sm:text-xs font-medium select-none group-hover/sig:text-sky-400/80 transition-colors duration-250">
              //
            </span>
            <span className="text-slate-400 text-[11px] sm:text-xs tracking-tight font-normal select-none">
              crafted by
            </span>
            <a
              href="https://wa.me/201009771898"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ammar Ibrahim"
              className="group/name relative inline-flex items-center text-[12px] sm:text-[13px] font-semibold text-slate-100 hover:text-cyan-300 transition-colors duration-250 cursor-pointer hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            >
              <span>Ammar Ibrahim</span>
              <span className="absolute -bottom-0.5 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent scale-x-0 group-hover/name:scale-x-100 transition-transform duration-250 ease-out origin-center" />
            </a>
            <span className="text-cyan-400/80 text-[10px] sm:text-[11px] font-bold tracking-tighter select-none transition-all duration-250 group-hover/sig:text-cyan-300 group-hover/sig:drop-shadow-[0_0_6px_rgba(34,211,238,0.7)] group-hover/sig:translate-x-0.5 inline-block">
              &lt;/&gt;
            </span>
          </div>

          <div className="order-3 flex items-center gap-4">
            <Link href="/about" className="hover:text-slate-300 transition-colors">
              {locale === 'ar' ? 'عن الشركة' : 'About'}
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-slate-300 transition-colors">
              {locale === 'ar' ? 'الدعم الفني' : 'Support'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
