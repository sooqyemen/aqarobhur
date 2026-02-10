'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Item({ href, label, icon, active }) {
  return (
    <Link href={href} className={active ? 'navItem active' : 'navItem'} aria-current={active ? 'page' : undefined}>
      <div className="icon" aria-hidden="true">{icon}</div>
      <div className="lbl">{label}</div>
      <style jsx>{`
        .navItem{
          flex:1;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:4px;
          padding:8px 6px;
          text-decoration:none;
          color: rgba(15,23,42,.65);
          font-weight:800;
          font-size:11px;
        }
        .icon{font-size:18px;line-height:1}
        .active{color: var(--primary)}
      `}</style>
    </Link>
  );
}

export default function MobileNav() {
  const pathname = usePathname() || '/';
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav className="mobileNav" aria-label="قائمة الجوال">
      <div className="bar">
        <Item href="/" label="الرئيسية" icon="🏠" active={isActive('/')} />
        <Item href="/neighborhoods" label="الأحياء" icon="📍" active={isActive('/neighborhoods')} />

        <Link href="/request" className="centerBtn" aria-label="أرسل طلبك">
          <span className="plus" aria-hidden="true">＋</span>
          <span className="txt">طلبك</span>
        </Link>

        <Item href="/map" label="الخريطة" icon="🗺️" active={isActive('/map')} />
        <Item href="/account" label="الحساب" icon="👤" active={isActive('/account')} />
      </div>

      <style jsx>{`
        .mobileNav{
          position:fixed;
          left:0;right:0;bottom:0;
          z-index:60;
          display:block;
        }
        .bar{
          background: rgba(255,255,255,.92);
          border-top:1px solid var(--border);
          backdrop-filter: blur(10px);
          display:flex;
          align-items:flex-end;
          padding:6px 10px 8px;
        }
        .centerBtn{
          width:78px;
          height:46px;
          margin:-18px 8px 0;
          border-radius:16px;
          background: var(--primary);
          color:#fff;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:2px;
          text-decoration:none;
          box-shadow: 0 14px 28px rgba(30,115,216,.28);
          border:1px solid rgba(0,0,0,.02);
          font-weight:900;
        }
        .plus{font-size:18px;line-height:1}
        .txt{font-size:11px;opacity:.95}
        @media (min-width: 980px){
          .mobileNav{display:none}
        }
      `}</style>
    </nav>
  );
}
