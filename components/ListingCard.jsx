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

function getStatusLabel(status, dealType) {
  const s = String(status || 'available');
  if (s === 'reserved') return 'محجوز';
  if (s === 'sold') return dealType === 'rent' ? 'مؤجر' : 'مباع';
  if (s === 'hidden' || s === 'inactive' || s === 'canceled') return 'غير متاح';
  return 'متاح';
}

function getStatusStyle(status) {
  const s = String(status || 'available');
  if (s === 'reserved') {
    return {
      color: '#92400e',
      background: 'rgba(217,119,6,.10)',
      border: '1px solid rgba(217,119,6,.18)',
    };
  }
  if (s === 'sold') {
    return {
      color: '#b91c1c',
      background: 'rgba(220,38,38,.08)',
      border: '1px solid rgba(220,38,38,.16)',
    };
  }
  if (s === 'hidden' || s === 'inactive' || s === 'canceled') {
    return {
      color: '#334155',
      background: 'rgba(71,85,105,.08)',
      border: '1px solid rgba(71,85,105,.16)',
    };
  }
  return {
    color: '#166534',
    background: 'rgba(22,163,74,.08)',
    border: '1px solid rgba(22,163,74,.15)',
  };
}

export default function ListingCard({ item, compact = false }) {
  if (!item) return null;

  const safeId = item?.id || item?.docId || item?.listingId || item?._id || '';
  const href = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';

  const title = item?.title || 'عرض عقاري';
  const price = formatPriceSAR(item?.price);
  const isRent = item?.dealType === 'rent';
  const locationText = [item?.neighborhood, item?.plan, item?.part].filter(Boolean).join(' • ') || item?.city || 'الموقع غير محدد';
  const detailsText = [item?.propertyType, item?.area ? `${item.area} م²` : null].filter(Boolean).join(' • ');
  const image = Array.isArray(item?.images) ? item.images[0] : '';
  const statusLabel = getStatusLabel(item?.status, item?.dealType);
  const statusStyle = getStatusStyle(item?.status);

  const Wrapper = safeId ? Link : 'div';
  const wrapperProps = safeId ? { href } : {};

  return (
    <Wrapper {...wrapperProps} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }} aria-label={title}>
      <article className="card listingCardClean">
        <div className="listingCardMedia">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={title} className="listingCardImage" />
          ) : (
            <div className="listingCardPlaceholder">بدون صورة</div>
          )}
        </div>

        <div className="listingCardBody">
          <div className="listingCardTop">
            <div className="listingCardHeadings">
              <div className="listingCardTitle" title={title}>{title}</div>
              <div className="listingCardLocation">{locationText}</div>
            </div>

            <span className="listingCardStatus" style={statusStyle}>{statusLabel}</span>
          </div>

          <div className="listingCardPriceRow">
            <div className="listingCardPrice">
              {price}
              {isRent ? <span className="listingCardRent"> / سنوي</span> : null}
            </div>
            <div className="listingCardTime">{timeAgoLabel(item?.createdAt)}</div>
          </div>

          {detailsText ? <div className="listingCardMeta">{detailsText}</div> : null}
        </div>
      </article>

      <style jsx>{`
        .listingCardClean {
          display: grid;
          grid-template-columns: ${compact ? '120px minmax(0,1fr)' : '132px minmax(0,1fr)'};
          gap: 12px;
          padding: 12px;
          overflow: hidden;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
        }

        .listingCardClean:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
          border-color: rgba(214, 179, 91, 0.28);
        }

        .listingCardMedia {
          width: 100%;
          height: ${compact ? '96px' : '108px'};
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #f8fafc;
        }

        .listingCardImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .listingCardPlaceholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: var(--muted);
          font-weight: 800;
          font-size: 13px;
          background: linear-gradient(135deg, rgba(214,179,91,.10), rgba(248,250,252,.95));
        }

        .listingCardBody {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
        }

        .listingCardTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .listingCardHeadings {
          min-width: 0;
          flex: 1 1 auto;
        }

        .listingCardTitle {
          font-size: ${compact ? '16px' : '17px'};
          line-height: 1.45;
          font-weight: 900;
          color: var(--text);
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .listingCardLocation,
        .listingCardMeta,
        .listingCardTime {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.55;
        }

        .listingCardStatus {
          flex: 0 0 auto;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .listingCardPriceRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .listingCardPrice {
          font-size: ${compact ? '20px' : '22px'};
          font-weight: 950;
          color: #1e40af;
          line-height: 1.2;
        }

        .listingCardRent {
          font-size: 12px;
          color: var(--muted);
          font-weight: 800;
        }

        @media (max-width: 720px) {
          .listingCardClean {
            grid-template-columns: 1fr;
          }

          .listingCardMedia {
            height: 190px;
          }

          .listingCardPrice {
            font-size: 20px;
          }
        }
      `}</style>
    </Wrapper>
  );
}
