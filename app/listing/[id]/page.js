'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchListingById, getListingMedia } from '@/lib/listings';
import { formatPrice } from '@/lib/format';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';

export default function ListingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [listing, setListing] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchListingById(id);
        if (data) {
          setListing(data);
          const images = await getListingMedia(id);
          setMedia(images);
        }
      } catch (err) {
        console.error("Error loading listing:", err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id]);

  const imagesList = useMemo(() => {
    const list = media.filter(m => m.url).map(m => m.url);
    if (list.length === 0 && listing?.mainImage) list.push(listing.mainImage);
    return list;
  }, [media, listing]);

  if (loading) return (
    <div className="loading-container">
      <div className="loader"></div>
      <p>جاري تحميل العقار...</p>
    </div>
  );

  if (!listing) return (
    <div className="error-container">
      <span className="material-icons-outlined">info</span>
      <h2>العقار غير متوفر</h2>
      <Link href="/listings" className="btn-return">العودة للعروض</Link>
    </div>
  );

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const whatsappMsg = `السلام عليكم، أهلاً منصور.. أستفسر عن عقار: ${listing.title}، رقم الإعلان: ${id}`;
  const contactLink = buildWhatsAppLink({ phone: whatsappNumber, text: whatsappMsg });

  const shareListing = () => {
    if (navigator.share) {
      navigator.share({ title: listing.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ الرابط بنجاح');
    }
  };

  return (
    <div className="page-container">
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <div className="container">
        {/* رأس الصفحة والموقع */}
        <div className="detail-header">
          <div className="header-main">
            <span className="type-badge">{listing.dealType === 'sale' ? 'للبيع' : 'للإيجار'}</span>
            <h1>{listing.title || 'تفاصيل العقار'}</h1>
            <div className="location">
              <span className="material-icons-outlined">location_on</span>
              {listing.neighborhood}، {listing.city || 'جدة'}
            </div>
          </div>
          <div className="header-actions">
            <button onClick={shareListing} className="icon-btn" title="مشاركة">
              <span className="material-icons-outlined">share</span>
            </button>
            <button onClick={() => window.print()} className="icon-btn" title="طباعة">
              <span className="material-icons-outlined">print</span>
            </button>
          </div>
        </div>

        <div className="content-layout">
          {/* القسم الرئيسي: الصور والوصف */}
          <div className="main-block">
            {/* معرض الصور المطور */}
            <div className="gallery-card">
              <div className="main-view">
                {imagesList.length > 0 ? (
                  <Image 
                    src={imagesList[activeImageIndex]} 
                    alt="Property" 
                    fill 
                    className="img-fit"
                    unoptimized 
                  />
                ) : (
                  <div className="no-img">لا توجد صور متوفرة</div>
                )}
              </div>
              <div className="thumbs-rail">
                {imagesList.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={`thumb-box ${idx === activeImageIndex ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                  >
                    <Image src={img} alt="thumb" fill className="img-fit" unoptimized />
                  </div>
                ))}
              </div>
            </div>

            {/* المواصفات الفنية */}
            <div className="info-card">
              <h3>المواصفات الأساسية</h3>
              <div className="specs-grid">
                <div className="spec-item">
                  <span className="material-icons-outlined">straighten</span>
                  <div><span>المساحة</span><strong>{listing.area} م²</strong></div>
                </div>
                <div className="spec-item">
                  <span className="material-icons-outlined">bed</span>
                  <div><span>الغرف</span><strong>{listing.rooms || '--'}</strong></div>
                </div>
                <div className="spec-item">
                  <span className="material-icons-outlined">bathtub</span>
                  <div><span>دورات المياه</span><strong>{listing.bathrooms || '--'}</strong></div>
                </div>
                <div className="spec-item">
                  <span className="material-icons-outlined">home</span>
                  <div><span>النوع</span><strong>{listing.propertyType}</strong></div>
                </div>
              </div>
            </div>

            {/* الوصف المكتوب */}
            <div className="info-card">
              <h3>الوصف والتفاصيل</h3>
              <div className="desc-content">
                {listing.description || 'لا يوجد وصف مضاف لهذا العقار.'}
              </div>
            </div>
          </div>

          {/* الجانب: السعر والتواصل */}
          <aside className="side-block">
            <div className="price-card">
              <div className="price-tag">
                <span className="label">السعر المطلوب</span>
                <span className="val">{formatPrice(listing.price)} <sub>ريال</sub></span>
              </div>
              
              <div className="advertiser-box">
                <div className="avatar">ع</div>
                <div className="adv-info">
                  <strong>عقار أبحر</strong>
                  <span>وسيط عقاري معتمد</span>
                </div>
              </div>

              <div className="cta-buttons">
                <a href={contactLink} target="_blank" className="btn-whatsapp">
                  <span className="material-icons-outlined">chat</span>
                  تواصل عبر الواتساب
                </a>
                <a href={`tel:${whatsappNumber}`} className="btn-call">
                  <span className="material-icons-outlined">call</span>
                  اتصال هاتفي
                </a>
              </div>

              <div className="ad-meta">
                <span>رقم الإعلان: {id.slice(-6).toUpperCase()}</span>
                <span>تاريخ النشر: {new Date().toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .page-container { background: #f4f7f6; min-height: 100vh; padding: 30px 0; color: #1a1a1a; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        
        .detail-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px; }
        .header-main h1 { font-size: 32px; font-weight: 800; margin: 10px 0; color: #0f172a; }
        .type-badge { background: #10b981; color: white; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-weight: 700; }
        .location { display: flex; align-items: center; gap: 5px; color: #64748b; font-weight: 600; }
        .header-actions { display: flex; gap: 10px; }
        .icon-btn { background: white; border: 1px solid #e2e8f0; width: 45px; height: 45px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .icon-btn:hover { background: #f8fafc; color: #10b981; }

        .content-layout { display: grid; grid-template-columns: 1fr 360px; gap: 30px; }

        .gallery-card { background: white; padding: 15px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .main-view { position: relative; width: 100%; height: 500px; border-radius: 15px; overflow: hidden; background: #e2e8f0; }
        .thumbs-rail { display: flex; gap: 10px; margin-top: 15px; overflow-x: auto; padding-bottom: 5px; }
        .thumb-box { position: relative; width: 90px; height: 65px; border-radius: 8px; cursor: pointer; flex-shrink: 0; border: 2px solid transparent; overflow: hidden; opacity: 0.6; }
        .thumb-box.active { border-color: #10b981; opacity: 1; }
        .img-fit { object-fit: cover; }

        .info-card { background: white; padding: 25px; border-radius: 20px; margin-top: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .info-card h3 { font-size: 20px; font-weight: 800; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
        
        .specs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px; }
        .spec-item { display: flex; align-items: center; gap: 12px; }
        .spec-item .material-icons-outlined { font-size: 30px; color: #10b981; }
        .spec-item div span { display: block; font-size: 13px; color: #94a3b8; }
        .spec-item div strong { font-size: 16px; font-weight: 700; }

        .desc-content { line-height: 1.8; color: #475569; white-space: pre-line; }

        .price-card { background: white; padding: 30px; border-radius: 25px; position: sticky; top: 100px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); border: 1px solid #f1f5f9; }
        .price-tag { margin-bottom: 25px; text-align: center; }
        .price-tag .label { display: block; font-size: 14px; color: #64748b; font-weight: 700; }
        .price-tag .val { font-size: 36px; font-weight: 900; color: #0f172a; }
        .price-tag .val sub { font-size: 16px; color: #94a3b8; }

        .advertiser-box { display: flex; align-items: center; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 15px; margin-bottom: 25px; }
        .avatar { width: 45px; height: 45px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; }
        .adv-info strong { display: block; font-size: 15px; }
        .adv-info span { font-size: 12px; color: #64748b; }

        .cta-buttons { display: flex; flex-direction: column; gap: 12px; }
        .btn-whatsapp { background: #25d366; color: white; padding: 16px; border-radius: 15px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 800; transition: 0.3s; }
        .btn-whatsapp:hover { background: #128c7e; transform: translateY(-3px); }
        .btn-call { background: white; border: 2px solid #10b981; color: #10b981; padding: 14px; border-radius: 15px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 800; transition: 0.3s; }
        .btn-call:hover { background: #f0fdf4; }

        .ad-meta { margin-top: 25px; font-size: 12px; color: #cbd5e1; display: flex; justify-content: space-between; font-weight: 600; }

        @media (max-width: 992px) {
          .content-layout { grid-template-columns: 1fr; }
          .side-block { order: -1; }
          .price-card { position: static; margin-bottom: 20px; }
          .main-view { height: 350px; }
        }
      `}</style>
    </div>
  );
}
