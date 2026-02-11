'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ✅ القائمة السفلية (نص فقط، بدون رموز، بدون الحساب)
const NAV = [
  { href: '/', label: 'الرئيسية' },
  { href: '/neighborhoods', label: 'الأحياء' },
  { href: '/map', label: 'الخريطة' },
  { href: '/request', label: 'أرسل طلبك' },
];

export default function MobileNav() {
  const pathname = usePathname() || '/';
  const router = useRouter();

  // ✅ نخفي القائمة السفلية أثناء ملء الشاشة في الخريطة
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setHide(document.body.classList.contains('isMapFullscreen'));
      } catch {
        setHide(false);
      }
    };

    read();
    const t = setInterval(read, 250); // بسيط وآمن
    return () => clearInterval(t);
  }, []);

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  if (hide) return null;

  return (
    <nav className="mobileNav" aria-label="التنقل السفلي">
      {NAV.map((it) => {
        const active = isActive(it.href);
        return (
          <button
            key={it.href}
            type="button"
            onClick={() => router.push(it.href)}
            className={`navBtn ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {it.label}
          </button>
        );
      })}

      <style jsx>{`
        .mobileNav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          background: var(--card);
          border-top: 1px solid var(--border);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          padding: 10px 10px 14px;
        }

        .navBtn {
          border: 0;
          background: transparent;
          color: var(--muted);
          font-weight: 900;
          font-size: 13px;
          padding: 10px 6px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .navBtn:hover {
          background: rgba(30, 115, 216, 0.06);
          color: var(--text);
        }

        .navBtn.active {
          background: rgba(30, 115, 216, 0.10);
          color: var(--primary2);
        }
      `}</style>
    </nav>
  );
}
