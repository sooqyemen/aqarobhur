'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

// دالة لتوليد لون فريد لكل حي بناءً على الاسم
function getColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360); // 0 to 359
  return `hsl(${hue}, 70%, 85%)`; // خلفية فاتحة مع تشبع معتدل
}

export default function NeighborhoodGrid({
  title = 'الأحياء',
  showViewAll = true,
}) {
  const router = useRouter();
  const items = NEIGHBORHOODS || [];

  function go(label) {
    router.push(`/listings?neighborhood=${encodeURIComponent(label)}`);
  }

  return (
    <section className="strip">
      <div className="head">
        <h3 className="title">{title}</h3>
        {showViewAll && (
          <Link className="all" href="/neighborhoods">
            عرض الكل
          </Link>
        )}
      </div>

      <div className="scrollableRow" role="list" aria-label="شريط الأحياء">
        {items.map((n) => {
          const bgColor = getColorFromString(n.label);
          return (
            <button
              key={n.key}
              type="button"
              className="chip"
              onClick={() => go(n.label)}
              role="listitem"
              style={{ backgroundColor: bgColor }}
            >
              {n.label}
            </button>
          );
        })}
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
          font-size: 18px; /* تكبير قليلاً */
          font-weight: 950;
          letter-spacing: 0.2px;
          color: #1e293b; /* لون غامق */
        }
        .all {
          color: var(--primary, #d6b35b);
          font-weight: 900;
          font-size: 14px;
          padding: 8px 14px; /* تكبير الرابط */
          border-radius: 999px;
          border: 1px solid rgba(214, 179, 91, 0.25);
          background: rgba(214, 179, 91, 0.08);
          text-decoration: none;
          transition: background 0.2s;
        }
        .all:hover {
          background: rgba(214, 179, 91, 0.15);
        }

        .scrollableRow {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 12px; /* زيادة المسافة قليلاً */
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 8px;
          white-space: nowrap;
          scrollbar-width: thin;
        }

        .scrollableRow::-webkit-scrollbar {
          height: 6px; /* زيادة سمك الشريط */
        }
        .scrollableRow::-webkit-scrollbar-thumb {
          background: var(--primary, #d6b35b);
          border-radius: 999px;
        }
        .scrollableRow::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .chip {
          flex: 0 0 auto;
          border: none; /* إزالة الحدود لتظهر الألوان بشكل أفضل */
          color: #1e293b; /* لون نص غامق */
          padding: 14px 20px; /* تكبير الحشو */
          border-radius: 999px;
          font-weight: 700; /* تقليل قليلاً من 950 إلى 700 ليكون متوازن */
          font-size: 16px; /* تكبير الخط */
          cursor: pointer;
          transition: transform 120ms ease, filter 120ms ease, box-shadow 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .chip:hover {
          transform: translateY(-2px);
          filter: brightness(95%); /* تغميق الخلفية قليلاً عند التمرير */
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </section>
  );
}
