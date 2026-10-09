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
import { normalizeMediaUrl } from '@/lib/utils';

import { DEFAULT_FOOTER_QUICK_LINKS, DEFAULT_FOOTER_CATEGORY_LINKS } from '@/data/settingsData';

export function Footer() {
  const { t, locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const pathname = usePathname();
  const contact = useCMSStore((s) => s.contact);
  const social = useCMSStore((s) => s.social);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const branding = useSettingsStore((s) => s.settings.branding);
  const isSettingsLoaded = useSettingsStore((s) => s.isLoaded);
  const settingsVersion = useSettingsStore((s) => s.version);
  const logoText = branding?.logoText || 'CLEANZO';
  const footerText = isAr ? (branding?.footerText || `جميع الحقوق محفوظة © ${logoText}`) : (branding?.footerTextEn || `All rights reserved © ${logoText}`);

  const quickLinks = (branding?.footerQuickLinks && branding.footerQuickLinks.length > 0
    ? branding.footerQuickLinks
    : DEFAULT_FOOTER_QUICK_LINKS
  ).filter((link) => link.visible !== false);

  const categoryLinks = (branding?.footerCategoryLinks && branding.footerCategoryLinks.length > 0
    ? branding.footerCategoryLinks
    : DEFAULT_FOOTER_CATEGORY_LINKS
  ).filter((link) => link.visible !== false);

  React.useEffect(() => {
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="w-full bg-[#07345C] text-[#DDE7EC] border-t border-[#0B467B] transition-colors font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" aria-label={logoText} className="inline-flex items-center">
              <div className="relative h-11 w-auto flex items-center justify-center shrink-0">
                {!isSettingsLoaded ? (
                  <div className="h-8 w-28 rounded-lg bg-slate-800/60 animate-pulse" />
                ) : (
                  <img
                    src={normalizeMediaUrl(branding?.logoUrl || '/brand/zo/cleanzo-logo.png', settingsVersion)}
                    alt={logoText}
                    className="h-full w-auto max-h-11 object-contain transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/brand/zo/cleanzo-logo.png';
                    }}
                  />
                )}
              </div>
            </Link>

            <p className="text-sm text-[#DDE7EC] leading-relaxed max-w-sm">
              {isAr
                ? 'CLEANZO — مساحات نظيفة، أيام أسعد. حلول تنظيف احترافية متنقلة للعناية بالسيارات والمنازل بالبخار والتعقيم بأعلى معايير الجودة والضمان.'
                : 'CLEANZO — Cleaner Spaces, Happier Days. Premier mobile car detailing and steam home care.'}
            </p>

            <div className="flex items-center gap-3 text-xs text-[#25B8E6] font-medium">
              <ShieldCheck className="w-4 h-4 text-[#F0444C]" />
              <span className="text-[#DDE7EC]">
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
          {quickLinks.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white tracking-wider uppercase">
                {locale === 'ar' ? 'روابط سريعة' : 'Quick Links'}
              </h4>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {quickLinks.map((link) => (
                  <li key={link.id || link.url}>
                    <Link href={link.url} className="text-[#DDE7EC] hover:text-[#25B8E6] transition-colors">
                      {isAr ? link.label : (link.labelEn || link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Services Col */}
          {categoryLinks.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white tracking-wider uppercase">
                {locale === 'ar' ? 'فئات الخدمات' : 'Service Categories'}
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {categoryLinks.map((link) => (
                  <li key={link.id || link.url}>
                    <Link href={link.url} className="text-[#DDE7EC] hover:text-[#25B8E6] transition-colors">
                      {isAr ? link.label : (link.labelEn || link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

            {/* Contact Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white tracking-wider uppercase">
                {locale === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </h4>
              <ul className="space-y-3 text-sm text-[#DDE7EC]">
                {contact?.phone && (
                  <li className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                    <a href={`tel:${contact.phone}`} dir="ltr" className="text-[#DDE7EC] hover:text-white transition-colors">
                      {contact.phone}
                    </a>
                  </li>
                )}
                {contact?.email && (
                  <li className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#83AED0] shrink-0" />
                    <a href={`mailto:${contact.email}`} className="text-[#DDE7EC] hover:text-white transition-colors">
                      {contact.email}
                    </a>
                  </li>
                )}
                {(contact?.address || contact?.addressEn) && (
                  <li className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-[#DDE7EC]">
                      {isAr ? (contact?.address || contact?.addressEn) : (contact?.addressEn || contact?.address)}
                    </span>
                  </li>
                )}
                {(contact?.workingHours || contact?.workingHoursEn) && (
                  <li className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[#DDE7EC]">
                      {isAr ? (contact?.workingHours || contact?.workingHoursEn) : (contact?.workingHoursEn || contact?.workingHours)}
                    </span>
                  </li>
                )}
                {!contact?.phone && !contact?.email && !contact?.address && !contact?.workingHours && (
                  <li className="text-xs text-[#DDE7EC]/80 py-1">
                    {locale === 'ar' ? 'لم يتم تعيين بيانات تواصل بعد' : 'No contact details configured yet'}
                  </li>
                )}
              </ul>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#0B467B] flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-[#DDE7EC]/70">
          <p className="order-2 md:order-1 text-center md:text-start text-[#DDE7EC]/70">© {new Date().getFullYear()} {footerText}</p>


          <div className="order-3 flex items-center gap-4 text-[#DDE7EC]/70">
            <Link href="/about" className="hover:text-white transition-colors">
              {locale === 'ar' ? 'عن الشركة' : 'About'}
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-white transition-colors">
              {locale === 'ar' ? 'الدعم الفني' : 'Support'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
