'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname() || '/';
  
  const isActive = (path) => pathname === path;

  return (
    <header className="header">
      <div className="container header-inner">
        {/* اللوجو */}
        <Link href="/" className="logo-area">
          <div className="logo-box">
            <img src="/logo-mark.svg" alt="شعار" />
          </div>
          <div className="logo-text">
            <h1>عقار أبحر</h1>
            <span>شمال جدة</span>
          </div>
        </Link>

        {/* القائمة */}
        <nav className="nav-links">
          <Link href="/" className={isActive('/') ? 'link active' : 'link'}>الرئيسية</Link>
          <Link href="/listings" className={isActive('/listings') ? 'link active' : 'link'}>العروض</Link>
          <Link href="/request" className={isActive('/request') ? 'link active' : 'link'}>طلب عقار</Link>
        </nav>

        {/* زر جانبي */}
        <div className="actions">
          <Link href="/admin" className="btn-admin">دخول الملاك</Link>
        </div>
      </div>

      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--border);
          height: 72px;
          display: flex;
          align-items: center;
        }
        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-area {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-box {
          width: 40px; 
          height: 40px; 
          border-radius: 8px; 
          overflow: hidden; 
          background: #eee;
        }
        .logo-box img { width: 100%; height: 100%; object-fit: cover; }
        
        .logo-text h1 { margin: 0; font-size: 18px; color: var(--primary); font-weight: 800; }
        .logo-text span { font-size: 11px; color: var(--text-secondary); }

        .nav-links {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 10px;
        }
        .link {
          padding: 6px 16px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: 8px;
        }
        .link.active {
          background: #fff;
          color: var(--primary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-weight: 700;
        }
        .link:hover:not(.active) { color: var(--text-main); }

        .btn-admin {
          font-size: 13px;
          color: var(--primary);
          font-weight: 700;
          padding: 8px 12px;
          border-radius: 6px;
          background: rgba(30, 58, 138, 0.05);
        }
        .btn-admin:hover { background: rgba(30, 58, 138, 0.1); }

        @media(max-width: 768px) {
          .nav-links { display: none; } /* يفضل عمل قائمة موبايل لاحقاً */
        }
      `}</style>
    </header>
  );
}
