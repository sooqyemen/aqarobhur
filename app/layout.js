import './globals.css';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import WhatsAppBar from '@/components/WhatsAppBar';

export const metadata = {
  metadataBase: new URL('https://aqarobhur.com'),
  title: 'عقار أبحر',
  description: 'عروض عقارية في أبحر الشمالية وشمال جدة + استقبال الطلبات عبر واتساب.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192x192.png', type: 'image/png', sizes: '192x192' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico']
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'عقار أبحر',
    description: 'عروض عقارية في أبحر الشمالية وشمال جدة + استقبال الطلبات عبر واتساب.',
    images: ['/logo-full-1024.png'],
    locale: 'ar_SA',
    siteName: 'عقار أبحر',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'عقار أبحر',
    description: 'عروض عقارية في أبحر الشمالية وشمال جدة + استقبال الطلبات عبر واتساب.',
    images: ['/logo-full-1024.png']
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="appShell">
          <Header />
          <main className="appMain">{children}</main>
          <Footer />
          <MobileNav />
          <WhatsAppBar />
        </div>
      </body>
    </html>
  );
}
