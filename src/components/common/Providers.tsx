'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import { Toaster, toast } from 'sonner';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCustomerStore } from '@/store/useCustomerStore';
import { MaintenanceScreen } from './MaintenanceScreen';
import { normalizeMediaUrl } from '@/lib/utils';

// Filter out the React 19 "Encountered a script tag" false-positive warning from next-themes
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && (
      args[0].includes('Encountered a script tag while rendering React component') ||
      args[0].includes('Scripts inside React components are never executed')
    )) {
      return;
    }
    origError.apply(console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  const { locale, direction } = useLocaleStore();
  const pathname = usePathname();
  const branding = useSettingsStore((s) => s.settings.branding);
  const appearance = useSettingsStore((s) => s.settings.appearance);
  const maintenanceMode = branding?.maintenanceMode;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const customers = useCustomerStore((s) => s.customers);

  // Active customer account deactivation monitor:
  // If the logged in customer's account gets marked as inactive/suspended by admin,
  // immediately log them out and notify them with an alert message.
  useEffect(() => {
    if (isAuthenticated && user?.phone) {
      const matched = customers.find((c) => c.phone === user.phone);
      if (matched && (matched.status === 'inactive' || matched.status === 'suspended')) {
        logout();
        toast.error(
          locale === 'ar'
            ? 'تم تعطيل هذا الحساب من قِبل إدارة كلينزو. يرجى التواصل مع خدمة العملاء.'
            : 'This account has been deactivated by Cleanzo admin. Please contact customer support.',
          { duration: 8000 }
        );
        if (pathname?.startsWith('/account')) {
          router.push('/login');
        }
      }
    }
  }, [isAuthenticated, user?.phone, customers, logout, locale, pathname, router]);

  useEffect(() => {
    // Silently restore persistent customer session via HttpOnly cookie/token
    useAuthStore.getState().initAuth();

    // Fetch live system & branding settings from backend
    useSettingsStore.getState().fetchPublicSettings();

    const handleSettingsUpdate = () => {
      useSettingsStore.getState().fetchPublicSettings();
    };

    window.addEventListener('cleanzo:settings-updated', handleSettingsUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'cleanzo-settings-storage') {
        useSettingsStore.getState().fetchPublicSettings();
      }
    });

    return () => {
      window.removeEventListener('cleanzo:settings-updated', handleSettingsUpdate);
    };
  }, []);

  // Dynamic Favicon synchronization
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const favUrl = normalizeMediaUrl(branding?.faviconUrl) || '/favicon.ico';
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.href = favUrl;
    }
  }, [branding?.faviconUrl]);

  // Dynamic Font family synchronization
  useEffect(() => {
    if (typeof document !== 'undefined' && branding?.fontFamily) {
      const font = branding.fontFamily.toLowerCase();
      if (font === 'cairo') {
        document.documentElement.style.fontFamily = 'var(--font-cairo), sans-serif';
      } else if (font === 'inter') {
        document.documentElement.style.fontFamily = 'var(--font-inter), sans-serif';
      } else {
        document.documentElement.style.fontFamily = `'${branding.fontFamily}', sans-serif`;
      }
    }
  }, [branding?.fontFamily]);

  useEffect(() => {
    // Synchronize HTML attributes on client mount
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = direction;

      // Apply dynamic branding theme colors with normalization against legacy cyan
      let primary = branding?.primaryColor || appearance?.primaryColor;
      let secondary = branding?.secondaryColor || appearance?.secondaryColor;
      let accent = branding?.accentColor || appearance?.accentColor;

      if (!primary || primary === '#00A3E0') primary = '#0866C6';
      if (!secondary) secondary = '#07345C';
      if (!accent || accent === '#38BDF8' || accent === '#EA051A') accent = '#F0444C';

      if (primary) {
        document.documentElement.style.setProperty('--cleanzo-blue', primary);
        document.documentElement.style.setProperty('--primary', primary);
        document.documentElement.style.setProperty('--ring', primary);
      }
      if (secondary) {
        document.documentElement.style.setProperty('--cleanzo-navy', secondary);
        document.documentElement.style.setProperty('--secondary', secondary);
      }
      if (accent) {
        document.documentElement.style.setProperty('--cleanzo-red', accent);
        document.documentElement.style.setProperty('--accent', accent);
      }
    }
  }, [locale, direction, branding?.primaryColor, branding?.secondaryColor, branding?.accentColor, appearance?.primaryColor, appearance?.secondaryColor, appearance?.accentColor]);

  const isMaintenanceActive = maintenanceMode && !pathname?.startsWith('/admin');

  let rawPrimary = branding?.primaryColor || appearance?.primaryColor;
  let rawSecondary = branding?.secondaryColor || appearance?.secondaryColor;
  let rawAccent = branding?.accentColor || appearance?.accentColor;

  if (!rawPrimary || rawPrimary === '#00A3E0') rawPrimary = '#0866C6';
  if (!rawSecondary) rawSecondary = '#07345C';
  if (!rawAccent || rawAccent === '#38BDF8' || rawAccent === '#EA051A') rawAccent = '#F0444C';

  const primary = rawPrimary;
  const secondary = rawSecondary;
  const accent = rawAccent;

  const currentTheme = appearance?.defaultTheme || 'system';

  useEffect(() => {
    if (typeof document !== 'undefined' && appearance?.defaultTheme) {
      if (appearance.defaultTheme === 'dark') {
        if (!localStorage.getItem('theme')) {
          document.documentElement.classList.add('dark');
        }
      } else if (appearance.defaultTheme === 'light') {
        if (!localStorage.getItem('theme')) {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, [appearance?.defaultTheme]);

  // Safe, graceful one-time cleanup of any legacy Service Worker & PWA Cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().catch(() => {});
          }
        }).catch(() => {});
      }
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          for (const name of cacheNames) {
            if (name.includes('cleanzo-cache') || name.includes('workbox')) {
              caches.delete(name).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={currentTheme}
      enableSystem={currentTheme === 'system'}
      disableTransitionOnChange
    >
      <style
        id="cleanzo-live-branding"
        dangerouslySetInnerHTML={{
          __html: `
            :root, html, body {
              --cleanzo-blue: ${primary};
              --cleanzo-navy: ${secondary};
              --cleanzo-red: ${accent};
              --color-primary: ${primary};
              --color-secondary: ${secondary};
              --color-accent: ${accent};
              --primary: ${primary};
              --ring: ${primary};
              --accent: ${accent};
            }

            .dark {
              --cleanzo-blue: #38BDF8;
              --cleanzo-navy: ${secondary};
              --cleanzo-red: ${accent};
              --color-primary: #38BDF8;
              --color-secondary: #0D3357;
              --color-accent: ${accent};
              --primary: #38BDF8;
              --ring: #38BDF8;
              --accent: ${accent};
            }
          `,
        }}
      />
      {isMaintenanceActive ? (
        <MaintenanceScreen />
      ) : (
        children
      )}
      <Toaster
        richColors
        closeButton
        duration={3500}
      />
    </ThemeProvider>
  );
}
