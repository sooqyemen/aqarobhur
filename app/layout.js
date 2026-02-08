import './globals.css';

export const metadata = {
  title: 'عقار أبحر',
  description: 'عروض عقارية في أبحر الشمالية وشمال جدة + استقبال الطلبات عبر واتساب',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
