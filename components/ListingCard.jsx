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
    if (min < 60) return `قبل ${min} دقيقة`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `قبل ${hr} ساعة`;
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
  if (s === 'canceled' || s === 'hidden' || s === 'inactive') return 'غير متاح';
  return 'متاح';
}

function getStatusStyles(status) {
  const s = String(status || 'available');
  if (s === 'reserved') {
    return { background: 'rgba(217,119,6,.10)', color: '#92400e', border: '1px solid rgba(217,119,6,.16)' };
  }
  if (s === 'sold') {
    return { background: 'rgba(220,38,38,.08)', color: '#b91c1c', border: '1px solid rgba(220,38,38,.16)' };
  }
  if (s === 'canceled' || s === 'hidden' || s === 'inactive') {
    return { background: 'rgba(71,85,105,.08)', color: '#334155', border: '1px solid rgba(71,85,105,.15)' };
  }
  return { background: 'rgba(22,163,74,.08)', color: '#166534', border: '1px solid rgba(22,163,74,.15)' };
}

export default function ListingCard({ item, compact = false }) {
  if (!item) return null;

  const safeId = item?.id || item?.docId || item?.listingId || item?._id || '';
  const detailLink = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';

  const title = item?.title || 'عرض عقاري';
  const displayPrice = formatPriceSAR(item?.price);
  const isRent = item?.dealType === 'rent';
  const statusLabel = getStatusLabel(item?.status, item?.dealType);
  const locationBits = [item?.neighborhood, item?.plan, item?.part].filter(Boolean);
  const locationText = locationBits.length ? locationBits.join(' • ') : item?.city || 'الموقع غير محدد';
  const subText = [item?.propertyType, item?.area ? `${item.area} م²` : null].filter(Boolean).join(' • ');
  const image = Array.isArray(item?.images) ? item.images[0] : '';

  const Wrapper = safeId ? Link : 'div';
  const wrapperProps = safeId ? { href: detailLink } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      aria-label={title}
    >
      <div
        className="card"
        style={{
          overflow: 'hidden',
          transition: 'transform 140ms ease, box-shadow 140ms ease',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? '160px minmax(0, 1fr)' : '220px minmax(0, 1fr)',
            gap: 0,
          }}
        >
          <div
            style={{
              minHeight: compact ? 150 : 190,
              background: '#f8fafc',
              borderInlineEnd: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--muted)',
                  fontWeight: 800,
                }}
              >
                بدون صورة
              </div>
            )}
          </div>

          <div style={{ padding: compact ? 14 : 16, display: 'grid', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 280px' }}>
                <div
                  style={{
                    fontSize: compact ? 17 : 18,
                    lineHeight: 1.5,
                    fontWeight: 900,
                    marginBottom: 6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                  }}
                >
                  {title}
                </div>

                <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{locationText}</div>
              </div>

              <span
                style={{
                  ...getStatusStyles(item?.status),
                  borderRadius: 999,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                }}
              >
                {statusLabel}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontWeight: 950, fontSize: compact ? 22 : 24 }}>
                {displayPrice}
                {isRent ? <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 800 }}> سنوي</span> : null}
              </div>

              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{timeAgoLabel(item?.createdAt)}</div>
            </div>

            {subText ? <div style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.7 }}>{subText}</div> : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        a:hover > div,
        div[aria-label]:hover > div {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        @media (max-width: 720px) {
          a > div > div,
          div[aria-label] > div > div {
            grid-template-columns: 1fr !important;
          }

          a > div > div > div:first-child,
          div[aria-label] > div > div > div:first-child {
            min-height: 210px !important;
            border-inline-end: 0 !important;
            border-bottom: 1px solid var(--border);
          }
        }
      `}</style>
    </Wrapper>
  );
}
