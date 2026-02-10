'use client';

import Link from 'next/link';
import { FEATURED_NEIGHBORHOODS } from '@/lib/taxonomy';

const ICONS = {
  'أبحر الشمالية': '🌊',
  'الشراع': '⛵',
  'الأمواج': '🌊',
  'الصواري': '🧭',
  'الياقوت': '💎',
  'الزمرد': '💠',
  'اللؤلؤ': '🦪',
  'الفنار': '🗼',
  'البحيرات': '🏞️',
  'الفردوس': '🌴',
  'المروج': '🌿',
  'النور': '✨',
};

export default function NeighborhoodGrid({ title = 'الأحياء المميزة', items = FEATURED_NEIGHBORHOODS }) {
  return (
    <section className="section">
      <div className="head">
        <h2 className="h">{title}</h2>
        <Link href="/neighborhoods" className="more">عرض الكل</Link>
      </div>

      <div className="grid">
        {items.map((n) => {
          const label = n.label;
          const icon = ICONS[label] || '📍';
          return (
            <Link
              key={n.key}
              href={`/listings?neighborhood=${encodeURIComponent(label)}`}
              className="tile"
              aria-label={`تصفح عروض ${label}`}
            >
              <div className="ico" aria-hidden="true">{icon}</div>
              <div className="lbl">{label}</div>
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
          grid-template-columns: repeat(4, 1fr);
          gap:10px;
        }
        .tile{
          background: var(--card);
          border:1px solid var(--border);
          border-radius: 16px;
          padding: 12px 10px;
          text-decoration:none;
          color: var(--text);
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:8px;
          box-shadow: 0 10px 24px rgba(15,23,42,.05);
          transition: transform 120ms ease;
          min-height: 86px;
        }
        .tile:hover{transform: translateY(-1px)}
        .ico{
          width:42px;height:42px;border-radius:14px;
          display:flex;align-items:center;justify-content:center;
          background: rgba(30,115,216,.10);
          font-size:20px;
        }
        .lbl{font-size:12px;font-weight:900;text-align:center;line-height:1.2}
        @media (max-width: 520px){
          .grid{grid-template-columns: repeat(3, 1fr)}
        }
      `}</style>
    </section>
  );
}
