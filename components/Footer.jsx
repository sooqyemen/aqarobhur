import Link from 'next/link';

export default function Footer() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

  return (
    <footer className="footer">
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
          {phone ? (
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              رقم التواصل: {phone}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              ضع رقم الواتساب في متغير NEXT_PUBLIC_WHATSAPP_NUMBER
            </div>
          )}
          <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.8 }}>
            العروض المعروضة “مباشر” هي عروض لدينا مباشرة. للطلبات الخاصة (حي/جزء/ميزانية) استخدم صفحة “أرسل طلبك”.
          </div>
        </div>
      </div>

      <div className="container copy muted">
        © {new Date().getFullYear()} عقار أبحر — جميع الحقوق محفوظة
      </div>

      <style jsx>{`
        .footerGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          padding: 18px 0;
          border-top: 1px solid rgba(255,255,255,.08);
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
          background: linear-gradient(180deg, rgba(214,179,91,.95), rgba(180,137,45,.92));
          box-shadow: 0 12px 30px rgba(214,179,91,.18);
          border: 1px solid rgba(214,179,91,.35);
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
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.05);
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 900;
        }
        .fLink:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(255,255,255,.16);
        }
        .copy {
          padding: 10px 0 18px;
          border-top: 1px dashed rgba(255,255,255,.10);
          font-size: 12px;
          text-align: center;
        }
      `}</style>
    </footer>
  );
}
