'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  User,
  MapPin,
  Settings,
  LogOut,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBookingStore } from '@/store/useBookingStore';
import { autoTranslate } from '@/lib/i18n/autoTranslate';
import { toast } from 'sonner';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, direction } = useLocaleStore();
  const { user, isAuthenticated, authStatus, initAuth, logout } = useAuthStore();
  const isAr = locale === 'ar';

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (authStatus === 'UNAUTHENTICATED') {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [authStatus, pathname, router]);

  const navItems = [
    { href: '/account', label: t.account.dashboard, icon: LayoutDashboard },
    { href: '/account/orders', label: t.account.ordersTitle, icon: Calendar },
    { href: '/account/subscriptions', label: isAr ? 'اشتراكاتي' : 'My Subscriptions', icon: Sparkles },
    { href: '/account/profile', label: t.account.profile, icon: User },
    { href: '/account/addresses', label: t.account.savedAddresses, icon: MapPin },
    { href: '/account/settings', label: t.account.settings, icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    toast.info(isAr ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
    router.push('/login');
  };

  if (authStatus === 'AUTH_LOADING') {
    return (
      <div className="py-20 bg-slate-50 dark:bg-[#0B1120] min-h-screen flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
            {isAr ? 'جاري التحقق من جلسة حسابك واستعادتها...' : 'Restoring your account session...'}
          </p>
        </div>
      </div>
    );
  }

  if (authStatus !== 'AUTHENTICATED') {
    return null;
  }

  return (
    <div className="py-10 bg-[#EAF8FC] dark:bg-[#041728] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* User Summary Header */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
              alt={user?.name || 'Customer'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-sky-500/30 shadow-md"
            />
            <div className="space-y-1 text-start">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {isAr
                  ? `${t.account.welcome}، ${user?.name?.split(' ')[0] || 'عميلنا العزيز'}`
                  : `${t.account.welcome}, ${autoTranslate(user?.name?.split(' ')[0], 'en') || 'Customer'}`} 👋
              </h1>
              <p className="text-xs text-slate-500">
                {user?.phone || '01012345678'} • {isAr ? 'عميل مميز لدى كلينزو' : 'Cleanzo Premium Member'}
              </p>
            </div>
          </div>

          <Link href="/booking">
            <button
              onClick={() => useBookingStore.getState().startNewBooking()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0866C6] to-[#07345C] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#0866C6]/25 hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'حجز خدمة جديدة' : 'New Booking'}</span>
            </button>
          </Link>
        </div>

        {/* Dashboard Grid Shell */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Nav */}
          <aside className="lg:col-span-3 p-3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-start"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.nav.logout}</span>
              </button>
            </div>
          </aside>

          {/* Main Dashboard Content */}
          <div className="lg:col-span-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
