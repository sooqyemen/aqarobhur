'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function NeighborhoodsPage() {
  // ألوان الخلفية المميزة (نفس ألوان NeighborhoodGrid)
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
    '#F1C40F', '#E74C3C', '#1ABC9C', '#E67E22', '#95A5A6',
  ];

  return (
    <div className="container">
      <div className="head">
        <h1 className="h1">الأحياء</h1>
        <div className="muted">اختر حيًا لتصفح العروض</div>
      </div>

      <div className="chips" role="list" aria-label="قائمة الأحياء">
        {NEIGHBORHOODS.map((label, index) => (
          <Link
            key={label}
            href={`/listings?neighborhood=${encodeURIComponent(label)}`}
            className="chip"
            role="listitem"
            style={{
              backgroundColor: colors[index % colors.length],
              borderColor: 'transparent',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <style jsx>{`
        .head {
          margin: 16px 0 12px;
        }
        .h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
        }
        .muted {
          color: var(--muted);
          font-size: 14px;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 18px;
        }
        .chip {
          text-decoration: none;
          border: none;
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 14px;
          transition: transform 120ms ease, opacity 120ms ease, box-shadow 120ms ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
          display: inline-block;
        }
        .chip:hover {
          transform: translateY(-2px);
          opacity: 0.9;
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}
