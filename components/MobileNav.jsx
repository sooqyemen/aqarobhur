'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ✅ شريط سفلي بسيط (نص فقط) حسب طلبك:
// الرئيسية - الأحياء - الخريطة - أرسل طلبك
// بدون رموز/إيموجي + بدون "الحساب".
export default function MobileNav() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [hiddenByFullscreen, setHiddenByFullscreen] = useState(false);

  useEffect(() => {
    // نخفي الشريط إذا كانت الخريطة في وضع ملء الشاشة (body.isMapFullscreen)
    const tick = () => {
      try {
        setHiddenByFullscreen(document.body.classList.contains('isMapFullscreen'));
      } catch {
        setHiddenByFullscreen(false);
      }
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, []);

  const items = [
    { href: '/', label: 'الرئيسية' },
    { href: '/neighborhoods', label: 'الأحياء' },
    { href: '/map', label: 'الخريطة' },
    { href: '/request', label: 'أرسل طلبك' },
  ];

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className={`mobileNav ${hiddenByFullscreen ? 'hidden' : ''}`} aria-label="قائمة الجوال">
      <div className="wrap">
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <button
              key={it.href}
              type="button"
              className={`item ${active ? 'active' : ''} ${it.href === '/request' ? 'primary' : ''}`}
              onClick={() => router.push(it.href)}
              aria-current={active ? 'page' : undefined}
            >
              {it.label}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .mobileNav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          padding: 10px 12px 14px;
          transition: transform 180ms ease, opacity 180ms ease;
        }
        .mobileNav.hidden {
          transform: translateY(120%);
          opacity: 0;
          pointer-events: none;
        }

        .wrap {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          background: rgba(10, 13, 18, 0.92);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 10px;
          backdrop-filter: blur(16px);
          box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
        }

        .item {
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          border-radius: 14px;
          padding: 10px 8px;
          font-weight: 950;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }
        .item.active {
          border-color: rgba(214, 179, 91, 0.55);
          background: rgba(214, 179, 91, 0.12);
          color: #f6f0df;
        }

        .item.primary {
          border-color: rgba(214, 179, 91, 0.35);
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          color: #0a0d12;
        }
        .item.primary.active {
          filter: brightness(0.98);
        }

        @media (min-width: 900px) {
          .mobileNav {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
