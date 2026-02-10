'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { buildWhatsAppLink } from './WhatsAppBar';

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');

  // الحصول على رقم الواتساب من المتغيرات البيئية
  useEffect(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
    setWhatsappNumber(phone);
    
    // إنشاء رابط الواتساب
    const waDigits = String(phone).replace(/\D/g, '');
    setWhatsappLink(`https://wa.me/${waDigits}`);
  }, []);

  // تحديث السنة تلقائياً
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // روابط الموقع الرئيسية
  const mainLinks = [
    { href: '/', label: 'الرئيسية' },
    { href: '/listings', label: 'كل العروض' },
    { href: '/request', label: 'أرسل طلبك' },
    { href: '/map', label: 'الخريطة' },
    { href: '/neighborhoods', label: 'الأحياء' },
  ];

  // روابط إضافية
  const extraLinks = [
    { href: '/about', label: 'عن عقار أبحر' },
    { href: '/contact', label: 'اتصل بنا' },
    { href: '/privacy', label: 'سياسة الخصوصية' },
    { href: '/terms', label: 'الشروط والأحكام' },
  ];

  // معلومات الاتصال
  const contactInfo = {
    whatsapp: whatsappNumber,
    email: 'info@aqarobhur.com',
    hours: 'يومياً: 9 صباحاً - 12 مساءً',
  };

  return (
    <footer className="footer">
      <div className="footerWave">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" />
        </svg>
      </div>

      <div className="container">
        <div className="footerContent">
          
          {/* القسم الأول: معلومات العلامة التجارية */}
          <div className="footerSection">
            <div className="footerLogo">
              <div className="logoMark">🏠</div>
              <div className="logoText">
                <h3 className="logoTitle">عقار أبحر</h3>
                <p className="logoSubtitle">شمال جدة</p>
              </div>
            </div>
            
            <p className="footerDescription">
              منصة عقارية متخصصة في عروض أبحر الشمالية وشمال جدة. 
              نقدم لك أفضل العروض العقارية مع خدمة التواصل المباشر عبر واتساب.
            </p>
            
            <div className="socialLinks">
              <a href={whatsappLink} className="socialLink whatsapp" target="_blank" rel="noopener noreferrer" aria-label="واتساب">
                <span className="socialIcon">💬</span>
              </a>
              <a href="https://twitter.com" className="socialLink twitter" target="_blank" rel="noopener noreferrer" aria-label="تويتر">
                <span className="socialIcon">🐦</span>
              </a>
              <a href="https://instagram.com" className="socialLink instagram" target="_blank" rel="noopener noreferrer" aria-label="انستغرام">
                <span className="socialIcon">📸</span>
              </a>
            </div>
          </div>

          {/* القسم الثاني: روابط سريعة */}
          <div className="footerSection">
            <h4 className="sectionTitle">روابط سريعة</h4>
            <ul className="footerLinks">
              {mainLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footerLink">
                    <span className="linkBullet">•</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* القسم الثالث: معلومات الاتصال */}
          <div className="footerSection">
            <h4 className="sectionTitle">تواصل معنا</h4>
            <div className="contactInfo">
              <a href={whatsappLink} className="contactItem" target="_blank" rel="noopener noreferrer">
                <span className="contactIcon">📱</span>
                <div>
                  <span className="contactLabel">واتساب</span>
                  <span className="contactValue">{whatsappNumber}</span>
                </div>
              </a>
              
              <div className="contactItem">
                <span className="contactIcon">📧</span>
                <div>
                  <span className="contactLabel">البريد الإلكتروني</span>
                  <span className="contactValue">{contactInfo.email}</span>
                </div>
              </div>
              
              <div className="contactItem">
                <span className="contactIcon">🕐</span>
                <div>
                  <span className="contactLabel">ساعات العمل</span>
                  <span className="contactValue">{contactInfo.hours}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* حقوق النشر والشعار */}
        <div className="footerBottom">
          <div className="copyright">
            <p>© {currentYear} عقار أبحر. جميع الحقوق محفوظة.</p>
            <p className="copyrightNote">
              هذا الموقع يهدف لتسهيل عملية البحث العقاري ولا نتحمل مسؤولية أي معاملات مالية.
            </p>
          </div>
          
          <div className="footerExtra">
            <div className="extraLinks">
              {extraLinks.map((link) => (
                <Link key={link.href} href={link.href} className="extraLink">
                  {link.label}
                </Link>
              ))}
            </div>
            
            <div className="madeWith">
              <span className="madeWithText">صنع بـ</span>
              <span className="heartIcon">❤️</span>
              <span className="madeWithText">في جدة</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer {
          position: relative;
          background: var(--bg2);
          border-top: 1px solid var(--border);
          margin-top: 60px;
          padding-top: 60px;
          color: var(--text);
        }

        .footerWave {
          position: absolute;
          top: -1px;
          left: 0;
          right: 0;
          height: 100px;
          overflow: hidden;
          line-height: 0;
        }

        .footerWave svg {
          position: relative;
          display: block;
          width: calc(100% + 1.3px);
          height: 100px;
          transform: rotateY(180deg);
        }

        .footerWave path {
          fill: var(--bg2);
        }

        .footerContent {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 40px;
          margin-bottom: 40px;
        }

        .footerSection {
          display: flex;
          flex-direction: column;
        }

        /* شعار الفوتر */
        .footerLogo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .logoMark {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: var(--shadow-primary);
        }

        .logoText {
          display: flex;
          flex-direction: column;
        }

        .logoTitle {
          font-size: 22px;
          font-weight: 900;
          margin: 0;
          background: linear-gradient(to right, var(--primary), #fff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .logoSubtitle {
          font-size: 13px;
          color: var(--muted);
          margin: 4px 0 0 0;
          font-weight: 700;
        }

        .footerDescription {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        /* روابط التواصل الاجتماعي */
        .socialLinks {
          display: flex;
          gap: 12px;
          margin-top: 10px;
        }

        .socialLink {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          color: var(--text);
          transition: all 0.2s ease;
        }

        .socialLink:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
          background: var(--primary-light);
          color: var(--primary);
        }

        .socialIcon {
          font-size: 20px;
        }

        .whatsapp:hover {
          background: rgba(37, 211, 102, 0.1);
          border-color: #25D366;
          color: #25D366;
        }

        .twitter:hover {
          background: rgba(29, 161, 242, 0.1);
          border-color: #1DA1F2;
          color: #1DA1F2;
        }

        .instagram:hover {
          background: rgba(225, 48, 108, 0.1);
          border-color: #E1306C;
          color: #E1306C;
        }

        /* عناوين الأقسام */
        .sectionTitle {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 20px 0;
          color: var(--text);
          position: relative;
          padding-bottom: 10px;
        }

        .sectionTitle::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 40px;
          height: 3px;
          background: linear-gradient(to right, var(--primary), transparent);
          border-radius: 2px;
        }

        /* روابط الفوتر */
        .footerLinks {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .footerLinks li {
          margin: 0;
        }

        .footerLink {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s ease;
          padding: 6px 0;
        }

        .footerLink:hover {
          color: var(--primary);
          transform: translateX(-5px);
        }

        .linkBullet {
          color: var(--primary);
          font-size: 20px;
          transition: transform 0.2s ease;
        }

        .footerLink:hover .linkBullet {
          transform: scale(1.3);
        }

        /* معلومات الاتصال */
        .contactInfo {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .contactItem {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: var(--text);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .contactItem:hover {
          color: var(--primary);
        }

        .contactIcon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(214, 179, 91, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          color: var(--primary);
        }

        .contactItem:hover .contactIcon {
          background: var(--primary-light);
          transform: scale(1.05);
        }

        .contactLabel {
          display: block;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 2px;
        }

        .contactValue {
          display: block;
          font-size: 14px;
          font-weight: 700;
        }

        /* قسم حقوق النشر */
        .footerBottom {
          border-top: 1px solid var(--border);
          padding-top: 30px;
          padding-bottom: 30px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .copyright {
          text-align: center;
        }

        .copyright p {
          margin: 0;
          font-size: 14px;
          color: var(--muted);
        }

        .copyrightNote {
          font-size: 12px !important;
          margin-top: 8px !important;
          opacity: 0.7;
        }

        .footerExtra {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .extraLinks {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
        }

        .extraLink {
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
          transition: color 0.2s ease;
        }

        .extraLink:hover {
          color: var(--primary);
        }

        .madeWith {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--muted);
        }

        .heartIcon {
          color: #ef4444;
          animation: heartbeat 1.5s ease-in-out infinite;
        }

        @keyframes heartbeat {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        /* التجاوب مع الشاشات المختلفة */
        @media (min-width: 768px) {
          .footerContent {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .footerBottom {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
          
          .copyright {
            text-align: right;
          }
          
          .footerExtra {
            align-items: flex-start;
          }
          
          .extraLinks {
            justify-content: flex-start;
          }
        }

        @media (min-width: 1024px) {
          .footerContent {
            gap: 60px;
          }
        }

        @media (max-width: 767px) {
          .footer {
            margin-top: 40px;
            padding-top: 40px;
          }
          
          .footerWave {
            height: 60px;
          }
          
          .footerWave svg {
            height: 60px;
          }
          
          .logoTitle {
            font-size: 20px;
          }
          
          .sectionTitle {
            font-size: 16px;
          }
          
          .extraLinks {
            gap: 15px;
          }
        }

        @media (max-width: 480px) {
          .footerContent {
            gap: 30px;
          }
          
          .footerLogo {
            flex-direction: column;
            text-align: center;
          }
          
          .logoText {
            align-items: center;
          }
          
          .footerDescription {
            text-align: center;
          }
          
          .socialLinks {
            justify-content: center;
          }
          
          .sectionTitle {
            text-align: center;
          }
          
          .sectionTitle::after {
            right: 50%;
            transform: translateX(50%);
          }
        }

        /* تحسينات للطباعة */
        @media print {
          .footer {
            border-top: 2px solid #000;
            background: #fff;
            color: #000;
            margin-top: 0;
            padding-top: 20px;
          }
          
          .footerWave {
            display: none;
          }
          
          .socialLinks {
            display: none;
          }
          
          .heartIcon {
            animation: none;
          }
        }

        /* تحسينات للوصول */
        .footerLink:focus-visible,
        .socialLink:focus-visible,
        .contactItem:focus-visible,
        .extraLink:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 3px;
          border-radius: 4px;
        }
      `}</style>
    </footer>
  );
}
