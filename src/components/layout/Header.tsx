'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Car,
  Home,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Calendar,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Tag,
  Image as ImageIcon,
  PhoneCall,
  Info,
  HelpCircle,
  Search,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useBookingStore } from '@/store/useBookingStore';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { CustomerNotificationCenter } from './CustomerNotificationCenter';
import { GlobalSearchModal } from '@/components/common/GlobalSearchModal';
import { cn, normalizeMediaUrl } from '@/lib/utils';
import { autoTranslate } from '@/lib/i18n/autoTranslate';
import { toast } from 'sonner';

export function Header() {
  const { t, locale, direction } = useLocaleStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const branding = useSettingsStore((s) => s.settings.branding);
  const isSettingsLoaded = useSettingsStore((s) => s.isLoaded);
  const settingsVersion = useSettingsStore((s) => s.version);
  const isSectionVisible = useCMSStore((s) => s.isSectionVisible);
  const sections = useCMSStore((s) => s.sections);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const logoText = branding?.logoText || 'CLEANZO';
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Close mobile menu and dropdowns on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setServicesDropdownOpen(false);
    setMoreDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    toast.info(locale === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
  };

  const isAr = locale === 'ar';

  const allPrimaryNavLinks = [
    {
      key: 'services',
      href: '/services',
      label: isAr ? 'الخدمات' : 'Services',
      hasDropdown: true,
      dropdownItems: [
        { href: '/services', label: t.services.all, desc: isAr ? 'جميع باقات العناية المتكاملة' : 'Browse all service packages', icon: Sparkles },
        { href: '/services/car', label: t.nav.carServices, desc: isAr ? 'تلميع، غسيل، حماية ونانو' : 'Polishing, wash & protection', icon: Car },
        { href: '/services/home', label: t.nav.homeServices, desc: isAr ? 'تنظيف عميق، كنب، مراتب' : 'Deep cleaning & sanitization', icon: Home },
      ],
    },
    { 
      key: 'offers', 
      href: '/offers', 
      label: isAr ? 'العروض' : 'Offers',
      badge: isAr ? 'خصم' : 'Sale',
    },
    {
      key: 'subscriptions',
      href: '/subscriptions',
      label: isAr ? 'الاشتراكات' : 'Subscriptions',
      badge: isAr ? 'باقات دورية' : 'Plans',
    },
    { key: 'gallery', href: '/gallery', label: isAr ? 'أعمالنا' : 'Our Work' },
    { key: 'reviews', href: '/reviews', label: isAr ? 'آراء العملاء' : 'Reviews' },
  ];

  const primaryNavLinks = React.useMemo(() => {
    if (!mounted) return allPrimaryNavLinks;
    return allPrimaryNavLinks.filter((item) => item.key === 'subscriptions' || isSectionVisible(item.key));
  }, [allPrimaryNavLinks, mounted, sections, isSectionVisible]);

  const allMoreLinks = [
    { key: 'about', href: '/about', label: isAr ? 'من نحن' : 'About Us', desc: isAr ? 'قصة كلينزو ورؤيتنا' : 'Our story & vision', icon: Info },
    { key: 'faq', href: '/faq', label: isAr ? 'الأسئلة الشائعة' : 'FAQs', desc: isAr ? 'إجابات على كافة استفساراتك' : 'Answers to common questions', icon: HelpCircle },
    { key: 'contact', href: '/contact', label: isAr ? 'تواصل معنا' : 'Contact Us', desc: isAr ? 'خدمة العملاء والدعم الفني' : 'Customer care & support', icon: PhoneCall },
  ];

  const moreLinks = React.useMemo(() => {
    if (!mounted) return allMoreLinks;
    return allMoreLinks.filter((item) => isSectionVisible(item.key));
  }, [allMoreLinks, mounted, sections, isSectionVisible]);

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300 border-t border-slate-200/80 dark:border-white/10',
        scrolled
          ? 'bg-white/95 dark:bg-[#041728]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-[#133B61] shadow-md shadow-slate-900/5'
          : 'bg-white/85 dark:bg-[#041728]/85 backdrop-blur-md border-b border-slate-200/60 dark:border-[#133B61]/60'
      )}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 xl:gap-3">
          
          {/* ========================================================= */}
          {/* 1. BRAND MODULE (المستطيل الأول: الشعار والهوية) */}
          {/* ========================================================= */}
          <Link
            href="/"
            aria-label={logoText}
            className="group flex items-center justify-center py-1 transition-transform duration-200 hover:opacity-95 shrink-0 select-none"
          >
            <div className="relative h-9 sm:h-10 w-auto flex items-center justify-center shrink-0">
              {!mounted || !isSettingsLoaded ? (
                <div className="h-7 w-20 rounded-lg bg-slate-200/40 dark:bg-slate-800/40 animate-pulse" />
              ) : branding?.logoUrl ? (
                <img
                  src={normalizeMediaUrl(branding.logoUrl, settingsVersion)}
                  alt={logoText}
                  className="h-full w-auto max-h-9 sm:max-h-10 object-contain transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/brand/zo/cleanzo-logo.png';
                  }}
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#0866C6] to-[#07345C] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5 text-white animate-pulse-subtle" />
                </div>
              )}
            </div>
          </Link>

          {/* ========================================================= */}
          {/* 2. NAVIGATION MODULE (المستطيل الثاني: شريط الروابط الرئيسية) */}
          {/* ========================================================= */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-slate-50/90 dark:bg-[#072540]/60 backdrop-blur-md border border-slate-200/80 dark:border-[#133B61] shadow-2xs">
            {primaryNavLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

              if (link.hasDropdown) {
                return (
                  <div
                    key={link.href}
                    className="relative"
                    onMouseEnter={() => setServicesDropdownOpen(true)}
                    onMouseLeave={() => setServicesDropdownOpen(false)}
                  >
                    <Link
                      href={link.href}
                      className={cn(
                        'relative px-3.5 py-1.5 rounded-xl text-xs xl:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 group select-none',
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-[#0866C6] dark:text-[#38BDF8] shadow-xs border border-slate-200/70 dark:border-slate-700/70'
                          : 'text-[#07345C] dark:text-white hover:text-[#0866C6] dark:hover:text-[#38BDF8] hover:bg-white/80 dark:hover:bg-slate-800/70 hover:shadow-2xs active:scale-[0.98]'
                      )}
                    >
                      <span>{link.label}</span>
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                          servicesDropdownOpen && 'rotate-180 text-[#0866C6] dark:text-[#38BDF8]'
                        )}
                      />
                    </Link>

                    {/* Services Animated Dropdown Menu */}
                    {servicesDropdownOpen && (
                      <div className="absolute top-full start-0 mt-2 w-64 rounded-2xl bg-white/95 dark:bg-[#072540]/95 backdrop-blur-xl border border-slate-200 dark:border-[#133B61] shadow-2xl p-2 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        {link.dropdownItems?.map((item) => {
                          const Icon = item.icon;
                          const isSubActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setServicesDropdownOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-start',
                                isSubActive
                                  ? 'bg-[#0866C6]/10 text-[#0866C6] dark:bg-[#0866C6]/20 dark:text-[#38BDF8]'
                                  : 'text-slate-700 dark:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                              )}
                            >
                              <div className={cn(
                                'w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0',
                                isSubActive
                                  ? 'bg-[#0866C6] text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-[#0866C6]/15 text-[#0866C6] dark:text-[#38BDF8]'
                              )}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold truncate">{item.label}</span>
                                {item.desc && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-300 truncate">
                                    {item.desc}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-3.5 py-1.5 rounded-xl text-xs xl:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 group select-none',
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-[#0866C6] dark:text-[#38BDF8] shadow-xs border border-slate-200/70 dark:border-slate-700/70'
                      : 'text-[#07345C] dark:text-white hover:text-[#0866C6] dark:hover:text-[#38BDF8] hover:bg-white/80 dark:hover:bg-slate-800/70 hover:shadow-2xs active:scale-[0.98]'
                  )}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#F0444C] text-white animate-pulse shadow-2xs">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* "More" Dropdown Menu */}
            {moreLinks.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setMoreDropdownOpen(true)}
                onMouseLeave={() => setMoreDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen((prev) => !prev)}
                  className={cn(
                    'relative px-3.5 py-1.5 rounded-xl text-xs xl:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 group select-none',
                    moreLinks.some((m) => pathname.startsWith(m.href))
                      ? 'bg-white dark:bg-slate-800 text-[#0866C6] dark:text-[#38BDF8] shadow-xs border border-slate-200/70 dark:border-slate-700/70'
                      : 'text-[#07345C] dark:text-white hover:text-[#0866C6] dark:hover:text-[#38BDF8] hover:bg-white/80 dark:hover:bg-slate-800/70 hover:shadow-2xs active:scale-[0.98]'
                  )}
                >
                  <span>{isAr ? 'المزيد' : 'More'}</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-slate-400 dark:text-slate-300 transition-transform duration-200',
                      moreDropdownOpen && 'rotate-180 text-[#0866C6] dark:text-[#38BDF8]'
                    )}
                  />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute top-full start-0 mt-2 w-60 rounded-2xl bg-white/95 dark:bg-[#072540]/95 backdrop-blur-xl border border-slate-200 dark:border-[#133B61] shadow-2xl p-2 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    {moreLinks.map((item) => {
                      const Icon = item.icon;
                      const isSubActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreDropdownOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-start',
                            isSubActive
                              ? 'bg-[#0866C6]/10 text-[#0866C6] dark:bg-[#0866C6]/20 dark:text-[#38BDF8]'
                              : 'text-slate-700 dark:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0',
                            isSubActive
                              ? 'bg-[#0866C6] text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-[#0866C6]/15 text-[#0866C6] dark:text-[#38BDF8]'
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate">{item.label}</span>
                            {item.desc && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-300 truncate">
                                {item.desc}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* ========================================================= */}
          {/* 3. DESKTOP ACTIONS: SEARCH + UTILITIES + AUTH + CTA */}
          {/* ========================================================= */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5">
            
            {/* Quick Search Module (المستطيل الثالث: البحث السريع) */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50/90 dark:bg-[#072540]/60 backdrop-blur-md border border-slate-200/80 dark:border-[#133B61] hover:border-[#0866C6]/50 hover:bg-white dark:hover:bg-[#082845] text-slate-700 dark:text-white text-xs font-semibold transition-all duration-200 shadow-2xs hover:shadow-xs group active:scale-[0.98]"
              title={isAr ? 'بحث سريع (Ctrl + K)' : 'Quick Search (Ctrl + K)'}
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0866C6] dark:group-hover:text-[#38BDF8] group-hover:scale-110 transition-all duration-200" />
              <span className="text-slate-600 dark:text-white font-medium">
                {isAr ? 'بحث سريع...' : 'Search...'}
              </span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] rounded-md text-slate-600 dark:text-white shadow-2xs group-hover:border-[#0866C6]/40 transition-colors">
                ⌘K
              </kbd>
            </button>

            {/* Compact Search for medium desktop (lg-xl) */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="hidden lg:flex xl:hidden items-center justify-center w-8 h-8 rounded-2xl bg-slate-50/90 dark:bg-[#072540]/60 backdrop-blur-md border border-slate-200/80 dark:border-[#133B61] hover:border-[#0866C6]/50 hover:bg-white dark:hover:bg-[#082845] text-slate-700 dark:text-white shadow-2xs hover:shadow-xs group transition-all duration-200 active:scale-[0.98]"
              title={isAr ? 'بحث سريع (Ctrl + K)' : 'Quick Search (Ctrl + K)'}
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-[#0866C6] dark:group-hover:text-[#38BDF8] group-hover:scale-110 transition-all duration-200" />
            </button>

            {/* Utilities Module (المستطيل الرابع: التنبيهات واللغة والثيم) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-50/90 dark:bg-[#072540]/60 backdrop-blur-md border border-slate-200/80 dark:border-[#133B61] shadow-2xs">
              <CustomerNotificationCenter
                buttonClassName="!p-1.5 rounded-xl hover:bg-white dark:hover:bg-[#082845] transition-all duration-200 group text-slate-700 dark:text-white hover:text-[#0866C6] dark:hover:text-[#38BDF8]"
                iconClassName="w-4 h-4 group-hover:scale-110 transition-transform duration-200"
              />
              <div className="w-[1px] h-4 bg-slate-200 dark:bg-[#133B61]" />
              <LanguageToggle
                compact
                className="!border-0 !bg-transparent !shadow-none !px-2 !py-1 rounded-xl hover:!bg-white dark:hover:!bg-[#082845] transition-all duration-200 text-slate-700 dark:text-white hover:!text-[#0866C6] dark:hover:!text-[#38BDF8]"
              />
              <div className="w-[1px] h-4 bg-slate-200 dark:bg-[#133B61]" />
              <ThemeToggle
                className="!w-7 !h-7 !border-0 !bg-transparent !shadow-none rounded-xl hover:!bg-white dark:hover:!bg-[#082845] transition-all duration-200 group text-slate-700 dark:text-white hover:!text-[#0866C6] dark:hover:!text-[#38BDF8]"
                iconClassName="!w-4 !h-4 group-hover:rotate-12 transition-transform duration-200"
              />
            </div>

            {/* User Account Module (المستطيل الخامس: الحساب وتفاصيل المستخدم) */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pe-3 rounded-2xl bg-white dark:bg-[#072540]/80 border border-slate-200/80 dark:border-[#133B61] hover:border-[#0866C6]/40 dark:hover:border-[#0866C6]/60 shadow-2xs hover:shadow-xs transition-all duration-200 group active:scale-[0.98]"
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-xl object-cover ring-2 ring-[#0866C6]/20 group-hover:ring-[#0866C6]/60 transition-all"
                    />
                    <span className="absolute -bottom-0.5 -end-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#072540]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white max-w-[85px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 text-slate-400 group-hover:text-[#0866C6] transition-transform duration-200",
                    userDropdownOpen && "rotate-180 text-[#0866C6]"
                  )} />
                </button>

                {/* User Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute end-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-[#072540]/95 backdrop-blur-xl border border-slate-200 dark:border-[#133B61] shadow-2xl p-2 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-[#133B61]/80 mb-1">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                        {user.phone}
                      </p>
                    </div>

                    <Link
                      href="/account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-[#0866C6]" />
                      <span>{t.account.dashboard}</span>
                    </Link>

                    <Link
                      href="/account/orders"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Calendar className="w-4 h-4 text-[#0866C6]" />
                      <span>{t.account.ordersTitle}</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#F0444C] dark:text-[#F87176] hover:bg-[#FEECEE] dark:hover:bg-[#380C10] transition-colors text-start"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.nav.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50/90 dark:bg-[#072540]/60 backdrop-blur-md border border-slate-200/80 dark:border-[#133B61] hover:bg-white dark:hover:bg-[#082845] hover:border-[#0866C6]/40 shadow-2xs hover:shadow-xs text-xs font-bold text-slate-700 dark:text-slate-200 transition-all duration-200 group active:scale-[0.98]"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#0866C6] dark:group-hover:text-[#38BDF8] transition-colors" />
                <span>{t.nav.login}</span>
              </Link>
            )}

            {/* Booking CTA Module (المستطيل السادس: زر الحجز الاحترافي بهوية كلينزو الحمراء) */}
            <Link
              href="/booking"
              onClick={() => useBookingStore.getState().startNewBooking()}
              className="relative group overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-[#F0444C] hover:bg-[#D9333B] active:bg-[#B8242C] shadow-md shadow-[#F0444C]/25 hover:shadow-xl hover:shadow-[#F0444C]/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 shrink-0 font-sans cursor-pointer"
            >
              {/* Animated Light Sweep Shimmer Effect */}
              <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shimmer pointer-events-none" />
              
              <span className="relative z-10 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white/80 group-hover:rotate-12 transition-transform duration-300" />
                <span>{isAr ? (branding?.ctaText || 'احجز خدمتك الآن') : (branding?.ctaTextEn || 'Book Now')}</span>
              </span>
              <ArrowIcon className={cn(
                "w-4 h-4 relative z-10 transition-transform duration-300",
                direction === 'rtl' ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"
              )} />
            </Link>
          </div>

          {/* ========================================================= */}
          {/* MOBILE UNIFIED CAPSULE (< 1024px) */}
          {/* ========================================================= */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-slate-50/90 dark:bg-[#072540]/60 backdrop-blur-md border border-slate-200/80 dark:border-[#133B61] shadow-2xs lg:hidden shrink-0">
            {/* Quick Search */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#082845] active:scale-95 transition-all"
              aria-label="Search"
              title={isAr ? 'بحث' : 'Search'}
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300" />
            </button>

            {/* Notifications */}
            <CustomerNotificationCenter
              buttonClassName="w-7 h-7 sm:w-8 sm:h-8 rounded-xl !p-0 flex items-center justify-center hover:bg-white dark:hover:bg-[#082845] active:scale-95 transition-all"
              iconClassName="w-3.5 h-3.5 sm:w-4 sm:h-4"
            />

            {/* Language Switcher */}
            <LanguageToggle
              compact
              className="!border-0 !bg-transparent !shadow-none hover:!bg-white dark:hover:!bg-[#082845]"
            />

            {/* Theme Toggle */}
            <ThemeToggle
              className="!w-7 !h-7 sm:!w-8 sm:!h-8 !border-0 !bg-transparent !shadow-none hover:!bg-white dark:hover:!bg-[#082845] active:scale-95"
              iconClassName="!h-3.5 !w-3.5 sm:!h-4 sm:!w-4"
            />

            {/* User Avatar or Login */}
            {isAuthenticated && user ? (
              <Link
                href="/account"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center overflow-hidden ring-1 ring-[#0866C6]/40 hover:ring-[#0866C6] active:scale-95 transition-all"
                aria-label="User account"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#082845] active:scale-95 transition-all"
                title={t.nav.login}
                aria-label={t.nav.login}
              >
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300" />
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#082845] active:scale-95 transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 text-[#F0444C]" />
              ) : (
                <Menu className="w-4 h-4 text-[#0866C6]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE DRAWER MENU */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-[#133B61] bg-white/95 dark:bg-[#041728]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-250">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#133B61]/80">
            <LanguageToggle />
            {isAuthenticated && user && (
              <span className="text-xs font-bold text-[#0866C6] dark:text-[#38BDF8]">
                {isAr ? user.name : autoTranslate(user.name, 'en')}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
            >
              <span>{t.nav.home}</span>
            </Link>
            {isSectionVisible('services') && (
              <>
                <Link
                  href="/services/car"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
                >
                  <Car className="w-4 h-4 text-[#0866C6]" />
                  <span>{t.nav.carServices}</span>
                </Link>
                <Link
                  href="/services/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
                >
                  <Home className="w-4 h-4 text-[#07345C] dark:text-[#38BDF8]" />
                  <span>{t.nav.homeServices}</span>
                </Link>
              </>
            )}
            {isSectionVisible('offers') && (
              <Link
                href="/offers"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4 text-[#F0444C]" />
                  <span>{t.nav.offers}</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F0444C] text-white">
                  {isAr ? 'عروض حصرية' : 'Hot Deals'}
                </span>
              </Link>
            )}
            {isSectionVisible('gallery') && (
              <Link
                href="/gallery"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-[#07345C] dark:text-[#38BDF8]" />
                <span>{t.nav.gallery}</span>
              </Link>
            )}
            {isSectionVisible('reviews') && (
              <Link
                href="/reviews"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#0866C6]" />
                <span>{isAr ? 'آراء العملاء' : 'Reviews'}</span>
              </Link>
            )}
            {isSectionVisible('about') && (
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
              >
                <Info className="w-4 h-4 text-[#07345C] dark:text-[#38BDF8]" />
                <span>{t.nav.about}</span>
              </Link>
            )}
            {isSectionVisible('faq') && (
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-[#0866C6]" />
                <span>{isAr ? 'الأسئلة الشائعة' : 'FAQs'}</span>
              </Link>
            )}
            {isSectionVisible('contact') && (
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#072540] transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-emerald-500" />
                <span>{t.nav.contact}</span>
              </Link>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#133B61]/80 space-y-2">
            {isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#133B61] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#072540] transition-colors"
                >
                  {t.account.dashboard}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-[#F0444C] hover:bg-[#FEECEE] dark:hover:bg-[#380C10] transition-colors"
                >
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#133B61] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#072540] transition-colors"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F0F6FC] dark:bg-[#0D3357] text-[#07345C] dark:text-[#F8FAFC] border border-slate-200 dark:border-[#133B61] hover:bg-[#E1EFFC] transition-colors"
                >
                  {t.nav.register}
                </Link>
              </div>
            )}

            <Link
              href="/booking"
              onClick={() => {
                setMobileMenuOpen(false);
                useBookingStore.getState().startNewBooking();
              }}
              className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-[#0866C6] via-[#0A7CEE] to-[#07345C] shadow-md shadow-[#0866C6]/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{isAr ? (branding?.ctaText || 'احجز خدمتك الآن') : (branding?.ctaTextEn || 'Book Now')}</span>
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </header>
  );
}
