'use client';

import Link from 'next/link';
import { getFooterSeoGroups } from '@/lib/areaCatalog';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const seoGroups = getFooterSeoGroups();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo">
              <strong>
                عقار<span> أبحر</span>
              </strong>
            </div>

            <p className="footer-tagline">
              وجهتك الموثوقة للعقارات في أبحر الشمالية وشمال جدة، أراضي، فلل،
              شقق، بيع وإيجار.
            </p>
          </div>

          <div className="footer-nav">
            <div className="footer-col">
              <h4>الشركة</h4>
              <Link href="/about">من نحن</Link>
              <Link href="/contact">اتصل بنا</Link>
            </div>

            <div className="footer-col">
              <h4>الخدمات</h4>
              <Link href="/marketing-request">تسويق عقار</Link>
              <Link href="/ejar-request">توثيق عقود</Link>
              <Link href="/request">أرسل طلبك</Link>
            </div>

            <div className="footer-col">
              <h4>العقارات</h4>
              <Link href="/listings">أحدث العروض</Link>
              <Link href="/neighborhoods">الأحياء</Link>
              <Link href="/map">الخريطة</Link>
            </div>
          </div>
        </div>

        <section className="seo-links-section" aria-label="روابط عقارية مهمة">
          <div className="seo-links-head">
            <span className="seo-eyebrow">روابط بحث سريعة</span>
            <h3>عقارات أبحر الشمالية وشمال جدة</h3>
          </div>

          <div className="seo-links-grid">
            {seoGroups.map((group) => (
              <div className="seo-links-card" key={group.title}>
                <h4>{group.title}</h4>

                <div className="seo-links-list">
                  {group.links.slice(0, 8).map((link) => (
                    <Link key={`${group.title}-${link.label}`} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="seo-keywords-row">
            <Link href="/listings?dealType=sale">عقارات للبيع في أبحر الشمالية</Link>
            <Link href="/listings?propertyType=أرض&dealType=sale">أراضي للبيع شمال جدة</Link>
            <Link href="/listings?propertyType=فيلا&dealType=sale">فلل للبيع في أبحر</Link>
            <Link href="/listings?propertyType=فيلا&dealType=rent">فلل للإيجار في أبحر</Link>
            <Link href="/listings?propertyType=شقة&dealType=rent">شقق للإيجار شمال جدة</Link>
            <Link href="/listings?neighborhood=الصواري&plan=مخطط الفال&propertyType=شقة&dealType=sale">
              شقق تمليك في مخطط الفال الصواري
            </Link>
            <Link href="/listings?neighborhood=جوهرة العروس&propertyType=أرض&dealType=sale">
              أراضي جوهرة العروس
            </Link>
            <Link href="/listings?neighborhood=طيبة الفرعية&propertyType=أرض&dealType=sale">
              أراضي طيبة الفرعية
            </Link>
            <Link href="/listings?neighborhood=الهجرة&propertyType=أرض&dealType=sale">
              أراضي الهجرة
            </Link>
          </div>
        </section>

        <div className="footer-bottom">
          <p className="copyright">
            © {currentYear} عقار أبحر. جميع الحقوق محفوظة.
          </p>

          <div className="footer-socials">
            <a href="#" aria-label="Snapchat" className="social-icon">
              Snapchat
            </a>
            <a href="#" aria-label="Twitter" className="social-icon">
              X
            </a>
            <a href="#" aria-label="Instagram" className="social-icon">
              Instagram
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .seo-links-section {
          margin-top: 28px;
          padding: 26px;
          border-radius: 26px;
          background:
            radial-gradient(circle at top right, rgba(214, 179, 91, 0.16), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.07);
        }

        .seo-links-head {
          text-align: center;
          margin-bottom: 20px;
        }

        .seo-eyebrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 13px;
          border-radius: 999px;
          background: #fff7df;
          color: #8a6a12;
          border: 1px solid rgba(214, 179, 91, 0.35);
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .seo-links-head h3 {
          margin: 0;
          font-size: clamp(20px, 3vw, 25px);
          font-weight: 950;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .seo-links-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .seo-links-card {
          min-width: 0;
          padding: 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045);
        }

        .seo-links-card h4 {
          margin: 0 0 12px;
          color: #111827;
          font-size: 16px;
          font-weight: 950;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
        }

        .seo-links-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .seo-links-list a {
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          min-height: 34px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.95);
          color: #475569;
          text-decoration: none;
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 850;
          white-space: normal;
          transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .seo-links-list a:hover {
          transform: translateY(-1px);
          border-color: #d6b35b;
          color: #111827;
          background: #fffaf0;
        }

        .seo-keywords-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 9px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(226, 232, 240, 0.95);
        }

        .seo-keywords-row a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: #111827;
          border: 1px solid rgba(17, 24, 39, 0.1);
          color: #fff;
          text-decoration: none;
          font-size: 12.5px;
          font-weight: 850;
          line-height: 1.45;
        }

        .seo-keywords-row a:hover {
          background: #8a6a12;
        }

        @media (max-width: 1100px) {
          .seo-links-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .seo-links-section {
            margin-top: 22px;
            padding: 18px 14px;
            border-radius: 22px;
          }

          .seo-links-head {
            text-align: right;
            margin-bottom: 16px;
          }

          .seo-links-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .seo-links-card {
            padding: 14px;
            border-radius: 18px;
          }

          .seo-links-list a:nth-child(n + 7) {
            display: none;
          }

          .seo-keywords-row {
            justify-content: flex-start;
            gap: 8px;
          }

          .seo-keywords-row a {
            font-size: 12px;
            padding: 7px 10px;
          }

          .seo-keywords-row a:nth-child(n + 7) {
            display: none;
          }
        }
      `}</style>
    </footer>
  );
}
