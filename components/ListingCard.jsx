'use client';

import Link from 'next/link';
import { formatPriceSAR, statusBadge } from '@/lib/format';

function firstNonEmpty(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
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

  const isRent = dealType === 'rent';
  const displayPrice = formatPriceSAR(price);
  const detailLink = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';
  const mainImage = images?.[0] || '';
  const locationText = firstNonEmpty(
    [city, neighborhood].filter(Boolean).join(' - '),
    [neighborhood, plan, part].filter(Boolean).join(' - '),
    city,
    neighborhood,
    'الموقع غير محدد'
  );

  const metaBits = [propertyType, area ? `${area} م²` : null].filter(Boolean);

  const CardTag = safeId ? Link : 'div';
  const cardProps = safeId
    ? { href: detailLink, className: 'listingCard' }
    : { className: 'listingCard disabled', role: 'article', 'aria-label': title };

  return (
    <CardTag {...cardProps}>
      <div className="listingCardMediaWrap">
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mainImage} alt={title} className="listingCardMedia" loading="lazy" />
        ) : (
          <div className="listingCardMedia listingCardMediaPlaceholder" aria-hidden="true">
            <span>لا توجد صورة</span>
          </div>
        )}
        {!!(images?.length > 1) && <span className="listingCardCount">{images.length} صور</span>}
        <span className="listingCardStatus">{statusBadge(status)}</span>
      </div>

      <div className="listingCardBody">
        <div className="listingCardTop">
          <h3 className="listingCardTitle">{title}</h3>
          <div className="listingCardPrice">
            {displayPrice}
            {isRent ? <span className="listingCardPriceHint"> / سنوي</span> : null}
          </div>
        </div>

        <div className="listingCardLocation">{locationText}</div>

        {metaBits.length ? <div className="listingCardMeta">{metaBits.join(' • ')}</div> : null}
      </div>
    </CardTag>
  );
}
