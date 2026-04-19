'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function NeighborhoodGrid({ title = 'تصفح حسب الحي', showViewAll = true }) {
  const list = Array.isArray(NEIGHBORHOODS) ? NEIGHBORHOODS : [];
  
  if (list.length === 0) return null;

  return (
    <section className="nb-section">
      <div className="nb-header">
        <div>
          <h2 className="nb-title">{title}</h2>
          <p className="nb-subtitle">اختر الحي لاستعراض العقارات المتاحة فيه</p>
        </div>
        {showViewAll && (
          <Link href="/neighborhoods" className="nb-view-btn">عرض الكل</Link>
        )}
      </div>

      <div className="nb-scroll-area">
        <div className="nb-chips-wrapper">
          {list.map((name) => (
            <Link key={name} href={`/listings?neighborhood=${encodeURIComponent(name)}`} className="nb-chip">
              <span className="dot"></span>
              {name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
