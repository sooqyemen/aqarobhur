'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function NeighborhoodGrid({ title = 'الأحياء', showViewAll = true }) {
  const router = useRouter();

  const items = Array.isArray(NEIGHBORHOODS)
    ? NEIGHBORHOODS.map((name) => ({ key: name, label: name }))
    : [];

  function go(label) {
    router.push(`/listings?neighborhood=${encodeURIComponent(label)}`);
  }

  return (
    <section className="nbStrip">
      <div className="nbHead">
        <h3 className="nbTitle">{title}</h3>
        {showViewAll ? (
          <Link className="nbAll" href="/neighborhoods">
            عرض الكل
          </Link>
        ) : null}
      </div>

      <div className="nbRow" role="list" aria-label="شريط الأحياء">
        {items.map((n) => (
          <button
            key={n.key}
            type="button"
            className="nbChip"
            onClick={() => go(n.label)}
            role="listitem"
            title={n.label}
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* ✅ Global + مقيّد داخل nbStrip لضمان تطبيق الستايل دائمًا */}
      <style jsx global>{`
        .nbStrip {
          margin: 14px 0 10px;
        }

        .nbStrip .nbHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .nbStrip .nbTitle {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: 0.2px;
          color: #0f172a;
        }

        .nbStrip .nbAll {
          color: #0f172a;
          font-weight: 900;
          font-size: 14px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          text-decoration: none;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
          white-space: nowrap;
        }

        .nbStrip .nbAll:hover {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(214, 179, 91, 0.55);
          transform: translateY(-1px);
        }

        .nbStrip .nbRow {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 10px;
          white-space: nowrap;
          scrollbar-width: none;
        }

        .nbStrip .nbRow::-webkit-scrollbar {
          display: none;
        }

        /* ✅ لون واحد “فاتح وراقي” بدل الألوان الصارخة */
        .nbStrip .nbChip {
          flex: 0 0 auto;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          color: #0f172a;

          padding: 12px 18px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 15px;
          cursor: pointer;

          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
        }

        .nbStrip .nbChip:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.92);
          border-color: rgba(214, 179, 91, 0.55);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
        }

        .nbStrip .nbChip:active {
          transform: translateY(0px);
        }
      `}</style>
    </section>
  );
}
