'use client';

import Link from 'next/link';

// ✅ لون ثابت لكل حي (نفس الاسم يعطي نفس اللون)
function pickColor(key = '') {
  const colors = ['#2D7FF9', '#00B8A9', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#06B6D4', '#F97316'];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export default function NeighborhoodBadge({ label, colorKey, href }) {
  const c = pickColor(colorKey || label || '');

  return (
    <Link href={href} className="nb" aria-label={`تصفح عروض ${label}`} title={label}>
      <span className="dot" style={{ background: c }} aria-hidden="true" />
      <span className="txt">{label}</span>

      <style jsx>{`
        .nb{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:10px 12px;
          border-radius:999px;
          background: var(--card);
          border:1px solid var(--border);
          text-decoration:none;
          color: var(--text);
          font-weight:900;
          font-size:13px;
          box-shadow: 0 10px 24px rgba(15,23,42,.05);
          direction: rtl;
          max-width: 100%;
          transition: transform 120ms ease;
        }
        .nb:hover{transform: translateY(-1px)}
        .dot{
          width:10px;
          height:10px;
          border-radius:999px;
          box-shadow:0 8px 18px rgba(0,0,0,.18);
          flex:0 0 10px;
        }
        .txt{
          line-height:1;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          max-width: 120px;
        }
        @media (min-width: 900px){
          .txt{max-width: 160px;}
        }
      `}</style>
    </Link>
  );
}
