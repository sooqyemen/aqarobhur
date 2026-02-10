'use client';

import Link from 'next/link';

export default function Footer() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const waDigits = String(phone).replace(/\D/g, '');
  const waLink = waDigits ? `https://wa.me/${waDigits}` : '';

  return (
    <footer className="footer">
      <div className="container inner">
        <div className="links">
          <Link href="/" className="a">الرئيسية</Link>
          <Link href="/listings" className="a">كل العروض</Link>
          <Link href="/request" className="a">أرسل طلبك</Link>
          <Link href="/map" className="a">الخريطة</Link>
        </div>

        <div className="contact">
          {waLink ? (
            <a className="wa" href={waLink} target="_blank" rel="noreferrer">واتساب: {waDigits}</a>
          ) : (
            <span className="muted">رقم الواتساب غير مضبوط</span>
          )}
        </div>

        <div className="copy muted">
          © {new Date().getFullYear()} عقار أبحر
        </div>
      </div>

      <style jsx>{`
        .footer{
          margin-top: 18px;
          border-top: 1px solid var(--border);
          background: var(--bg2);
        }
        .inner{padding:18px 0}
        .links{display:flex;flex-wrap:wrap;gap:12px}
        .a{text-decoration:none;color:var(--text);font-weight:900;font-size:13px}
        .a:hover{color:var(--primary)}
        .contact{margin-top:10px}
        .wa{color:var(--primary);font-weight:900;text-decoration:none}
        .copy{margin-top:10px;font-size:12px}
        @media (max-width: 980px){
          .footer{padding-bottom: 90px;} /* مساحة إضافية فوق شريط الجوال */
        }
      `}</style>
    </footer>
  );
}
