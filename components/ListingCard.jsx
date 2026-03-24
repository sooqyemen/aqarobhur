'use client';

import Link from 'next/link';
import { formatPriceSAR } from '@/lib/format';

function getStatusLabel(status, dealType) {
  const s = String(status || 'available');
  if (s === 'reserved') return 'محجوز';
  if (s === 'sold') return dealType === 'rent' ? 'مؤجر' : 'مباع';
  if (s === 'canceled' || s === 'hidden') return 'غير متاح';
  return 'متاح';
}

export default function ListingCard({ item }) {
  if (!item) return null;

  const safeId = item?.id || item?.docId || item?.listingId || item?._id || '';
  const {
    title = 'عرض عقاري',
    price,
    neighborhood = '',
    plan = '',
    part = '',
    city = '',
    area,
    dealType,
    propertyType,
    status = 'available',
    images = [],
  } = item;

  const detailLink = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';
  const mainImage = images?.[0] || null;
  const displayPrice = formatPriceSAR(price);
  const statusLabel = getStatusLabel(status, dealType);
  const locationText = city || [neighborhood, plan, part].filter(Boolean).join(' • ') || 'غير محدد';
  const metaText = [propertyType, area ? `${area} م²` : null].filter(Boolean).join(' • ');

  const CardTag = safeId ? Link : 'div';
  const cardProps = safeId
    ? { href: detailLink, className: 'listingCardSimple' }
    : { className: 'listingCardSimple', role: 'article', 'aria-label': title };

  return (
    <CardTag {...cardProps}>
      <div className="listingCardInner">
        <div className="listingCardThumb" aria-hidden="true">
          {mainImage ? (
            <div className="listingCardThumbImg" style={{ backgroundImage: `url(${mainImage})` }} />
          ) : (
            <div className="listingCardThumbFallback">بدون صورة</div>
          )}
        </div>

        <div className="listingCardBody">
          <div className="listingCardTop">
            <h3 className="listingCardTitle" title={title}>{title}</h3>
            <span className={`listingCardStatus ${status === 'reserved' ? 'warn' : status === 'sold' ? 'sold' : 'ok'}`}>
              {statusLabel}
            </span>
          </div>

          <div className="listingCardPrice">
            {displayPrice}
            {dealType === 'rent' ? <span className="listingCardRent"> سنوي</span> : null}
          </div>

          <div className="listingCardLocation" title={locationText}>{locationText}</div>

          {metaText ? <div className="listingCardMeta">{metaText}</div> : null}
        </div>
      </div>
    </CardTag>
  );
}
