import { notFound } from 'next/navigation';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR, statusBadge } from '@/lib/format';
import WhatsAppBar, { buildWhatsAppLink } from '@/components/WhatsAppBar';

// إعداد Metadata للصفحة (لتحسين SEO وعناوين الروابط)
export async function generateMetadata(props) {
  const params = await props.params; // ✅ الحل للمشكلة: انتظار الباراميترز
  const item = await fetchListingById(params.id);
  
  if (!item) {
    return { title: 'العرض غير موجود | عقار أبحر' };
  }

  return {
    title: `${item.title} | عقار أبحر`,
    description: item.description?.substring(0, 160) || 'عرض عقاري مميز في أبحر الشمالية',
  };
}

export default async function ListingPage(props) {
  // ✅ الخطوة الحاسمة: فك الباراميترز بشكل غير متزامن
  const params = await props.params;
  const { id } = params;

  // جلب البيانات
  const item = await fetchListingById(id);

  // إذا لم يتم العثور على العقار
  if (!item) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 500, margin: '0 auto', padding: 40 }}>
          <h1 style={{ fontSize: 24, marginBottom: 10 }}>العرض غير موجود</h1>
          <p className="muted">ربما تم حذف هذا العرض أو أن الرابط غير صحيح.</p>
          <a href="/listings" className="btnPrimary" style={{ marginTop: 20, display: 'inline-block' }}>
            تصفح كل العروض
          </a>
        </div>
      </div>
    );
  }

  // تجهيز رابط الواتساب
  const waText = `السلام عليكم، بخصوص العرض: ${item.title} (${item.neighborhood}) - الكود: ${id}`;
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const waLink = buildWhatsAppLink({ phone, text: waText });

  return (
    <div className="container" style={{ padding: '30px 20px 80px' }}>
      
      {/* رأس الصفحة وزر الرجوع */}
      <div style={{ marginBottom: 20 }}>
        <a href="/listings" className="muted" style={{ fontSize: 14 }}>← العودة للعروض</a>
      </div>

      <div className="listingGrid">
        
        {/* القسم الأيمن: تفاصيل العقار */}
        <div className="mainContent">
          <div className="card">
            
            {/* العنوان والحالة */}
            <div className="headerRow">
              <h1 className="title">{item.title}</h1>
              <div className="badges">
                {statusBadge(item.status)}
                {item.propertyType && <span className="badge">{item.propertyType}</span>}
              </div>
            </div>

            {/* السعر */}
            <div className="priceBox">
              <span className="muted label">السعر المطلوب</span>
              <div className="price">{formatPriceSAR(item.price)}</div>
            </div>

            {/* المواصفات السريعة */}
            <div className="specsGrid">
              <div className="specItem">
                <span className="muted label">الحي</span>
                <span className="val">{item.neighborhood || '—'}</span>
              </div>
              <div className="specItem">
                <span className="muted label">المساحة</span>
                <span className="val">{item.area ? `${item.area} م²` : '—'}</span>
              </div>
              <div className="specItem">
                <span className="muted label">نوع الصفقة</span>
                <span className="val">
                  {item.dealType === 'sale' ? 'بيع' : item.dealType === 'rent' ? 'إيجار' : item.dealType}
                </span>
              </div>
              <div className="specItem">
                <span className="muted label">المخطط / الجزء</span>
                <span className="val">
                  {[item.plan, item.part].filter(Boolean).join(' / ') || '—'}
                </span>
              </div>
            </div>

            <hr className="divider" />

            {/* الوصف */}
            <div className="description">
              <h3>التفاصيل</h3>
              <p>{item.description || 'لا يوجد وصف إضافي.'}</p>
            </div>

            {/* أزرار التواصل */}
            <div className="actionBtns">
              <a href={waLink} target="_blank" rel="noreferrer" className="btnPrimary fullWidth">
                تواصل واتساب
              </a>
              <a href={`tel:${phone}`} className="btn fullWidth">
                اتصال هاتفي
              </a>
            </div>

          </div>
        </div>

        {/* القسم الأيسر: الصور */}
        <div className="mediaContent">
          <div className="card imageCard">
            {item.images && item.images.length > 0 ? (
              <div className="gallery">
                {item.images.map((img, idx) => (
                  <div key={idx} className="imgWrapper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`${item.title} - ${idx + 1}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="noImg">
                <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
                <div className="muted">لا توجد صور لهذا العرض</div>
              </div>
            )}
          </div>
        </div>

      </div>

      <style jsx>{`
        .listingGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 900px) {
          .listingGrid {
            grid-template-columns: 1fr 1.2fr; /* الصور تأخذ مساحة أكبر */
            align-items: start;
          }
          /* نعكس الترتيب في الديسك توب عشان الصور تكون يسار والتفاصيل يمين */
          .mainContent { order: 1; }
          .mediaContent { order: 2; }
        }

        .headerRow {
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: 900;
          margin: 0 0 10px 0;
          line-height: 1.3;
        }
        .badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .priceBox {
          background: rgba(214,179,91,0.08);
          border: 1px solid rgba(214,179,91,0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .price {
          font-size: 28px;
          font-weight: 950;
          color: var(--gold);
        }

        .specsGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .specItem {
          display: flex;
          flex-direction: column;
        }
        .val {
          font-weight: 700;
          font-size: 16px;
        }
        .label {
          font-size: 12px;
          margin-bottom: 4px;
        }

        .divider {
          border: 0;
          border-top: 1px solid var(--border);
          margin: 20px 0;
        }

        .description h3 {
          font-size: 18px;
          margin-bottom: 10px;
        }
        .description p {
          line-height: 1.8;
          color: rgba(244,246,251,0.85);
          white-space: pre-line; /* يحافظ على الأسطر الجديدة */
        }

        .actionBtns {
          display: flex;
          gap: 10px;
          margin-top: 30px;
        }
        .fullWidth {
          flex: 1;
          text-align: center;
          justify-content: center;
        }

        /* معرض الصور */
        .imageCard {
          padding: 10px;
          overflow: hidden;
        }
        .gallery {
          display: grid;
          gap: 10px;
          grid-template-columns: 1fr;
        }
        .imgWrapper {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          aspect-ratio: 16/10;
        }
        .imgWrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .noImg {
          aspect-ratio: 16/10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
