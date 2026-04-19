'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { isAdminUser } from '@/lib/admin';

const LOGO_SOURCES = ['/logo-symbol.png?v=4', '/icon-256x256.png?v=4', '/logo-full.png?v=4'];

export default function Header() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoDead, setLogoDead] = useState(false);
  const [user, setUser] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const { auth } = getFirebase();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);
  useEffect(() => {
    const onScroll = () => setIsScrolled((window?.scrollY || 0) > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const close = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => { setMenuOpen(false); setDropdownOpen(false); }, [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? 'hidden' : '';
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; document.body.style.overflow = ''; };
  }, [menuOpen]);

  const isAdmin = isAdminUser(user);
  const navLinks = useMemo(() => [
    { href: '/', label: 'الرئيسية' },
    { href: '/listings', label: 'كل العقارات' },
    { href: '/neighborhoods', label: 'الأحياء' },
    { href: '/map', label: 'الخريطة' },
    { href: '/request', label: 'أرسل طلبك' },
    { href: '/about', label: 'عن المنصة' },
    { href: '/contact', label: 'اتصل بنا' },
  ], []);
  const userLinks = useMemo(() => {
    if (!user) return [];
    const links = [{ href: '/account', label: 'حسابي' }];
    if (isAdmin) links.unshift(
      { href: '/admin', label: 'لوحة التحكم' },
      { href: '/admin/listings', label: 'إدارة العقارات' },
      { href: '/admin/requests', label: 'إدارة الطلبات' }
    );
    return links;
  }, [user, isAdmin]);

  function isActive(href) { return href === '/' ? pathname === '/' : pathname.startsWith(href); }
  function onSearch(e) {
    e.preventDefault();
    const value = String(q || '').trim();
    router.push(value ? `/listings?q=${encodeURIComponent(value)}` : '/listings');
    setMenuOpen(false);
  }
  async function handleLogout() {
    const { auth } = getFirebase();
    await signOut(auth);
    router.push('/');
  }
  function handleLogoError() { if (logoIndex < LOGO_SOURCES.length - 1) setLogoIndex((x) => x + 1); else setLogoDead(true); }
  function Logo({ small = false }) {
    const size = small ? 42 : 48;
    if (logoDead) return <div className={`brandFallback ${small ? 'small' : ''}`}>ع</div>;
    return <img src={LOGO_SOURCES[logoIndex]} alt="عقار أبحر" className={`brandLogo ${small ? 'small' : ''}`} width={size} height={size} onError={handleLogoError} draggable={false} />;
  }

  return (
    <>
      <header className={`headerShell ${isScrolled ? 'isScrolled' : ''}`}>
        <div className="container">
          <div className="headerSurface">
            <div className="headerMainRow">
              <button type="button" className="menuToggle" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">القائمة</button>
              <Link href="/" className="brandBlock" aria-label="عقار أبحر">
                <Logo />
                <div className="brandText"><strong>عقار أبحر</strong><span>عروض أبحر الشمالية وشمال جدة</span></div>
              </Link>
              <form className="headerSearchForm" onSubmit={onSearch}>
                <input className="headerSearchInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن حي، مخطط، أو نوع عقار" />
                <button className="headerSearchButton" type="submit">بحث</button>
              </form>
              <div className="headerActions">
                <Link href="/add" className="headerPrimaryCta">إضافة إعلان</Link>
                {user ? (
                  <div className="accountWrap" ref={dropdownRef}>
                    <button type="button" className="accountButton" onClick={() => setDropdownOpen((v) => !v)}>{user.email?.split('@')[0] || 'حسابي'}</button>
                    {dropdownOpen && (
                      <div className="accountMenu">
                        <div className="accountMenuHeader">{user.email}</div>
                        <div className="accountMenuBody">{userLinks.map((link) => <Link key={link.href} href={link.href} className="accountMenuLink">{link.label}</Link>)}</div>
                        <button type="button" className="accountLogout" onClick={handleLogout}>تسجيل الخروج</button>
                      </div>
                    )}
                  </div>
                ) : <Link href="/account" className="headerGhostCta">دخول</Link>}
              </div>
            </div>
            <nav className="headerNavRow">{navLinks.map((link) => <Link key={link.href} href={link.href} className={`headerNavLink ${isActive(link.href) ? 'active' : ''}`}>{link.label}</Link>)}</nav>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div className="drawerOverlay" onClick={() => setMenuOpen(false)}>
          <aside className="drawerPanel" onClick={(e) => e.stopPropagation()}>
            <div className="drawerTop">
              <div className="brandBlock compactBrand"><Logo small /><div className="brandText"><strong>عقار أبحر</strong><span>تنقل سريع</span></div></div>
              <button type="button" className="drawerClose" onClick={() => setMenuOpen(false)}>إغلاق</button>
            </div>
            <form className="drawerSearchForm" onSubmit={onSearch}>
              <input className="headerSearchInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في العقارات" />
              <button className="headerSearchButton" type="submit">بحث</button>
            </form>
            <div className="drawerLinks">{navLinks.map((link) => <Link key={link.href} href={link.href} className={`drawerLink ${isActive(link.href) ? 'active' : ''}`}>{link.label}</Link>)}</div>
            <div className="drawerBottomActions">
              <Link href="/add" className="headerPrimaryCta fullWidth">إضافة إعلان جديد</Link>
              {!user ? <Link href="/account" className="headerGhostCta fullWidth">دخول / تسجيل</Link> : null}
            </div>
          </aside>
        </div>
      )}
      <style jsx>{`
        .headerShell{position:sticky;top:0;z-index:80;padding:14px 0 0}.headerSurface{background:rgba(255,255,255,.86);border:1px solid rgba(214,226,237,.95);border-radius:0 0 28px 28px;backdrop-filter:blur(16px);box-shadow:0 10px 30px rgba(15,23,42,.05)}.isScrolled .headerSurface{box-shadow:0 18px 40px rgba(15,23,42,.08)}.headerMainRow{display:grid;grid-template-columns:auto auto minmax(280px,1fr) auto;align-items:center;gap:14px;padding:16px 18px}.menuToggle{display:none;min-height:46px;padding:0 16px;border-radius:14px;border:1px solid #dce7f1;background:#fff;color:#0f172a;font-weight:800;cursor:pointer}.brandBlock{display:inline-flex;align-items:center;gap:12px;min-width:0}.brandLogo,.brandFallback{width:48px;height:48px;border-radius:16px;object-fit:contain;background:#fff;border:1px solid #dce7f1;box-shadow:0 8px 20px rgba(15,23,42,.05);flex-shrink:0}.brandFallback{display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:var(--primary)}.brandLogo.small,.brandFallback.small{width:42px;height:42px;border-radius:14px}.brandText{display:flex;flex-direction:column;min-width:0}.brandText strong{color:#0f172a;font-size:18px;font-weight:900;line-height:1.15}.brandText span{color:#64748b;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.headerSearchForm,.drawerSearchForm{display:flex;align-items:center;gap:10px;min-width:0}.headerSearchInput{width:100%;min-height:48px;border-radius:16px;border:1px solid #dce7f1;background:#fff;padding:0 16px;color:#0f172a;font-weight:700}.headerSearchInput:focus{border-color:var(--primary);box-shadow:0 0 0 4px rgba(15,118,110,.08)}.headerSearchButton,.headerPrimaryCta,.headerGhostCta,.accountButton,.drawerClose{min-height:48px;border-radius:16px;font-weight:800;padding:0 18px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;cursor:pointer;transition:.2s ease;white-space:nowrap}.headerSearchButton,.headerPrimaryCta{background:linear-gradient(135deg,#0f766e,#115e59);color:#fff;box-shadow:0 12px 24px rgba(15,118,110,.18)}.headerGhostCta,.accountButton,.drawerClose{background:#fff;color:#0f172a;border-color:#dce7f1}.headerSearchButton:hover,.headerPrimaryCta:hover,.headerGhostCta:hover,.accountButton:hover,.drawerClose:hover,.menuToggle:hover{transform:translateY(-1px)}.headerActions{display:flex;align-items:center;gap:10px;justify-self:end}.accountWrap{position:relative}.accountMenu{position:absolute;inset-inline-start:0;top:calc(100% + 10px);min-width:230px;background:#fff;border:1px solid #dce7f1;border-radius:20px;box-shadow:0 24px 40px rgba(15,23,42,.1);overflow:hidden}.accountMenuHeader{padding:14px 16px;font-size:12px;font-weight:700;color:#64748b;background:#f8fbfd;border-bottom:1px solid #edf2f7;word-break:break-word}.accountMenuBody{display:flex;flex-direction:column;padding:8px}.accountMenuLink,.accountLogout{display:flex;width:100%;align-items:center;justify-content:flex-start;min-height:44px;padding:0 12px;border-radius:12px;font-size:14px;font-weight:800;color:#0f172a;background:transparent;border:none;cursor:pointer}.accountMenuLink:hover,.accountLogout:hover{background:#f4f8fb}.accountLogout{margin:4px 8px 10px;width:calc(100% - 16px);color:#b91c1c}.headerNavRow{display:flex;align-items:center;gap:8px;overflow-x:auto;padding:0 18px 14px;scrollbar-width:none}.headerNavRow::-webkit-scrollbar{display:none}.headerNavLink{flex:0 0 auto;min-height:42px;padding:0 14px;border-radius:999px;color:#475569;font-size:14px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;transition:.2s ease}.headerNavLink:hover,.headerNavLink.active{color:var(--primary);background:rgba(15,118,110,.08);border-color:rgba(15,118,110,.14)}.drawerOverlay{position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:120;display:flex;justify-content:flex-end}.drawerPanel{width:min(92vw,360px);height:100%;background:#fff;padding:20px;display:flex;flex-direction:column;gap:18px;box-shadow:-20px 0 40px rgba(15,23,42,.15)}.drawerTop{display:flex;align-items:center;justify-content:space-between;gap:12px}.compactBrand{pointer-events:none}.drawerLinks{display:grid;gap:10px}.drawerLink{min-height:48px;border-radius:16px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;font-weight:800;padding:0 16px;display:flex;align-items:center}.drawerLink.active{border-color:rgba(15,118,110,.2);background:rgba(15,118,110,.08);color:var(--primary)}.drawerBottomActions{margin-top:auto;display:grid;gap:10px}.fullWidth{width:100%}@media (max-width:1100px){.headerMainRow{grid-template-columns:auto minmax(200px,1fr) auto}.headerSearchForm{grid-column:1 / -1;order:5}}@media (max-width:820px){.headerMainRow{grid-template-columns:auto minmax(0,1fr) auto;padding:14px}.menuToggle{display:inline-flex}.headerSearchForm,.headerNavRow,.headerActions{display:none}.headerSurface{border-radius:0 0 22px 22px}}
      `}</style>
    </>
  );
}
