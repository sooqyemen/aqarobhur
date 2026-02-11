'use client';

import Link from 'next/link';
import { buildWhatsAppLink } from './WhatsAppBar';

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
        <div className="footerContent">
          {/* الشعار */}
          <div className="footerSection brand">
            <div className="footerLogo">
              <span className="logoMark">🏠</span>
              <div className="logoText">
                <h3 className="logoTitle">عقار أبحر</h3>
                <span className="logoSubtitle">شمال جدة</span>
              </div>
            </div>
          </div>

          {/* معلومات الاتصال - داخل أيقونات */}
          <div className="footerSection contact">
            <h4 className="sectionTitle">تواصل معنا</h4>
            <div className="contactPills">
              <a href={whatsappLink} className="contactPill" target="_blank" rel="noopener noreferrer">
                <span className="pillIcon">📱</span>
                <span className="pillText">{phone}</span>
              </a>
              <div className="contactPill">
                <span className="pillIcon">📧</span>
                <span className="pillText">info@aqarobhur.com</span>
              </div>
              <div className="contactPill">
                <span className="pillIcon">🕐</span>
                <span className="pillText">9ص - 12م</span>
              </div>
            </div>
          </div>

          {/* روابط سريعة - داخل أيقونات */}
          <div className="footerSection quick">
            <h4 className="sectionTitle">روابط سريعة</h4>
            <div className="quickPills">
              {mainLinks.map((link) => (
                <Link key={link.href} href={link.href} className="quickPill">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* حقوق النشر فقط - بدون أي إضافات */}
        <div className="copyright">
          <p>© {new Date().getFullYear()} عقار أبحر. جميع الحقوق محفوظة.</p>
        </div>
      </div>

      <style jsx>{`
        .footer {
          background: var(--bg2);
          border-top: 1px solid var(--border);
          padding: 30px 0 20px;
          margin-top: 40px;
          color: var(--text);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .footerContent {
          display: grid;
          grid-template-columns: 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        @media (min-width: 768px) {
          .footerContent {
            grid-template-columns: 1fr 1.2fr 1fr;
            align-items: start;
          }
        }

        /* الشعار */
        .footerLogo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logoMark {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
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

        /* عناوين الأقسام - صغيرة ومضغوطة */
        .sectionTitle {
          font-size: 15px;
          font-weight: 800;
          margin: 0 0 15px 0;
          color: var(--text);
          position: relative;
          padding-bottom: 6px;
        }

        .sectionTitle::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 30px;
          height: 2px;
          background: var(--primary);
          border-radius: 2px;
        }

        /* حبوب الاتصال - أيقونة + نص داخل شكل بيضاوي */
        .contactPills {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contactPill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(214, 179, 91, 0.08);
          border: 1px solid var(--border);
          border-radius: 40px;
          color: var(--text);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          width: fit-content;
        }

        .contactPill:hover {
          background: var(--primary-light);
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-2px);
        }

        .pillIcon {
          font-size: 16px;
        }

        .pillText {
          line-height: 1;
        }

        /* حبوب الروابط السريعة - كل رابط داخل كبسولة */
        .quickPills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .quickPill {
          padding: 6px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 30px;
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .quickPill:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
          transform: translateY(-2px);
        }

        /* حقوق النشر - سطر واحد فقط */
        .copyright {
          border-top: 1px solid var(--border);
          padding-top: 20px;
          text-align: center;
        }

        .copyright p {
          margin: 0;
          font-size: 13px;
          color: var(--muted);
        }

        /* تجاوب للشاشات الصغيرة */
        @media (max-width: 767px) {
          .footer {
            padding: 25px 0 15px;
          }

          .footerContent {
            gap: 25px;
          }

          .brand {
            text-align: center;
          }

          .footerLogo {
            justify-content: center;
          }

          .sectionTitle::after {
            right: 50%;
            transform: translateX(50%);
          }

          .contactPill,
          .quickPills {
            justify-content: center;
          }

          .contactPills {
            align-items: center;
          }
        }

        /* تحسين الوصول */
        .quickPill:focus-visible,
        .contactPill:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 3px;
        }
      `}</style>
    </footer>
  );
}
