'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { isAdminUser } from '@/lib/admin';

const LOGO_SOURCES = ['/logo-symbol.png?v=5', '/icon-256x256.png?v=5', '/logo-full.png?v=5'];

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
    if (typeof document === 'undefined') return undefined;
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

  const adminLinks = useMemo(() => [
    { href: '/admin', label: 'لوحة التحكم' },
    { href: '/admin/listings', label: 'إدارة العروض' },
    { href: '/admin/requests', label: 'إدارة الطلبات' },
    { href: '/admin/inbox', label: 'الوارد الذكي' },
    { href: '/admin/search', label: 'البحث الذكي' },
  ], []);

  const accountLinks = useMemo(() => {
    const links = [];
    if (isAdmin) links.push(...adminLinks);
    links.push({ href: '/add', label: 'إضافة إعلان' });
    links.push({ href: '/account', label: 'حسابي' });
    return links;
  }, [adminLinks, isAdmin]);

  const drawerLinks = useMemo(() => {
    const links = [...navLinks, { href: '/listings', label: 'كل العقارات' }];
    if (user) {
      accountLinks.forEach((link) => {
        if (!links.some((item) => item.href === link.href)) links.push(link);
      });
    }
    return links;
  }, [navLinks, user, accountLinks]);

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
    return (
      <span className="logoBox" aria-hidden="true">
        {logoDead ? (
          <span className="logoFallback">ع</span>
        ) : (
          <img
            src={LOGO_SOURCES[logoIndex]}
            alt=""
            className="brandLogo"
            onError={handleLogoError}
            draggable={false}
          />
        )}
      </span>
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
              <details className="accountDetails">
                <summary className="loginBtn accountSummary" title={user.email || 'حسابي'}>
                  حسابي
                </summary>
                <div className="accountMenu">
                  <div className="accountMenuHead">
                    <strong>{isAdmin ? 'حساب الإدارة' : 'حسابي'}</strong>
                    <small>{user.email || 'مستخدم مسجل'}</small>
                  </div>
                  {accountLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : ''}>
                      {link.label}
                    </Link>
                  ))}
                  <button type="button" className="logoutMenuBtn" onClick={handleLogout}>
                    تسجيل الخروج
                  </button>
                </div>
              </details>
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

            {user ? (
              <div className="drawerUserBox">
                <strong>{isAdmin ? 'حساب الإدارة' : 'حسابي'}</strong>
                <small>{user.email || 'مستخدم مسجل'}</small>
              </div>
            ) : null}

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
          height: 66px;
          background: rgba(255, 255, 255, .98);
          border-bottom: 1px solid rgba(190, 157, 98, .18);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, .035);
        }
        .headerInner {
          height: 66px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 22px;
        }
        .brandBlock {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #111827;
          text-decoration: none;
          min-width: 0;
          max-width: 260px;
        }
        .logoBox {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 12px;
          background: #fffaf0;
          border: 1px solid rgba(184, 132, 47, .18);
        }
        .brandLogo {
          width: 100%;
          height: 100%;
          max-width: 42px;
          max-height: 42px;
          object-fit: contain;
          display: block;
        }
        .logoFallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #b8842f;
          font-size: 22px;
          font-weight: 950;
        }
        .brandText {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
          min-width: 0;
        }
        .brandText strong {
          color: #b8842f;
          font-size: 19px;
          font-weight: 950;
          letter-spacing: -.02em;
          white-space: nowrap;
        }
        .brandText small {
          color: #4b5563;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }
        .desktopNav {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 30px;
        }
        .desktopNav a {
          position: relative;
          color: #111827;
          font-size: 14px;
          font-weight: 850;
          text-decoration: none;
          padding: 23px 0 20px;
        }
        .desktopNav a::after {
          content: '';
          position: absolute;
          right: 0;
          left: 0;
          bottom: 14px;
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
          gap: 9px;
        }
        .addListingBtn,
        .loginBtn {
          min-height: 37px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 13px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          font-family: inherit;
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
        .accountDetails {
          position: relative;
          z-index: 120;
        }
        .accountDetails .material-icons-outlined,
        .accountMenu .material-icons-outlined {
          display: none !important;
        }
        .accountDetails summary {
          list-style: none;
        }
        .accountDetails summary::-webkit-details-marker { display: none; }
        .accountSummary {
          min-width: 96px;
          border-radius: 999px;
          background: #fffaf0;
          color: #8a5a18;
          box-shadow: 0 8px 18px rgba(184, 132, 47, .08);
        }
        .accountSummary:hover {
          background: #fff7e8;
          border-color: rgba(184, 132, 47, .5);
        }
        .accountMenu {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 265px;
          padding: 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, .98);
          border: 1px solid rgba(184, 132, 47, .22);
          box-shadow: 0 22px 55px rgba(15, 23, 42, .16);
          direction: rtl;
        }
        .accountMenuHead {
          padding: 13px 14px;
          border-radius: 16px;
          border: 1px solid rgba(184, 132, 47, .16);
          background: linear-gradient(135deg, #fff8e8, #ffffff);
          margin-bottom: 10px;
        }
        .accountMenuHead strong,
        .drawerUserBox strong {
          display: block;
          color: #111827;
          font-size: 15px;
          font-weight: 950;
        }
        .accountMenuHead small,
        .drawerUserBox small {
          display: block;
          color: #6b7280;
          font-size: 11px;
          font-weight: 800;
          margin-top: 4px;
          direction: ltr;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .accountMenu a,
        .logoutMenuBtn {
          width: 100%;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 0 14px;
          border-radius: 13px;
          border: 1px solid transparent;
          background: transparent;
          color: #263142;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
          text-align: right;
          font-family: inherit;
        }
        .accountMenu a + a { margin-top: 4px; }
        .accountMenu a:hover,
        .accountMenu a.active {
          color: #9a6a21;
          background: #fff7e8;
          border-color: rgba(184, 132, 47, .16);
        }
        .logoutMenuBtn {
          margin-top: 9px;
          color: #b42318;
          background: #fff7f6;
          border-color: rgba(180, 35, 24, .12);
        }
        .logoutMenuBtn:hover {
          background: #fff1ef;
          border-color: rgba(180, 35, 24, .22);
        }
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
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px;
          border-bottom: 1px solid rgba(184, 132, 47, .18);
        }
        .drawerUserBox {
          margin: 16px 18px 0;
          padding: 12px 14px;
          border-radius: 14px;
          background: #fff7e8;
          border: 1px solid rgba(184,132,47,.18);
        }
        .drawerLinks {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 18px;
        }
        .drawerLinks a {
          display: flex;
          align-items: center;
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
          .headerInner { height: 62px; }
          .headerInner { grid-template-columns: 1fr auto; gap: 10px; }
          .desktopNav { display: none; }
          .mobileMenuBtn,
          .closeBtn { display: grid; }
          .addListingBtn:not(.full),
          .loginBtn:not(.full),
          .accountDetails { display: none; }
          .brandBlock { max-width: calc(100vw - 92px); }
          .logoBox { width: 38px; height: 38px; flex-basis: 38px; }
          .brandLogo { max-width: 38px; max-height: 38px; }
          .brandText strong { font-size: 17px; }
          .brandText small { font-size: 10px; }
        }
      `}</style>
    </>
  );
}
