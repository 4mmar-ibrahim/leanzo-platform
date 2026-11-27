'use client';

import { useSupportWhatsApp } from '@/lib/supportWhatsApp';
import React from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { usePathname } from 'next/navigation';
import { normalizeMediaUrl } from '@/lib/utils';

import { DEFAULT_FOOTER_QUICK_LINKS, DEFAULT_FOOTER_CATEGORY_LINKS } from '@/data/settingsData';
import { SocialBrandIcon, resolvePublicSocialItems } from '@/components/common/SocialBrandIcon';

export function Footer() {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const pathname = usePathname();
  const contact = useCMSStore((s) => s.contact);
  const social = useCMSStore((s) => s.social);
  const settingsContact = useSettingsStore((s) => s.settings.contact);
  const settingsSocial = useSettingsStore((s) => s.settings.social);
  const activeContact = (contact && (contact.phone || contact.email || contact.address)) ? contact : (settingsContact || contact);
  const supportWhatsApp = useSupportWhatsApp();
  const activeSocial = (social && (social.facebook || social.whatsapp || (social.items && social.items.length > 0))) ? social : (settingsSocial || social);
  const isLoading = useCMSStore((s) => s.isLoading);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const branding = useSettingsStore((s) => s.settings.branding);
  const settingsVersion = useSettingsStore((s) => s.version);
  const hasBottomNavigation = useSettingsStore((s) => s.settings.mobileExperience?.enableBottomNavigation !== false);
  const logoSrc = settingsVersion === null ? '' : normalizeMediaUrl(branding?.logoUrl, settingsVersion);
  const [failedLogo, setFailedLogo] = React.useState('');
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

  const socialItems = resolvePublicSocialItems(activeSocial, supportWhatsApp).filter(
    (item) => item.visible !== false && Boolean(item.url?.trim())
  );

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className={`w-full bg-[#07345C] text-[#DDE7EC] border-t border-[#0B467B] font-sans ${hasBottomNavigation ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-7 lg:gap-10">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4 border-b border-white/15 pb-5 lg:border-0 lg:pb-0">
            <Link href="/" aria-label={logoText} className="inline-flex min-h-12 min-w-28 max-w-full items-center justify-center rounded-xl bg-white px-3 py-2 text-[#07345C] shadow-sm">
              {settingsVersion === null ? (
                <span className="h-6 w-24 animate-pulse rounded bg-slate-200" aria-hidden="true" />
              ) : logoSrc && failedLogo !== logoSrc ? (
                <img
                  src={logoSrc}
                  alt={logoText}
                  className="h-8 w-auto max-w-44 object-contain sm:h-10"
                  onError={() => setFailedLogo(logoSrc)}
                />
              ) : (
                <span className="text-sm font-black tracking-wide">{logoText}</span>
              )}
            </Link>

            <p className="text-sm text-[#DDE7EC] leading-relaxed max-w-md">
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

            {/* Official Social Links Bar */}
            {isLoading && socialItems.length === 0 ? (
              <div className="flex items-center gap-2.5 pt-2 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-slate-800/80" />
                <div className="w-9 h-9 rounded-xl bg-slate-800/80" />
                <div className="w-9 h-9 rounded-xl bg-slate-800/80" />
              </div>
            ) : socialItems.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {socialItems.map((item) => {
                  const href = item.url;
                  const label = isAr ? item.name : (item.nameEn || item.name);

                  return (
                    <a
                      key={item.id}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="size-11 rounded-xl bg-white hover:bg-sky-100 border border-slate-200 text-[#07345C] flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-xs group"
                      title={label}
                      aria-label={label}
                    >
                      <SocialBrandIcon platform={item.platform} size="xs" colored={true} />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Quick Links */}
          {quickLinks.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white tracking-wider uppercase">
                {locale === 'ar' ? 'روابط سريعة' : 'Quick Links'}
              </h4>
              <ul className="space-y-1 text-sm">
                {quickLinks.map((link) => (
                  <li key={link.id || link.url}>
                    <Link href={link.url} className="block min-h-9 break-words py-1.5 text-[#DDE7EC] hover:text-white transition-colors">
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
              <ul className="space-y-1 text-sm">
                {categoryLinks.map((link) => (
                  <li key={link.id || link.url}>
                    <Link href={link.url} className="block min-h-9 break-words py-1.5 text-[#DDE7EC] hover:text-white transition-colors">
                      {isAr ? link.label : (link.labelEn || link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

            {/* Contact Details */}
            <div className="col-span-2 min-w-0 space-y-3 border-t border-white/15 pt-5 lg:col-span-1 lg:border-0 lg:pt-0">
              <h4 className="text-sm font-bold text-white tracking-wider uppercase">
                {locale === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </h4>
              <ul className="space-y-3 text-sm text-[#DDE7EC]">
                {isLoading && !activeContact?.phone && !activeContact?.email ? (
                  <div className="space-y-3 py-1 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-md bg-slate-700/60" />
                      <div className="w-28 h-3.5 rounded-md bg-slate-700/60" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-md bg-slate-700/60" />
                      <div className="w-32 h-3.5 rounded-md bg-slate-700/60" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-md bg-slate-700/60" />
                      <div className="w-40 h-3.5 rounded-md bg-slate-700/60" />
                    </div>
                  </div>
                ) : (
                  <>
                    {activeContact?.phone && (
                      <li className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                        <a href={`tel:${activeContact.phone}`} dir="ltr" className="min-w-0 break-all text-[#DDE7EC] hover:text-white transition-colors">
                          {activeContact.phone}
                        </a>
                      </li>
                    )}
                    {activeContact?.email && (
                      <li className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-[#83AED0] shrink-0" />
                        <a href={`mailto:${activeContact.email}`} dir="ltr" className="min-w-0 break-all text-[#DDE7EC] hover:text-white transition-colors">
                          {activeContact.email}
                        </a>
                      </li>
                    )}
                    {(activeContact?.address || activeContact?.addressEn) && (
                      <li className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="text-[#DDE7EC]">
                          {isAr ? (activeContact?.address || activeContact?.addressEn) : (activeContact?.addressEn || activeContact?.address)}
                        </span>
                      </li>
                    )}
                    {(activeContact?.workingHours || activeContact?.workingHoursEn) && (
                      <li className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-[#DDE7EC]">
                          {isAr ? (activeContact?.workingHours || activeContact?.workingHoursEn) : (activeContact?.workingHoursEn || activeContact?.workingHours)}
                        </span>
                      </li>
                    )}
                    {!activeContact?.phone && !activeContact?.email && !activeContact?.address && !activeContact?.workingHours && (
                      <li className="text-xs text-[#DDE7EC]/80 py-1">
                        {locale === 'ar' ? 'لم يتم تعيين بيانات تواصل بعد' : 'No contact details configured yet'}
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-7 pt-5 sm:mt-10 border-t border-white/15 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#DDE7EC]/70">
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
