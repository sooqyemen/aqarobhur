'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { FEATURED_NEIGHBORHOODS } from '@/lib/taxonomy';

function hashHue(text) {
  const s = String(text || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function emojiForNeighborhood(label) {
  const s = String(label || '');
  if (s.includes('زمرد')) return '💎';
  if (s.includes('ياقوت')) return '🔷';
  if (s.includes('اللؤلؤ')) return '🦪';
  if (s.includes('الشراع')) return '⛵️';
  if (s.includes('الصواري')) return '🧭';
  if (s.includes('أبحر')) return '🌊';
  if (s.includes('خليج')) return '🏝️';
  if (s.includes('جوهرة')) return '✨';
  return '🏘️';
}

function IconBadge({ label }) {
  const hue = useMemo(() => hashHue(label), [label]);
  const emoji = useMemo(() => emojiForNeighborhood(label), [label]);
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

export default function NeighborhoodGrid() {
  const items = useMemo(() => FEATURED_NEIGHBORHOODS || [], []);

  return (
    <section className="wrap" aria-label="الأحياء">
      <div className="head">
        <div className="title">الأحياء</div>
        <Link className="all" href="/neighborhoods">
          عرض الكل
        </Link>
      </div>

      <div className="rail" role="list">
        {items.map((n) => (
          <Link
            key={n.key}
            href={`/listings?neighborhood=${encodeURIComponent(n.label)}`}
            className="chip"
            role="listitem"
          >
            <IconBadge label={n.label} />
            <span className="label">{n.label}</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .wrap {
          margin-top: 10px;
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .title {
          font-weight: 950;
          font-size: 16px;
        }
        .all {
          font-weight: 900;
          font-size: 13px;
          color: var(--primary);
          text-decoration: none;
          border: 1px solid rgba(214, 179, 91, 0.18);
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(214, 179, 91, 0.08);
        }

        .rail {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 6px;
        }

        .chip {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          text-decoration: none;
          font-weight: 950;
          white-space: nowrap;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .chip:hover {
          transform: translateY(-1px);
          border-color: rgba(214, 179, 91, 0.45);
          background: rgba(214, 179, 91, 0.08);
        }

        .icon {
          width: 34px;
          height: 34px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }
        .label {
          font-size: 13px;
        }
      `}</style>
    </section>
  );
}
