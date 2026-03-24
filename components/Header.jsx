'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

import { getFirebase } from '@/lib/firebaseClient';
import { isAdminUser } from '@/lib/admin';

const LOGO_SOURCES = ['/logo-mark.svg?v=1', '/logo-icon-256.png?v=1', '/logo.svg?v=1'];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoDead, setLogoDead] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  const prevBodyOverflowRef = useRef('');
  const prevHtmlOverflowRef = useRef('');

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

  useEffect(() => {
    try {
      const { auth } = getFirebase();
      const unsub = onAuthStateChanged(auth, (user) => {
        setHasUser(!!user);
        setIsAdmin(!!user && isAdminUser(user));
      });
      return () => unsub();
    } catch {
      setHasUser(false);
      setIsAdmin(false);
      return undefined;
    }
  }, []);

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

  const actionLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { href: '/account', label: 'الحساب', kind: 'ghost' },
        { href: '/admin', label: 'لوحة الأدمن', kind: 'primary' },
      ];
    }

    return [
      {
        href: '/account',
        label: hasUser ? 'الحساب' : 'تسجيل الدخول',
        kind: 'ghost',
      },
    ];
  }, [hasUser, isAdmin]);

  function onSearch(e) {
    e.preventDefault();
    const value = String(q || '').trim();
    router.push(value ? `/listings?q=${encodeURIComponent(value)}` : '/listings');
  }

  function isActive(href) {
    if (href === '/') return pathname === '/';
    if (href === '/account') return pathname === '/account';
    if (href === '/admin') return pathname === '/admin' || pathname?.startsWith('/admin/');
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
        <div
          className="hdrInner"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr) auto',
            alignItems: 'center',
            rowGap: 12,
          }}
        >
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
              <div className="sub">عروض أبحر الشمالية وشمال جدة</div>
            </div>
          </Link>

          <div className="navActions" aria-label="إجراءات الحساب">
            {actionLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.kind === 'primary'
                    ? 'navLinkPrimary'
                    : `navLinkGhost ${isActive(link.href) ? 'active' : ''}`
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Link
            href={isAdmin ? '/admin' : '/account'}
            className={`mobileAccountBtn ${isActive(isAdmin ? '/admin' : '/account') ? 'active' : ''}`}
            aria-label={isAdmin ? 'لوحة الأدمن' : hasUser ? 'الحساب' : 'تسجيل الدخول'}
          >
            {isAdmin ? 'الأدمن' : hasUser ? 'الحساب' : 'الدخول'}
          </Link>

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <nav className="navDesktop" aria-label="روابط الموقع" style={{ flex: '1 1 460px' }}>
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

            <form className="search" onSubmit={onSearch} role="search" style={{ flex: '1 1 340px' }}>
              <input
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن حي، مخطط، جزء أو نوع عقار"
                aria-label="بحث"
              />
              <button className="btn btnPrimary" type="submit">
                بحث
              </button>
            </form>
          </div>
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
                  <div className="drawerSub">الوصول السريع</div>
                </div>
              </div>

              <button className="btn" type="button" onClick={() => setMenuOpen(false)}>
                إغلاق
              </button>
            </div>

            <form className="search" onSubmit={onSearch} role="search" style={{ marginBottom: 14 }}>
              <input
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في العروض"
                aria-label="بحث"
              />
              <button className="btn btnPrimary" type="submit">
                بحث
              </button>
            </form>

            <div className="drawerLinks">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="drawerLink"
                  style={
                    isActive(link.href)
                      ? {
                          background: 'rgba(214, 179, 91, 0.14)',
                          borderColor: 'rgba(214, 179, 91, 0.45)',
                        }
                      : undefined
                  }
                >
                  {link.label}
                </Link>
              ))}

              {actionLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={link.kind === 'primary' ? 'drawerActionPrimary' : 'drawerAction'}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="drawerHint">يمكنك الوصول للعروض أو إرسال طلبك مباشرة من الجوال.</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
