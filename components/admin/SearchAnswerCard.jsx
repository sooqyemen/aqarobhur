'use client';

import Link from 'next/link';
import { formatPriceSAR } from '@/lib/format';
import SourceBadge from './SourceBadge';

function getImageUrl(item = {}) {
  const candidates = [];

  if (Array.isArray(item.imagesMeta)) {
    for (const entry of item.imagesMeta) {
      if (typeof entry === 'string') candidates.push(entry);
      else if (entry?.kind !== 'video' && entry?.url) candidates.push(entry.url);
    }
  }

  if (Array.isArray(item.images)) candidates.push(...item.images);
  if (Array.isArray(item.media)) {
    for (const entry of item.media) {
      if (typeof entry === 'string') candidates.push(entry);
      else if (entry?.kind !== 'video' && entry?.url) candidates.push(entry.url);
    }
  }

  candidates.push(item.image, item.imageUrl, item.cover, item.coverImage, item.thumbnail, item.photo);

  return candidates
    .map((value) => String(value || '').trim())
    .find((value) => value && !/\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(value)) || '';
}

function getMediaCount(item = {}) {
  const urls = new Set();
  const add = (value) => {
    const text = String(value || '').trim();
    if (text) urls.add(text);
  };

  if (Array.isArray(item.imagesMeta)) {
    item.imagesMeta.forEach((entry) => add(typeof entry === 'string' ? entry : entry?.url));
  }
  if (Array.isArray(item.images)) item.images.forEach(add);
  if (Array.isArray(item.media)) {
    item.media.forEach((entry) => add(typeof entry === 'string' ? entry : entry?.url));
  }

  [item.image, item.imageUrl, item.cover, item.coverImage, item.thumbnail, item.photo].forEach(add);
  return urls.size;
}

export default function SearchAnswerCard({
  answer,
  results = [],
  isPublic = false,
  whatsappLink = '',
}) {
  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <div className="answerCardWrap smartAnswerCard">
        <div className="answerHeader">
          <div className="titleWrap">
            <span className="material-icons-outlined titleIcon">psychology</span>
            <h3>نتيجة البحث الذكي</h3>
          </div>
        </div>

        {answer && (
          <div className="aiResponseBox">
            <span className="material-icons-outlined quoteIcon">format_quote</span>
            <p>{answer}</p>
          </div>
        )}

        <div className="resultsContainer smartResultsContainer">
          {results.length > 0 ? results.map((item) => {
            const imageUrl = getImageUrl(item);
            const mediaCount = getMediaCount(item);

            return (
              <div key={item.id} className="resultCard smartResultCard">
                <div className="smartResultMedia">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.title || 'صورة العرض العقاري'}
                      className="smartResultImage"
                      loading="lazy"
                    />
                  ) : (
                    <div className="smartResultPlaceholder">
                      <span className="material-icons-outlined">real_estate_agent</span>
                      <strong>لا توجد صورة</strong>
                    </div>
                  )}

                  <div className="smartMediaBadge">
                    <span className="material-icons-outlined">photo_library</span>
                    {mediaCount || 0}
                  </div>
                </div>

                <div className="smartResultBody">
                  <div className="resultTop">
                    <div className="resultMainInfo">
                      <h4 className="resultTitle">{item.title || 'عرض عقاري بدون عنوان'}</h4>
                      <div className="resultLocation">
                        <span className="material-icons-outlined">place</span>
                        {[item.neighborhood, item.plan, item.part].filter(Boolean).join(' — ') || 'موقع غير محدد بدقة'}
                      </div>
                    </div>

                    {!isPublic && (
                      <div className="sourceBadgeWrap">
                        <SourceBadge item={item} />
                      </div>
                    )}
                  </div>

                  <div className="infoGrid smartInfoGrid">
                    <Info label="نوع العقار" value={item.propertyType || '—'} icon="home" />
                    <Info label="التصنيف" value={item.propertyClass || '—'} icon="category" />
                    <Info label="السعر" value={item.price ? formatPriceSAR(item.price) : '—'} icon="payments" highlight />
                    <Info label="المساحة" value={item.area ? `${item.area} م²` : '—'} icon="square_foot" />
                    <Info label="مباشر؟" value={item.direct ? 'نعم (مباشر)' : 'لا'} icon="verified_user" isDirect={item.direct} />
                  </div>

                  {item.description && (
                    <div className="descBox smartDescBox">
                      <div className="descLabel">الوصف والتفاصيل:</div>
                      <p className="descContent">{item.description}</p>
                    </div>
                  )}

                  <div className="cardActions smartCardActions">
                    {isPublic ? (
                      <a href={whatsappLink} className="btnPrimary" target="_blank" rel="noopener noreferrer">
                        <span className="material-icons-outlined">chat</span>
                        تواصل معنا بخصوص هذا العرض
                      </a>
                    ) : (
                      <Link href={`/admin/listings/${item.id}`} className="btnOutline">
                        <span className="material-icons-outlined">open_in_new</span>
                        إدارة الإعلان
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="emptyState">
              <span className="material-icons-outlined">search_off</span>
              <p>لا توجد عروض عقارية تطابق هذا البحث حالياً.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .smartAnswerCard {
          overflow: hidden;
        }

        .smartResultsContainer {
          display: grid;
          gap: 16px;
          padding: 18px;
        }

        .smartResultCard {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 16px;
          align-items: stretch;
          padding: 14px;
          border-radius: 18px;
          background: #fff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
          overflow: hidden;
        }

        .smartResultMedia {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          min-height: 156px;
          max-height: 190px;
          border-radius: 16px;
          overflow: hidden;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          align-self: start;
        }

        .smartResultImage {
          display: block;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          object-fit: cover !important;
          object-position: center !important;
          border-radius: 0 !important;
        }

        .smartResultPlaceholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          gap: 8px;
          text-align: center;
          color: #64748b;
          background: linear-gradient(135deg, #f8fafc, #eef2f7);
        }

        .smartResultPlaceholder .material-icons-outlined {
          font-size: 34px;
          color: #94a3b8;
        }

        .smartResultPlaceholder strong {
          font-size: 13px;
          font-weight: 900;
        }

        .smartMediaBadge {
          position: absolute;
          top: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.75);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          backdrop-filter: blur(8px);
        }

        .smartMediaBadge .material-icons-outlined {
          font-size: 15px;
        }

        .smartResultBody {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 12px;
        }

        .smartResultBody :global(.resultTop),
        .resultTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }

        .resultMainInfo {
          min-width: 0;
          flex: 1;
        }

        .resultTitle {
          margin: 0 0 6px;
          color: #111827;
          font-size: 18px;
          font-weight: 950;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .resultLocation {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.6;
        }

        .resultLocation .material-icons-outlined {
          font-size: 17px;
        }

        .smartInfoGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
          gap: 8px;
        }

        .infoCard {
          min-width: 0;
          padding: 10px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .infoCard.highlight {
          background: #fffaf0;
          border-color: rgba(214, 179, 91, 0.55);
        }

        .infoCard.direct {
          background: #ecfdf5;
          border-color: #bbf7d0;
        }

        .infoLabel {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.4;
          margin-bottom: 5px;
        }

        .infoIcon {
          font-size: 15px;
        }

        .infoValue {
          color: #111827;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .smartDescBox {
          padding: 11px 12px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .descLabel {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .descContent {
          margin: 0;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.8;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .smartCardActions {
          display: flex;
          justify-content: flex-end;
          margin-top: auto;
        }

        .smartCardActions :global(a),
        .smartCardActions a {
          min-height: 42px;
          padding: 9px 14px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
        }

        @media (max-width: 780px) {
          .smartResultsContainer {
            padding: 12px;
            gap: 14px;
          }

          .smartResultCard {
            grid-template-columns: 1fr;
            padding: 12px;
            gap: 12px;
            border-radius: 16px;
          }

          .smartResultMedia {
            aspect-ratio: 16 / 10;
            min-height: 0;
            max-height: none;
          }

          .resultTitle {
            font-size: 16px;
            -webkit-line-clamp: 2;
          }

          .smartResultBody :global(.resultTop),
          .resultTop {
            flex-direction: column;
            gap: 8px;
          }

          .smartInfoGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .smartCardActions,
          .smartCardActions :global(a),
          .smartCardActions a {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}

function Info({ label, value, icon, highlight, isDirect }) {
  return (
    <div className={`infoCard ${highlight ? 'highlight' : ''} ${isDirect ? 'direct' : ''}`}>
      <div className="infoLabel">
        {icon && <span className="material-icons-outlined infoIcon">{icon}</span>}
        {label}
      </div>
      <div className="infoValue">{value}</div>
    </div>
  );
}
