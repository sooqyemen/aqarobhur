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
      { href: '/account', label: 'الحساب' }, // إضافة رابط الحساب
    ],
    []
  );

  // روابط القائمة الجانبية (جميع الروابط + الحساب)
  const mobileLinks = useMemo(
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

  // تتبع التمرير لتغيير مظهر الهيدر
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // إغلاق القائمة عند تغيير المسار
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
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
            <div className="brandMark" aria-hidden="true">
              <div className="markInner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="markLogo" src="/logo-icon-128.png" alt="" />
              </div>
            </div>
            <div className="brandText">
              <div className="brandTitle">عقار أبحر</div>
              <div className="brandSub">شمال جدة</div>
            </div>
          </Link>

          <form className="search" onSubmit={onSearch} role="search" aria-label="بحث">
            <div className="searchWrapper">
              <input
                className="searchInput"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن حي / مخطط / جزء…"
              />
              <button className="searchButton" type="submit">
                <span className="searchText">بحث</span>
              </button>
            </div>
          </form>

          {/* روابط سطح المكتب */}
          <nav className="desktopNav" aria-label="القائمة الرئيسية">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`navLink ${isActive(link.href) ? 'active' : ''}`}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Sidebar / Drawer للجوال */}
      <div className={menuOpen ? 'overlay show' : 'overlay'} onClick={() => setMenuOpen(false)} />

      <aside className={menuOpen ? 'drawer show' : 'drawer'} aria-hidden={menuOpen ? 'false' : 'true'}>
        <div className="drawerHead">
          <div className="drawerBrand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="drawerLogo" src="/logo-icon-128.png" alt="" />
            <div>
              <div className="drawerTitle">عقار أبحر</div>
              <div className="drawerSub">القائمة</div>
            </div>
          </div>

          <button type="button" className="closeBtn" onClick={() => setMenuOpen(false)}>
            إغلاق
          </button>
        </div>

        <nav className="drawerNav" aria-label="روابط التنقل">
          {mobileLinks.map((l) => (
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
          transition: all 0.3s ease;
        }

        .header.scrolled {
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid rgba(214, 179, 91, 0.2);
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
        }

        .bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          height: 70px;
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
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text);
        }

        .brandMark {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(214, 179, 91, 0.2);
          position: relative;
          overflow: hidden;
        }

        .markInner {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
        }

        .markLogo {
          width: 22px;
          height: 22px;
          object-fit: contain;
        }

        .brandText {
          display: flex;
          flex-direction: column;
        }

        .brandTitle {
          font-weight: 950;
          line-height: 1.2;
          color: #000000;
          font-size: 18px;
        }
        .brandSub {
          font-size: 11px;
          color: var(--muted);
          font-weight: 700;
          margin-top: 2px;
        }

        /* البحث */
        .search {
          flex: 1;
          max-width: 500px;
          min-width: 200px;
        }

        .searchWrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 6px;
          transition: all 0.2s ease;
        }

        .searchWrapper:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .searchInput {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text);
          font-size: 14px;
          padding: 8px 14px;
          outline: none;
          min-width: 0;
        }

        .searchInput::placeholder {
          color: #94a3b8;
        }

        .searchButton {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          border: none;
          color: #1e293b;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .searchButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(214, 179, 91, 0.25);
        }

        .searchText {
          font-size: 13px;
        }

        /* روابط سطح المكتب */
        .desktopNav {
          display: none;
          align-items: center;
          gap: 20px;
        }

        .navLink {
          color: var(--text);
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 6px 0;
          position: relative;
          transition: color 0.2s ease;
          white-space: nowrap;
        }

        .navLink:hover {
          color: var(--primary);
        }

        .navLink.active {
          color: var(--primary);
          font-weight: 900;
        }

        .navLink.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary);
          border-radius: 1px;
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
          background: #ffffff;
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
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .drawerLogo {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #f1f5f9;
          padding: 6px;
          object-fit: contain;
        }

        .drawerTitle {
          font-weight: 950;
          line-height: 1.2;
          color: #000000;
          font-size: 16px;
        }
        .drawerSub {
          font-size: 12px;
          color: var(--muted);
          font-weight: 700;
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
          color: #000000;
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

        /* التجاوب */
        @media (min-width: 1024px) {
          .desktopNav {
            display: flex;
          }
          .menuBtn {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .bar {
            flex-wrap: wrap;
            height: auto;
            gap: 8px;
          }
          .brand {
            min-width: unset;
          }
          .brandSub {
            display: none;
          }
          .search {
            width: 100%;
            max-width: none;
          }
          .searchButton {
            padding: 8px 12px;
          }
        }

        @media (max-width: 480px) {
          .brandTitle {
            font-size: 16px;
          }
          .searchInput {
            font-size: 13px;
            padding: 8px 10px;
          }
          .searchButton {
            padding: 8px 10px;
          }
          .menuBtn {
            width: 38px;
            height: 38px;
          }
        }
      `}</style>
    </>
  );
}
