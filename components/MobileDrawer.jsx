'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';

function hashHue(text) {
  const s = String(text || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function IconBadge({ emoji, label }) {
  const hue = useMemo(() => hashHue(label), [label]);
  return (
    <span
      className="icon"
      aria-hidden="true"
      style={{
        background: `hsla(${hue}, 70%, 55%, 0.18)`,
        borderColor: `hsla(${hue}, 70%, 60%, 0.35)`,
      }}
    >
      {emoji}
    </span>
  );
}

export default function MobileDrawer({ open, onClose }) {
  const pathname = usePathname() || '/';

  const links = useMemo(
    () => [
      { href: '/', label: 'الرئيسية', emoji: '🏠' },
      { href: '/listings', label: 'كل العروض', emoji: '📋' },
      { href: '/listings?dealType=sale', label: 'بيع', emoji: '💰' },
      { href: '/listings?dealType=rent', label: 'إيجار', emoji: '🏷️' },
      { href: '/map', label: 'الخريطة', emoji: '🗺️' },
      { href: '/neighborhoods', label: 'الأحياء', emoji: '🏘️' },
      { href: '/request', label: 'أرسل طلبك', emoji: '📨', primary: true },
    ],
    []
  );

  // إغلاق عند الضغط على الخلفية
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  // تحسين: عند فتح القائمة نحرّك الفوكس للحاوية
  useEffect(() => {
    if (!open) return;
    try {
      const el = document.getElementById('mobile-drawer');
      el?.focus?.();
    } catch {}
  }, [open]);

  return (
    <div className={`drawerRoot ${open ? 'open' : ''}`} onMouseDown={onBackdrop} aria-hidden={!open}>
      <aside
        id="mobile-drawer"
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="قائمة الجوال"
        tabIndex={-1}
      >
        <div className="head">
          <div className="title">القائمة</div>
          <button className="close" type="button" onClick={onClose} aria-label="إغلاق القائمة">
            ✕
          </button>
        </div>

        <div className="items" role="navigation" aria-label="روابط">
          {links.map((it) => {
            const active = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href.split('?')[0]);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onClose}
                className={`item ${active ? 'active' : ''} ${it.primary ? 'primary' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <IconBadge emoji={it.emoji} label={it.label} />
                <span className="label">{it.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="hint muted">اسحب للأسفل أو اضغط ✕ للإغلاق.</div>
      </aside>

      <style jsx>{`
        .drawerRoot {
          position: fixed;
          inset: 0;
          z-index: 10050;
          pointer-events: none;
        }
        .drawerRoot::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          opacity: 0;
          transition: opacity 180ms ease;
        }
        .drawer {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: min(86vw, 340px);
          background: rgba(10, 13, 18, 0.98);
          border-left: 1px solid var(--border);
          box-shadow: -22px 0 50px rgba(0, 0, 0, 0.55);
          transform: translateX(110%);
          transition: transform 220ms ease;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          outline: none;
        }

        .drawerRoot.open {
          pointer-events: auto;
        }
        .drawerRoot.open::before {
          opacity: 1;
        }
        .drawerRoot.open .drawer {
          transform: translateX(0);
        }

        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 4px 2px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .title {
          font-weight: 950;
          font-size: 16px;
        }
        .close {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          font-weight: 950;
          cursor: pointer;
        }

        .items {
          display: grid;
          gap: 10px;
          padding-top: 10px;
        }

        .item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
          font-weight: 950;
        }
        .item.active {
          border-color: rgba(214, 179, 91, 0.55);
          background: rgba(214, 179, 91, 0.12);
        }
        .item.primary {
          border-color: rgba(214, 179, 91, 0.35);
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          color: #0a0d12;
        }

        .icon {
          width: 36px;
          height: 36px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          flex: 0 0 auto;
        }
        .label {
          font-size: 14px;
          white-space: nowrap;
        }

        .hint {
          margin-top: auto;
          font-size: 12px;
          opacity: 0.9;
          padding: 8px 2px 0;
        }

        @media (min-width: 1024px) {
          .drawerRoot {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
