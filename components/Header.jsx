'use client';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="header">
      <div className="container headerInner">
        <div className="brand">
          <div className="brandMark" aria-hidden="true" />
          <div>
            <div className="brandTitle">عقار أبحر</div>
            <div className="muted" style={{ fontSize: 12 }}>عروض مباشرة • شمال جدة</div>
          </div>
        </div>

        <nav className="nav">
          <Link className="btn" href="/">الرئيسية</Link>
          <Link className="btn" href="/listings">كل العروض</Link>
          <Link className="btn" href="/request">أرسل طلبك</Link>
          <Link className="btn" href="/admin">الأدمن</Link>
        </nav>
      </div>
    </header>
  );
}
