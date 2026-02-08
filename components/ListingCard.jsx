'use client';

import Link from 'next/link';
import { formatPriceSAR, statusBadge } from '@/lib/format';

function dealLabel(dealType) {
  if (dealType === 'sale') return 'بيع';
  if (dealType === 'rent') return 'إيجار';
  return '';
}

export default function ListingCard({ item }) {
  const thumb = item?.images?.[0] || '';
  const meta = [item?.neighborhood, item?.plan ? `مخطط ${item.plan}` : '', item?.part ? `جزء ${item.part}` : '']
    .filter(Boolean)
    .join(' • ');

  return (
    <Link href={`/listing/${item.id}`} className="card listingCard" aria-label={item?.title || 'عرض عقاري'}>
      <div className="thumbContainer">
        <div className="thumb">
          {thumb ? (
            <img src={thumb} alt={item.title || 'صورة العرض'} loading="lazy" />
          ) : (
            <div className="noImg">
              <div className="noImgIcon">🏠</div>
              <div className="noImgText muted">عرض عقاري</div>
            </div>
          )}
          <div className="overlay"></div>
          <div className="status">{statusBadge(item.status)}</div>
          {item.featured && (
            <div className="featuredBadge">
              <span className="star">⭐</span>
              مميز
            </div>
          )}
        </div>
      </div>

      <div className="body">
        <div className="titleRow">
          <div className="title">{item.title || 'عرض عقاري'}</div>
          {item.urgent && (
            <span className="urgentBadge">عاجل</span>
          )}
        </div>

        <div className="metaRow">
          <div className="meta muted">{meta || '—'}</div>
          <div className="price">{formatPriceSAR(item.price)}</div>
        </div>

        <div className="description">
          {item.description ? (
            <p className="descText muted">{item.description.slice(0, 80)}...</p>
          ) : (
            <p className="descPlaceholder muted">وصف غير متوفر</p>
          )}
        </div>

        <div className="tags">
          {item.area ? <span className="badge area">{item.area} م²</span> : null}
          {item.dealType ? <span className="badge deal">{dealLabel(item.dealType) || item.dealType}</span> : null}
          {item.propertyType ? <span className="badge type">{item.propertyType}</span> : null}
          {item.direct ? <span className="badge ok">مباشر</span> : null}
        </div>

        <div className="footer">
          <div className="details">
            <span className="detailsText">عرض التفاصيل</span>
            <span className="arrow">←</span>
          </div>
          <div className="contact">
            <span className="contactText muted">تواصل مباشر</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .listingCard {
          padding: 0;
          overflow: hidden;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .listingCard:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 60px rgba(16, 24, 40, 0.15);
          border-color: rgba(29, 78, 216, 0.3);
        }
        
        .thumbContainer {
          position: relative;
          overflow: hidden;
        }
        
        .thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .listingCard:hover .thumb img {
          transform: scale(1.1);
        }
        
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.1), transparent 40%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .listingCard:hover .overlay {
          opacity: 1;
        }
        
        .noImg {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        
        .noImgIcon {
          font-size: 48px;
          opacity: 0.3;
        }
        
        .noImgText {
          font-weight: 600;
          font-size: 14px;
        }
        
        .status {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 2;
        }
        
        .featuredBadge {
          position: absolute;
          top: 16px;
          right: 16px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 2;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }
        
        .star {
          font-size: 10px;
        }
        
        .body {
          padding: 20px;
        }
        
        .titleRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .title {
          font-weight: 900;
          line-height: 1.3;
          font-size: 18px;
          flex: 1;
          color: var(--text);
        }
        
        .urgentBadge {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
        }
        
        .metaRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .meta {
          font-size: 14px;
          flex: 1;
        }
        
        .price {
          font-weight: 950;
          font-size: 20px;
          color: var(--blue);
          background: linear-gradient(135deg, var(--blue), #2563eb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .description {
          margin-bottom: 16px;
          min-height: 48px;
        }
        
        .descText, .descPlaceholder {
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
        }
        
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .badge {
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .badge.area {
          background: linear-gradient(135deg, rgba(29, 78, 216, 0.1), rgba(29, 78, 216, 0.05));
          border-color: rgba(29, 78, 216, 0.2);
          color: var(--blue);
        }
        
        .badge.deal {
          background: linear-gradient(135deg, rgba(201, 162, 39, 0.1), rgba(201, 162, 39, 0.05));
          border-color: rgba(201, 162, 39, 0.2);
          color: var(--gold);
        }
        
        .badge.type {
          background: linear-gradient(135deg, rgba(107, 114, 128, 0.1), rgba(107, 114, 128, 0.05));
          border-color: rgba(107, 114, 128, 0.2);
          color: #4b5563;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }
        
        .details {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: gap 0.2s ease;
        }
        
        .listingCard:hover .details {
          gap: 12px;
        }
        
        .detailsText {
          font-weight: 700;
          color: var(--blue);
          font-size: 14px;
        }
        
        .arrow {
          color: var(--blue);
          font-size: 18px;
          transition: transform 0.2s ease;
        }
        
        .listingCard:hover .arrow {
          transform: translateX(-4px);
        }
        
        .contactText {
          font-size: 13px;
          font-weight: 500;
        }
        
        @media (max-width: 640px) {
          .title {
            font-size: 16px;
          }
          
          .price {
            font-size: 18px;
          }
          
          .metaRow {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .footer {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
        }
      `}</style>
    </Link>
  );
}
