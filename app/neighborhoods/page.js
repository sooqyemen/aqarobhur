'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

const ICONS = {
  'أبحر الشمالية': '🌊',
  'الأمواج': '🌊',
  'الشراع': '⛵',
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

export default function NeighborhoodsPage() {
  return (
    <div className="container">
      <div className="head">
        <h1 className="h1">الأحياء</h1>
        <div className="muted">اختر حيًا لتصفح العروض</div>
      </div>

      <div className="grid">
        {NEIGHBORHOODS.map((label) => (
          <Link
            key={label}
            href={`/listings?neighborhood=${encodeURIComponent(label)}`}
            className="tile"
          >
            <div className="ico" aria-hidden="true">{ICONS[label] || '📍'}</div>
            <div className="lbl">{label}</div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .head{margin:16px 0 12px}
        .h1{margin:0;font-size:18px;font-weight:900}
        .grid{
          display:grid;
          grid-template-columns: repeat(4, 1fr);
          gap:10px;
          margin-bottom: 18px;
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
          min-height: 90px;
        }
        .ico{
          width:44px;height:44px;border-radius:14px;
          display:flex;align-items:center;justify-content:center;
          background: rgba(30,115,216,.10);
          font-size:20px;
        }
        .lbl{font-size:12px;font-weight:900;text-align:center;line-height:1.2}
        @media (max-width: 520px){
          .grid{grid-template-columns: repeat(3, 1fr)}
        }
      `}</style>
    </div>
  );
}
