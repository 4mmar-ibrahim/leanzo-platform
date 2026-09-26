'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Bell,
  Globe,
  Menu,
  Shield,
  LogOut,
  User,
  Settings,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  Tag,
  HardHat,
} from 'lucide-react';

import { useAdminStore } from '@/store/useAdminStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { hasPermission } from '@/lib/permissions';
import { AdminRole } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AdminThemeToggle } from './AdminThemeToggle';

interface AdminTopbarProps {
  onOpenSearch: () => void;
  onOpenMobileMenu: () => void;
  onOpenQuickAction: (actionType: 'order' | 'service' | 'offer' | 'technician') => void;
}

const roleNames: Record<AdminRole, { label: string; badge: string; color: string }> = {
  owner: { label: 'مالك المنصة (Owner)', badge: 'كامل الصلاحيات 👑', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  admin: { label: 'مدير نظام (Admin)', badge: 'مسؤول رئيسي 🛡️', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  manager: { label: 'مدير عام (Manager)', badge: 'تشغيل وإدارة 💼', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  booking_manager: { label: 'مدير الحجوزات', badge: 'حجوزات وفنيين 📋', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  content_manager: { label: 'مدير المحتوى', badge: 'تسويق وCMS ✍️', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  support: { label: 'خدمة العملاء (Support)', badge: 'مساعدة وعملاء 🎧', color: 'bg-[#0866C6]/10 text-[#0866C6] dark:text-[#83AED0] border-[#0866C6]/20' },
  technician: { label: 'فني ميداني', badge: 'ميداني 🔧', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
};

export function AdminTopbar({ onOpenSearch, onOpenMobileMenu, onOpenQuickAction }: AdminTopbarProps) {
  const router = useRouter();
  const { currentAdmin, logout } = useAdminStore();
  const { notifications, markAsRead, markAllAsRead, getUnreadCount, fetchNotifications } = useNotificationStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  const unreadCount = getUnreadCount();
  const currentRoleInfo = (currentAdmin && (roleNames as Record<string, any>)[currentAdmin.role]) || roleNames.owner;

  const canCreateOrder = hasPermission(currentAdmin, 'orders.create');
  const canCreateService = hasPermission(currentAdmin, 'services.create');
  const canCreateOffer = hasPermission(currentAdmin, 'offers.create');
  const canCreateTechnician = hasPermission(currentAdmin, 'orders.create');
  const hasAnyQuickAction = canCreateOrder || canCreateService || canCreateOffer || canCreateTechnician;

  const handleLogout = () => {
    logout();
    toast.info('تم تسجيل الخروج بنجاح من لوحة التحكم');
    router.push('/admin/login');
  };

  return (
    <header className="h-16 px-4 lg:px-8 bg-white/95 dark:bg-[#072540]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#133B61] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors duration-200">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="القائمة الجانبية"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#041728] text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#061e35] text-xs font-medium border border-slate-200/80 dark:border-[#133B61] transition-colors w-48 sm:w-64 md:w-80"
        >
          <Search className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="truncate">بحث سريع في الطلبات، العملاء، الخدمات...</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] font-mono bg-white dark:bg-[#072540] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, RBAC Role Switcher, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Current User Role Badge */}
        <div
          className={cn(
            'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
            currentRoleInfo.color
          )}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{currentRoleInfo.badge}</span>
        </div>

        {/* Quick Actions Dropdown */}
        {hasAnyQuickAction && (
          <div className="relative">
            <button
              onClick={() => setQuickActionOpen(!quickActionOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0866C6] hover:bg-[#07345C] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إجراء سريع</span>
            </button>

            {quickActionOpen && (
              <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-[#072540] rounded-2xl shadow-xl border border-slate-200/80 dark:border-[#133B61] p-1.5 z-50">
                {canCreateOrder && (
                  <button
                    onClick={() => {
                      setQuickActionOpen(false);
                      onOpenQuickAction('order');
                    }}
                    className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#0866C6]" />
                    <span>إنشاء حجز / طلب جديد</span>
                  </button>
                )}
                {canCreateService && (
                  <button
                    onClick={() => {
                      setQuickActionOpen(false);
                      onOpenQuickAction('service');
                    }}
                    className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-[#0866C6]" />
                    <span>إضافة خدمة جديدة</span>
                  </button>
                )}
                {canCreateOffer && (
                  <button
                    onClick={() => {
                      setQuickActionOpen(false);
                      onOpenQuickAction('offer');
                    }}
                    className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
                  >
                    <Tag className="w-4 h-4 text-amber-500" />
                    <span>إطلاق عرض ترويجي</span>
                  </button>
                )}
                {canCreateTechnician && (
                  <button
                    onClick={() => {
                      setQuickActionOpen(false);
                      onOpenQuickAction('technician');
                    }}
                    className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
                  >
                    <HardHat className="w-4 h-4 text-indigo-500" />
                    <span>إضافة فني جديد</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle Button */}
        <AdminThemeToggle />

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="الإشعارات"
          >
            <Bell className="w-4 h-4" />
            {mounted && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {notifMenuOpen && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#072540] rounded-2xl shadow-xl border border-slate-200/80 dark:border-[#133B61] p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#133B61] mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#07345C] dark:text-white">الإشعارات والتنبيهات</span>
                  {mounted && unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                      {unreadCount} جديد
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-[#0866C6] hover:text-[#07345C] font-medium"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 scrollbar-thin">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.link) router.push(n.link);
                      setNotifMenuOpen(false);
                    }}
                    className={cn(
                      'p-2.5 rounded-xl text-xs cursor-pointer transition-colors border',
                      n.read
                        ? 'bg-transparent border-transparent text-slate-500 dark:text-slate-400'
                        : 'bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/20 text-slate-800 dark:text-slate-200'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#0866C6] dark:text-sky-400">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] line-clamp-2 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-[#133B61] text-center mt-2">
                <Link
                  href="/admin/notifications"
                  onClick={() => setNotifMenuOpen(false)}
                  className="text-xs font-semibold text-[#0866C6] hover:text-[#07345C]"
                >
                  عرض جميع الإشعارات
                </Link>
              </div>
            </div>
          )}
        </div>



        {/* Admin Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[#041728] transition-colors"
          >
            <img
              src={currentAdmin?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
              alt={currentAdmin?.name || 'Admin'}
              className="w-8 h-8 rounded-xl object-cover ring-2 ring-[#0866C6]/30"
            />
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-[#07345C] dark:text-white leading-tight">{currentAdmin?.name || 'مدير النظام'}</span>
              <span className="text-[10px] text-slate-400 leading-none">{currentRoleInfo.label}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-[#072540] rounded-2xl shadow-xl border border-slate-200/80 dark:border-[#133B61] p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-[#133B61] mb-1">
                <p className="text-xs font-bold text-[#07345C] dark:text-white">{currentAdmin?.name}</p>
                <p className="text-[11px] text-slate-400">{currentAdmin?.email}</p>
              </div>
              <Link
                href="/admin/profile"
                onClick={() => setUserMenuOpen(false)}
                className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>الملف الشخصي</span>
              </Link>
              <Link
                href="/admin/settings"
                onClick={() => setUserMenuOpen(false)}
                className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>إعدادات المنصة</span>
              </Link>
              <Link
                href="/"
                target="_blank"
                onClick={() => setUserMenuOpen(false)}
                className="w-full text-right px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span>زيارة موقع العملاء</span>
              </Link>
              <div className="my-1 border-t border-slate-100 dark:border-[#133B61]" />
              <button
                onClick={handleLogout}
                className="w-full text-right px-3 py-2 rounded-xl text-xs font-semibold text-[#F0444C] hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
