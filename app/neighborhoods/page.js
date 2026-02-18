'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function NeighborhoodsPage() {
  const items = Array.isArray(NEIGHBORHOODS) ? NEIGHBORHOODS : [];

  return (
    <div className="container nbPage">
      <div className="nbHead">
        <h1 className="nbTitle">الأحياء</h1>
        <p className="muted nbDesc">اختر حيًا لتصفح العروض</p>
      </div>

      <div className="nbChips" role="list" aria-label="قائمة الأحياء">
        {items.map((label) => (
          <Link
            key={label}
            href={`/listings?neighborhood=${encodeURIComponent(label)}`}
            className="nbChip"
            role="listitem"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* مهم: global + تقييد داخل .nbPage فقط */}
      <style jsx global>{`
        .nbPage {
          padding: 20px 0;
        }

        .nbPage .nbHead {
          margin: 0 0 20px 0;
        }

        .nbPage .nbTitle {
          margin: 0 0 6px 0;
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
        }

        .nbPage .nbDesc {
          margin: 0;
          font-size: 16px;
          color: #64748b;
        }

        .nbPage .nbChips {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 18px;
        }

        .nbPage .nbChip {
          text-decoration: none !important;
          color: #1e293b;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 12px 20px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .nbPage .nbChip:hover {
          transform: translateY(-2px);
          border-color: #d6b35b;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
}
