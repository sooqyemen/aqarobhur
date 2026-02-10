import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import WhatsAppBar from '@/components/WhatsAppBar';

export const metadata = {
  title: 'عقار أبحر',
  description: 'عروض عقارية في أبحر الشمالية وشمال جدة + استقبال الطلبات عبر واتساب',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="appShell">
          <Header />
          <main className="appMain">
            {children}
          </main>
          <Footer />
          <MobileNav />
          <WhatsAppBar />
        </div>
      </body>
    </html>
  );
}
