import './globals.css';
import './home.css';
import './mobile-fixes.css';
import './account-menu-fixes.css';
import './home-map-fixes.css';
import { Cairo } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppBar from '@/components/WhatsAppBar';
import MobileNav from '@/components/MobileNav';
import SiteViewTracker from '@/components/analytics/SiteViewTracker';
import HomeMapRuntimePatch from '@/components/HomeMapRuntimePatch';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata = {
  title: 'عقار أبحر | خيارك الأول لعقارات جدة',
  description: 'منصة عقار أبحر للبحث عن العقارات في أبحر الشمالية وشمال جدة.',
  keywords: 'عقار أبحر, عقارات أبحر الشمالية, عقارات شمال جدة',
  openGraph: {
    title: 'عقار أبحر | دليلك العقاري',
    description: 'اكتشف عروض الأراضي والفلل والشقق في أبحر الشمالية وشمال جدة.',
    locale: 'ar_SA',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#b8842f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.className}>
      <body>
        <SiteViewTracker />
        <HomeMapRuntimePatch />
        <Header />
        <main className="mainContent">{children}</main>
        <Footer />
        <MobileNav />
        <WhatsAppBar />
      </body>
    </html>
  );
}
