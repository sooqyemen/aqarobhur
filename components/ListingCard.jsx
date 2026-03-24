'use client';

import Link from 'next/link';
import { formatPriceSAR } from '@/lib/format';

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

function getStatusMeta(status, dealType) {
  const s = String(status || 'available');
  const dt = String(dealType || 'sale');

  if (s === 'sold') {
    return { label: dt === 'rent' ? 'مؤجر' : 'مباع', className: 'sold' };
  }
  if (s === 'reserved') {
    return { label: 'محجوز', className: 'warn' };
  }
  if (s === 'canceled' || s === 'hidden' || s === 'inactive') {
    return { label: 'غير متاح', className: '' };
  }
  return { label: 'متاح', className: 'ok' };
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
    createdAt,
    sellerName,
    ownerName,
    contactName,
  } = item;

  const isRent = dealType === 'rent';
  const displayPrice = formatPriceSAR(price);
  const statusMeta = getStatusMeta(status, dealType);
  const detailLink = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';
  const mainImage = images?.[0] || null;
  const hasMultipleImages = (images?.length || 0) > 1;

  const locationText =
    city ||
    [neighborhood, plan, part].filter(Boolean).join(' • ') ||
    neighborhood ||
    'غير محدد';

  const timeText = timeAgoLabel(createdAt);
  const userName = sellerName || ownerName || contactName || 'المالك';

  const CardTag = safeId ? Link : 'div';
  const cardProps = safeId
    ? { href: detailLink, className: 'harajCard' }
    : { className: 'harajCard disabled', role: 'article', 'aria-label': title };

  return (
    <CardTag {...cardProps}>
      <div className="harajCardRow">
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
          <div className="harajTitle" title={title}>
            {title}
          </div>

          <div className="harajPriceRow">
            <div className="harajPrice">
              {displayPrice}
              {isRent && <span className="harajRent"> / سنوي</span>}
            </div>
            <div className="harajStatus">
              <span className={`badge ${statusMeta.className}`.trim()}>{statusMeta.label}</span>
            </div>
          </div>

          <div className="harajMeta">
            <div className="harajMetaItem" title={locationText}>
              <span className="harajTxt">{locationText}</span>
            </div>
            <div className="harajMetaItem">
              <span className="harajTxt">{timeText}</span>
            </div>
          </div>

          <div className="harajBottom">
            <div className="harajUser">
              <span className="harajAvatar">{firstChar(userName)}</span>
              <span className="harajUserName">{userName}</span>
            </div>
          </div>

          {(propertyType || area) && (
            <div className="harajSub">
              {[propertyType, area ? `${area} م²` : null].filter(Boolean).join(' • ')}
            </div>
          )}
        </div>
      </div>
    </CardTag>
  );
}
