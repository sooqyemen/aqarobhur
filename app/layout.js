import './globals.css';

export const metadata = {
  title: 'عقار أبحر | aqarobhur.com',
  description: 'موقع عقارات أبحر الشمالية — عروض وطلبات الأراضي والفلل والشقق.',
  metadataBase: new URL('https://aqarobhur.com'),
};

const WHATSAPP = 'https://wa.me/966597520693'; // غيّر الرقم

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="header">
          <div className="container headerInner">
            <div className="brand">
              <div className="logo">A</div>
              <div className="brandText">
                <div className="brandTitle">عقار أبحر</div>
                <div className="brandSub">أبحر الشمالية • جدة</div>
              </div>
            </div>

            <nav className="nav">
              <a className="navLink" href="#offers">العروض</a>
              <a className="navLink" href="#request">اطلب عقار</a>
              <a className="navLink" href={WHATSAPP} target="_blank" rel="noreferrer">واتساب</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="footer" id="contact">
          <div className="container footerInner">
            <div>
              <div className="footerTitle">عقار أبحر</div>
              <div className="muted">© {new Date().getFullYear()} aqarobhur.com</div>
            </div>
            <div className="muted">
              تواصل واتساب: <a className="link" href={WHATSAPP} target="_blank" rel="noreferrer">اضغط هنا</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
