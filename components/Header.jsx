'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LOGO_SOURCES = ['/logo-mark.svg?v=1', '/logo-icon-256.png?v=1', '/logo.svg?v=1'];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [logoIndex, setLogoIndex] = useState(0);
  const [logoDead, setLogoDead] = useState(false);

  const prevBodyOverflowRef = useRef('');
  const prevHtmlOverflowRef = useRef('');

  const links = useMemo(
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
    if (typeof window === 'undefined') return;

    let raf = 0;
    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setIsScrolled(window.scrollY > 10));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // لا نخرب overflow القديم
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;

    if (menuOpen) {
      prevHtmlOverflowRef.current = html.style.overflow || '';
      prevBodyOverflowRef.current = body.style.overflow || '';
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    } else {
      html.style.overflow = prevHtmlOverflowRef.current;
      body.style.overflow = prevBodyOverflowRef.current;
    }

    return () => {
      html.style.overflow = prevHtmlOverflowRef.current;
      body.style.overflow = prevBodyOverflowRef.current;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
    if (logoIndex < LOGO_SOURCES.length - 1) setLogoIndex((v) => v + 1);
    else setLogoDead(true);
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
          <button
            className="menuBtn"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="فتح القائمة"
            aria-expanded={menuOpen ? 'true' : 'false'}
          >
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

          {/* روابط سطح المكتب */}
          <nav className="navDesktop" aria-label="روابط الموقع">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={`navLink ${isActive(link.href) ? 'active' : ''}`}>
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
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="drawerLink" onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="drawerHint">استخدم البحث للوصول السريع للعروض.</div>
          </aside>
        </div>
      ) : null}

      {/* ✅ المهم: global حتى ما تتعطل مع Link */}
      <style jsx global>{`
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
          flex-wrap: wrap;
        }

        .menuBtn {
          display: none;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(10px);
          color: #0f172a;
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
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
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
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          color: #0f172a;
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
          color: #0f172a;
        }
        .brandText .sub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 2px;
          white-space: nowrap;
        }

        .search {
          flex: 1 1 360px;
          display: flex;
          gap: 10px;
          align-items: center;
          min-width: 240px;
        }

        .navDesktop {
          flex: 1 1 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 4px;

          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .navDesktop::-webkit-scrollbar {
          display: none;
        }

        .navLink {
          text-decoration: none !important;
          color: #0f172a;
          font-weight: 900;
          font-size: 14px;

          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 38px;
          padding: 0 14px;
          border-radius: 999px;

          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(15, 23, 42, 0.12);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(12px);

          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .navLink:hover {
          background: rgba(255, 255, 255, 0.78);
          border-color: rgba(15, 23, 42, 0.16);
          transform: translateY(-1px);
        }
        .navLink.active {
          background: rgba(255, 255, 255, 0.92);
          border-color: rgba(214, 179, 91, 0.55);
          box-shadow: 0 10px 26px rgba(214, 179, 91, 0.14), 0 6px 18px rgba(15, 23, 42, 0.08);
        }

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
          color: #0f172a;
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
          color: #0f172a;
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

        @media (max-width: 900px) {
          .navDesktop {
            display: none;
          }
          .menuBtn {
            display: inline-flex;
          }
          .search {
            flex: 1 1 100%;
            min-width: 0;
          }
        }
        @media (max-width: 768px) {
          .hdrInner {
            gap: 10px;
          }
          .brandText .sub {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
