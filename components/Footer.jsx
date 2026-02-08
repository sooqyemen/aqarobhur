'use client';

import Link from 'next/link';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';

export default function Footer() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const href = buildWhatsAppLink({
    phone,
    text: 'السلام عليكم، عندي استفسار بخصوص عروض عقار أبحر.',
  });

  return (
    <footer className="siteFooter">
      <div className="container footerGrid">
        <div className="about">
          <div className="brandLine">
            <div className="mark" aria-hidden="true" />
            <div>
              <div className="title">عقار أبحر</div>
              <div className="muted" style={{ fontSize: 12 }}>عروض مباشرة • شمال جدة</div>
            </div>
          </div>
          <p className="muted" style={{ margin: '10px 0 0', lineHeight: 1.8 }}>
            نوفر لك عروض مختارة، ونستقبل طلبك عبر الموقع أو واتساب، ونرجع لك بأفضل الخيارات حسب الحي والميزانية.
          </p>
        </div>

        <div className="links">
          <div className="label muted">روابط سريعة</div>
          <div className="linkGrid">
            <Link className="fLink" href="/">الرئيسية</Link>
            <Link className="fLink" href="/listings">كل العروض</Link>
            <Link className="fLink" href="/request">أرسل طلبك</Link>
            <Link className="fLink" href="/admin">الأدمن</Link>
          </div>
        </div>

        <div className="contact">
          <div className="label muted">التواصل</div>
          <a className="btnPrimary" href={href} target="_blank" rel="noreferrer">
            تواصل واتساب
          </a>
          {phone ? (
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              رقم التواصل: {phone}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              ضع رقم الواتساب في متغير NEXT_PUBLIC_WHATSAPP_NUMBER
            </div>
          )}
        </div>
      </div>

      <div className="container copy muted">
        © {new Date().getFullYear()} عقار أبحر — جميع الحقوق محفوظة
      </div>

      <style jsx>{`
        .siteFooter {
          padding: 26px 0 28px;
          margin-top: 18px;
          border-top: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(29, 78, 216, 0.03), rgba(201, 162, 39, 0.02));
        }
        .footerGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 900px) {
          .footerGrid {
            grid-template-columns: 1.6fr 1fr 1fr;
            gap: 18px;
            align-items: start;
          }
        }
        .brandLine {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .mark {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--blue), #0ea5e9);
          box-shadow: 0 10px 26px rgba(29, 78, 216, 0.18);
          border: 1px solid rgba(29, 78, 216, 0.25);
        }
        .title {
          font-weight: 950;
          letter-spacing: 0.2px;
        }
        .label {
          font-size: 12px;
          margin-bottom: 8px;
        }
        .linkGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .fLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 800;
        }
        .fLink:hover {
          background: #fafafa;
        }
        .copy {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px dashed rgba(16, 24, 40, 0.12);
          font-size: 12px;
          text-align: center;
        }
      `}</style>
    </footer>
  );
}
