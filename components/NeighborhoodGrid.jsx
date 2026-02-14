'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

// استيراد جميع الأحياء (نصوص) من ملف taxonomy
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function NeighborhoodGrid({
  title = 'الأحياء',
  showViewAll = true,
}) {
  const router = useRouter();

  // تحويل مصفوفة النصوص إلى مصفوفة كائنات { key, label }
  const items = (NEIGHBORHOODS || []).map(name => ({
    key: name,        // نستخدم الاسم نفسه كمفتاح (فريد)
    label: name,
  }));

  // مصفوفة ألوان خلفية للأزرار
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
    '#F1C40F', '#E74C3C', '#1ABC9C', '#E67E22', '#95A5A6',
  ];

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
        {items.map((n, index) => (
          <button
            key={n.key}
            type="button"
            className="chip"
            onClick={() => go(n.label)}
            role="listitem"
            style={{
              backgroundColor: colors[index % colors.length],
              borderColor: 'transparent',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            {n.label}
          </button>
        ))}
      </div>

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
          font-size: 18px;
          font-weight: 950;
          letter-spacing: 0.2px;
        }
        .all {
          color: var(--primary);
          font-weight: 900;
          font-size: 14px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(214, 179, 91, 0.25);
          background: rgba(214, 179, 91, 0.08);
          text-decoration: none;
          transition: background 0.2s;
        }
        .all:hover {
          background: rgba(214, 179, 91, 0.15);
        }

        /* حاوية التمرير الأفقي */
        .scrollableRow {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 12px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 10px;
          white-space: nowrap;
          scrollbar-width: thin;
        }

        /* تخصيص شريط التمرير */
        .scrollableRow::-webkit-scrollbar {
          height: 6px;
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
          border: none;
          padding: 12px 20px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 16px;
          cursor: pointer;
          transition: transform 120ms ease, opacity 120ms ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .chip:hover {
          transform: translateY(-2px);
          opacity: 0.9;
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
      `}</style>
    </section>
  );
}
