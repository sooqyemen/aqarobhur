'use client';

import Link from 'next/link';
import { formatPriceSAR, statusBadge } from '@/lib/format';

function dealLabel(dealType) {
  if (dealType === 'sale') return 'بيع';
  if (dealType === 'rent') return 'إيجار';
  return '';
}

function timeLabel(ts) {
  // يدعم Date أو رقم أو string
  try {
    const d = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : (ts ? new Date(ts) : null));
    if (!d || isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `قبل ${mins} د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `قبل ${hrs} س`;
    const days = Math.floor(hrs / 24);
    return `قبل ${days} يوم`;
  } catch {
    return '';
  }
}

export default function ListingCard({ item }) {
  const safeId = item?.id || item?.docId || item?.docID || item?.listingId || item?._id || '';
  const href = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';

  const thumb = item?.images?.[0] || '';
  const title = item?.title || 'عرض عقاري';
  const loc = item?.neighborhood || item?.city || '—';
  const when = timeLabel(item?.createdAt || item?.updatedAt);

  const badges = [
    item?.dealType ? (dealLabel(item.dealType) || item.dealType) : '',
    item?.propertyClass || '',
    item?.propertyType || '',
    item?.area ? `${item.area} م²` : '',
  ].filter(Boolean);

  return (
    <Link href={href} className="cardRow" aria-label={title}>
      <div className="thumb">
        {thumb ? (
          <img src={thumb} alt={title} loading="lazy" />
        ) : (
          <div className="noImg muted">بدون صورة</div>
        )}
        <div className="status">{statusBadge(item?.status)}</div>
      </div>

      <div className="info">
        <div className="title">{title}</div>

        <div className="meta">
          <span className="loc">{loc}</span>
          {when ? <span className="dot">•</span> : null}
          {when ? <span className="when">{when}</span> : null}
        </div>

        <div className="badges">
          {badges.slice(0, 3).map((b) => (
            <span className="badge" key={b}>{b}</span>
          ))}
          {item?.direct ? <span className="badge ok">مباشر</span> : null}
        </div>

        <div className="bottom">
          <div className="price">{formatPriceSAR(item?.price)}</div>
          <div className="more">تفاصيل</div>
        </div>
      </div>

      <style jsx>{`
        .cardRow{
          display:flex;
          gap:12px;
          padding:10px;
          border-radius: var(--radius);
          border:1px solid var(--border);
          background: var(--card);
          text-decoration:none;
          color: var(--text);
          box-shadow: 0 10px 24px rgba(15,23,42,.05);
        }
        .thumb{
          position:relative;
          width:110px;
          height:92px;
          border-radius:14px;
          overflow:hidden;
          background: var(--card2);
          flex: 0 0 auto;
        }
        .thumb img{width:100%;height:100%;object-fit:cover}
        .noImg{display:flex;align-items:center;justify-content:center;height:100%;font-weight:800;font-size:12px}
        .status{
          position:absolute;
          top:8px;right:8px;
        }
        .info{flex:1;min-width:0;display:flex;flex-direction:column}
        .title{
          font-weight:900;
          font-size:14px;
          line-height:1.25;
          margin-bottom:6px;
          overflow:hidden;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
        }
        .meta{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px;font-weight:800}
        .dot{opacity:.7}
        .badges{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}
        .badge{
          font-size:11px;
          font-weight:900;
          padding:5px 8px;
          border-radius:999px;
          background: rgba(30,115,216,.08);
          border:1px solid rgba(30,115,216,.14);
          color: var(--primary2);
        }
        .ok{
          background: rgba(16,185,129,.10);
          border-color: rgba(16,185,129,.20);
          color: #065f46;
        }
        .bottom{
          margin-top:auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding-top:10px;
        }
        .price{
          font-weight:900;
          color: var(--text);
        }
        .more{
          font-weight:900;
          color: var(--primary);
          font-size:12px;
        }
        @media (max-width: 420px){
          .thumb{width:98px;height:86px}
        }
      `}</style>
    </Link>
  );
}
