'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

// استيراد جميع الأحياء بدلاً من المميزة
import { NEIGHBORHOODS } from '@/lib/taxonomy';   // <-- غيّر هذا السطر

export default function NeighborhoodGrid({
  title = 'الأحياء',
  showViewAll = true,
}) {
  const router = useRouter();

  // استخدم المصفوفة الكاملة
  const items = NEIGHBORHOODS || [];

  function go(label) {
    router.push(`/listings?neighborhood=${encodeURIComponent(label)}`);
  }

  return (
    <section className="strip">
      <div className="head">
        <h3 className="title">{title}</h3>
        {showViewAll ? (
          <Link className="all" href="/neighborhoods">عرض الكل</Link>
        ) : null}
      </div>

      <div className="scrollableRow" role="list" aria-label="شريط الأحياء">
        {items.map((n) => (
          <button
            key={n.key}
            type="button"
            className="chip"
            onClick={() => go(n.label)}
            role="listitem"
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* الأنماط كما هي دون تغيير */}
      <style jsx>{`
        .strip {
          margin: 14px 0 10px;
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .title {
          margin: 0;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 0.2px;
        }
        .all {
          color: var(--primary);
          font-weight: 900;
          font-size: 13px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(214, 179, 91, 0.25);
          background: rgba(214, 179, 91, 0.08);
          text-decoration: none;
        }

        .scrollableRow {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 8px;
          white-space: nowrap;
          scrollbar-width: thin;
        }

        .scrollableRow::-webkit-scrollbar {
          height: 4px;
        }
        .scrollableRow::-webkit-scrollbar-thumb {
          background: var(--primary);
          border-radius: 999px;
        }
        .scrollableRow::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .chip {
          flex: 0 0 auto;
          border: 1px solid var(--border);
          background: #ffffff;
          color: var(--text);
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 14px;
          cursor: pointer;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .chip:hover {
          transform: translateY(-1px);
          background: #f1f5f9;
          border-color: var(--border2);
        }
      `}</style>
    </section>
  );
}
