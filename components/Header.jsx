'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  // اغلق القائمة الجانبية عند تغيير الصفحة
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="header">
      <div className="container headerInner">
        <Link className="brand" href="/" aria-label="عقار أبحر - الصفحة الرئيسية">
          <div className="brandLogo" aria-hidden="true">
            <img src="/logo-mark.svg" alt="" />
          </div>
          <div>
            <div className="brandTitle">عقار أبحر</div>
            <div className="muted" style={{ fontSize: 12 }}>عروض مباشرة • شمال جدة</div>
          </div>
        </Link>

        {/* ✅ سطح المكتب: تظهر كل الروابط بما فيها الأدمن */}
        <nav className="nav navDesktop" aria-label="التنقل">
          <Link className={isActive('/') ? 'btn btnActive' : 'btn'} href="/" aria-current={isActive('/') ? 'page' : undefined}>الرئيسية</Link>
          <Link className={isActive('/listings') ? 'btn btnActive' : 'btn'} href="/listings" aria-current={isActive('/listings') ? 'page' : undefined}>كل العروض</Link>
          <Link className={isActive('/map') ? 'btn btnActive' : 'btn'} href="/map" aria-current={isActive('/map') ? 'page' : undefined}>الخريطة</Link>
          <Link className={isActive('/request') ? 'btn btnActive' : 'btn'} href="/request" aria-current={isActive('/request') ? 'page' : undefined}>أرسل طلبك</Link>
          <Link className={isActive('/admin') ? 'btn btnActive' : 'btn'} href="/admin" aria-current={isActive('/admin') ? 'page' : undefined}>الأدمن</Link>
        </nav>

        {/* ✅ الجوال: 3 روابط فقط + قائمة جانبية للأدمن */}
        <nav className="nav navMobile" aria-label="التنقل للجوال">
          <Link className={isActive('/') ? 'btn btnActive' : 'btn'} href="/" aria-current={isActive('/') ? 'page' : undefined}>الرئيسية</Link>
          <Link className={isActive('/listings') ? 'btn btnActive' : 'btn'} href="/listings" aria-current={isActive('/listings') ? 'page' : undefined}>العروض</Link>
          <Link className={isActive('/request') ? 'btn btnActive' : 'btn'} href="/request" aria-current={isActive('/request') ? 'page' : undefined}>أرسل طلبك</Link>
          <button
            type="button"
            className="btn menuBtn"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen ? 'true' : 'false'}
            aria-label="فتح القائمة"
          >
            ☰
          </button>
        </nav>
      </div>

      {/* القائمة الجانبية للجوال */}
      {menuOpen ? (
        <div className="drawerOverlay" role="dialog" aria-modal="true" onClick={() => setMenuOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawerHeader">
              <div>
                <div style={{ fontWeight: 900 }}>القائمة</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>روابط إضافية</div>
              </div>
              <button type="button" className="btn" onClick={() => setMenuOpen(false)}>إغلاق</button>
            </div>

            <div className="drawerLinks">
              <Link className={isActive('/') ? 'btn btnActive' : 'btn'} href="/">الرئيسية</Link>
              <Link className={isActive('/listings') ? 'btn btnActive' : 'btn'} href="/listings">كل العروض</Link>
              <Link className={isActive('/map') ? 'btn btnActive' : 'btn'} href="/map">الخريطة</Link>
              <Link className={isActive('/request') ? 'btn btnActive' : 'btn'} href="/request">أرسل طلبك</Link>
              <div style={{ height: 8 }} />
              <Link className={isActive('/admin') ? 'btn btnActive' : 'btn'} href="/admin">تسجيل دخول الأدمن</Link>
              <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                ملاحظة: رابط الأدمن مخفي من الشريط في الجوال ويظهر هنا فقط.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .brandLogo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(214,179,91,.45);
          background: linear-gradient(180deg, rgba(214,179,91,.95), rgba(180,137,45,.92));
          box-shadow: 0 12px 28px rgba(214,179,91,.18);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brandLogo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .navMobile { display: none; }
        .navDesktop { display: flex; }

        @media (max-width: 780px) {
          .navDesktop { display: none; }
          .navMobile {
            display: flex;
            gap: 8px;
            flex-wrap: nowrap;
            align-items: center;
          }
          .navMobile :global(.btn) {
            padding: 8px 10px;
            border-radius: 999px;
            white-space: nowrap;
          }
          .menuBtn { padding: 8px 12px; }
        }

        .drawerOverlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(0,0,0,.55);
          backdrop-filter: blur(6px);
          display: flex;
          justify-content: flex-end;
        }
        .drawer {
          width: min(330px, 86vw);
          height: 100%;
          background: rgba(10,13,18,.96);
          border-left: 1px solid rgba(255,255,255,.12);
          padding: 14px;
          box-shadow: 0 20px 80px rgba(0,0,0,.55);
        }
        .drawerHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,.10);
        }
        .drawerLinks {
          padding-top: 12px;
          display: grid;
          gap: 10px;
        }
        .drawerLinks :global(.btn) {
          width: 100%;
          justify-content: center;
          border-radius: 12px;
        }
      `}</style>
    </header>
  );
}
