'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminShell({ title, description, actions, children }) {
  const pathname = usePathname();

  // دالة ذكية لمعرفة ما إذا كان الرابط هو الصفحة الحالية لتمييزه بصرياً
  const isActive = (path) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(path);
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <div className="shellContainer">
        {/* شريط التنقل (Navigation Bar) */}
        <nav className="shellNav">
          <NavLink href="/admin" active={isActive('/admin')} icon="dashboard">الرئيسية</NavLink>
          <NavLink href="/admin/requests" active={isActive('/admin/requests')} icon="support_agent">الطلبات</NavLink>
          <NavLink href="/admin/inbox" active={isActive('/admin/inbox')} icon="all_inbox">الوارد الذكي</NavLink>
          <NavLink href="/admin/search" active={isActive('/admin/search')} icon="manage_search">البحث الذكي</NavLink>
          <NavLink href="/admin/listings" active={isActive('/admin/listings')} icon="real_estate_agent">العروض</NavLink>
          
          <div className="navDivider"></div>
          
          <NavLink href="/add" active={isActive('/add')} icon="add_circle" isPrimary>إضافة إعلان</NavLink>
        </nav>

        {/* الترويسة العلوية لكل صفحة (Hero Header) */}
        <div className="shellHero">
          <div className="heroTexts">
            <h2 className="heroTitle">{title}</h2>
            {description && <p className="heroDescription">{description}</p>}
          </div>
          {actions && <div className="heroActions">{actions}</div>}
        </div>

        {/* محتوى الصفحة يتغير هنا */}
        <div className="shellContent">
          {children}
        </div>
      </div>

      <style jsx>{`
        .shellContainer { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
        
        .shellNav { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; background: white; padding: 15px 20px; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 5px; }
        .navDivider { width: 1px; height: 30px; background: var(--border); margin: 0 5px; }

        .shellHero { background: white; border-radius: 16px; border: 1px solid var(--border); padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
        .heroTexts { flex: 1; min-width: 250px; }
        .heroTitle { margin: 0; font-size: 24px; font-weight: 900; color: var(--text); line-height: 1.3; }
        .heroDescription { color: var(--muted); margin: 8px 0 0 0; font-size: 15px; line-height: 1.6; }
        
        .heroActions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        
        .shellContent { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

// مكون فرعي معزول لروابط التنقل
function NavLink({ href, children, active, icon, isPrimary }) {
  return (
    <>
      <Link href={href} className={`navLink ${active ? 'active' : ''} ${isPrimary ? 'primaryLink' : ''}`}>
        {icon && <span className="material-icons-outlined navIcon">{icon}</span>}
        {children}
      </Link>
      <style jsx>{`
        .navLink { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 800; text-decoration: none; color: var(--muted); background: var(--bg-main); border: 1px solid transparent; transition: all 0.2s; }
        .navLink:hover { background: var(--bg-soft); color: var(--text); }
        .navLink.active { background: rgba(15, 118, 110, 0.1); color: var(--primary); border-color: rgba(15, 118, 110, 0.2); }
        .navIcon { font-size: 18px; }
        
        /* تصميم خاص للزر الأساسي (إضافة إعلان) */
        .primaryLink { background: var(--primary); color: white; border-color: var(--primary); }
        .primaryLink:hover { background: #0d665f; color: white; }
        .primaryLink.active { background: #0b534d; color: white; border-color: #0b534d; }
      `}</style>
    </>
  );
}
