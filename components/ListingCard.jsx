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

  // ✅ تأمين الـID (عشان ما يطلع /unknown)
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
    direct = false,
    createdAt,
    sellerName,
    ownerName,
    contactName,
  } = item;

  const isRent = dealType === 'rent';
  const displayPrice = formatPriceSAR(price);

  // ✅ لا نفتح رابط إذا ما فيه ID صحيح
  const detailLink = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';

  // ✅ بدون placeholder file لتجنب 404
  const mainImage = images?.[0] || null;
  const hasMultipleImages = (images?.length || 0) > 1;

  const locationText =
    city ||
    neighborhood ||
    [neighborhood, plan, part].filter(Boolean).join(' • ') ||
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
              {isRent && <span className="harajRent"> / شهري</span>}
            </div>
            <div className="harajStatus">{statusBadge(status)}</div>
          </div>

          <div className="harajMeta">
            <div className="harajMetaItem" title={locationText}>
              <span className="harajIco">📍</span>
              <span className="harajTxt">{locationText}</span>
            </div>
            <div className="harajMetaItem">
              <span className="harajIco">🕒</span>
              <span className="harajTxt">{timeText}</span>
            </div>
          </div>

          <div className="harajBottom">
            <div className="harajUser">
              <span className="harajAvatar">{firstChar(userName)}</span>
              <span className="harajUserName">{userName}</span>
            </div>

            {direct && <span className="harajDirect">مباشر</span>}
          </div>

          {(propertyType || area) && (
            <div className="harajSub">
              {[propertyType, area ? `${area} م²` : null].filter(Boolean).join(' • ')}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .harajCard {
          display: block;
          text-decoration: none;
          color: inherit;
          width: 100%;
        }
        .harajCard.disabled {
          cursor: default;
          opacity: 0.85;
        }

        /* ✅ أسماء كلاسات فريدة لتجنب تعارض CSS المشروع */
        .harajCardRow {
          direction: ltr; /* الصورة يسار */
          display: flex;
          gap: 12px;
          align-items: stretch;
          background: var(--card, #fff);
          border: 1px solid var(--border, rgba(0,0,0,0.08));
          border-radius: 14px;
          padding: 12px;
          box-shadow: var(--shadow, 0 6px 16px rgba(0,0,0,0.06));
        }

        .harajThumb {
          flex: 0 0 118px;
          height: 92px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border, rgba(0,0,0,0.06));
          background: rgba(0,0,0,0.04);
          position: relative;
        }
        .harajThumbImg {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
        }
        .harajImgCount {
          position: absolute;
          left: 8px;
          top: 8px;
          background: rgba(0,0,0,0.65);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
        }

        .harajInfo {
          direction: rtl;
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .harajTitle {
          font-size: 16px;
          font-weight: 900;
          color: #18a86b; /* أخضر قريب من حراج */
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .harajPriceRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .harajPrice {
          font-size: 15px;
          font-weight: 900;
          color: #1e6fd9; /* أزرق قريب من حراج */
          white-space: nowrap;
        }
        .harajRent {
          font-size: 12px;
          font-weight: 800;
          color: var(--muted, rgba(0,0,0,0.55));
        }
        .harajStatus {
          flex: 0 0 auto;
        }

        .harajMeta {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          color: var(--muted, rgba(0,0,0,0.55));
          font-size: 12.5px;
          font-weight: 700;
        }
        .harajMetaItem {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .harajTxt {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .harajBottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
        }
        .harajUser {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--muted, rgba(0,0,0,0.65));
          font-weight: 800;
          font-size: 12.5px;
          min-width: 0;
        }
        .harajAvatar {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: rgba(0,0,0,0.06);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }
        .harajUserName {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .harajDirect {
          font-size: 12px;
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(214,179,91,0.14);
          border: 1px solid rgba(214,179,91,0.25);
          white-space: nowrap;
        }

        .harajSub {
          font-size: 12px;
          font-weight: 800;
          color: var(--muted, rgba(0,0,0,0.5));
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-top: -2px;
        }

        @media (max-width: 600px) {
          .harajThumb { flex: 0 0 110px; height: 86px; }
          .harajTitle { font-size: 15px; }
        }
      `}</style>
    </CardTag>
  );
}
