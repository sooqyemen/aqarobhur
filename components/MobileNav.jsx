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
      try {
        setHiddenByFullscreen(document.body.classList.contains('isMapFullscreen'));
      } catch {
        setHiddenByFullscreen(false);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(min-width: 900px)');
    const apply = () => setIsDesktop(!!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const items = (MAIN_NAV_LINKS || []).filter((link) => link.mobileBottom);
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  if (isDesktop || !items.length) return null;

  return (
    <nav className={`mobileBottomNav ${hiddenByFullscreen ? 'hidden' : ''}`} aria-label="التنقل السفلي">
      <div className="navContainer">
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <button
              key={it.href}
              type="button"
              className={`navItem ${active ? 'active' : ''}`}
              onClick={() => router.push(it.href)}
            >
              {it.shortLabel || it.label}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .mobileBottomNav {
          position: fixed;
          left: 14px;
          right: 14px;
          bottom: calc(12px + env(safe-area-inset-bottom));
          z-index: 5000;
          transition: transform .25s ease, opacity .25s ease;
        }
        .mobileBottomNav.hidden {
          transform: translateY(150%);
          opacity: 0;
          pointer-events: none;
        }
        .navContainer {
          display: grid;
          grid-template-columns: repeat(${items.length || 1}, minmax(0, 1fr));
          gap: 6px;
          padding: 7px;
          border-radius: 18px;
          background: rgba(255, 255, 255, .94);
          border: 1px solid rgba(184, 132, 47, .22);
          box-shadow: 0 12px 30px rgba(15, 23, 42, .16);
          backdrop-filter: blur(16px);
        }
        .navItem {
          min-width: 0;
          height: 40px;
          border: 0;
          border-radius: 13px;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }
        .navItem.active {
          color: #fff;
          background: linear-gradient(180deg, #c89a45, #a97625);
          box-shadow: 0 8px 18px rgba(169, 118, 37, .22);
        }
        @media (max-width: 360px) {
          .navContainer { gap: 4px; padding: 6px; }
          .navItem { font-size: 11px; }
        }
      `}</style>
    </nav>
  );
}
