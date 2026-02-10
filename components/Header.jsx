'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function Header() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [q, setQ] = useState('');

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  useEffect(() => {
    // لو رجع المستخدم للصفحة الرئيسية نخلي البحث فاضي
    if (pathname === '/') setQ('');
  }, [pathname]);

  function onSubmit(e) {
    e.preventDefault();
    const query = String(q || '').trim();
    if (!query) {
      router.push('/listings');
      return;
    }
    router.push(`/listings?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="topbar">
      <div className="container topbarInner">
        <Link className="brand" href="/" aria-label="عقار أبحر - الرئيسية">
          <span className="brandMark" aria-hidden="true">
            <img src="/logo-mark.svg" alt="" />
          </span>
          <span className="brandText">
            <span className="brandTitle">عقار أبحر</span>
            <span className="brandSub muted">شمال جدة</span>
          </span>
        </Link>

        <form className="search" onSubmit={onSubmit} role="search" aria-label="بحث">
          <input
            className="searchInput"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن حي / مخطط / جزء..."
            aria-label="ابحث"
          />
          <button className="searchBtn" type="submit" aria-label="بحث">بحث</button>
        </form>

        {/* سطح المكتب فقط */}
        <nav className="topLinks" aria-label="روابط سريعة">
          <Link className={isActive('/listings') ? 'link active' : 'link'} href="/listings">كل العروض</Link>
          <Link className={isActive('/map') ? 'link active' : 'link'} href="/map">الخريطة</Link>
          <Link className={isActive('/request') ? 'link active' : 'link'} href="/request">أرسل طلبك</Link>
          <Link className={isActive('/account') ? 'link active' : 'link'} href="/account">الحساب</Link>
        </nav>
      </div>

      <style jsx>{`
        .topbar{
          position:sticky;top:0;z-index:50;
          background: var(--primary);
          border-bottom: 1px solid rgba(255,255,255,.18);
        }
        .topbarInner{
          display:flex;align-items:center;gap:12px;
          padding:10px 0;
        }
        .brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}
        .brandMark{
          width:38px;height:38px;border-radius:12px;
          background: rgba(255,255,255,.14);
          display:flex;align-items:center;justify-content:center;
          overflow:hidden;
        }
        .brandMark img{width:26px;height:26px;object-fit:contain;filter:drop-shadow(0 6px 16px rgba(0,0,0,.18))}
        .brandText{display:flex;flex-direction:column;line-height:1.1}
        .brandTitle{font-weight:900;font-size:16px}
        .brandSub{font-size:12px;color:rgba(255,255,255,.82)}
        .search{
          flex:1;display:flex;align-items:center;gap:8px;
          background: rgba(255,255,255,.16);
          border:1px solid rgba(255,255,255,.22);
          padding:6px;border-radius:14px;
        }
        .searchInput{
          flex:1;border:0;outline:0;background:transparent;color:#fff;
          font-size:14px;padding:6px 10px;
        }
        .searchInput::placeholder{color:rgba(255,255,255,.72)}
        .searchBtn{
          border:0;cursor:pointer;
          background:#fff;color:var(--primary2);
          font-weight:800;border-radius:12px;
          padding:8px 12px;
        }
        .topLinks{display:none;gap:14px;align-items:center}
        .link{color:rgba(255,255,255,.85);text-decoration:none;font-weight:700;font-size:13px}
        .link:hover{color:#fff}
        .active{color:#fff;text-decoration:underline;text-underline-offset:6px}
        @media (min-width: 980px){
          .topLinks{display:flex}
          .brandTitle{font-size:17px}
        }
        @media (max-width: 520px){
          .brandText{display:none}
          .searchBtn{display:none}
        }
      `}</style>
    </header>
  );
}
