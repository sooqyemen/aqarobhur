'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';
import { HiOutlineLocationMarker } from 'react-icons/hi'; // أيقونة موقع أنيقة

export default function NeighborhoodsPage() {
  return (
    <div className="container">
      {/* رأس الصفحة */}
      <div className="head">
        <h1 className="h1">الأحياء</h1>
        <p className="muted">اختر الحي الذي تريد استكشاف عروضه</p>
      </div>

      {/* شبكة البطاقات */}
      <div className="chipsGrid" role="list" aria-label="قائمة الأحياء">
        {NEIGHBORHOODS.map((label) => (
          <Link
            key={label}
            href={`/listings?neighborhood=${encodeURIComponent(label)}`}
            className="chip"
            role="listitem"
          >
            <HiOutlineLocationMarker className="chipIcon" />
            <span className="chipLabel">{label}</span>
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
          margin-bottom: 24px;
        }
        .h1 {
          margin: 0 0 6px 0;
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
        }
        .muted {
          margin: 0;
          color: #64748b;
          font-size: 16px;
        }

        /* شبكة الشيبس */
        .chipsGrid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* تصميم الشريحة (chip) */
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 999px; /* حواف مستديرة كاملة */
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          text-decoration: none;
          transition: all 0.2s ease;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b; /* لون نص داكن موحد */
          cursor: pointer;
        }

        /* الأيقونة */
        .chipIcon {
          font-size: 20px;
          color: #d6b35b; /* اللون المميز (ذهبي) */
          transition: transform 0.2s ease;
        }

        /* تأثير hover */
        .chip:hover {
          transform: translateY(-3px);
          border-color: #d6b35b;
          box-shadow: 0 8px 16px rgba(0,0,0,0.05);
        }
        .chip:hover .chipIcon {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
