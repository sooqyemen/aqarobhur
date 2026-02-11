'use client';

import Link from 'next/link';
import { formatPriceSAR, statusBadge } from '@/lib/format';

function timeAgoLabel(createdAt) {
  // يدعم Date أو Firestore Timestamp (createdAt.toDate)
  try {
    const d =
      createdAt?.toDate?.() ||
      (createdAt instanceof Date ? createdAt : null);

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
  if (!s) return 'م';
  return s[0];
}

export default function ListingCard({ item, compact = false }) {
  if (!item) return null;

  const {
    id,
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
  const detailLink = `/listings/${id || 'unknown'}`;

  // ✅ بدون placeholder file (حتى لا يطلع 404)
  const mainImage = images?.[0] || null;

  // بيانات سطر الموقع/الوقت مثل حراج
  const locationText =
    city ||
    neighborhood ||
    [neighborhood, plan, part].filter(Boolean).join(' • ') ||
    'غير محدد';

  const timeText = timeAgoLabel(createdAt);

  // اسم المعلن (لو ما عندك حقول اسم، بيظهر "المالك" افتراضي)
  const userName =
    sellerName ||
    ownerName ||
    contactName ||
    'المالك';

  // =========================
  // ✅ نسخة حراج (Compact) — للقوائم (الرئيسية/كل العروض/الخريطة)
  // =========================
  if (compact) {
    return (
      <Link href={detailLink} className="harajCard" aria-label={title}>
        {/* نخلي ترتيب الأعمدة LTR عشان الصورة تكون يسار مثل حراج */}
        <div className="row">
          {/* الصورة (يسار) */}
          <div className="thumb" aria-hidden="true">
            <div
              className="thumbImg"
              style={
                mainImage
                  ? { backgroundImage: `url(${mainImage})` }
                  : {
                      backgroundImage:
                        'linear-gradient(135deg, rgba(214,179,91,0.20), rgba(255,255,255,0.05))',
                    }
              }
            />
          </div>

          {/* التفاصيل (يمين) */}
          <div className="info">
            <div className="title" title={title}>
              {title}
            </div>

            <div className="priceRow">
              <div className="price">
                {displayPrice}
                {isRent && <span className="rent"> / شهري</span>}
              </div>

              {/* حالة العرض (اختياري) */}
              <div className="badge">{statusBadge(status)}</div>
            </div>

            <div className="meta">
              <div className="metaItem" title={locationText}>
                <span className="ico">📍</span>
                <span className="txt">{locationText}</span>
              </div>

              <div className="metaItem">
                <span className="ico">🕒</span>
                <span className="txt">{timeText}</span>
              </div>
            </div>

            <div className="bottom">
              <div className="user">
                <span className="avatar">{firstChar(userName)}</span>
                <span className="userName">{userName}</span>
              </div>

              {/* مباشر (زي شارة صغيرة) */}
              {direct && <span className="direct">مباشر</span>}
            </div>

            {/* سطر إضافي صغير (اختياري) */}
            {(propertyType || area) && (
              <div className="sub">
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
          }

          /* الكرت */
          .row {
            direction: ltr; /* ✅ يخلي الصورة يسار */
            display: flex;
            gap: 12px;
            align-items: stretch;
            background: #fff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 14px;
            padding: 12px;
          }

          /* دعم الثيم الداكن حسب متغيراتك لو موجودة */
          :global(body.dark) .row {
            background: var(--card);
            border-color: var(--border);
          }

          /* الصورة */
          .thumb {
            flex: 0 0 118px;
            height: 92px;
            border-radius: 12px;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(0, 0, 0, 0.06);
          }

          :global(body.dark) .thumb {
            border-color: var(--border);
          }

          .thumbImg {
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
          }

          /* التفاصيل */
          .info {
            direction: rtl; /* ✅ النص عربي طبيعي */
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .title {
            font-size: 16px;
            font-weight: 900;
            color: #18a86b; /* أخضر حراج */
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          :global(body.dark) .title {
            color: var(--primary);
          }

          .priceRow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .price {
            font-size: 15px;
            font-weight: 900;
            color: #1e6fd9; /* أزرق حراج */
            white-space: nowrap;
          }

          :global(body.dark) .price {
            color: var(--primary);
          }

          .rent {
            font-size: 12px;
            font-weight: 800;
            color: rgba(0, 0, 0, 0.55);
          }

          :global(body.dark) .rent {
            color: var(--muted);
          }

          .badge {
            flex: 0 0 auto;
          }

          /* معلومات صغيرة: الموقع/الوقت */
          .meta {
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
            color: rgba(0, 0, 0, 0.55);
            font-size: 12.5px;
            font-weight: 700;
          }

          :global(body.dark) .meta {
            color: var(--muted);
          }

          .metaItem {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
          }

          .txt {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          /* أسفل: اسم المعلن */
          .bottom {
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .user {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: rgba(0, 0, 0, 0.65);
            font-weight: 800;
            font-size: 12.5px;
            min-width: 0;
          }

          :global(body.dark) .user {
            color: var(--muted);
          }

          .avatar {
            width: 26px;
            height: 26px;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.06);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
          }

          :global(body.dark) .avatar {
            background: rgba(255, 255, 255, 0.06);
          }

          .userName {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .direct {
            font-size: 12px;
            font-weight: 900;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(214, 179, 91, 0.14);
            color: rgba(0, 0, 0, 0.75);
            border: 1px solid rgba(214, 179, 91, 0.25);
            white-space: nowrap;
          }

          :global(body.dark) .direct {
            color: var(--primary);
          }

          .sub {
            font-size: 12px;
            font-weight: 800;
            color: rgba(0, 0, 0, 0.5);
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            margin-top: -2px;
          }

          :global(body.dark) .sub {
            color: var(--muted);
          }

          /* موبايل: نفس حراج */
          @media (max-width: 600px) {
            .thumb {
              flex: 0 0 110px;
              height: 86px;
            }
            .title {
              font-size: 15px;
            }
          }
        `}</style>
      </Link>
    );
  }

  // =========================
  // النسخة Full (لو تستخدمها في صفحات أخرى)
  // خليتها بسيطة: تستخدم نفس شكل compact لكن أكبر
  // =========================
  return (
    <div className="fullWrap">
      <Link href={detailLink} className="harajCard">
        <div className="row big">
          <div className="thumb bigThumb" aria-hidden="true">
            <div
              className="thumbImg"
              style={
                mainImage
                  ? { backgroundImage: `url(${mainImage})` }
                  : {
                      backgroundImage:
                        'linear-gradient(135deg, rgba(214,179,91,0.20), rgba(255,255,255,0.05))',
                    }
              }
            />
          </div>

          <div className="info">
            <div className="title" title={title}>
              {title}
            </div>

            <div className="priceRow">
              <div className="price">
                {displayPrice}
                {isRent && <span className="rent"> / شهري</span>}
              </div>
              <div className="badge">{statusBadge(status)}</div>
            </div>

            <div className="meta">
              <div className="metaItem" title={locationText}>
                <span className="ico">📍</span>
                <span className="txt">{locationText}</span>
              </div>
              <div className="metaItem">
                <span className="ico">🕒</span>
                <span className="txt">{timeText}</span>
              </div>
            </div>

            <div className="bottom">
              <div className="user">
                <span className="avatar">{firstChar(userName)}</span>
                <span className="userName">{userName}</span>
              </div>
              {direct && <span className="direct">مباشر</span>}
            </div>

            {(propertyType || area) && (
              <div className="sub">
                {[propertyType, area ? `${area} م²` : null].filter(Boolean).join(' • ')}
              </div>
            )}
          </div>
        </div>
      </Link>

      <style jsx>{`
        .fullWrap :global(.row.big) {
          padding: 14px;
        }
        .fullWrap :global(.bigThumb) {
          flex: 0 0 160px;
          height: 120px;
        }
      `}</style>
    </div>
  );
}
