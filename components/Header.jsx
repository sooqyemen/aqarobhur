'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = useMemo(
    () => [
      { href: '/', label: 'الرئيسية' },
      { href: '/listings', label: 'كل العروض' },
      { href: '/map', label: 'الخريطة' },
      { href: '/neighborhoods', label: 'الأحياء' },
      { href: '/request', label: 'أرسل طلبك' },
    ],
    []
  );

  // قفل/فتح القائمة يمنع التمرير بالخلفية
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // إغلاق بالضغط على Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSearch(e) {
    e.preventDefault();
    const value = (q || '').trim();
    if (!value) {
      router.push('/listings');
      return;
    }
    router.push(`/listings?q=${encodeURIComponent(value)}`);
  }

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  }

  return (
    <>
      <header className="header">
        <div className="container bar">
          <button
            type="button"
            className="menuBtn"
            aria-label="القائمة"
            aria-expanded={menuOpen ? 'true' : 'false'}
            onClick={() => setMenuOpen(true)}
          >
            <span className="hamburger" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          <Link href="/" className="brand" aria-label="الصفحة الرئيسية">
            <div className="brandText">
              <div className="brandTitle">عقار أبحر</div>
              <div className="brandSub">شمال جدة</div>
            </div>
          </Link>

          <form className="search" onSubmit={onSearch} role="search" aria-label="بحث">
            <input
              className="input searchInput"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن حي / مخطط / جزء…"
            />
            <button className="btn btnPrimary searchBtn" type="submit">بحث</button>
          </form>
        </div>
      </header>

      {/* Sidebar / Drawer */}
      <div className={menuOpen ? 'overlay show' : 'overlay'} onClick={() => setMenuOpen(false)} />

      <aside className={menuOpen ? 'drawer show' : 'drawer'} aria-hidden={menuOpen ? 'false' : 'true'}>
        <div className="drawerHead">
          <div className="drawerBrand">
            <div className="drawerTitle">عقار أبحر</div>
            <div className="drawerSub">القائمة</div>
          </div>

          <button type="button" className="closeBtn" onClick={() => setMenuOpen(false)}>
            إغلاق
          </button>
        </div>

        <nav className="drawerNav" aria-label="روابط التنقل">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? 'drawerLink active' : 'drawerLink'}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="drawerFoot muted">
          استخدم البحث للوصول السريع للعروض.
        </div>
      </aside>

      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.85);
          border-bottom: 1px solid var(--border);
        }

        .bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
        }

        .menuBtn {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #ffffff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .hamburger {
          width: 18px;
          height: 14px;
          display: inline-flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .hamburger span {
          height: 2px;
          width: 100%;
          background: var(--text);
          border-radius: 999px;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text);
        }

        .brandTitle {
          font-weight: 950;
          line-height: 1.2;
        }
        .brandSub {
          font-size: 12px;
          color: var(--muted);
          font-weight: 800;
          margin-top: 2px;
        }

        .search {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .searchInput {
          height: 42px;
        }
        .searchBtn {
          height: 42px;
          padding: 0 16px;
        }

        /* Drawer */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.25);
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease;
          z-index: 60;
        }
        .overlay.show {
          opacity: 1;
          pointer-events: auto;
        }

        .drawer {
          position: fixed;
          top: 0;
          bottom: 0;
          right: 0;
          width: min(86vw, 340px);
          background: #ffffff; /* خلفية بيضاء صلبة */
          border-left: 1px solid var(--border);
          box-shadow: -8px 0 30px rgba(15, 23, 42, 0.15);
          transform: translateX(110%);
          transition: transform 220ms ease;
          z-index: 70;
          display: flex;
          flex-direction: column;
          padding: 14px;
        }
        .drawer.show {
          transform: translateX(0);
        }

        .drawerHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .drawerBrand {
          display: flex;
          flex-direction: column;
        }

        .drawerTitle {
          font-weight: 950;
          line-height: 1.2;
          color: #000000; /* أسود صريح */
          font-size: 18px;
        }
        .drawerSub {
          font-size: 12px;
          color: var(--muted);
          font-weight: 800;
        }

        .closeBtn {
          background: #f1f5f9;
          border: 1px solid var(--border);
          border-radius: 30px;
          padding: 8px 16px;
          font-weight: 900;
          font-size: 14px;
          color: var(--text);
          cursor: pointer;
          transition: all 0.1s ease;
        }
        .closeBtn:hover {
          background: #e2e8f0;
        }

        .drawerNav {
          display: grid;
          gap: 10px;
          margin-top: 6px;
          flex: 1;
        }

        .drawerLink {
          border: 1px solid var(--border);
          background: #f8fafc;
          color: #000000; /* نص أسود */
          text-decoration: none;
          padding: 14px 16px;
          border-radius: 14px;
          font-weight: 950;
          font-size: 16px;
          transition: all 0.1s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .drawerLink:hover {
          background: #f1f5f9;
          border-color: var(--border2);
        }

        .drawerLink.active {
          border-color: rgba(214, 179, 91, 0.7);
          background: rgba(214, 179, 91, 0.15);
          color: #000000;
        }

        .drawerFoot {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid var(--border);
          font-size: 12px;
          color: var(--muted);
          font-weight: 700;
        }

        /* Responsive tweaks */
        @media (max-width: 768px) {
          .bar {
            flex-wrap: wrap;
          }
          .brand {
            min-width: unset;
          }
          .search {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
