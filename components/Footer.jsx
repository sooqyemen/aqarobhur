'use client';

import Link from 'next/link';
import { useMemo } from 'react';

export default function Footer() {
  const rawPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const phone = String(rawPhone).trim();
  const waDigits = phone.replace(/^0/, '966').replace(/\D/g, '');
  const whatsappLink = `https://wa.me/${waDigits}`;

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const quickLinks = [
    { href: '/', label: 'الرئيسية', icon: 'home' },
    { href: '/listings', label: 'كل العقارات', icon: 'apartment' },
    { href: '/map', label: 'خريطة العقارات', icon: 'map' },
    { href: '/neighborhoods', label: 'دليل الأحياء', icon: 'location_city' },
    { href: '/request', label: 'أرسل طلبك العقاري', icon: 'add_home_work', highlight: true },
    { href: '/about', label: 'عن المنصة', icon: 'info' },
    { href: '/contact', label: 'اتصل بنا', icon: 'support_agent' },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <footer className="siteFooter">
        <div className="container">
          <div className="footerGrid">
            {/* القسم الأول: الهوية والتعريف */}
            <section className="footerSection brandSection">
              <div className="brandHead">
                <div className="logoWrapper">
                  <img src="/icon-128x128.png" alt="عقار أبحر" className="brandLogo" loading="lazy" />
                </div>
                <div>
                  <h3 className="brandTitle">عقار أبحر</h3>
                  <p className="brandDesc">
                    مكتب عقار أبحر | متخصصون في بيع، شراء، وتأجير العقارات السكنية والتجارية في جدة وأبحر.
                  </p>
                </div>
              </div>
              <div className="footerBadges">
                <span className="badge">بيع</span>
                <span className="badge">إيجار</span>
                <span className="badge">تسويق عقاري</span>
                <span className="badge">دعم واتساب</span>
                <span className="badge">خدمة 24/7</span>
              </div>
            </section>

            {/* القسم الثاني: الروابط السريعة */}
            <section className="footerSection">
              <h4 className="sectionTitle">روابط سريعة</h4>
              <nav className="footerLinks">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`footerLink ${link.highlight ? 'highlightLink' : ''}`}
                  >
                    <span className="material-icons-outlined">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>
            </section>

            {/* القسم الثالث: معلومات التواصل */}
            <section className="footerSection">
              <h4 className="sectionTitle">تواصل معنا</h4>
              <div className="contactList">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="contactItem whatsappBtn">
                  <span className="material-icons-outlined">chat</span>
                  <div className="contactInfo">
                    <span className="contactLabel">مراسلة عبر واتساب</span>
                    <span className="contactValue" dir="ltr">{phone}</span>
                  </div>
                </a>

                <a href={`tel:${phone}`} className="contactItem phoneBtn">
                  <span className="material-icons-outlined">phone_in_talk</span>
                  <div className="contactInfo">
                    <span className="contactLabel">اتصال هاتفي مباشر</span>
                    <span className="contactValue" dir="ltr">{phone}</span>
                  </div>
                </a>

                <a href="mailto:info@abhar.sa" className="contactItem emailBtn">
                  <span className="material-icons-outlined">email</span>
                  <div className="contactInfo">
                    <span className="contactLabel">البريد الإلكتروني</span>
                    <span className="contactValue">info@abhar.sa</span>
                  </div>
                </a>

                <div className="serviceBox">
                  <span className="material-icons-outlined">support_agent</span>
                  <span>الخدمة: استقبال طلبات البيع والإيجار والتسويق الحصري.</span>
                </div>

                <div className="socialLinks">
                  <a href="https://x.com/abhar" target="_blank" rel="noopener noreferrer" aria-label="تويتر">
                    <span className="material-icons-outlined">flutter_dash</span>
                  </a>
                  <a href="https://instagram.com/abhar" target="_blank" rel="noopener noreferrer" aria-label="انستغرام">
                    <span className="material-icons-outlined">photo_camera</span>
                  </a>
                  <a href="https://linkedin.com/company/abhar" target="_blank" rel="noopener noreferrer" aria-label="لينكد إن">
                    <span className="material-icons-outlined">business</span>
                  </a>
                </div>
              </div>
            </section>
          </div>

          <div className="footerBottom">
            <p>© {currentYear} عقار أبحر. جميع الحقوق محفوظة.</p>
            <div className="footerLegal">
              <Link href="/privacy">سياسة الخصوصية</Link>
              <span>|</span>
              <Link href="/terms">الشروط والأحكام</Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .siteFooter {
          background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
          color: #f8fafc;
          padding: 70px 0 20px;
          margin-top: auto;
          border-top: 4px solid #0f766e;
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.05);
        }

        .container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .footerGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 48px;
          margin-bottom: 48px;
        }

        .brandSection {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .brandHead {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .logoWrapper {
          background: rgba(255, 255, 255, 0.95);
          padding: 6px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
        }

        .brandLogo {
          width: 54px;
          height: 54px;
          object-fit: contain;
        }

        .brandTitle {
          margin: 0 0 6px 0;
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .brandDesc {
          margin: 0;
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.8;
        }

        .footerBadges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .badge {
          background: rgba(255, 255, 255, 0.08);
          color: #e2e8f0;
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }

        .badge:hover {
          background: rgba(15, 118, 110, 0.25);
          color: #5eead4;
          border-color: rgba(15, 118, 110, 0.5);
          transform: translateY(-2px);
        }

        .sectionTitle {
          margin: 0 0 24px 0;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          position: relative;
          padding-bottom: 12px;
        }

        .sectionTitle::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 45px;
          height: 3px;
          background: #0f766e;
          border-radius: 4px;
        }

        .footerLinks {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .footerLink {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #cbd5e1;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.2s ease;
          padding: 4px 0;
          border-radius: 8px;
        }

        .footerLink .material-icons-outlined {
          font-size: 20px;
          opacity: 0.7;
          transition: transform 0.2s, opacity 0.2s;
        }

        .footerLink:hover {
          color: #5eead4;
          transform: translateX(-6px);
        }

        .footerLink:hover .material-icons-outlined {
          opacity: 1;
          transform: scale(1.05);
        }

        .highlightLink {
          color: #5eead4;
          font-weight: 700;
        }

        .highlightLink:hover {
          color: #99f6e4;
        }

        .contactList {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .contactItem {
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          transition: all 0.25s ease;
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(4px);
        }

        .whatsappBtn:hover {
          background: rgba(37, 211, 102, 0.12);
          border-color: rgba(37, 211, 102, 0.4);
          transform: translateY(-2px);
        }

        .whatsappBtn .material-icons-outlined {
          color: #25d366;
        }

        .phoneBtn:hover {
          background: rgba(15, 118, 110, 0.12);
          border-color: rgba(15, 118, 110, 0.4);
          transform: translateY(-2px);
        }

        .phoneBtn .material-icons-outlined {
          color: #5eead4;
        }

        .emailBtn:hover {
          background: rgba(100, 116, 139, 0.12);
          border-color: rgba(100, 116, 139, 0.4);
          transform: translateY(-2px);
        }

        .emailBtn .material-icons-outlined {
          color: #94a3b8;
        }

        .contactInfo {
          display: flex;
          flex-direction: column;
        }

        .contactLabel {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .contactValue {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          font-family: 'Cairo', monospace;
          letter-spacing: 0.3px;
        }

        .serviceBox {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(255, 255, 255, 0.03);
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.7;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          margin: 8px 0 4px;
        }

        .serviceBox .material-icons-outlined {
          font-size: 20px;
          color: #64748b;
        }

        .socialLinks {
          display: flex;
          gap: 16px;
          margin-top: 12px;
          justify-content: flex-start;
        }

        .socialLinks a {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          color: #cbd5e1;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .socialLinks a:hover {
          background: #0f766e;
          color: white;
          transform: translateY(-3px);
          border-color: transparent;
        }

        .socialLinks .material-icons-outlined {
          font-size: 22px;
        }

        .footerBottom {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          padding-top: 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          font-size: 14px;
        }

        .footerBottom p {
          margin: 0;
        }

        .footerLegal {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .footerLegal a {
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footerLegal a:hover {
          color: #5eead4;
        }

        @media (max-width: 768px) {
          .siteFooter {
            padding: 48px 0 20px;
          }

          .footerGrid {
            gap: 40px;
          }

          .brandHead {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .brandDesc {
            text-align: center;
          }

          .footerBadges {
            justify-content: center;
          }

          .sectionTitle::after {
            right: 50%;
            transform: translateX(50%);
          }

          .sectionTitle {
            text-align: center;
          }

          .footerLinks {
            align-items: center;
          }

          .footerLink {
            justify-content: center;
          }

          .contactItem {
            justify-content: center;
          }

          .serviceBox {
            justify-content: center;
            text-align: center;
          }

          .socialLinks {
            justify-content: center;
          }

          .footerBottom {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .container {
            padding: 0 16px;
          }

          .footerGrid {
            grid-template-columns: 1fr;
            gap: 32px;
          }

          .footerBadges {
            gap: 8px;
          }

          .badge {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}
