'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const navLinks = useMemo(
    () => [
      { href: '/', label: 'الرئيسية' },
      { href: '/listings', label: 'كل العروض' },
      { href: '/map', label: 'الخريطة' },
      { href: '/neighborhoods', label: 'الأحياء' },
      { href: '/request', label: 'أرسل طلبك' },
      { href: '/account', label: 'الحساب' },
    ],
    []
  );

  const mobileLinks = navLinks; // same links for mobile

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function onSearch(e) {
    e.preventDefault();
    const value = (q || '').trim();
    router.push(value ? `/listings?q=${encodeURIComponent(value)}` : '/listings');
  }

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  }

  return (
    <>
      <header className={`hdr ${isScrolled ? 'scrolled' : ''}`} dir="rtl">
        <div className="hdrInner">
          <button className="menuBtn" type="button" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">
            القائمة
          </button>

          <Link href="/" className="brand" aria-label="الانتقال للرئيسية">
            {/* Replace with your actual logo or use a fallback inline SVG */}
            <div className="logoFallback">عقار</div>
            {/* <img src="/logo.png" alt="عقار أبحر" className="logo" /> */}
            <div className="brandText">
              <div className="title">عقار أبحر</div>
              <div className="sub">شمال جدة</div>
            </div>
          </Link>

          <form className="search" onSubmit={onSearch} role="search">
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن حي / مخطط / جزء…"
              aria-label="بحث"
            />
            <button className="btn btnPrimary" type="submit">
              بحث
            </button>
          </form>

          <nav className="navDesktop" aria-label="روابط الموقع">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`navLink ${isActive(link.href) ? 'active' : ''}`}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {menuOpen && (
        <div className="drawerRoot" dir="rtl">
          <div className="overlay" onClick={() => setMenuOpen(false)} />
          <aside className="drawer" aria-label="قائمة الجوال">
            <div className="drawerTop">
              <div className="drawerBrand">
                <div className="logoFallback small">عقار</div>
                <div>
                  <div className="drawerTitle">عقار أبحر</div>
                  <div className="drawerSub">القائمة</div>
                </div>
              </div>

              <button className="btn" type="button" onClick={() => setMenuOpen(false)}>
                إغلاق
              </button>
            </div>

            <div className="drawerLinks">
              {mobileLinks.map((l) => (
                <Link key={l.href} href={l.href} className="drawerLink" onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="drawerHint">استخدم البحث للوصول السريع للعروض.</div>
          </aside>
        </div>
      )}

      <style jsx>{`
        .hdr {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(248, 250, 252, 0.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
        }
        .hdr.scrolled {
          background: rgba(248, 250, 252, 0.95);
        }
        .hdrInner {
          width: min(1000px, calc(100% - 28px));
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
        }
        .menuBtn {
          display: none;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
          padding: 10px 14px;
          border-radius: 14px;
          font-weight: 900;
          cursor: pointer;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex: 0 0 auto;
        }
        .logo {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          object-fit: contain;
        }
        /* Fallback if logo.png is missing */
        .logoFallback {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 1px solid var(--border);
        }
        .logoFallback.small {
          width: 40px;
          height: 40px;
          font-size: 12px;
        }
        .brandText .title {
          font-weight: 950;
          line-height: 1.1;
        }
        .brandText .sub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 2px;
        }
        .search {
          flex: 1;
          display: flex;
          gap: 10px;
          align-items: center;
          min-width: 220px;
        }
        .navDesktop {
          display: flex;
          gap: 8px;
          align-items: center;
          flex: 0 0 auto;
        }
        /* === Chips styling for navigation links === */
        .navLink {
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 999px; /* fully rounded edges */
          background-color: #ffffff;
          color: #000000;
          font-weight: 600;
          white-space: nowrap;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }
        .navLink:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .navLink.active {
          background-color: #f1f5f9;
          border-color: #94a3b8;
          font-weight: 700;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Drawer */
        .drawerRoot {
          position: fixed;
          inset: 0;
          z-index: 100;
        }
        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.35);
        }
        .drawer {
          position: absolute;
          top: 0;
          right: 0;
          height: 100%;
          width: min(360px, 92vw);
          background: #fff;
          border-left: 1px solid var(--border);
          box-shadow: -18px 0 40px rgba(15, 23, 42, 0.12);
          display: flex;
          flex-direction: column;
          padding: 14px;
        }
        .drawerTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        .drawerBrand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logoSm {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          object-fit: contain;
        }
        .drawerTitle {
          font-weight: 950;
          line-height: 1.1;
        }
        .drawerSub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 2px;
        }
        .drawerLinks {
          display: grid;
          gap: 10px;
          margin-top: 6px;
        }
        .drawerLink {
          text-decoration: none;
          padding: 12px 16px;
          border-radius: 999px; /* matching chip style */
          background-color: #ffffff;
          color: #000000;
          font-weight: 600;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }
        .drawerLink:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .drawerHint {
          margin-top: auto;
          padding-top: 12px;
          color: var(--muted);
          font-size: 13px;
        }

        /* Mobile */
        @media (max-width: 900px) {
          .navDesktop {
            display: none;
          }
          .menuBtn {
            display: inline-flex;
          }
        }
        @media (max-width: 768px) {
          .hdrInner {
            gap: 10px;
          }
          .search {
            min-width: 0;
          }
          .brandText .sub {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
