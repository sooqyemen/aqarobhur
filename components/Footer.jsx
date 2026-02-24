'use client';

import Link from 'next/link';

export default function Footer() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const waDigits = String(phone).replace(/\D/g, '');
  const whatsappLink = `https://wa.me/${waDigits}`;

  const mainLinks = [
    { href: '/', label: 'الرئيسية' },
    { href: '/listings', label: 'كل العروض' },
    { href: '/request', label: 'أرسل طلبك' },
    { href: '/map', label: 'الخريطة' },
    { href: '/neighborhoods', label: 'الأحياء' },
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footerMain">
          <div className="brand">
            <div className="footerLogo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logoIcon" src="/logo-icon-128.png" alt="" />
              <div className="logoText">
                <h3 className="logoTitle">عقار أبحر</h3>
                <span className="logoSubtitle">شمال جدة</span>
              </div>
            </div>
          </div>

          <div className="contactRow">
            <a href={whatsappLink} className="contactItem" target="_blank" rel="noopener noreferrer">
              <span className="contactLabel">واتساب</span>
              <span className="contactValue">{phone}</span>
            </a>

            <div className="contactItem">
              <span className="contactLabel">البريد</span>
              <span className="contactValue">info@aqarobhur.com</span>
            </div>

            <div className="contactItem">
              <span className="contactLabel">الدوام</span>
              <span className="contactValue">9ص - 12م</span>
            </div>
          </div>

          <div className="quickRow">
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href} className="quickLink">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="copyright">
          <p>© {new Date().getFullYear()} عقار أبحر. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
