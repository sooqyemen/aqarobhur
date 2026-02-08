'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname() || '/';
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="header">
      <div className="container headerInner">
        <Link className="brand" href="/" aria-label="عقار أبحر - الصفحة الرئيسية">
          <div className="brandLogo" aria-hidden="true">
            <img src="/logo-mark.svg" alt="" />
          </div>
          <div>
            <div className="brandTitle">عقار أبحر</div>
            <div className="muted" style={{ fontSize: 12 }}>عروض مباشرة • شمال جدة</div>
          </div>
        </Link>

        <nav className="nav">
          <Link className={isActive('/') ? 'btn btnActive' : 'btn'} href="/" aria-current={isActive('/') ? 'page' : undefined}>الرئيسية</Link>
          <Link className={isActive('/listings') ? 'btn btnActive' : 'btn'} href="/listings" aria-current={isActive('/listings') ? 'page' : undefined}>كل العروض</Link>
          <Link className={isActive('/request') ? 'btn btnActive' : 'btn'} href="/request" aria-current={isActive('/request') ? 'page' : undefined}>أرسل طلبك</Link>
          <Link className={isActive('/admin') ? 'btn btnActive' : 'btn'} href="/admin" aria-current={isActive('/admin') ? 'page' : undefined}>الأدمن</Link>
        </nav>
      </div>

      <style jsx>{`
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .brandLogo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #fff;
          box-shadow: 0 8px 24px rgba(16, 24, 40, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brandLogo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        :global(.btnActive) {
          border-color: rgba(29, 78, 216, 0.35) !important;
          background: rgba(29, 78, 216, 0.06) !important;
        }
      `}</style>
    </header>
  );
}
