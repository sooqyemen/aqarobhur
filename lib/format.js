'use client';
import Link from 'next/link';
// تأكد أن مسار الاستدعاء هذا صحيح لديك، أو قم بحذفه واستخدام price مباشرة
import { formatPriceSAR, statusBadge } from '@/lib/format'; 

export default function ListingCard({ item }) {
  // حماية ضد البيانات الناقصة
  const imageSrc = item?.images?.[0] || null;
  const title = item?.title || 'عقار مميز';
  const location = item?.neighborhood || 'شمال جدة';
  const tag = item?.dealType === 'sale' ? 'بيع' : 'إيجار';

  return (
    <Link href={`/listing/${item.id}`} className="card">
      
      {/* قسم الصورة */}
      <div className="image-wrapper">
        {imageSrc ? (
          <img src={imageSrc} alt={title} loading="lazy" />
        ) : (
          <div className="no-image">لا توجد صورة</div>
        )}
        <span className="badge-type">{item?.propertyType || 'عقار'}</span>
        {item?.direct && <span className="badge-direct">مباشر</span>}
      </div>

      {/* المحتوى */}
      <div className="content">
        <div className="top-row">
            <h3 className="title">{title}</h3>
            <span className={`tag ${item?.dealType}`}>{tag}</span>
        </div>
        
        <p className="location">📍 {location} {item?.plan && ` - مخطط ${item.plan}`}</p>

        {/* الخصائص */}
        <div className="features">
          {item?.area && <span>📐 {item.area} م²</span>}
          {item?.part && <span>🔹 جزء {item.part}</span>}
        </div>

        <div className="divider"></div>

        {/* السعر والزر */}
        <div className="footer">
          <div className="price">
            {/* إذا لم تعمل formatPriceSAR استخدم item.price مباشرة */}
            {formatPriceSAR ? formatPriceSAR(item.price) : `${item.price} ريال`}
          </div>
          <span className="details-link">التفاصيل ←</span>
        </div>
      </div>

      <style jsx>{`
        .card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: #cbd5e1;
        }

        .image-wrapper {
          position: relative;
          aspect-ratio: 4/3;
          background: #f1f5f9;
        }
        .image-wrapper img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .no-image {
          width: 100%; height: 100%; display: flex; 
          align-items: center; justify-content: center; 
          color: var(--text-secondary); font-size: 12px;
        }

        .badge-type {
          position: absolute; top: 10px; right: 10px;
          background: rgba(255,255,255,0.9);
          padding: 4px 10px; border-radius: 6px;
          font-size: 12px; font-weight: 700; color: var(--text-main);
        }
        .badge-direct {
          position: absolute; top: 10px; left: 10px;
          background: var(--success); color: #fff;
          padding: 4px 8px; border-radius: 6px;
          font-size: 11px; font-weight: 700;
        }

        .content { padding: 16px; flex: 1; display: flex; flex-direction: column; }
        
        .top-row { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
        .title { margin: 0; font-size: 16px; font-weight: 800; color: var(--text-main); line-height: 1.4; }
        
        .tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #eee; font-weight: 700; }
        .tag.sale { color: var(--primary); background: rgba(30, 58, 138, 0.1); }
        .tag.rent { color: var(--accent); background: rgba(217, 119, 6, 0.1); }

        .location { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px 0; }

        .features { display: flex; gap: 12px; font-size: 13px; color: var(--text-main); font-weight: 600; }

        .divider { height: 1px; background: var(--border); margin: 16px 0; margin-top: auto; }

        .footer { display: flex; justify-content: space-between; align-items: center; }
        .price { font-size: 18px; font-weight: 900; color: var(--primary); }
        .details-link { font-size: 13px; color: var(--text-secondary); font-weight: 700; }
        .card:hover .details-link { color: var(--primary); }
      `}</style>
    </Link>
  );
}
