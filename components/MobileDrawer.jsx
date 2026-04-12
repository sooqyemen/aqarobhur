'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { MAIN_NAV_LINKS } from '@/lib/navigation';

export default function MobileDrawer({ open, onClose }) {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (open) body.style.overflow = 'hidden';
    else body.style.overflow = '';
  }, [open]);

  if (!open) return null;

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      <div className="drawerRoot" onClick={onClose}>
        <aside className="drawerContent" onClick={(e) => e.stopPropagation()}>
          <div className="drawerHeader">
            <div className="brandTitle">
              <strong>عقار أبحر</strong>
              <span>القائمة الرئيسية</span>
            </div>
            <button className="closeBtn" onClick={onClose}>
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
          <nav className="drawerNav">
            {(MAIN_NAV_LINKS || []).map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href.split('?')[0]);
              return (
                <Link key={link.href} href={link.href} className={`navLink ${active ? 'active' : ''} ${link.primary ? 'primaryLink' : ''}`} onClick={onClose}>
                  <span className="material-icons-outlined">{link.icon}</span>
                  <span className="linkText">{link.label}</span>
                  {active && <span className="activeDot"></span>}
                </Link>
              );
            })}
          </nav>
          <div className="drawerFooter">
            <p>© {new Date().getFullYear()} عقار أبحر</p>
            <p>للتسويق والوساطة العقارية</p>
          </div>
        </aside>
      </div>
      <style jsx>{`
        .drawerRoot { position: fixed; inset: 0; z-index: 10000; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: flex-end; animation: fadeIn 0.3s ease; }
        .drawerContent { width: min(85vw, 320px); background: #ffffff; height: 100%; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1); animation: slideIn 0.3s ease-out; }
        .drawerHeader { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; }
        .brandTitle strong { display: block; font-size: 18px; color: var(--text); }
        .brandTitle span { font-size: 12px; color: var(--muted); }
        .closeBtn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border); background: var(--bg-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); }
        .drawerNav { padding: 15px; display: flex; flex-direction: column; gap: 8px; flex-grow: 1; overflow-y: auto; }
        .navLink { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; text-decoration: none; color: var(--muted); font-weight: 700; font-size: 15px; transition: all 0.2s; position: relative; }
        .navLink:hover { background: var(--bg-soft); color: var(--text); }
        .navLink.active { background: rgba(15, 118, 110, 0.1); color: var(--primary); }
        .primaryLink { background: var(--primary); color: white !important; margin-top: 10px; }
        .primaryLink:hover { background: #0d665f; }
        .activeDot { width: 6px; height: 6px; background: var(--primary); border-radius: 50%; position: absolute; left: 15px; }
        .drawerFooter { padding: 20px; border-top: 1px solid var(--border); text-align: center; font-size: 12px; color: var(--muted); line-height: 1.6; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}
