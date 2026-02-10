'use client';

import Link from 'next/link';
import { FEATURED_NEIGHBORHOODS } from '@/lib/taxonomy';
import NeighborhoodBadge from '@/components/NeighborhoodBadge';

// ✅ عرض 6 أحياء فقط في الواجهة الرئيسية (حسب طلبك)
const HOME_NEIGHBORHOODS_ORDER = [
  'الشراع',
  'الياقوت',
  'الزمرد',
  'أبحر الشمالية',
  'الصواري',
  'اللؤلؤ',
];

function buildHomeItems(allItems) {
  const byLabel = new Map((allItems || []).map((x) => [x.label, x]));
  return HOME_NEIGHBORHOODS_ORDER.map((label) => {
    const found = byLabel.get(label);
    return found || { key: label, label };
  });
}

export default function NeighborhoodGrid({ title = 'الأحياء المميزة', items = FEATURED_NEIGHBORHOODS }) {
  const homeItems = buildHomeItems(items);
  return (
    <section className="section">
      <div className="head">
        <h2 className="h">{title}</h2>
        <Link href="/neighborhoods" className="more">عرض الكل</Link>
      </div>

      <div className="wrap">
        {homeItems.map((n) => {
          const label = n.label;
          return (
            <NeighborhoodBadge
              key={n.key || label}
              label={label}
              colorKey={n.key || label}
              href={`/listings?neighborhood=${encodeURIComponent(label)}`}
            />
          );
        })}
      </div>

      <style jsx>{`
        .section{margin-top:18px}
        .head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
        .h{margin:0;font-size:16px;font-weight:900;color:var(--text)}
        .more{text-decoration:none;color:var(--primary);font-weight:900;font-size:13px}
        .wrap{
          display:flex;
          flex-wrap:wrap;
          gap:10px;
        }
      `}</style>
    </section>
  );
}
