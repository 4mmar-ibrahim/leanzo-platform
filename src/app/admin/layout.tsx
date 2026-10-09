'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AdminSearchModal } from '@/components/admin/AdminSearchModal';
import { QuickActionModal } from '@/components/admin/QuickActionModal';
import { useAdminStore } from '@/store/useAdminStore';
import { useAdminThemeStore } from '@/store/useAdminThemeStore';
import { canAccessRoute, getFirstAllowedRoute } from '@/lib/permissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'order' | 'service' | 'offer' | 'technician' | null>(null);

  const { currentAdmin, isAuthenticated, adminAuthStatus, initAdminAuth, refreshCurrentAdmin } = useAdminStore();
  const { theme: adminTheme, setTheme: setAdminTheme } = useAdminThemeStore();

  // Initialize admin authentication session on mount (silent refresh via HttpOnly cookie)
  useEffect(() => {
    initAdminAuth();
  }, [initAdminAuth]);

  // Sync admin theme independently on mount and preserve client public theme
  useEffect(() => {
    const savedAdminTheme = (localStorage.getItem('cleanzo-admin-theme') as 'light' | 'dark') || 'light';
    setAdminTheme(savedAdminTheme);
    document.documentElement.classList.toggle('dark', savedAdminTheme === 'dark');
    document.documentElement.setAttribute('data-admin-theme', savedAdminTheme);

    return () => {
      // When unmounting or navigating away from /admin, restore public customer theme
      const publicTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.classList.toggle('dark', publicTheme === 'dark');
      document.documentElement.removeAttribute('data-admin-theme');
    };
  }, [setAdminTheme]);

  const isLoginPage = pathname === '/admin/login';

  // If already authenticated and visiting /admin/login, redirect to dashboard
  useEffect(() => {
    if (isLoginPage && adminAuthStatus === 'AUTHENTICATED' && currentAdmin) {
      const target = getFirstAllowedRoute(currentAdmin);
      router.replace(target && target !== '/admin/login' ? target : '/admin');
    }
  }, [isLoginPage, adminAuthStatus, currentAdmin, router]);

  // Check route authorization via centralized PBAC permission rules
  const isAuthorized = isLoginPage || (adminAuthStatus === 'AUTHENTICATED' && canAccessRoute(currentAdmin, pathname));

  // Automatic silent redirection if route is not authorized (Only once auth is determined)
  useEffect(() => {
    if (!isLoginPage && adminAuthStatus === 'UNAUTHENTICATED') {
      router.replace('/admin/login');
    } else if (!isLoginPage && adminAuthStatus === 'AUTHENTICATED' && !isAuthorized) {
      const targetRoute = getFirstAllowedRoute(currentAdmin);
      if (targetRoute && targetRoute !== pathname) {
        router.replace(targetRoute);
      }
    }
  }, [isLoginPage, isAuthorized, adminAuthStatus, currentAdmin, pathname, router]);

  // Login page has its own standalone full screen layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // While restoring admin session, display a smooth branded loader to prevent flicker
  if (adminAuthStatus === 'AUTH_LOADING') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F5F8FC] dark:bg-[#041728] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
            جاري استعادة الجلسة والتحقق من الصلاحيات...
          </p>
        </div>
      </div>
    );
  }

  // If unauthorized, do not render any protected child content
  if (!isAuthorized) {
    return null;
  }

  return (
    <div
      id="admin-root"
      data-admin-theme={adminTheme}
      className={adminTheme === 'dark' ? 'dark' : ''}
      dir="rtl"
    >
      <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#041728] flex text-[#162631] dark:text-[#F6F8FA] antialiased selection:bg-[#0866C6] selection:text-white transition-colors duration-200 font-sans">
      {/* Sidebar - Strictly filtered by permissions */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenQuickAction={(type) => setQuickActionType(type)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command Search Modal - Permission filtered */}
      <AdminSearchModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

      {/* Quick Action Modal - Permission filtered */}
      <QuickActionModal type={quickActionType} onClose={() => setQuickActionType(null)} />
      </div>
    </div>
  );
}
