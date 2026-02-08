'use client';

import Link from 'next/link';
import { formatPriceSAR, statusBadge } from '@/lib/format';

export default function ListingCard({ item }) {
  const thumb = item?.images?.[0] || '';
  return (
    <div className="card">
      <div className="listingThumb">
        {thumb ? <img src={thumb} alt={item.title || 'صورة العرض'} /> : <div className="muted">بدون صورة</div>}
      </div>

      <div style={{ marginTop: 10 }} className="row">
        <div style={{ fontWeight: 800, flex: 1 }}>{item.title || 'عرض عقاري'}</div>
        {statusBadge(item.status)}
      </div>

      <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
        {item.neighborhood || '—'} • {item.plan || '—'} • {item.part || '—'}
      </div>

      <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{formatPriceSAR(item.price)}</div>
        <Link className="btn" href={`/listing/${item.id}`}>التفاصيل</Link>
      </div>
    </div>
  );
}
