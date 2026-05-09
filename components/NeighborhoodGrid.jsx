'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

function uniqueNeighborhoods(list) {
  return [...new Set((Array.isArray(list) ? list : []).map((name) => String(name || '').trim()).filter(Boolean))];
}

export default function NeighborhoodGrid({ title = 'تصفح الأحياء', showViewAll = true }) {
  const list = uniqueNeighborhoods(NEIGHBORHOODS);

  if (!list.length) return null;

  return (
    <section className="nbCleanSection" aria-label={title} dir="rtl">
      <div className="nbCleanHeader">
        <h2>{title}</h2>
        {showViewAll ? (
          <Link href="/neighborhoods" className="nbCleanViewAll">
            عرض جميع الأحياء
          </Link>
        ) : null}
      </div>

      <div className="nbCleanScroller" role="list" aria-label="قائمة الأحياء">
        {list.map((name) => (
          <Link
            key={name}
            role="listitem"
            href={`/listings?neighborhood=${encodeURIComponent(name)}`}
            className="nbCleanChip"
            prefetch={false}
          >
            <span className="nbCleanMark" aria-hidden="true" />
            <span className="nbCleanText">{name}</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .nbCleanSection {
          width: 100%;
          max-width: 100%;
          margin: 26px 0 28px;
          overflow: hidden;
        }

        .nbCleanHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .nbCleanHeader h2 {
          margin: 0;
          color: #111827;
          font-size: clamp(20px, 4vw, 28px);
          line-height: 1.35;
          font-weight: 950;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .nbCleanViewAll {
          flex: 0 0 auto;
          color: #111827;
          font-size: 14px;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
          opacity: 0.82;
        }

        .nbCleanViewAll:hover {
          opacity: 1;
          color: #b8842f;
        }

        .nbCleanScroller {
          display: flex;
          align-items: stretch;
          gap: 10px;
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 4px 2px 14px;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-inline: contain;
        }

        .nbCleanScroller::-webkit-scrollbar {
          display: none;
        }

        .nbCleanChip {
          flex: 0 0 auto;
          scroll-snap-align: start;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: max-content;
          min-height: 46px;
          padding: 0 17px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(216, 178, 95, 0.34);
          color: #1f2937;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
          text-decoration: none;
          font-size: 15px;
          font-weight: 850;
          line-height: 1;
          white-space: nowrap;
          transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
        }

        .nbCleanChip:hover {
          transform: translateY(-2px);
          background: #fffaf0;
          border-color: rgba(184, 132, 47, 0.7);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        .nbCleanMark {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d8b25f, #b8842f);
          box-shadow: 0 0 0 4px rgba(216, 178, 95, 0.14);
        }

        .nbCleanText {
          display: block;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .nbCleanSection {
            margin: 18px 0 22px;
          }

          .nbCleanHeader {
            margin-bottom: 10px;
          }

          .nbCleanHeader h2 {
            font-size: 21px;
          }

          .nbCleanViewAll {
            font-size: 13px;
          }

          .nbCleanScroller {
            gap: 9px;
            padding: 3px 1px 12px;
          }

          .nbCleanChip {
            min-height: 42px;
            padding: 0 14px;
            font-size: 14px;
          }
        }
      `}</style>
    </section>
  );
}
