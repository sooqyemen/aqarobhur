'use client';

import Link from 'next/link';
import { formatPriceSAR, statusBadge } from '@/lib/format';

function dealLabel(dealType) {
  if (dealType === 'sale') return 'بيع';
  if (dealType === 'rent') return 'إيجار';
  return '';
}

export default function ListingCard({ item }) {
  // ✅ بعض الداتا القديمة قد لا تحتوي id بشكل صحيح
  // نخلي الرابط يعتمد على أكثر من حقل مع ترميز آمن للـURL
  const safeId = item?.id || item?.docId || item?.docID || item?.listingId || item?._id || '';
  const href = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';
  const thumb = item?.images?.[0] || '';
  const meta = [item?.neighborhood, item?.plan ? `مخطط ${item.plan}` : '', item?.part ? `جزء ${item.part}` : '']
    .filter(Boolean)
    .join(' • ');

  return (
    <Link href={href} className="card listingCard" aria-label={item?.title || 'عرض عقاري'}>
      <div className="thumb">
        {thumb ? (
          <img src={thumb} alt={item.title || 'صورة العرض'} loading="lazy" />
        ) : (
          <div className="noImg muted">بدون صورة</div>
        )}
        <div className="status">{statusBadge(item.status)}</div>
      </div>

      <div className="body">
        <div className="titleRow">
          <div className="title">{item.title || 'عرض عقاري'}</div>
        </div>

        <div className="muted meta">{meta || '—'}</div>

        <div className="tags">
          {item.area ? <span className="badge">{item.area} م²</span> : null}
          {item.dealType ? <span className="badge">{dealLabel(item.dealType) || item.dealType}</span> : null}
          {item.propertyType ? <span className="badge">{item.propertyType}</span> : null}
          {item.direct ? <span className="badge ok">مباشر</span> : null}
        </div>

        <div className="bottom">
          <div className="price">{formatPriceSAR(item.price)}</div>
          <span className="more">التفاصيل</span>
        </div>
      </div>

      <style jsx>{`
        .listingCard {
          padding: 0;
          overflow: hidden;
          background: var(--card);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .listingCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.35);
        }
        .thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 16/10;
          background: rgba(255,255,255,.04);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .noImg {
          font-weight: 800;
          font-size: 13px;
        }
        .status {
          position: absolute;
          top: 10px;
          left: 10px;
        }
        .body {
          padding: 12px;
        }
        .titleRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .title {
          font-weight: 900;
          line-height: 1.25;
          font-size: 16px;
          flex: 1;
        }
        .meta {
          margin-top: 6px;
          font-size: 13px;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .bottom {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .price {
          font-weight: 950;
          font-size: 17px;
        }
        .more {
          font-weight: 900;
          color: var(--gold);
        }

        @media (max-width: 640px) {
          .title {
            font-size: 15px;
          }
          .price {
            font-size: 16px;
          }
        }
      `}</style>
    </Link>
  );
}
