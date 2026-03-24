'use client';

import Link from 'next/link';
import { formatPriceSAR, statusBadge } from '@/lib/format';

function timeAgoLabel(createdAt) {
  try {
    const d = createdAt?.toDate?.() || (createdAt instanceof Date ? createdAt : null);
    if (!d) return 'الآن';
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'الآن';
    if (min < 60) return `قبل ${min} د`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `قبل ${hr} س`;
    const day = Math.floor(hr / 24);
    return `قبل ${day} يوم`;
  } catch {
    return 'الآن';
  }
}

function firstChar(name) {
  const s = (name || '').trim();
  return s ? s[0] : 'م';
}

export default function ListingCard({ item, compact = false }) {
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
    createdAt,
    sellerName,
    ownerName,
    contactName,
  } = item;

  const isRent = dealType === 'rent';
  const displayPrice = formatPriceSAR(price);
  const detailLink = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';
  const mainImage = images?.[0] || null;
  const hasMultipleImages = (images?.length || 0) > 1;

  const locationText =
    city ||
    neighborhood ||
    [neighborhood, plan, part].filter(Boolean).join(' • ') ||
    'غير محدد';

  const detailText = [propertyType, area ? `${area} م²` : null].filter(Boolean).join(' • ');
  const timeText = timeAgoLabel(createdAt);
  const userName = sellerName || ownerName || contactName || 'المالك';
  const CardTag = safeId ? Link : 'div';
  const cardProps = safeId
    ? { href: detailLink, className: 'harajCard' }
    : { className: 'harajCard disabled', role: 'article', 'aria-label': title };

  return (
    <CardTag {...cardProps}>
      <div className={`harajCardRow${compact ? ' compact' : ''}`}>
        <div className="harajThumb" aria-hidden="true">
          <div
            className="harajThumbImg"
            style={
              mainImage
                ? { backgroundImage: `url(${mainImage})` }
                : { backgroundImage: 'linear-gradient(135deg, rgba(214,179,91,0.18), rgba(255,255,255,0.06))' }
            }
          />
          {hasMultipleImages && <div className="harajImgCount">+{images.length}</div>}
        </div>

        <div className="harajInfo">
          <div className="harajTopLine">
            <div className="harajPriceWrap">
              <div className="harajPrice">
                {displayPrice}
                {isRent && <span className="harajRent"> / سنوي</span>}
              </div>
            </div>
            <div className="harajStatus">{statusBadge(status)}</div>
          </div>

          <div className="harajTitle" title={title}>
            {title}
          </div>

          <div className="harajLocation" title={locationText}>
            {locationText}
          </div>

          {detailText ? <div className="harajSub">{detailText}</div> : null}

          <div className="harajBottom">
            <div className="harajUser">
              <span className="harajAvatar">{firstChar(userName)}</span>
              <span className="harajUserName">{userName}</span>
            </div>
            <div className="harajTime">{timeText}</div>
          </div>
        </div>
      </div>
    </CardTag>
  );
}
