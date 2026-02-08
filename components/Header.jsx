'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname() || '/';
  const isActive = (path) => pathname === path;

  return (
    <header className="header">
      <div className="container header-inner">
        {/* الشعار */}
        <Link href="/" className="brand">
          <div className="logo-box">
            <img src="/logo-mark.svg" alt="شعار" />
          </div>
          <div className="brand-text">
            <h1 className="title">عقار أبحر</h1>
            <span className="subtitle">عروض حصرية</span>
          </div>
        </Link>

        {/* القائمة */}
        <nav className="nav">
          <Link href="/" className={isActive('/') ? 'nav-link active' : 'nav-link'}>الرئيسية</Link>
          <Link href="/listings" className={isActive('/listings') ? 'nav-link active' : 'nav-link'}>كل العروض</Link>
          <Link href="/request" className={isActive('/request') ? 'nav-link active' : 'nav-link'}>طلب عقار</Link>
        </nav>

        {/* زر الإجراء */}
        <div className="actions">
          <Link href="/admin" className="btn-login">
            دخول الملاك
          </Link>
        </div>
      </div>

      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
          height: 70px;
          display: flex;
          align-items: center;
        }
        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-box {
          width: 42px; height: 42px;
          border-radius: 10px;
          overflow: hidden;
          background: #f8fafc;
          border: 1px solid var(--border);
        }
        .logo-box img { width: 100%; height: 100%; object-fit: cover; }
        
        .title { margin: 0; font-size: 18px; font-weight: 800; color: var(--primary); line-height: 1; }
        .subtitle { font-size: 11px; color: var(--text-muted); }

        .nav {
          display: flex;
          gap: 6px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
        }
        .nav-link {
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          border-radius: 8px;
          transition: 0.2s;
        }
        .nav-link:hover { color: var(--text-main); background: rgba(255,255,255,0.5); }
        .nav-link.active {
          background: #fff;
          color: var(--primary);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .btn-login {
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
          padding: 8px 14px;
          background: var(--primary-light);
          border-radius: 8px;
        }
        .btn-login:hover { background: #dbeafe; }

        @media (max-width: 768px) {
          .nav { display: none; }
        }
      `}</style>
    </header>
  );
}
