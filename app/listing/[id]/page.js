'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { fetchListingById, getListingMedia } from '@/lib/listings';
import { formatPrice } from '@/lib/format';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';

// مكون صورة احتياطية في حال فشل التحميل
const FallbackImage = () => (
  <div className="fallback-image">
    <span className="material-icons-outlined">photo_camera</span>
    <p>لا توجد صورة</p>
  </div>
);

export default function ListingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [listing, setListing] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchListingById(id);
        if (!data) {
          setError('هذا الإعلان غير موجود أو تم حذفه.');
        } else {
          setListing(data);
          const images = await getListingMedia(id);
          setMedia(images);
        }
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء جلب تفاصيل الإعلان.');
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
    <div className="loading-state container">
      <div className="spinner"></div>
      <p>جاري تحميل تفاصيل العقار...</p>
    </div>
  );

  if (error || !listing) return (
    <div className="error-state container">
      <span className="material-icons-outlined error-icon">sentiment_dissatisfied</span>
      <h2>عذراً!</h2>
      <p>{error}</p>
      <button onClick={() => router.back()} className="btn-back">العودة للسابق</button>
    </div>
  );

  const isSale = listing.dealType === 'sale' || listing.dealType === 'للبيع';
  const priceLabel = isSale ? 'سعر البيع' : 'الإيجار السنوي';
  
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const whatsappMsg = `السلام عليكم، بخصوص إعلان (${listing.title || 'العقار'}) المعروض في منصة عقار أبحر رقم الإعلان: ${id}، هل ما زال متاحاً؟`;
  const contactLink = buildWhatsAppLink({ phone: whatsappNumber, text: whatsappMsg });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `عقار أبحر | ${listing.title}`,
          text: `شاهد هذا العقار المميز في ${listing.neighborhood || 'أبحر'}`,
          url: window.location.href,
        });
      } catch (err) { console.log('Share canceled', err); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ رابط الإعلان!');
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <div className="listing-page-wrapper">
        <div className="container">
          
          {/* مسار التصفح (Breadcrumb) */}
          <div className="breadcrumb">
            <Link href="/">الرئيسية</Link>
            <span className="separator">/</span>
            <Link href="/listings">العقارات</Link>
            <span className="separator">/</span>
            <span className="current">{listing.dealType === 'sale' ? 'للبيع' : 'للإيجار'}</span>
          </div>

          <div className="listing-header">
            <div className="title-area">
              <span className="badge-deal">{listing.dealType === 'sale' ? 'للبيع' : 'للإيجار'}</span>
              <h1 className="title">{listing.title || `${listing.propertyType || 'عقار'} في ${listing.neighborhood || 'أبحر'}`}</h1>
              <div className="location-info">
                <span className="material-icons-outlined">location_on</span>
                {listing.neighborhood || 'غير محدد الحي'} {listing.city ? `، ${listing.city}` : ''}
              </div>
            </div>
            <div className="price-area-mobile">
              <span className="price-label">{priceLabel}</span>
              <span className="price-value">{formatPrice(listing.price)} <sub>ريال</sub></span>
            </div>
          </div>

          <div className="listing-content-grid">
            
            {/* القسم الأيمن (الصور والتفاصيل) */}
            <div className="main-content">
              
              {/* معرض الصور */}
              <div className="gallery-section">
                <div className="main-image-container">
                  {imagesList.length > 0 ? (
                    <Image 
                      src={imagesList[activeImageIndex]} 
                      alt={listing.title || 'صورة العقار'} 
                      fill 
                      className="main-image"
                      unoptimized
                    />
                  ) : (
                    <FallbackImage />
                  )}
                  {imagesList.length > 1 && (
                    <div className="image-counter">
                      <span className="material-icons-outlined">photo_library</span>
                      {activeImageIndex + 1} / {imagesList.length}
                    </div>
                  )}
                </div>
                
                {imagesList.length > 1 && (
                  <div className="thumbnails-container">
                    {imagesList.map((img, idx) => (
                      <div 
                        key={idx} 
                        className={`thumbnail ${idx === activeImageIndex ? 'active' : ''}`}
                        onClick={() => setActiveImageIndex(idx)}
                      >
                        <Image src={img} alt={`Thumbnail ${idx}`} fill unoptimized className="thumb-img" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* أزرار الإجراءات السريعة (مشاركة، طباعة) */}
              <div className="action-bar">
                <button className="action-btn" onClick={handleShare}>
                  <span className="material-icons-outlined">ios_share</span>
                  مشاركة الإعلان
                </button>
                <button className="action-btn" onClick={() => window.print()}>
                  <span className="material-icons-outlined">print</span>
                  طباعة التفاصيل
                </button>
              </div>

              {/* التفاصيل الأساسية (مربعات) */}
              <div className="details-card">
                <h2>التفاصيل الأساسية</h2>
                <div className="features-grid">
                  {listing.area && (
                    <div className="feature-item">
                      <span className="material-icons-outlined">straighten</span>
                      <div className="f-text">
                        <span>المساحة</span>
                        <strong>{listing.area} م²</strong>
                      </div>
                    </div>
                  )}
                  {listing.rooms && (
                    <div className="feature-item">
                      <span className="material-icons-outlined">bed</span>
                      <div className="f-text">
                        <span>الغرف</span>
                        <strong>{listing.rooms}</strong>
                      </div>
                    </div>
                  )}
                  {listing.bathrooms && (
                    <div className="feature-item">
                      <span className="material-icons-outlined">bathtub</span>
                      <div className="f-text">
                        <span>دورات المياه</span>
                        <strong>{listing.bathrooms}</strong>
                      </div>
                    </div>
                  )}
                  {listing.age && (
                    <div className="feature-item">
                      <span className="material-icons-outlined">event</span>
                      <div className="f-text">
                        <span>عمر العقار</span>
                        <strong>{listing.age} سنة</strong>
                      </div>
                    </div>
                  )}
                  {listing.propertyType && (
                    <div className="feature-item">
                      <span className="material-icons-outlined">home_work</span>
                      <div className="f-text">
                        <span>النوع</span>
                        <strong>{listing.propertyType}</strong>
                      </div>
                    </div>
                  )}
                  {listing.streetWidth && (
                    <div className="feature-item">
                      <span className="material-icons-outlined">add_road</span>
                      <div className="f-text">
                        <span>عرض الشارع</span>
                        <strong>{listing.streetWidth} م</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* وصف العقار */}
              {listing.description && (
                <div className="details-card">
                  <h2>وصف العقار</h2>
                  <div className="description-text">
                    {listing.description.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* القسم الأيسر (بطاقة السعر والتواصل الاستيكي) */}
            <div className="sidebar">
              <div className="sticky-card">
                <div className="price-header">
                  <span className="p-label">{priceLabel}</span>
                  <div className="p-amount">
                    {formatPrice(listing.price)} <span className="currency">ريال</span>
                  </div>
                </div>

                <div className="advertiser-info">
                  <div className="adv-avatar">
                    <span className="material-icons-outlined">real_estate_agent</span>
                  </div>
                  <div className="adv-details">
                    <span className="adv-title">المُعلن</span>
                    <strong className="adv-name">مؤسسة عقار أبحر</strong>
                    <span className="adv-license">رقم ترخيص فال: 1200000000</span>
                  </div>
                </div>

                <div className="contact-actions">
                  <a href={contactLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.5 3.47 1.44 4.96L2 22l5.3-1.53c1.46.88 3.13 1.34 4.82 1.34 5.46 0 9.91-4.45 9.91-9.91 0-5.45-4.45-9.9-9.91-9.9zm0 18.18c-1.5 0-2.97-.44-4.22-1.27l-.3-.18-3.16.96.96-3.1-.2-.31a7.9 7.9 0 0 1-1.35-4.37c0-4.37 3.56-7.93 7.93-7.93 4.37 0 7.93 3.56 7.93 7.93 0 4.37-3.56 7.93-7.93 7.93zm4.09-5.86c-.22-.11-1.31-.65-1.51-.72-.2-.07-.35-.11-.5.11-.15.22-.58.72-.71.87-.13.15-.26.17-.48.06-.22-.11-.93-.34-1.77-1.09-.66-.59-1.1-1.32-1.23-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.21-.69-1.66-.18-.44-.36-.38-.5-.38h-.43c-.15 0-.39.06-.6.28-.22.22-.83.81-.83 1.98 0 1.17.85 2.3.97 2.46.12.16 1.67 2.55 4.04 3.58.57.24 1.01.38 1.36.49.57.18 1.09.15 1.5.09.46-.07 1.31-.54 1.49-1.06.18-.52.18-.97.13-1.06-.05-.09-.19-.15-.41-.26z"/>
                    </svg>
                    تواصل عبر واتساب
                  </a>
                  <a href={`tel:${whatsappNumber}`} className="btn-call">
                    <span className="material-icons-outlined">call</span>
                    اتصال هاتفي
                  </a>
                </div>

                <div className="meta-info">
                  <span>رقم الإعلان: #{id.substring(0, 6)}</span>
                  {listing.createdAt && (
                    <span>تاريخ النشر: {new Date(listing.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('ar-SA')}</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        .listing-page-wrapper { background: #f8fafc; min-height: 100vh; padding: 20px 0 60px; font-family: inherit; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 15px; }
        
        /* Breadcrumb */
        .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; margin-bottom: 20px; }
        .breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 600; }
        .breadcrumb .separator { color: #cbd5e1; }
        .breadcrumb .current { color: #94a3b8; }

        /* Header */
        .listing-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; background: white; padding: 20px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
        .title-area { display: flex; flex-direction: column; gap: 8px; }
        .badge-deal { align-self: flex-start; background: #e0f2fe; color: #0284c7; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; }
        .title { margin: 0; font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.3; }
        .location-info { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 15px; font-weight: 500; }
        .location-info .material-icons-outlined { font-size: 18px; color: var(--primary); }
        
        .price-area-mobile { display: none; } /* يظهر في الجوال فقط */

        /* Grid Layout */
        .listing-content-grid { display: grid; grid-template-columns: 1fr 380px; gap: 25px; align-items: start; }

        /* Gallery */
        .gallery-section { background: white; border-radius: 16px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); padding: 10px; }
        .main-image-container { position: relative; width: 100%; height: 450px; border-radius: 12px; overflow: hidden; background: #f1f5f9; }
        .main-image { object-fit: cover; transition: transform 0.3s ease; }
        .fallback-image { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; gap: 10px; }
        .fallback-image .material-icons-outlined { font-size: 48px; opacity: 0.5; }
        .image-counter { position: absolute; bottom: 15px; right: 15px; background: rgba(0,0,0,0.7); color: white; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(4px); }
        .image-counter .material-icons-outlined { font-size: 16px; }
        
        .thumbnails-container { display: flex; gap: 10px; margin-top: 10px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .thumbnails-container::-webkit-scrollbar { display: none; }
        .thumbnail { position: relative; width: 100px; height: 75px; border-radius: 8px; overflow: hidden; cursor: pointer; opacity: 0.6; transition: all 0.2s; border: 2px solid transparent; flex-shrink: 0; }
        .thumbnail.active { opacity: 1; border-color: var(--primary); box-shadow: 0 2px 8px rgba(15, 118, 110, 0.3); }
        .thumb-img { object-fit: cover; }

        /* Action Bar */
        .action-bar { display: flex; gap: 15px; margin-bottom: 20px; }
        .action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background: white; border: 1px solid #e2e8f0; padding: 12px; border-radius: 12px; color: #475569; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
        .action-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: var(--primary); }
        .action-btn .material-icons-outlined { font-size: 20px; }

        /* Details Cards */
        .details-card { background: white; border-radius: 16px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
        .details-card h2 { margin: 0 0 20px 0; font-size: 18px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 10px; }
        .details-card h2::before { content: ''; display: block; width: 4px; height: 20px; background: var(--primary); border-radius: 4px; }
        
        .features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
        .feature-item { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #f1f5f9; }
        .feature-item .material-icons-outlined { font-size: 24px; color: var(--primary); background: white; padding: 8px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
        .f-text { display: flex; flex-direction: column; gap: 2px; }
        .f-text span { font-size: 12px; color: #64748b; font-weight: 600; }
        .f-text strong { font-size: 15px; color: #0f172a; font-weight: 800; }

        .description-text { font-size: 15px; line-height: 1.8; color: #475569; font-weight: 500; }
        .description-text p { margin-bottom: 10px; }

        /* Sidebar (Sticky Card) */
        .sidebar { position: relative; }
        .sticky-card { position: sticky; top: 100px; background: white; border-radius: 16px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
        
        .price-header { display: flex; flex-direction: column; gap: 5px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
        .p-label { font-size: 14px; color: #64748b; font-weight: 700; }
        .p-amount { font-size: 32px; font-weight: 900; color: var(--primary-dark); line-height: 1; }
        .p-amount .currency { font-size: 18px; color: #64748b; font-weight: 700; margin-right: 5px; }

        .advertiser-info { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
        .adv-avatar { width: 50px; height: 50px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary); }
        .adv-avatar .material-icons-outlined { font-size: 26px; }
        .adv-details { display: flex; flex-direction: column; }
        .adv-title { font-size: 12px; color: #94a3b8; font-weight: 600; }
        .adv-name { font-size: 16px; font-weight: 800; color: #0f172a; }
        .adv-license { font-size: 12px; color: #64748b; margin-top: 2px; }

        .contact-actions { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .btn-whatsapp { display: flex; align-items: center; justify-content: center; gap: 10px; background: #25d366; color: white; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 800; text-decoration: none; transition: background 0.2s; box-shadow: 0 4px 15px rgba(37,211,102,0.2); }
        .btn-whatsapp:hover { background: #1ebc59; transform: translateY(-2px); }
        .btn-call { display: flex; align-items: center; justify-content: center; gap: 10px; background: white; color: var(--primary); border: 2px solid var(--primary); padding: 12px; border-radius: 12px; font-size: 16px; font-weight: 800; text-decoration: none; transition: all 0.2s; }
        .btn-call:hover { background: var(--bg-soft); }

        .meta-info { display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: #94a3b8; font-weight: 600; text-align: center; background: #f8fafc; padding: 15px; border-radius: 10px; }

        /* Loading & Error States */
        .loading-state, .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center; color: #64748b; }
        .spinner { width: 50px; height: 50px; border: 4px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-icon { font-size: 64px; color: #cbd5e1; margin-bottom: 15px; }
        .btn-back { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; margin-top: 15px; cursor: pointer; }

        /* Responsive Design */
        @media (max-width: 992px) {
          .listing-content-grid { grid-template-columns: 1fr; }
          .sidebar { order: -1; } /* وضع بطاقة السعر في الأعلى في الجوال */
          .sticky-card { position: relative; top: 0; margin-bottom: 20px; border-radius: 16px; }
          
          /* إخفاء السعر من الهيدر إذا كان معروضاً في البطاقة العلوية */
          .listing-header { flex-direction: column; gap: 15px; }
        }
        
        @media (max-width: 600px) {
          .main-image-container { height: 300px; }
          .title { font-size: 20px; }
          .features-grid { grid-template-columns: 1fr 1fr; }
          .action-bar { flex-direction: column; }
        }
      `}</style>
    </>
  );
}
