'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MAIN_NAV_LINKS } from '@/lib/navigation';

export default function MobileNav() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [hiddenByFullscreen, setHiddenByFullscreen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const tick = () => {
      try { setHiddenByFullscreen(document.body.classList.contains('isMapFullscreen')); } 
      catch { setHiddenByFullscreen(false); }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 900px)');
    const apply = () => setIsDesktop(!!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // نتأكد من وجود الروابط قبل الفلترة لتجنب الأخطاء
  const items = (MAIN_NAV_LINKS || []).filter(link => link.mobileBottom);

  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (isDesktop) return null;

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      <nav className={`mobileBottomNav ${hiddenByFullscreen ? 'hidden' : ''}`}>
        <div className="navContainer">
          {items.map((it) => {
            const active = isActive(it.href);
            return (
              <button key={it.href} type="button" className={`navItem ${active ? 'active' : ''}`} onClick={() => router.push(it.href)}>
                <span className="material-icons-outlined icon">{it.icon}</span>
                <span className="label">{it.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <style jsx>{`
        .mobileBottomNav { position: fixed; bottom: 20px; left: 15px; right: 15px; z-index: 5000; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s; }
        .mobileBottomNav.hidden { transform: translateY(150%); opacity: 0; pointer-events: none; }
        .navContainer { display: grid; grid-template-columns: repeat(${items.length || 1}, 1fr); background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 24px; padding: 8px 5px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15); }
        .navItem { display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; color: #64748b; padding: 8px 0; cursor: pointer; transition: all 0.2s; position: relative; }
        .icon { font-size: 24px; transition: transform 0.2s; }
        .label { font-size: 10px; font-weight: 800; }
        .navItem.active { color: var(--primary); }
        .navItem.active .icon { transform: translateY(-2px); font-variation-settings: 'FILL' 1; }
        .navItem.active::after { content: ''; position: absolute; bottom: 2px; width: 4px; height: 4px; background: var(--primary); border-radius: 50%; }
        @media (max-width: 350px) { .label { font-size: 9px; } }
      `}</style>
    </>
  );
}
