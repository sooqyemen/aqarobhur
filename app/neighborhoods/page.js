'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function NeighborhoodsPage() {
  return (
    <div className="container">
      <div className="head">
        <h1 className="h1">الأحياء</h1>
        <p className="muted">اختر حيًا لتصفح العروض</p>
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
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px 16px;
        }
        .head {
          margin: 0 0 20px 0;
        }
        .h1 {
          margin: 0 0 6px 0;
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
        }
        .muted {
          margin: 0;
          color: #64748b;
          font-size: 16px;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 18px;
        }
        .chip {
          text-decoration: none;
          color: #1e293b;               /* لون نص ثابت غامق */
          background-color: #ffffff;      /* خلفية بيضاء */
          border: 1px solid #e2e8f0;      /* حدود رمادية فاتحة */
          padding: 12px 20px;             /* حجم متوسط */
          border-radius: 999px;            /* حواف مستديرة */
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .chip:hover {
          transform: translateY(-2px);
          border-color: #d6b35b;           /* اللون المميز */
          box-shadow: 0 8px 16px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
}
