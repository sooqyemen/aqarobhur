'use client';

import Link from 'next/link';

// ✅ 6 أحياء فقط (واجهة) حسب طلبك
const FEATURED_6 = [
  { key: 'al-shiraa', label: 'الشراع' },
  { key: 'al-yacout', label: 'الياقوت' },
  { key: 'al-zomorod', label: 'الزمرد' },
  { key: 'obhur-north', label: 'أبحر الشمالية' },
  { key: 'al-sawari', label: 'الصواري' },
  { key: 'al-lulu', label: 'اللؤلؤ' },
];

function pickColor(seed = '') {
  const colors = ['#2D7FF9', '#00B8A9', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#06B6D4', '#F97316'];
  let h = 0;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export default function NeighborhoodGrid({ title = 'الأحياء المميزة', items = FEATURED_6 }) {
  const list = Array.isArray(items) && items.length ? items : FEATURED_6;

  return (
    <section className="section">
      <div className="head">
        <h2 className="h">{title}</h2>
        <Link href="/neighborhoods" className="more">عرض الكل</Link>
      </div>

      {/* ✅ اسم الحي داخل أيقونة ملوّنة (بدون رموز/إيموجي) */}
      <div className="grid">
        {list.map((n) => {
          const label = n?.label || '';
          const color = pickColor(n?.key || label);

          return (
            <Link
              key={n.key || label}
              href={`/listings?neighborhood=${encodeURIComponent(label)}`}
              className="tile"
              aria-label={`تصفح عروض ${label}`}
              style={{ background: color }}
            >
              <span className="txt">{label}</span>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .section{margin-top:18px}
        .head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
        .h{margin:0;font-size:16px;font-weight:900;color:var(--text)}
        .more{text-decoration:none;color:var(--primary);font-weight:900;font-size:13px}

        .grid{
          display:grid;
          grid-template-columns: repeat(3, 1fr);
          gap:10px;
        }

        /* ✅ الأيقونة الملوّنة (الاسم داخلها) */
        .tile{
          border-radius: 16px;
          padding: 12px 10px;
          text-decoration:none;
          display:flex;
          align-items:center;
          justify-content:center;
          min-height: 58px;
          box-shadow: 0 12px 26px rgba(15,23,42,.10);
          transition: transform 120ms ease, filter 120ms ease;
          border: 1px solid rgba(255,255,255,.20);
        }
        .tile:hover{transform: translateY(-1px); filter: brightness(1.02)}
        .tile:active{transform: translateY(0px) scale(.99)}

        .txt{
          color: #fff;
          font-weight: 950;
          font-size: 12px;
          text-align:center;
          line-height: 1.15;
          direction: rtl;
          display: -webkit-box;
          -webkit-line-clamp: 2; /* يسمح بسطرين للأسماء الطويلة */
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (min-width: 900px){
          .grid{grid-template-columns: repeat(6, 1fr)}
          .tile{min-height: 62px}
          .txt{font-size: 13px}
        }
      `}</style>
    </section>
  );
}
