import './globals.css';
import { Cairo } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppBar from '@/components/WhatsAppBar';
import SiteViewTracker from '@/components/analytics/SiteViewTracker';

const cairo = Cairo({ 
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata = {
  title: 'عقار أبحر | خيارك الأول لعقارات جدة',
  description: 'منصة عقار أبحر هي بوابتك المتطورة للبحث عن أفضل العقارات في مدينة جدة وأبحر، بيع وشراء وتأجير وإدارة أملاك باحترافية وموثوقية عالية.',
  keywords: 'عقار, أبحر, جدة, عقارات جدة, أراضي أبحر, فلل للبيع, شقق تمليك, إدارة أملاك, تسويق عقاري',
  openGraph: {
    title: 'عقار أبحر | دليلك العقاري',
    description: 'اكتشف أفضل العروض العقارية في أبحر وجدة.',
    locale: 'ar_SA',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.className}>
      <body>
        <SiteViewTracker />
        <Header />

        <main className="mainContent">
          {children}
        </main>

        <Footer />
        <WhatsAppBar />
      </body>
    </html>
  );
}
