'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

// ✅ ألوان بسيطة للأحياء (نقطة صغيرة داخل البطاقة)
// الهدف: تمييز بصري بدون رموز/إيموجي أو فوضى.
const NEIGHBORHOOD_COLORS = {
  الزمرد: '#34A853',
  الياقوت: '#4285F4',
  الصواري: '#EA4335',
  الشراع: '#FBBC05',
  اللؤلؤ: '#7B1FA2',
  النور: '#00796B',
  الفنار: '#0B57D0',
  البحيرات: '#6D4C41',
};

export default function NeighborhoodsPage() {
  return (
    <div className="container">
      <div className="head">
        <h1 className="h1">الأحياء</h1>
        {/* ✅ سطر واحد فقط (بدون تكرار) */}
        <div className="muted">اختر الحي لعرض الإعلانات</div>
      </div>

      {/* ✅ شريط واحد فقط للأحياء + خيار (الكل) */}
      <div className="chips" role="navigation" aria-label="الأحياء">
        <Link href="/listings" className="chip">
          <span className="dot" style={{ background: '#94A3B8' }} />
          <span className="t">الكل</span>
        </Link>

        {NEIGHBORHOODS.map((label) => {
          const col = NEIGHBORHOOD_COLORS[label] || '#94A3B8';
          return (
            <Link
              key={label}
              href={`/listings?neighborhood=${encodeURIComponent(label)}`}
              className="chip"
            >
              <span className="dot" style={{ background: col }} />
              <span className="t">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* ✅ مكان النتائج (بدون صناديق إضافية/مكررة) */}
      <div className="hint card muted" style={{ marginTop: 12 }}>
        بعد اختيار الحي سيتم فتح صفحة العروض مباشرة.
      </div>

      <style jsx>{`
        .head {
          margin: 16px 0 12px;
        }
        .h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
        }

        /* شريط أفقي (مثل سوق اليمن) */
        .chips {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 2px 2px 10px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .chips::-webkit-scrollbar {
          display: none;
        }
        .chip {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--card);
          text-decoration: none;
          color: var(--text);
          font-weight: 900;
          font-size: 13px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
          white-space: nowrap;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.03);
        }
        .t {
          line-height: 1;
        }

        .hint {
          line-height: 1.7;
        }
      `}</style>
    </div>
  );
}
