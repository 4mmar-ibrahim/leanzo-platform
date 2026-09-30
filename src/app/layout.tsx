import type { Metadata } from 'next';
import { Cairo, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/common/Providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { TopAnnouncementBanner } from '@/components/layout/TopAnnouncementBanner';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CLEANZO — خدمات تنظيف العناية بالسيارات والمنازل المتخصصة',
    template: '%s | CLEANZO',
  },
  description: 'احجز أفضل خدمات تنظيف وتلميع السيارات والعناية بالمنزل بالبخار والتعقيم مع كلينزو. خبراء مدربون، دقة في المواعيد، وأسعار شفافة في مصر.',
  keywords: ['كلينزو', 'غسيل سيارات متنقل', 'ديتيلينج سيارات', 'تنظيف منازل بالبخار', 'تعقيم منازل', 'غسيل كنب بالبخار', 'Cleanzo car wash', 'home cleaning egypt'],
  authors: [{ name: 'Cleanzo Team' }],
  openGraph: {
    title: 'CLEANZO — خدمات تنظيف العناية بالسيارات والمنازل المتخصصة',
    description: 'مساحات نظيفة. قيادة نقية. كلينزو. منصة الحجز الأولى للعناية بالسيارات والمنازل.',
    url: 'https://cleanzo.app',
    siteName: 'Cleanzo',
    locale: 'ar_EG',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/brand/zo/cleanzo-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/zo/cleanzo-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/brand/zo/cleanzo-logo.png',
    apple: '/brand/zo/cleanzo-logo.png',
  },
};

import { CentralZoEngine } from '@/components/mascot/CentralZoEngine';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} ${inter.variable} overflow-x-hidden max-w-full`}>
      <body className="font-sans antialiased min-h-screen flex flex-col overflow-x-hidden max-w-full w-full bg-[#F5F8FC] dark:bg-[#041728] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-[#0866C6] selection:text-white">
        <Providers>
          <TopAnnouncementBanner />
          <Header />
          <main className="flex-1 flex flex-col pb-28 lg:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
          <CentralZoEngine />
        </Providers>
      </body>
    </html>
  );
}
