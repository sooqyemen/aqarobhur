'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { isAdminUser } from '@/lib/admin';

const LOGO_SOURCES = ['/logo-symbol.png?v=4', '/icon-256x256.png?v=4', '/logo-full.png?v=4'];

export default function Header() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoDead, setLogoDead] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { auth } = getFirebase();
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.overflow = menuOpen ? 'hidden' : '';
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const isAdmin = isAdminUser(user);

  const navLinks = useMemo(() => [
    { href: '/', label: 'الرئيسية' },
    { href: '/neighborhoods', label: 'الأحياء' },
    { href: '/map', label: 'الخريطة' },
    { href: '/request', label: 'أرسل طلبك' },
  ], []);

  const drawerLinks = useMemo(() => {
    const links = [...navLinks, { href: '/listings', label: 'كل العقارات' }];
    if (isAdmin) {
      links.push({ href: '/admin', label: 'لوحة التحكم' });
      links.push({ href: '/admin/listings', label: 'إدارة العقارات' });
      links.push({ href: '/admin/requests', label: 'إدارة الطلبات' });
    }
    return links;
  }, [navLinks, isAdmin]);

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function handleLogoError() {
    if (logoIndex < LOGO_SOURCES.length - 1) setLogoIndex((v) => v + 1);
    else setLogoDead(true);
  }

  async function handleLogout() {
    const { auth } = getFirebase();
    await signOut(auth);
    router.push('/');
  }

  function Logo() {
    if (logoDead) {
      return (
        <span className="logoFallback" aria-hidden="true">ع</span>
      );
    }
    return (
      <img
        src={LOGO_SOURCES[logoIndex]}
        alt="عقار أبحر"
        className="brandLogo"
        onError={handleLogoError}
        draggable={false}
      />
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      <header className="premiumHeader">
        <div className="container headerInner">
          <Link href="/" className="brandBlock" aria-label="عقار أبحر">
            <Logo />
            <span className="brandText">
              <strong>عقار أبحر</strong>
              <small>عقارك في أبحر وشمال جدة</small>
            </span>
          </Link>

          <nav className="desktopNav" aria-label="القائمة الرئيسية">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : ''}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="headerActions">
            <Link href="/add" className="addListingBtn">
              <span className="material-icons-outlined">add_circle</span>
              إضافة إعلان
            </Link>
            {user ? (
              <button type="button" className="loginBtn" onClick={handleLogout} title={user.email || 'حسابي'}>
                <span className="material-icons-outlined">account_circle</span>
                خروج
              </button>
            ) : (
              <Link href="/account" className="loginBtn">
                <span className="material-icons-outlined">person</span>
                تسجيل / دخول
              </Link>
            )}
            <button type="button" className="mobileMenuBtn" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">
              <span className="material-icons-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="drawerBackdrop" onClick={() => setMenuOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawerHead">
              <Link href="/" className="brandBlock">
                <Logo />
                <span className="brandText">
                  <strong>عقار أبحر</strong>
                  <small>أبحر وشمال جدة</small>
                </span>
              </Link>
              <button type="button" className="closeBtn" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="drawerLinks">
              {drawerLinks.map((link) => (
                <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : ''}>
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="drawerActions">
              <Link href="/add" className="addListingBtn full">إضافة إعلان</Link>
              {user ? (
                <button type="button" className="loginBtn full" onClick={handleLogout}>تسجيل الخروج</button>
              ) : (
                <Link href="/account" className="loginBtn full">تسجيل / دخول</Link>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <style jsx>{`
        .premiumHeader {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 70px;
          background: rgba(255, 255, 255, .97);
          border-bottom: 1px solid rgba(190, 157, 98, .18);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, .035);
        }

        .headerInner {
          height: 70px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 24px;
        }

        .brandBlock {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #111827;
          text-decoration: none;
          min-width: 0;
        }

        .brandLogo {
          width: 48px;
          height: 48px;
          object-fit: contain;
          display: block;
        }

        .logoFallback {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #b8842f;
          background: #fff7e8;
          border: 1px solid rgba(184, 132, 47, .25);
          font-size: 22px;
          font-weight: 950;
        }

        .brandText {
          display: flex;
          flex-direction: column;
          line-height: 1.35;
        }
        .brandText strong {
          color: #b8842f;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -.02em;
        }
        .brandText small {
          color: #4b5563;
          font-size: 11px;
          font-weight: 800;
        }

        .desktopNav {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 34px;
        }
        .desktopNav a {
          position: relative;
          color: #111827;
          font-size: 14px;
          font-weight: 850;
          text-decoration: none;
          padding: 25px 0 21px;
        }
        .desktopNav a::after {
          content: '';
          position: absolute;
          right: 0;
          left: 0;
          bottom: 16px;
          height: 2px;
          border-radius: 99px;
          background: #b8842f;
          transform: scaleX(0);
          transition: transform .2s ease;
        }
        .desktopNav a:hover,
        .desktopNav a.active { color: #a97625; }
        .desktopNav a:hover::after,
        .desktopNav a.active::after { transform: scaleX(1); }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .addListingBtn,
        .loginBtn {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .addListingBtn {
          border: 1px solid #b8842f;
          color: #fff;
          background: linear-gradient(180deg, #c89a45, #a97625);
          box-shadow: 0 8px 20px rgba(184,132,47,.18);
        }
        .loginBtn {
          border: 1px solid rgba(184, 132, 47, .35);
          background: #fff;
          color: #9a6a21;
        }
        .addListingBtn .material-icons-outlined,
        .loginBtn .material-icons-outlined { font-size: 17px; }

        .mobileMenuBtn,
        .closeBtn {
          width: 40px;
          height: 40px;
          display: none;
          place-items: center;
          border-radius: 10px;
          border: 1px solid rgba(184, 132, 47, .25);
          background: #fff;
          color: #a97625;
          cursor: pointer;
        }

        .drawerBackdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(17, 24, 39, .42);
          backdrop-filter: blur(5px);
        }
        .drawer {
          position: absolute;
          inset-block: 0;
          right: 0;
          width: min(360px, 88vw);
          background: #fff;
          box-shadow: -20px 0 45px rgba(15, 23, 42, .2);
          display: flex;
          flex-direction: column;
        }
        .drawerHead {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px;
          border-bottom: 1px solid rgba(184, 132, 47, .18);
        }
        .drawerLinks {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 18px;
        }
        .drawerLinks a {
          padding: 13px 14px;
          border-radius: 12px;
          color: #111827;
          font-weight: 900;
          text-decoration: none;
          border: 1px solid transparent;
        }
        .drawerLinks a.active,
        .drawerLinks a:hover {
          color: #9a6a21;
          background: #fff7e8;
          border-color: rgba(184,132,47,.22);
        }
        .drawerActions {
          margin-top: auto;
          display: grid;
          gap: 10px;
          padding: 18px;
          border-top: 1px solid rgba(184, 132, 47, .18);
        }
        .full { width: 100%; min-height: 44px; }

        @media (max-width: 920px) {
          .premiumHeader,
          .headerInner { height: 66px; }
          .headerInner { grid-template-columns: 1fr auto; }
          .desktopNav { display: none; }
          .mobileMenuBtn,
          .closeBtn { display: grid; }
          .addListingBtn:not(.full) { display: none; }
          .loginBtn:not(.full) { display: none; }
          .brandLogo { width: 42px; height: 42px; }
          .brandText strong { font-size: 18px; }
        }
      `}</style>
    </>
  );
}
