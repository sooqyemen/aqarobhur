'use client';

function pickColor(key = '') {
  const colors = ['#2D7FF9','#00B8A9','#F59E0B','#8B5CF6','#EF4444','#10B981','#06B6D4','#F97316'];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export default function NeighborhoodTile({ name, slug, href }) {
  const c = pickColor(slug || name || '');

  return (
    <a className="nTile" href={href} aria-label={name}>
      <div className="nIcon" style={{ background: c }}>
        {/* أيقونة بسيطة (خريطة/مكان) */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" stroke="white" strokeWidth="2"/>
          <path d="M12 13.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" fill="white"/>
        </svg>
      </div>
      <div className="nName">{name}</div>

      <style jsx>{`
        .nTile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 10px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.06);
          text-decoration: none;
          color: inherit;
        }
        .nIcon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 22px rgba(0,0,0,0.08);
        }
        .nName {
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          direction: rtl;
          line-height: 1.2;
        }
        .nTile:active {
          transform: scale(0.99);
        }
      `}</style>
    </a>
  );
}
