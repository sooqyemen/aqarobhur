'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

// ✅ صفحة الأحياء: بدون رموز/إيموجي، بطاقات صغيرة (نص فقط)
export default function NeighborhoodsPage() {
  return (
    <div className="container">
      <div className="head">
        <h1 className="h1">الأحياء</h1>
        <div className="muted">اختر حيًا لتصفح العروض</div>
      </div>

      <div className="chips" role="list" aria-label="قائمة الأحياء">
        {NEIGHBORHOODS.map((label) => (
          <Link
            key={label}
            href={`/listings?neighborhood=${encodeURIComponent(label)}`}
            className="chip"
            role="listitem"
          >
            {label}
          </Link>
        ))}
      </div>

      <style jsx>{`
        .head{margin:16px 0 12px}
        .h1{margin:0;font-size:18px;font-weight:950}
        .chips{
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          margin-bottom: 18px;
        }
        .chip{
          text-decoration:none;
          color: var(--text);
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.06);
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 14px;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .chip:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,0.09);
          border-color: var(--border2);
        }
      `}</style>
    </div>
  );
}
