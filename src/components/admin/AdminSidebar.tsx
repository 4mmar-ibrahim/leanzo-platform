'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  Users,
  Wrench,
  Sparkles,
  Tag,
  Image as ImageIcon,
  HardDrive,
  FileText,

  MapPin,
  HardHat,
  BarChart3,
  TrendingUp,
  BrainCircuit,
  Bell,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  History,
  TicketPercent,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Layers,
  Home,
  Info,
  Phone,
  HelpCircle,
  Star,
  MessageSquareHeart,
} from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { normalizeMediaUrl } from '@/lib/utils';
import { canAccessRoute } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  module?: string;
  children?: { title: string; href: string; icon?: React.ElementType }[];
}

interface NavSection {
  sectionTitle: string;
  items: NavItem[];
}

export function AdminSidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const orders = useOrderStore((s) => s.orders) || [];
  const getUnreadCount = useNotificationStore((s) => s.getUnreadCount);
  const { currentAdmin, canView } = useAdminStore();
  const branding = useSettingsStore((s) => s.settings?.branding);

  const pendingOrdersCount = mounted ? orders.filter((o) => o?.status === 'pending').length : 0;
  const unreadNotifsCount = mounted ? (getUnreadCount?.() ?? 0) : 0;

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    services: pathname.startsWith('/admin/services'),
    content: pathname.startsWith('/admin/content'),
    settings: pathname.startsWith('/admin/settings'),
  });

  const toggleSubmenu = (key: string) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getModuleForItem = (href: string, explicitModule?: string): string => {
    if (explicitModule) return explicitModule;
    if (href === '/admin') return 'dashboard';
    if (href.startsWith('/admin/calendar')) return 'calendar';
    if (href.startsWith('/admin/orders')) return 'orders';
    if (href.startsWith('/admin/customers')) return 'customers';
    if (href.startsWith('/admin/technicians')) return 'technicians';
    if (href.startsWith('/admin/locations')) return 'locations';
    if (href.startsWith('/admin/services')) return 'services';
    if (href.startsWith('/admin/offers')) return 'offers';
    if (href.startsWith('/admin/coupons')) return 'coupons';
    if (href.startsWith('/admin/gallery')) return 'gallery';
    if (href.startsWith('/admin/media')) return 'media';
    if (href.startsWith('/admin/content')) return 'content';
    if (href.startsWith('/admin/zo-studio')) return 'zo';
    if (href.startsWith('/admin/reports')) return 'reports';
    if (href.startsWith('/admin/analytics')) return 'analytics';
    if (href.startsWith('/admin/notifications')) return 'notifications';
    if (href.startsWith('/admin/users') || href.startsWith('/admin/roles')) return 'users';
    if (href.startsWith('/admin/activity-log')) return 'activity_logs';
    if (href.startsWith('/admin/settings')) return 'settings';
    return 'dashboard';
  };

  const isTechUser = currentAdmin?.userType === 'technician' || currentAdmin?.role === 'technician';

  const navSections: NavSection[] = [
    {
      sectionTitle: isTechUser ? 'طلباتك' : 'نظرة عامة',
      items: [
        { title: 'لوحة القيادة', href: '/admin', icon: LayoutDashboard },
        { title: 'جدول المواعيد', href: '/admin/calendar', icon: Calendar },
      ],
    },
    {
      sectionTitle: isTechUser ? 'المهام والطلبات' : 'العمليات والتشغيل',
      items: [
        {
          title: isTechUser ? 'الطلبات المسندة إليك' : 'إدارة الطلبات',
          href: '/admin/orders',
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
        { title: 'سجل العملاء (CRM)', href: '/admin/customers', icon: Users },
        { title: 'فريق الفنيين', href: '/admin/technicians', icon: HardHat },
        { title: 'نطاق التغطية والمناطق', href: '/admin/locations', icon: MapPin },
      ],
    },
    {
      sectionTitle: 'الخدمات والعروض',
      items: [
        {
          title: 'الخدمات والتصنيفات',
          href: '/admin/services',
          icon: Sparkles,
          children: [
            { title: 'جميع الخدمات', href: '/admin/services', icon: Sparkles },
            { title: 'تصنيفات الخدمات', href: '/admin/services/categories', icon: Layers },
          ],
        },
        { title: 'العروض الترويجية', href: '/admin/offers', icon: Tag },
        { title: 'كوبونات الخصم', href: '/admin/coupons', icon: TicketPercent },
        { title: 'معرض الأعمال (قبل وبعد)', href: '/admin/gallery', icon: ImageIcon },
        { title: 'مكتبة الوسائط الموحدة', href: '/admin/media', icon: HardDrive },
      ],
    },

    {
      sectionTitle: 'إدارة المحتوى',
      items: [
        {
          title: 'محتوى المنصة',
          href: '/admin/content',
          icon: FileText,
          children: [
            { title: 'نظرة عامة على المحتوى', href: '/admin/content', icon: FileText },
            { title: 'الصفحة الرئيسية', href: '/admin/content/home', icon: Home },
            { title: 'من نحن', href: '/admin/content/about', icon: Info },
            { title: 'اتصل بنا', href: '/admin/content/contact', icon: Phone },
            { title: 'الأسئلة الشائعة', href: '/admin/content/faq', icon: HelpCircle },
            { title: 'آراء العملاء', href: '/admin/content/reviews', icon: Star },
          ],
        },
        {
          title: 'آراء العملاء',
          href: '/admin/content/reviews',
          icon: MessageSquareHeart,
          badge: 'CMS',
          badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        },
      ],
    },
    {
      sectionTitle: 'تجربة زو التفاعلية',
      items: [
        { title: 'استوديو زو 3D', href: '/admin/zo-studio', icon: BrainCircuit },
      ],
    },
    {
      sectionTitle: 'التقارير والذكاء',
      items: [
        { title: 'مركز التقارير', href: '/admin/reports', icon: BarChart3 },
        { title: 'التحليلات والمؤشرات', href: '/admin/analytics', icon: TrendingUp },
      ],
    },
    {
      sectionTitle: 'النظام والأمان',
      items: [
        {
          title: 'مركز التنبيهات',
          href: '/admin/notifications',
          icon: Bell,
          badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
        { title: 'الأمان وتشفير البيانات', href: '/admin/settings/security', icon: ShieldCheck, module: 'settings' },
        { title: 'المسؤولون والمستخدمون', href: '/admin/users', icon: UserCheck, module: 'users' },
        { title: 'سجل النشاطات (Audit)', href: '/admin/activity-log', icon: History, module: 'activity_logs' },
        {
          title: 'إعدادات النظام',
          href: '/admin/settings',
          icon: Sliders,
          children: [
            { title: 'مركز الأمان وتشفير البيانات', href: '/admin/settings/security' },
            { title: 'الإعدادات العامة', href: '/admin/settings/general' },
            { title: 'تميمة زو 3D (Zo Studio)', href: '/admin/zo-studio' },
            { title: 'الهوية والعلامة (Branding)', href: '/admin/settings/branding' },
            { title: 'المظهر والألوان', href: '/admin/settings/appearance' },
            { title: 'تجربة الموبايل (App)', href: '/admin/settings/mobile' },
            { title: 'قواعد الحجز والمواعيد', href: '/admin/settings/booking' },
            { title: 'بيانات التواصل', href: '/admin/settings/contact' },
            { title: 'منصات التواصل', href: '/admin/settings/social' },
            { title: 'تفضيلات الإشعارات', href: '/admin/settings/notifications' },
            { title: 'النسخ الاحتياطي', href: '/admin/settings/backup' },
          ],
        },
      ],
    },
  ];

  const visibleSections = navSections
    .map((sec) => ({
      ...sec,
      items: sec.items
        .map((item) => {
          if (item.children) {
            const filteredChildren = item.children.filter((child) => canAccessRoute(currentAdmin, child.href));
            return {
              ...item,
              children: filteredChildren,
            };
          }
          return item;
        })
        .filter((item) => canAccessRoute(currentAdmin, item.href) || (item.children && item.children.length > 0)),
    }))
    .filter((sec) => sec.items.length > 0);

  const sidebarContent = (
    <div suppressHydrationWarning className="flex flex-col h-full bg-white dark:bg-[#072540] border-l border-slate-200/80 dark:border-[#133B61] text-slate-700 dark:text-slate-200 select-none shadow-xs transition-colors duration-200">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-[#133B61] bg-white dark:bg-[#072540] transition-colors duration-200">
        <Link href="/admin" aria-label="لوحة الإدارة" className="flex items-center overflow-hidden">
          <div className="h-10 w-10 shrink-0 flex items-center justify-center">
            {branding?.logoUrl ? (
              <img
                src={normalizeMediaUrl(branding.logoUrl)}
                alt="Logo"
                className="max-h-10 w-auto max-w-[40px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/brand/zo/cleanzo-logo.png';
                }}
              />
            ) : (
              <Sparkles className="w-6 h-6 text-[#0866C6]" />
            )}
          </div>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {visibleSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            {!collapsed && (
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-400 uppercase">
                {section.sectionTitle}
              </div>
            )}
            {section.items.map((item, iIdx) => {
              const Icon = item.icon;
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              const isSubmenuOpen = expandedMenus[item.href.replace('/admin/', '')] || false;

              if (hasChildren && !collapsed) {
                return (
                  <div key={iIdx} className="space-y-1">
                    <button
                      onClick={() => toggleSubmenu(item.href.replace('/admin/', ''))}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                        isActive
                          ? 'bg-[#0866C6]/10 dark:bg-[#0866C6]/20 text-[#0866C6] dark:text-[#38BDF8] font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-[#0A2E50] hover:text-[#07345C] dark:hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#0866C6] dark:text-[#38BDF8]' : 'text-slate-400 dark:text-slate-400')} />
                        <span>{item.title}</span>
                      </div>
                      <ChevronDown
                        className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', isSubmenuOpen && 'rotate-180')}
                      />
                    </button>
                    {isSubmenuOpen && (
                      <div className="pr-7 space-y-1 border-r border-slate-200 dark:border-[#133B61] mr-4 mt-1">
                        {item.children?.map((child, cIdx) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <Link
                              key={cIdx}
                              href={child.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                'block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                isChildActive
                                  ? 'bg-[#0866C6] text-white shadow-xs font-bold'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0A2E50]'
                              )}
                            >
                              {child.title}
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
                  key={iIdx}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group',
                    isActive
                      ? 'bg-[#0866C6] text-white shadow-md shadow-[#0866C6]/20 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-[#0A2E50] hover:text-[#07345C] dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                        isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-[#0866C6] dark:group-hover:text-[#38BDF8]'
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </div>
                  {!collapsed && mounted && item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                        item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Customer Website Quick Jump */}
      <div className="p-3 border-t border-slate-100 dark:border-[#133B61] bg-slate-50/70 dark:bg-[#041728]/70 transition-colors duration-200">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#072540] text-slate-700 dark:text-slate-200 hover:bg-[#0866C6] hover:text-white dark:hover:bg-[#0866C6] dark:hover:text-white transition-colors border border-slate-200/80 dark:border-[#133B61] shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>معاينة موقع العملاء</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 transition-all duration-300 sticky top-0 h-screen z-30',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-full h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
