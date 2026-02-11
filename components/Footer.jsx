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
        {/* الصف العلوي: شعار + معلومات الاتصال + روابط سريعة */}
        <div className="footerMain">
          {/* الشعار */}
          <div className="brand">
            <div className="footerLogo">
              <span className="logoIcon">🏠</span>
              <div className="logoText">
                <h3 className="logoTitle">عقار أبحر</h3>
                <span className="logoSubtitle">شمال جدة</span>
              </div>
            </div>
          </div>

          {/* معلومات الاتصال - أفقية */}
          <div className="contactRow">
            <a href={whatsappLink} className="contactItem" target="_blank" rel="noopener noreferrer">
              <span className="contactIcon">📱</span>
              <span className="contactValue">{phone}</span>
            </a>
            <div className="contactItem">
              <span className="contactIcon">📧</span>
              <span className="contactValue">info@aqarobhur.com</span>
            </div>
            <div className="contactItem">
              <span className="contactIcon">🕐</span>
              <span className="contactValue">9ص - 12م</span>
            </div>
          </div>

          {/* الروابط السريعة - أفقية */}
          <div className="quickRow">
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href} className="quickLink">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* حقوق النشر - سطر واحد فقط */}
        <div className="copyright">
          <p>© {new Date().getFullYear()} عقار أبحر. جميع الحقوق محفوظة.</p>
        </div>
      </div>

      <style jsx>{`
        .footer {
          background: var(--bg2);
          border-top: 1px solid var(--border);
          padding: 25px 0 15px;
          margin-top: 40px;
          color: var(--text);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* الصف الرئيسي - ترتيب أفقي للأقسام */
        .footerMain {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 20px 40px;
          margin-bottom: 25px;
        }

        /* الشعار - مضغوط */
        .brand {
          flex-shrink: 0;
        }

        .footerLogo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logoIcon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: var(--shadow-primary);
        }

        .logoText {
          display: flex;
          flex-direction: column;
        }

        .logoTitle {
          font-size: 18px;
          font-weight: 900;
          margin: 0;
          background: linear-gradient(to right, var(--primary), #fff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .logoSubtitle {
          font-size: 11px;
          color: var(--muted);
          margin-top: 2px;
          font-weight: 700;
        }

        /* معلومات الاتصال - أفقية */
        .contactRow {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 20px;
          align-items: center;
        }

        .contactItem {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(214, 179, 91, 0.08);
          border: 1px solid var(--border);
          border-radius: 40px;
          color: var(--text);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .contactItem:hover {
          background: var(--primary-light);
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-2px);
        }

        .contactIcon {
          font-size: 16px;
        }

        .contactValue {
          line-height: 1;
        }

        /* الروابط السريعة - أفقية */
        .quickRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .quickLink {
          padding: 6px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 30px;
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .quickLink:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
          transform: translateY(-2px);
        }

        /* حقوق النشر */
        .copyright {
          border-top: 1px solid var(--border);
          padding-top: 15px;
          text-align: center;
        }

        .copyright p {
          margin: 0;
          font-size: 12px;
          color: var(--muted);
        }

        /* ========== التجاوب مع الشاشات المتوسطة والصغيرة ========== */
        @media (max-width: 900px) {
          .footerMain {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }

          .brand {
            display: flex;
            justify-content: center;
          }

          .contactRow,
          .quickRow {
            justify-content: center;
          }

          .contactItem,
          .quickLink {
            white-space: nowrap;
          }
        }

        @media (max-width: 480px) {
          .contactRow {
            flex-direction: column;
            align-items: stretch;
          }

          .contactItem {
            justify-content: center;
            white-space: normal;
            width: 100%;
          }

          .quickRow {
            justify-content: center;
          }

          .quickLink {
            white-space: nowrap;
          }
        }

        /* تحسين الوصول */
        .quickLink:focus-visible,
        .contactItem:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 3px;
        }
      `}</style>
    </footer>
  );
}
