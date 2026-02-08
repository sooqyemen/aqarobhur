'use client';

import Link from 'next/link';
import { formatPriceSAR, statusBadge } from '@/lib/format'; // تأكد أن المسار صحيح

export default function ListingCard({ item }) {
  // حماية ضد البيانات الفارغة
  const thumb = item?.images?.[0] || '';
  const title = item?.title || 'عقار مميز';
  
  // دمج الحي والمخطط
  const locationText = [item?.neighborhood, item?.plan && `مخطط ${item.plan}`]
    .filter(Boolean).join(' - ');

  return (
    <Link href={`/listing/${item.id}`} className="card listing-card">
      
      {/* قسم الصورة */}
      <div className="thumb-wrapper">
        {thumb ? (
          <img src={thumb} alt={title} loading="lazy" />
        ) : (
          <div className="no-img">لا توجد صورة</div>
        )}
        
        {/* شارات الحالة فوق الصورة */}
        <div className="badges-overlay">
          {item.direct && <span className="badge-direct">مباشر</span>}
          <div className="status-badge-wrapper">
             {/* استخدام دالتك statusBadge هنا */}
             {statusBadge(item.status)}
          </div>
        </div>

        <span className="property-type">{item.propertyType || 'عقار'}</span>
      </div>

      {/* المحتوى */}
      <div className="body">
        <div className="header-row">
          <h3 className="title">{title}</h3>
        </div>

        <div className="meta-row">
          <span className="location-text">📍 {locationText || 'شمال جدة'}</span>
        </div>

        {/* الميزات: المساحة والنوع */}
        <div className="features">
          {item.area && (
            <div className="feature-pill">
              <span className="val">{item.area}</span> <span className="unit">م²</span>
            </div>
          )}
          <div className="feature-pill type-pill">
            {item.dealType === 'sale' ? 'بيع' : 'إيجار'}
          </div>
          {item.part && <div className="feature-pill">جزء {item.part}</div>}
        </div>

        <div className="divider"></div>

        {/* السعر والقدم */}
        <div className="footer">
          <div className="price-tag">
            {/* استخدام دالتك formatPriceSAR هنا */}
            {formatPriceSAR(item.price)}
          </div>
          <span className="view-more">التفاصيل ←</span>
        </div>
      </div>

      <style jsx>{`
        .listing-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
          display: flex;
          flex-direction: column;
        }
        .listing-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .thumb-wrapper {
          position: relative;
          aspect-ratio: 16/10;
          background: #f1f5f9;
          overflow: hidden;
        }
        .thumb-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        .no-img { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px; }

        .badges-overlay {
          position: absolute; top: 10px; left: 10px; right: 10px;
          display: flex; justify-content: space-between; pointer-events: none;
        }
        .badge-direct {
          background: var(--success-bg); color: var(--success-text);
          padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;
        }
        .property-type {
          position: absolute; bottom: 10px; right: 10px;
          background: rgba(0,0,0,0.6); color: #fff;
          padding: 2px 8px; border-radius: 6px; font-size: 11px;
        }

        .body { padding: 16px; flex: 1; display: flex; flex-direction: column; }
        
        .title {
          font-size: 16px; font-weight: 800; color: var(--text-main);
          margin: 0 0 6px 0;
          line-height: 1.4;
        }
        
        .location-text { font-size: 13px; color: var(--text-muted); }

        .features { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
        .feature-pill {
          background: #f8fafc; border: 1px solid var(--border);
          padding: 4px 8px; border-radius: 6px;
          font-size: 12px; font-weight: 600; color: var(--text-main);
        }
        .type-pill { color: var(--primary); background: var(--primary-light); border-color: transparent; }

        .divider { height: 1px; background: var(--border); margin: 16px 0; margin-top: auto; }

        .footer { display: flex; align-items: center; justify-content: space-between; }
        .price-tag { font-size: 18px; font-weight: 900; color: var(--primary); letter-spacing: -0.5px; }
        .view-more { font-size: 13px; color: var(--text-muted); font-weight: 700; }
        .listing-card:hover .view-more { color: var(--primary); }
      `}</style>
    </Link>
  );
}
