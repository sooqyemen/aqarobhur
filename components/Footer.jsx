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
            <h3>عقارات أبحر الشمالية وشمال جدة</h3>
            <p>
              روابط بحث دقيقة حسب الأحياء والمخططات: أحياء أبحر للشقق والفلل
              والأراضي، ومخططات جوهرة العروس وطيبة والهجرة للأراضي السكنية
              والتجارية.
            </p>
          </div>

          <div className="seo-links-grid">
            {seoGroups.map((group) => (
              <div className="seo-links-col" key={group.title}>
                <h4>{group.title}</h4>

                {group.links.map((link) => (
                  <Link key={`${group.title}-${link.label}`} href={link.href}>
                    {link.label}
                  </Link>
                ))}
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
          padding: 28px 22px;
          border-radius: 24px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
        }

        .seo-links-head {
          text-align: center;
          margin-bottom: 22px;
        }

        .seo-links-head h3 {
          margin: 0 0 8px;
          font-size: 22px;
          font-weight: 900;
          color: #111827;
        }

        .seo-links-head p {
          margin: 0 auto;
          max-width: 760px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.9;
        }

        .seo-links-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
        }

        .seo-links-col {
          display: flex;
          flex-direction: column;
          gap: 9px;
          min-width: 0;
        }

        .seo-links-col h4 {
          margin: 0 0 6px;
          color: #111827;
          font-size: 17px;
          font-weight: 900;
        }

        .seo-links-col a {
          color: #4b5563;
          text-decoration: none;
          font-size: 14px;
          line-height: 1.7;
          transition: color 0.18s ease;
        }

        .seo-links-col a:hover {
          color: #9a7a21;
          text-decoration: underline;
        }

        .seo-keywords-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid rgba(226, 232, 240, 0.95);
        }

        .seo-keywords-row a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          color: #334155;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .seo-keywords-row a:hover {
          border-color: #d6b35b;
          color: #111827;
          background: #fffaf0;
        }

        @media (max-width: 1100px) {
          .seo-links-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .seo-links-section {
            padding: 22px 16px;
            border-radius: 20px;
          }

          .seo-links-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .seo-links-head h3 {
            font-size: 19px;
          }

          .seo-keywords-row {
            gap: 8px;
          }

          .seo-keywords-row a {
            font-size: 12px;
            padding: 7px 10px;
          }
        }
      `}</style>
    </footer>
  );
}
