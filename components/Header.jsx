'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function Header() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  // تتبع التمرير لتغيير مظهر الهيدر
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // إعادة تعيين البحث عند العودة للصفحة الرئيسية
  useEffect(() => {
    if (pathname === '/') setSearchQuery('');
  }, [pathname]);

  // إغلاق القائمة الجانبية عند تغيير المسار
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = String(searchQuery || '').trim();
    
    if (!query) {
      router.push('/listings');
      return;
    }
    
    router.push(`/listings?q=${encodeURIComponent(query)}`);
  };

  // روابط التنقل الرئيسية
  const navLinks = useMemo(() => [
    { href: '/listings', label: 'كل العروض' },
    { href: '/map', label: 'الخريطة' },
    { href: '/request', label: 'أرسل طلبك' },
    { href: '/account', label: 'الحساب' },
  ], []);

  const mobileLinks = useMemo(() => [
    { href: '/', label: 'الرئيسية' },
    { href: '/listings', label: 'كل العروض' },
    { href: '/listings?dealType=sale', label: 'بيع' },
    { href: '/listings?dealType=rent', label: 'إيجار' },
    { href: '/map', label: 'الخريطة' },
    { href: '/neighborhoods', label: 'الأحياء' },
    { href: '/request', label: 'أرسل طلبك' },
  ], []);

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container headerInner">
        {/* الشعار */}
        <Link className="brand" href="/" aria-label="عقار أبحر - الرئيسية">
          <div className="brandMark" aria-hidden="true">
            <div className="markInner">
              {/* الشعار بدل رمز المنزل */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="markLogo" src="/logo-icon-128.png" alt="" />
            </div>
          </div>
          <div className="brandText">
            <span className="brandTitle">عقار أبحر</span>
            <span className="brandSub">شمال جدة</span>
          </div>
        </Link>

        {/* شريط البحث */}
        <form className="searchForm" onSubmit={handleSearch} role="search" aria-label="بحث عن عقارات">
          <div className="searchWrapper">
            <input
              className="searchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن حي / مخطط / جزء..."
              aria-label="نص البحث"
            />
            <button className="searchButton" type="submit" aria-label="تنفيذ البحث">
              <span className="searchText">بحث</span>
            </button>
          </div>
        </form>

        {/* روابط التنقل (لأجهزة سطح المكتب) */}
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

        {/* زر القائمة الجانبية للجوال */}
        <button
          className="menuToggle"
          aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={isMenuOpen ? 'true' : 'false'}
          onClick={() => setIsMenuOpen((s) => !s)}
          type="button"
        >
          <span className="hamburger" aria-hidden="true">
            <span className="line" />
            <span className="line" />
            <span className="line" />
          </span>
        </button>
      </div>

      {/* ✅ قائمة جانبية للجوال */}
      {isMenuOpen ? (
        <div className="drawerRoot" role="dialog" aria-modal="true" aria-label="القائمة">
          <button className="drawerOverlay" type="button" onClick={() => setIsMenuOpen(false)} aria-label="إغلاق" />
          <aside className="drawer">
            <div className="drawerHead">
              <div className="drawerBrand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="drawerLogo" src="/logo-icon-128.png" alt="" />
                <div>
                  <div className="drawerTitle">عقار أبحر</div>
                  <div className="drawerSub">شمال جدة</div>
                </div>
              </div>
              <button className="drawerClose" type="button" onClick={() => setIsMenuOpen(false)} aria-label="إغلاق">
                ×
              </button>
            </div>

            <div className="drawerLinks">
              {mobileLinks.map((l) => (
                <button
                  key={l.href}
                  type="button"
                  className={`drawerLink ${isActive(l.href.split('?')[0]) && l.href === '/' ? 'active' : ''}`}
                  onClick={() => router.push(l.href)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 13, 18, 0.85);
          backdrop-filter: blur(15px);
          border-bottom: 1px solid var(--border);
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .header.scrolled {
          background: rgba(10, 13, 18, 0.95);
          border-bottom: 1px solid rgba(214, 179, 91, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .headerInner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0;
          height: 70px;
        }

        /* الشعار */
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: white;
          min-width: 0;
          flex-shrink: 0;
        }

        .brandMark {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-primary);
          position: relative;
          overflow: hidden;
        }

        .markInner {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.15);
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
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
        }

        .brandText {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .brandTitle {
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.3px;
          background: linear-gradient(to right, #fff, var(--primary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brandSub {
          font-size: 11px;
          color: var(--muted);
          font-weight: 700;
          margin-top: 2px;
        }

        /* شريط البحث */
        .searchForm {
          flex: 1;
          max-width: 500px;
          min-width: 200px;
        }

        .searchWrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 6px;
          transition: all 0.2s ease;
        }

        .searchWrapper:focus-within {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .searchInput {
          flex: 1;
          border: none;
          background: transparent;
          color: white;
          font-size: 14px;
          padding: 10px 14px;
          outline: none;
          min-width: 0;
        }

        .searchInput::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .searchButton {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          border: none;
          color: #000;
          font-weight: 800;
          padding: 10px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .searchButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(214, 179, 91, 0.3);
        }

        .searchButton:active {
          transform: translateY(0);
        }

        .searchText {
          font-size: 13px;
        }

        /* روابط التنقل (سطح المكتب) */
        .desktopNav {
          display: none;
          align-items: center;
          gap: 20px;
        }

        .navLink {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
          padding: 6px 0;
          position: relative;
          transition: color 0.2s ease;
          white-space: nowrap;
        }

        .navLink:hover {
          color: white;
        }

        .navLink.active {
          color: var(--primary);
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

        /* زر القائمة الجانبية */
        .menuToggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .menuToggle:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--primary);
        }

        .hamburger {
          width: 18px;
          height: 14px;
          display: inline-flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .line {
          height: 2px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.92);
          display: block;
        }

        /* ===== Drawer ===== */
        .drawerRoot {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: flex;
          justify-content: flex-end;
        }
        .drawerOverlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(4px);
          border: 0;
        }
        .drawer {
          position: relative;
          width: min(340px, 88vw);
          height: 100%;
          background: rgba(18, 22, 29, 0.98);
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: -18px 0 40px rgba(0, 0, 0, 0.35);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .drawerHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
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
          background: rgba(255, 255, 255, 0.06);
          padding: 6px;
          object-fit: contain;
        }
        .drawerTitle {
          font-weight: 950;
          color: #fff;
          line-height: 1.1;
        }
        .drawerSub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
          margin-top: 2px;
          font-weight: 700;
        }
        .drawerClose {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 22px;
          cursor: pointer;
        }
        .drawerLinks {
          display: grid;
          gap: 10px;
          margin-top: 4px;
        }
        .drawerLink {
          text-align: right;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }
        .drawerLink:hover {
          border-color: rgba(214, 179, 91, 0.35);
          background: rgba(214, 179, 91, 0.12);
        }

        /* التجاوب مع الشاشات المختلفة */
        @media (min-width: 1024px) {
          .desktopNav {
            display: flex;
          }
          
          .menuToggle {
            display: none;
          }
          
          .brandTitle {
            font-size: 19px;
          }
        }

        @media (max-width: 768px) {
          .headerInner {
            gap: 12px;
            padding: 12px 0;
            height: 64px;
          }
          
          .brandMark {
            width: 40px;
            height: 40px;
          }
          
          .markInner {
            width: 32px;
            height: 32px;
          }
          
          .brandSub {
            display: none;
          }
          
          .searchText {
            display: inline;
          }
          
          .searchButton {
            padding: 10px;
          }
        }

        @media (max-width: 480px) {
          .brandTitle {
            font-size: 16px;
          }
          
          .searchInput {
            font-size: 13px;
            padding: 8px 12px;
          }
          
          .searchButton {
            padding: 8px;
          }
          
          .menuToggle {
            width: 40px;
            height: 40px;
          }
        }

        /* تحسينات للوضع المظلم في المتصفح */
        @media (prefers-color-scheme: dark) {
          .header {
            background: rgba(10, 13, 18, 0.95);
          }
        }

        /* تحسينات للوصول */
        .navLink:focus-visible,
        .searchButton:focus-visible,
        .menuToggle:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .searchInput:focus-visible {
          outline: none;
        }
      `}</style>
    </header>
  );
}
