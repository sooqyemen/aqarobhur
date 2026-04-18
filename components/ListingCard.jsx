'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatPriceSAR, statusBadge } from '@/lib/format';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.ogg', '.m3u8'];

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

function looksLikeVideo(url = '') {
  const lower = String(url || '').toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.includes(ext));
}

function normalizeMediaEntry(entry, forcedKind = '') {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const url = entry.trim();
    if (!url) return null;
    return { url, kind: forcedKind || (looksLikeVideo(url) ? 'video' : 'image') };
  }

  if (typeof entry !== 'object') return null;

  const url = String(entry.url || entry.src || entry.href || entry.downloadURL || entry.downloadUrl || '').trim();
  if (!url) return null;

  const rawKind = String(entry.kind || entry.type || entry.mediaType || forcedKind || '').trim().toLowerCase();
  return { url, kind: rawKind === 'video' || looksLikeVideo(url) ? 'video' : 'image' };
}

function getListingMedia(item) {
  const sources = [
    ...(Array.isArray(item?.imagesMeta) ? item.imagesMeta : []),
    ...(Array.isArray(item?.images) ? item.images : []),
    ...(Array.isArray(item?.videos) ? item.videos.map((url) => ({ url, kind: 'video' })) : []),
    ...(item?.coverImage ? [item.coverImage] : []),
    ...(item?.image ? [item.image] : []),
    ...(item?.imageUrl ? [item.imageUrl] : []),
  ];

  const out = [];
  const seen = new Set();

  for (const source of sources) {
    const entry = normalizeMediaEntry(source);
    const key = String(entry?.url || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }

  return out;
}

export default function ListingCard({ item, compact = false }) {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [item?.id, item?.imagesMeta, item?.images, item?.videos]);

  const media = useMemo(() => getListingMedia(item), [item]);

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
    direct = false,
    createdAt,
  } = item;

  const isRent = dealType === 'rent';
  const displayPrice = formatPriceSAR(price);
  const detailLink = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '#';
  const coverEntry = media.find((entry) => entry.kind !== 'video') || media[0] || null;
  const imageCount = media.filter((entry) => entry.kind !== 'video').length;
  const hasMultipleImages = imageCount > 1;
  const timeText = timeAgoLabel(createdAt);
  const locationParts = [neighborhood, plan, part].filter(Boolean);
  const locationText = locationParts.join(' • ') || city || 'غير محدد';
  const specsText = [propertyType, area ? `${area} م²` : null].filter(Boolean).join(' • ');
  const showPlaceholder = !coverEntry || coverFailed;
  const isVideoCover = !showPlaceholder && coverEntry?.kind === 'video';

  const CardTag = safeId ? Link : 'article';
  const cardProps = safeId
    ? { href: detailLink, className: `listingCard ${compact ? 'compact' : ''}` }
    : { className: `listingCard ${compact ? 'compact' : ''} disabled`, role: 'article', 'aria-label': title };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <CardTag {...cardProps}>
        <div className="cardMedia">
          {showPlaceholder ? (
            <div className="mediaPlaceholder">
              <span className="material-icons-outlined">image_not_supported</span>
              <span>لا توجد صورة</span>
            </div>
          ) : isVideoCover ? (
            <video src={coverEntry.url} className="mediaImage" preload="metadata" muted playsInline />
          ) : (
            <img
              src={coverEntry.url}
              alt={title}
              className="mediaImage"
              loading="lazy"
              onError={() => setCoverFailed(true)}
            />
          )}

          <div className="mediaOverlays">
            <div className="statusBadgeWrap">{statusBadge(status)}</div>
            {hasMultipleImages && (
              <div className="imageCountBadge">
                <span className="material-icons-outlined">photo_library</span>
                {imageCount}
              </div>
            )}
          </div>

          <div className={`dealBadge ${isRent ? 'rent' : 'sale'}`}>
            {isRent ? 'للإيجار' : 'للبيع'}
          </div>
        </div>

        <div className="cardBody">
          <div className="priceRow">
            <div className="priceText">
              {displayPrice}
              {isRent && <span className="rentSuffix">/ سنوي</span>}
            </div>
          </div>

          <h3 className="cardTitle" title={title}>{title}</h3>

          <div className="locationRow" title={locationText}>
            <span className="material-icons-outlined">place</span>
            {locationText}
          </div>

          {specsText && (
            <div className="specsRow">
              <span className="material-icons-outlined">straighten</span>
              {specsText}
            </div>
          )}
        </div>

        <div className="cardFooter">
          <div className="metaInfo">
            {direct && <span className="directBadge"><span className="material-icons-outlined">verified</span> مباشر</span>}
            <span className="timeBadge"><span className="material-icons-outlined">schedule</span> {timeText}</span>
          </div>
        </div>

        <style jsx>{`
          .listingCard {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: white;
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            text-decoration: none;
            color: inherit;
            box-shadow: 0 4px 6px rgba(15, 23, 42, 0.02);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .listingCard:hover:not(.disabled) {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
            border-color: #cbd5e0;
          }

          .listingCard.disabled { cursor: default; opacity: 0.9; }

          .cardMedia {
            position: relative;
            aspect-ratio: 16 / 11;
            background: #f8fafc;
            overflow: hidden;
            border-bottom: 1px solid #edf2f7;
          }

          /* 🔧 ضمان ملء الصورة للمساحة بشكل سليم في كافة المتصفحات */
          .mediaImage {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
            display: block;
            background: #f8fafc;
          }
          
          .listingCard:hover:not(.disabled) .mediaImage { transform: scale(1.05); }

          .mediaPlaceholder {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #a0aec0;
            background: linear-gradient(135deg, #f7fafc, #edf2f7);
            font-size: 13px;
            font-weight: 600;
          }
          .mediaPlaceholder .material-icons-outlined { font-size: 32px; opacity: 0.5; }

          .mediaOverlays {
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            pointer-events: none;
          }

          .statusBadgeWrap :global(.badge) {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 800;
            background: rgba(255, 255, 255, 0.95);
            color: #1a202c;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            backdrop-filter: blur(4px);
          }
          .statusBadgeWrap :global(.badge.ok) { color: #2f855a; }
          .statusBadgeWrap :global(.badge.warn) { color: #dd6b20; }
          .statusBadgeWrap :global(.badge.sold) { color: #c53030; }

          .imageCountBadge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            color: white;
            background: rgba(26, 32, 44, 0.7);
            backdrop-filter: blur(4px);
          }
          .imageCountBadge .material-icons-outlined { font-size: 14px; }

          .dealBadge {
            position: absolute;
            bottom: 10px;
            right: 10px;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 800;
            color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .dealBadge.sale { background: #3182ce; }
          .dealBadge.rent { background: #dd6b20; }

          .cardBody { padding: 16px; display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
          .compact .cardBody { padding: 12px; gap: 8px; }

          .priceRow { display: flex; align-items: center; justify-content: space-between; }
          .priceText { font-size: 20px; font-weight: 900; color: #2f855a; display: flex; align-items: baseline; gap: 4px; }
          .compact .priceText { font-size: 18px; }
          .rentSuffix { font-size: 12px; font-weight: 700; color: #718096; }

          .cardTitle { margin: 0; font-size: 15px; font-weight: 800; color: #1a202c; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 44px; }

          .locationRow, .specsRow { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #4a5568; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .locationRow .material-icons-outlined, .specsRow .material-icons-outlined { font-size: 16px; color: #a0aec0; }

          .specsRow { background: #f7fafc; padding: 6px 10px; border-radius: 8px; border: 1px solid #edf2f7; font-weight: 600; color: #2d3748; margin-top: 4px; }

          .cardFooter { display: flex; justify-content: flex-end; padding: 12px 16px; border-top: 1px dashed #e2e8f0; background: #fcfcfd; margin-top: auto; }
          .compact .cardFooter { padding: 10px 12px; }

          .metaInfo { display: flex; align-items: center; justify-content: flex-end; gap: 8px; width: 100%; }
          .directBadge, .timeBadge { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; }
          .directBadge { background: #ebf8ff; color: #2b6cb0; }
          .timeBadge { background: #edf2f7; color: #718096; }
          .directBadge .material-icons-outlined, .timeBadge .material-icons-outlined { font-size: 13px; }
        `}</style>
      </CardTag>
    </>
  );
}
