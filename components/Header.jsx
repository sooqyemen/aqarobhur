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
  const [logoIndex, setLogoIndex] = useState(0);
  const [logoDead, setLogoDead] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const prevBodyOverflowRef = useRef('');
  const prevHtmlOverflowRef = useRef('');

  useEffect(() => {
    const { auth } = getFirebase();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const isAdmin = isAdminUser(user);

  const navLinks = useMemo(
    () => [
      { href: '/', label: 'الرئيسية' },
      { href: '/listings', label: 'كل العقارات' },
      { href: '/neighborhoods', label: 'دليل الأحياء' },
      { href: '/map', label: 'الخريطة العقارية' },
      { href: '/request', label: 'أرسل طلبك' },
    ],
    []
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

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

  useEffect(() => setMenuOpen(false), [pathname]);

  async function handleLogout() {
    const { auth } = getFirebase();
    await signOut(auth);
    router.push('/');
    setDropdownOpen(false);
  }

  function onSearch(e) {
    e.preventDefault();
    const value = String(q || '').trim();
    router.push(value ? `/listings?q=${encodeURIComponent(value)}` : '/listings');
    setMenuOpen(false);
  }

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function handleLogoError() {
    if (logoIndex < LOGO_SOURCES.length - 1) {
      setLogoIndex((v) => v + 1);
    } else {
      setLogoDead(true);
    }
  }

  function Logo({ small = false }) {
    const size = small ? 40 : 50;
    
    if (logoDead) {
      return (
        <div style={{ width: size, height: size, borderRadius: 12, background: '#f0f9ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: small ? 20 : 24, fontWeight: 900, border: '1px solid #dde5ef', flexShrink: 0 }}>
          ع
        </div>
      );
    }
    return (
      <img
        src={LOGO_SOURCES[logoIndex]}
        alt="عقار أبحر"
        style={{ width: size, height: size, borderRadius: 12, objectFit: 'contain', background: 'white', border: '1px solid #e2e8f0', padding: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', flexShrink: 0 }}
        onError={handleLogoError}
        draggable={false}
      />
    );
  }

  const userLinks = useMemo(() => {
    if (!user) return [];
    const links = [];
    if (isAdmin) {
      links.push({ href: '/admin', label: 'لوحة التحكم', icon: 'dashboard' });
      links.push({ href: '/admin/requests', label: 'إدارة الطلبات', icon: 'support_agent' });
      links.push({ href: '/admin/listings', label: 'إدارة العقارات', icon: 'real_estate_agent' });
    }
    return links;
  }, [user, isAdmin]);

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <header className={`siteHeader ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container">
          
          <div className="headerTop">
            <button type="button" className="mobileMenuBtn" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">
              <span className="material-icons-outlined">menu</span>
            </button>

            <Link href="/" className="siteBrand">
              <Logo />
              <div className="siteBrandText">
                <strong>عقار أبحر</strong>
                <span>عروض أبحر الشمالية وشمال جدة</span>
              </div>
            </Link>

            <form className="headerSearch" onSubmit={onSearch}>
              <div className="searchInputWrapper">
                <span className="material-icons-outlined searchIcon">search</span>
                <input
                  className="searchInput"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث عن حي، مخطط، أو نوع عقار..."
                />
              </div>
              <button className="searchBtn" type="submit">بحث</button>
            </form>

            <div className="headerActions">
              <Link href="/add" className="btnPrimary addBtn">
                <span className="material-icons-outlined">add_circle</span>
                إضافة إعلان
              </Link>
              
              {user ? (
                <div className="userDropdownWrap" ref={dropdownRef}>
                  <button className="userBtn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                    <span className="material-icons-outlined userIcon">account_circle</span>
                    <span className="userName">{user.email?.split('@')[0] || 'حسابي'}</span>
                    <span className="material-icons-outlined">expand_more</span>
                  </button>
                  
                  {dropdownOpen && (
                    <div className="dropdownMenu">
                      <div className="dropdownHeader">
                        <span>{user.email}</span>
                      </div>
                      <div className="dropdownBody">
                        {userLinks.map((link) => (
                          <Link key={link.href} href={link.href} className="dropdownItem" onClick={() => setDropdownOpen(false)}>
                            <span className="material-icons-outlined">{link.icon}</span> {link.label}
                          </Link>
                        ))}
                        <Link href="/account" className="dropdownItem" onClick={() => setDropdownOpen(false)}>
                          <span className="material-icons-outlined">settings</span> إعدادات الحساب
                        </Link>
                      </div>
                      <div className="dropdownFooter">
                        <button onClick={handleLogout} className="logoutBtn">
                          <span className="material-icons-outlined">logout</span> تسجيل الخروج
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/account" className="btnOutline loginBtn">
                  <span className="material-icons-outlined">login</span> دخول
                </Link>
              )}
            </div>
          </div>

          <nav className="headerNavLinks">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`navLink ${isActive(link.href) ? 'active' : ''}`}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {menuOpen && (
        <div className="mobileOverlay" onClick={() => setMenuOpen(false)}>
          <aside className="mobileDrawer" onClick={(e) => e.stopPropagation()}>
            
            <div className="drawerHeader">
              <div className="siteBrand">
                <Logo small />
                <div className="siteBrandText">
                  <strong>عقار أبحر</strong>
                  <span>عقارات</span>
                </div>
              </div>
              <button type="button" className="closeBtn" onClick={() => setMenuOpen(false)}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="drawerBody">
              <form className="mobileSearch" onSubmit={onSearch}>
                <input
                  className="mobileSearchInput"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث هنا..."
                />
                <button type="submit" className="mobileSearchBtn"><span className="material-icons-outlined">search</span></button>
              </form>

              <div className="drawerLinksGroup">
                <span className="groupTitle">القائمة الرئيسية</span>
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={`drawerLink ${isActive(link.href) ? 'active' : ''}`}>
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="drawerLinksGroup">
                <span className="groupTitle">حسابي</span>
                {user ? (
                  <>
                    <div className="drawerUserEmail">{user.email}</div>
                    {userLinks.map((link) => (
                      <Link key={link.href} href={link.href} className="drawerLink">
                        <span className="material-icons-outlined" style={{fontSize: '18px'}}>{link.icon}</span> {link.label}
                      </Link>
                    ))}
                    <Link href="/account" className="drawerLink">
                       <span className="material-icons-outlined" style={{fontSize: '18px'}}>settings</span> إعدادات الحساب
                    </Link>
                    <button onClick={handleLogout} className="drawerLogoutBtn">
                      <span className="material-icons-outlined">logout</span> تسجيل الخروج
                    </button>
                  </>
                ) : (
                  <Link href="/account" className="drawerLink">
                    <span className="material-icons-outlined" style={{fontSize: '18px'}}>login</span> تسجيل الدخول
                  </Link>
                )}
              </div>
            </div>

            <div className="drawerFooter">
              <Link href="/add" className="btnPrimary drawerAddBtn">
                <span className="material-icons-outlined">add_circle</span> أضف عقارك الآن
              </Link>
            </div>

          </aside>
        </div>
      )}

      <style jsx>{`
        /* 1. إعدادات الهيدر الرئيسية */
        .siteHeader { position: sticky; top: 0; z-index: 100; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); transition: all 0.3s ease; padding: 15px 0 0; }
        .siteHeader.scrolled { box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 10px 0 0; }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        .headerTop { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 25px; margin-bottom: 15px; }

        /* 2. الشعار والهوية */
        .siteBrand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        
        .siteBrandText { display: flex; flex-direction: column; gap: 2px; }
        .siteBrandText strong { font-size: 18px; font-weight: 900; color: var(--text); line-height: 1.1; }
        .siteBrandText span { font-size: 13px; color: var(--muted); font-weight: 600; }

        /* 3. شريط البحث */
        .headerSearch { display: flex; align-items: center; gap: 8px; max-width: 500px; width: 100%; margin: 0 auto; }
        .searchInputWrapper { position: relative; flex-grow: 1; display: flex; align-items: center; }
        .searchIcon { position: absolute; right: 15px; color: var(--muted); font-size: 20px; }
        .searchInput { width: 100%; padding: 12px 15px 12px 45px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-main); color: var(--text); font-size: 14px; transition: all 0.2s; outline: none; }
        .searchInput:focus { background: white; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); }
        .searchBtn { background: var(--primary); color: white; border: none; border-radius: 12px; padding: 0 20px; height: 44px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
        .searchBtn:hover { background: #0d665f; }

        /* 4. الأزرار والإجراءات */
        .headerActions { display: flex; align-items: center; gap: 12px; }
        
        .btnPrimary { display: inline-flex; align-items: center; gap: 6px; background: var(--primary); color: white; padding: 10px 18px; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; transition: background 0.2s; border: none; cursor: pointer; }
        .btnPrimary:hover { background: #0d665f; }
        
        .btnOutline { display: inline-flex; align-items: center; gap: 6px; background: white; color: var(--text); border: 1px solid var(--border); padding: 10px 18px; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; transition: all 0.2s; }
        .btnOutline:hover { background: var(--bg-main); color: var(--primary); border-color: var(--primary); }

        /* 5. قائمة المستخدم (Dropdown) */
        .userDropdownWrap { position: relative; }
        .userBtn { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid var(--border); padding: 8px 14px; border-radius: 12px; color: var(--text); font-weight: 700; cursor: pointer; transition: all 0.2s; height: 44px; }
        .userBtn:hover { background: var(--bg-main); border-color: var(--primary); color: var(--primary); }
        .userIcon { color: var(--primary); }
        .userName { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
        
        .dropdownMenu { position: absolute; top: calc(100% + 8px); left: 0; background: white; border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); min-width: 220px; overflow: hidden; animation: fadeInDown 0.2s ease-out; }
        .dropdownHeader { padding: 15px; background: var(--bg-main); border-bottom: 1px solid var(--border); color: var(--muted); font-size: 13px; font-weight: 600; word-break: break-all; }
        .dropdownBody { display: flex; flex-direction: column; padding: 8px 0; }
        .dropdownItem { display: flex; align-items: center; gap: 10px; padding: 10px 15px; color: var(--text); text-decoration: none; font-size: 14px; font-weight: 600; transition: background 0.2s; }
        .dropdownItem:hover { background: var(--bg-main); color: var(--primary); }
        .dropdownItem .material-icons-outlined { font-size: 18px; color: var(--muted); }
        .dropdownItem:hover .material-icons-outlined { color: var(--primary); }
        .dropdownFooter { border-top: 1px solid var(--border); padding: 8px; }
        .logoutBtn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; background: #fff5f5; color: #e53e3e; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
        .logoutBtn:hover { background: #fed7d7; }

        /* 6. الروابط السفلية للهيدر */
        .headerNavLinks { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; padding-bottom: 10px; overflow-x: auto; scrollbar-width: none; }
        .headerNavLinks::-webkit-scrollbar { display: none; }
        .navLink { padding: 8px 16px; color: var(--muted); text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 10px; transition: all 0.2s; white-space: nowrap; }
        .navLink:hover { background: var(--bg-main); color: var(--text); }
        .navLink.active { background: rgba(15, 118, 110, 0.1); color: var(--primary); }

        /* 7. الموبايل والقائمة الجانبية (Mobile Menu) */
        .mobileMenuBtn { display: none; background: white; border: 1px solid var(--border); border-radius: 10px; width: 44px; height: 44px; align-items: center; justify-content: center; color: var(--text); cursor: pointer; }
        
        .mobileOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; backdrop-filter: blur(4px); animation: fadeIn 0.3s; }
        .mobileDrawer { position: absolute; top: 0; bottom: 0; right: 0; width: 85%; max-width: 350px; background: white; display: flex; flex-direction: column; box-shadow: -5px 0 25px rgba(0,0,0,0.1); animation: slideInRight 0.3s ease-out; }
        
        .drawerHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--border); background: #fcfcfd; }
        .closeBtn { background: var(--bg-main); border: 1px solid var(--border); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text); cursor: pointer; }
        
        .drawerBody { flex-grow: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 25px; }
        
        .mobileSearch { display: flex; gap: 8px; }
        .mobileSearchInput { flex-grow: 1; padding: 12px 15px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-main); outline: none; }
        .mobileSearchBtn { background: var(--primary); color: white; border: none; border-radius: 12px; width: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        
        .drawerLinksGroup { display: flex; flex-direction: column; gap: 8px; }
        .groupTitle { font-size: 13px; color: var(--muted); font-weight: 700; margin-bottom: 5px; padding-right: 10px; }
        .drawerLink { display: flex; align-items: center; gap: 10px; padding: 12px 15px; color: var(--text); text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 12px; transition: background 0.2s; }
        .drawerLink:hover, .drawerLink.active { background: rgba(15, 118, 110, 0.1); color: var(--primary); }
        .drawerUserEmail { padding: 10px 15px; color: var(--muted); font-size: 13px; font-weight: 600; background: var(--bg-main); border-radius: 10px; margin-bottom: 5px; word-break: break-all; }
        .drawerLogoutBtn { display: flex; align-items: center; gap: 10px; padding: 12px 15px; background: white; color: #e53e3e; border: 1px solid #fed7d7; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 5px; }
        
        .drawerFooter { padding: 20px; border-top: 1px solid var(--border); background: #fcfcfd; }
        .drawerAddBtn { width: 100%; justify-content: center; padding: 14px; font-size: 16px; }

        /* تأثيرات الحركة (Animations) */
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }

        /* التجاوب (Media Queries) */
        @media (max-width: 900px) {
          .headerTop { grid-template-columns: auto 1fr auto; }
          .siteBrandText span { display: none; }
          .headerSearch { display: none; }
          .headerNavLinks { display: none; }
          .mobileMenuBtn { display: flex; }
          .addBtn span { display: none; }
          .loginBtn { display: none; }
          .userDropdownWrap { display: none; }
        }
      `}</style>
    </>
  );
}
