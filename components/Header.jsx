'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LOGO_SOURCES = [
  '/logo-mark.svg?v=1',
  '/logo-icon-256.png?v=1',
  '/logo.svg?v=1',
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [logoIndex, setLogoIndex] = useState(0);
  const [logoDead, setLogoDead] = useState(false);

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

  function handleLogoError() {
    if (logoIndex < LOGO_SOURCES.length - 1) {
      setLogoIndex((v) => v + 1);
    } else {
      setLogoDead(true);
    }
  }

  function Logo({ variant = 'lg' }) {
    if (logoDead) {
      return (
        <span className={variant === 'sm' ? 'logoFallbackSm' : 'logoFallback'} aria-hidden="true">
          ع
        </span>
      );
    }

    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={LOGO_SOURCES[logoIndex]}
        alt="عقار أبحر"
        className={variant === 'sm' ? 'logoSm' : 'logo'}
        width={variant === 'sm' ? 40 : 42}
        height={variant === 'sm' ? 40 : 42}
        decoding="async"
        draggable={false}
        onError={handleLogoError}
      />
    );
  }

  return (
    <>
      <header className={`hdr ${isScrolled ? 'scrolled' : ''}`} dir="rtl">
        <div className="hdrInner">
          <button className="menuBtn" type="button" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">
            القائمة
          </button>

          <Link href="/" className="brand" aria-label="الانتقال للرئيسية">
            <Logo variant="lg" />
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

          {/* ✅ روابط رئيسية بشكل مرتب (Tabs داخل كبسولة) */}
          <nav className="navDesktop" aria-label="روابط الموقع">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`navLink ${isActive(link.href) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {menuOpen ? (
        <div className="drawerRoot" dir="rtl">
          <div className="overlay" onClick={() => setMenuOpen(false)} />
          <aside className="drawer" aria-label="قائمة الجوال">
            <div className="drawerTop">
              <div className="drawerBrand">
                <Logo variant="sm" />
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
      ) : null}

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
          width: min(1100px, calc(100% - 28px));
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          flex-wrap: nowrap;
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
          min-width: 0;
        }

        .logo,
        .logoSm {
          display: block;
          flex: 0 0 auto;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          object-fit: contain;
          object-position: center;
        }
        .logo {
          width: 42px;
          height: 42px;
        }
        .logoSm {
          width: 40px;
          height: 40px;
        }

        .logoFallback,
        .logoFallbackSm {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
          font-weight: 950;
          line-height: 1;
          flex: 0 0 auto;
          user-select: none;
        }
        .logoFallback {
          width: 42px;
          height: 42px;
          font-size: 18px;
        }
        .logoFallbackSm {
          width: 40px;
          height: 40px;
          font-size: 17px;
        }

        .brandText {
          min-width: 0;
        }
        .brandText .title {
          font-weight: 950;
          line-height: 1.1;
          white-space: nowrap;
        }
        .brandText .sub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 2px;
          white-space: nowrap;
        }

        .search {
          flex: 1;
          display: flex;
          gap: 10px;
          align-items: center;
          min-width: 240px;
        }

        /* ✅ تحسين شكل الروابط الرئيسية */
        .navDesktop {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;

          background: #fff;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 6px;

          overflow-x: auto;
          max-width: 520px;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .navDesktop::-webkit-scrollbar {
          display: none;
        }

        .navLink {
          text-decoration: none !important;
          color: var(--text);
          font-weight: 900;
          font-size: 14px;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          transition: background 120ms ease, border-color 120ms ease;
        }
        .navLink:hover {
          background: #f1f5f9;
          border-color: rgba(15, 23, 42, 0.06);
        }
        .navLink.active {
          background: rgba(214, 179, 91, 0.22);
          border-color: rgba(214, 179, 91, 0.35);
          color: #1e293b;
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
          min-width: 0;
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
          text-decoration: none !important;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          font-weight: 900;
          color: var(--text);
        }
        .drawerLink:hover {
          border-color: var(--border2);
          background: #f8fafc;
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
