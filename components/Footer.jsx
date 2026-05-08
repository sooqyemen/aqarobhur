'use client';

import Link from 'next/link';

const quickLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/neighborhoods', label: 'الأحياء' },
  { href: '/map', label: 'الخريطة' },
  { href: '/request', label: 'أرسل طلبك' },
  { href: '/add', label: 'إضافة إعلان' },
];

const infoLinks = [
  { href: '/about', label: 'من نحن' },
  { href: '/terms', label: 'شروط الاستخدام' },
  { href: '/privacy', label: 'سياسة الخصوصية' },
  { href: '/faq', label: 'الأسئلة الشائعة' },
  { href: '/contact', label: 'تواصل معنا' },
];

const seoLinks = [
  { href: '/listings?dealType=sale', label: 'عقارات للبيع في أبحر الشمالية' },
  { href: '/listings?propertyType=أرض&dealType=sale', label: 'أراضي للبيع شمال جدة' },
  { href: '/listings?propertyType=شقة&dealType=rent', label: 'شقق للإيجار شمال جدة' },
  { href: '/listings?propertyType=فيلا&dealType=sale', label: 'فلل للبيع في أبحر' },
  { href: '/listings?neighborhood=جوهرة العروس', label: 'عقارات جوهرة العروس' },
  { href: '/listings?neighborhood=الهجرة', label: 'عقارات الهجرة' },
  { href: '/listings?neighborhood=طيبة الفرعية', label: 'عقارات طيبة الفرعية' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="premiumFooter">
      <div className="container footerGrid">
        <section className="footerBrand">
          <div className="footerLogo">
            <span className="mark">ع</span>
            <div>
              <strong>عقار أبحر</strong>
              <small>عقارك في أبحر وشمال جدة</small>
            </div>
          </div>
          <p>
            منصة عقارية متخصصة في أرقى أحياء أبحر وشمال جدة. نربط بين البائعين والمشترين
            بشفافية واحترافية.
          </p>
          <div className="socials" aria-label="روابط التواصل">
            <a href="#" aria-label="Instagram">◎</a>
            <a href="#" aria-label="X">𝕏</a>
            <a href="#" aria-label="WhatsApp">☎</a>
            <a href="#" aria-label="YouTube">▶</a>
          </div>
        </section>

        <section className="footerColumn">
          <h3>روابط مهمة</h3>
          {quickLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </section>

        <section className="footerColumn">
          <h3>معلومات</h3>
          {infoLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </section>

        <section className="footerColumn contactColumn">
          <h3>تواصل معنا</h3>
          <a href="tel:+966501234567">+966 50 123 4567</a>
          <a href="mailto:info@aqarabhur.com">info@aqarabhur.com</a>
          <span>أبحر الشمالية، جدة</span>
          <span>المملكة العربية السعودية</span>
        </section>
      </div>

      <div className="container footerSeo">
        {seoLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </div>

      <div className="container footerBottom">
        <p>© {currentYear} عقار أبحر. جميع الحقوق محفوظة.</p>
        <span>تصميم وتطوير</span>
      </div>

      <style jsx>{`
        .premiumFooter {
          margin-top: 26px;
          padding: 44px 0 18px;
          background:
            radial-gradient(circle at 18% 0, rgba(184,132,47,.18), transparent 34%),
            linear-gradient(180deg, #121b2b 0%, #07111f 100%);
          color: #e5e7eb;
          border-top: 1px solid rgba(184,132,47,.25);
        }

        .footerGrid {
          display: grid;
          grid-template-columns: 1.45fr .85fr .85fr 1fr;
          gap: 34px;
          align-items: start;
        }

        .footerLogo {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .mark {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #d7ad55;
          border: 1px solid rgba(215,173,85,.32);
          background: rgba(255,255,255,.06);
          font-weight: 950;
          font-size: 24px;
        }
        .footerLogo strong {
          display: block;
          color: #d7ad55;
          font-size: 22px;
          font-weight: 950;
        }
        .footerLogo small {
          display: block;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 800;
        }

        .footerBrand p {
          max-width: 390px;
          margin: 0 0 18px;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.9;
          font-weight: 700;
        }

        .socials {
          display: flex;
          gap: 10px;
        }
        .socials a {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
        }

        .footerColumn h3 {
          margin: 0 0 14px;
          color: #fff;
          font-size: 16px;
          font-weight: 950;
        }
        .footerColumn a,
        .footerColumn span {
          display: block;
          color: #cbd5e1;
          font-size: 14px;
          font-weight: 750;
          line-height: 2.1;
          text-decoration: none;
        }
        .footerColumn a:hover { color: #d7ad55; }

        .footerSeo {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 30px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,.09);
        }
        .footerSeo a {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          color: #f8fafc;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(215,173,85,.18);
          font-size: 12px;
          font-weight: 850;
          text-decoration: none;
        }
        .footerSeo a:hover { background: rgba(215,173,85,.16); }

        .footerBottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,.08);
          color: #94a3b8;
          font-size: 13px;
          font-weight: 800;
        }
        .footerBottom p { margin: 0; }
        .footerBottom span { color: #d7ad55; }

        @media (max-width: 980px) {
          .footerGrid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .premiumFooter { padding-bottom: 86px; }
          .footerGrid { grid-template-columns: 1fr; gap: 24px; }
          .footerBottom { flex-direction: column; align-items: flex-start; }
          .footerSeo a:nth-child(n + 6) { display: none; }
        }
      `}</style>
    </footer>
  );
}
