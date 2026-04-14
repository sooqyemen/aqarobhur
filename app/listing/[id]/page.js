'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR } from '@/lib/format';
import {
  getSafeImages,
  normalizePhoneDigits,
  normalizeDealTypeLabel,
  isFiniteCoord
} from '@/lib/listingUtils';

import HeroSection from '@/components/HeroSection';
import ImageGallery from '@/components/ImageGallery';
import ListingDetails from '@/components/ListingDetails';

export default function ListingDetailsPage({ params }) {
  const routeParams = useParams();
  const rawId = params?.id ?? routeParams?.id;

  const id = useMemo(() => {
    try {
      return rawId ? decodeURIComponent(String(rawId)) : '';
    } catch {
      return rawId ? String(rawId) : '';
    }
  }, [rawId]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    let live = true;
    if (!id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const data = await fetchListingById(id);
        if (live) setItem(data || null);
      } catch (e) {
        if (live) setError('تعذر تحميل العرض حالياً.');
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => { live = false; };
  }, [id]);

  const images = useMemo(() => getSafeImages(item), [item]);
  const dealTypeLabel = useMemo(() => normalizeDealTypeLabel(item?.dealType), [item]);

  const contactPhone = useMemo(() => {
    const directPhone = item?.phone || item?.contactPhone || item?.mobile || item?.whatsapp || '';
    return normalizePhoneDigits(directPhone || '966597520693');
  }, [item]);

  const whatsappHref = useMemo(() => {
    if (!item) return '';
    const text = [
      'السلام عليكم، أرغب في الاستفسار عن هذا العرض:',
      item.title || 'عرض عقاري',
      `السعر: ${formatPriceSAR(item.price)}`,
      `الحي: ${item.neighborhood || '—'}`,
      item.licenseNumber ? `رقم الترخيص: ${item.licenseNumber}` : '',
      typeof window !== 'undefined' ? `الرابط: ${window.location.href}` : '',
    ].filter(Boolean).join('\n');

    return buildWhatsAppLink({ phone: contactPhone, text });
  }, [item, contactPhone]);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      await navigator.share({ title: item?.title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setShareMsg('تم نسخ الرابط بنجاح.');
      setTimeout(() => setShareMsg(''), 2500);
    }
  };

  if (loading) return <div className="container" style={{padding: '50px', textAlign: 'center'}}>جاري تحميل الإعلان...</div>;
  if (error) return <div className="container" style={{padding: '50px', textAlign: 'center'}}>{error}</div>;
  if (!item) return <div className="container" style={{padding: '50px', textAlign: 'center'}}>العرض غير موجود.</div>;

  // التحقق من وجود إحداثيات صحيحة لعرض الخريطة
  const hasMapCoordinates = isFiniteCoord(item.lat) && isFiniteCoord(item.lng);

  return (
    <div className="container listingPageWrap">
      <style jsx>{`
        .listingPageWrap { padding: 20px 0; }
        .topNavRow { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .backLink { 
          padding: 10px 20px; 
          background: #fff; 
          border: 1px solid var(--border); 
          border-radius: 12px; 
          font-weight: 800; 
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s;
        }
        .backLink:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        
        .contentGrid { 
          display: grid; 
          grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr); 
          gap: 24px; 
          align-items: start;
        }
        
        .mainCol { display: flex; flex-direction: column; gap: 20px; }
        .sideCol { display: flex; flex-direction: column; gap: 20px; }
        
        .sectionCard {
          background: var(--card);
          padding: 24px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }
        
        .sectionHeading {
          font-size: 20px;
          font-weight: 900;
          margin: 0 0 16px 0;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .descriptionText {
          white-space: pre-wrap;
          line-height: 1.9;
          color: var(--text);
          font-size: 16px;
        }

        .mapContainer {
          width: 100%;
          height: 350px;
          border-radius: 12px;
          overflow: hidden;
          background: #f1f5f9;
          border: 1px solid var(--border);
        }
        
        .mapContainer iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .noMapData {
          padding: 40px 20px;
          text-align: center;
          background: var(--bg-soft);
          border-radius: 12px;
          border: 1px dashed var(--border-strong);
          color: var(--muted);
          font-weight: 600;
        }

        @media (max-width: 900px) { 
          .contentGrid { grid-template-columns: 1fr; } 
        }
      `}</style>

      {/* 1. أزرار التنقل العلوية */}
      <div className="topNavRow">
        <Link href="/listings" className="backLink">
          &rarr; العودة للعروض
        </Link>
        <button onClick={handleShare} className="backLink">
          مشاركة الإعلان
        </button>
      </div>
      
      {shareMsg && (
        <div style={{textAlign: 'center', color: 'var(--success)', marginBottom: '15px', fontWeight: 'bold'}}>
          {shareMsg}
        </div>
      )}

      {/* 2. قسم الترويسة الرئيسي (العنوان، السعر، الأزرار) */}
      <HeroSection item={item} whatsappHref={whatsappHref} />

      {/* 3. شبكة المحتوى (عمودين في الديسكتوب، عمود في الجوال) */}
      <div className="contentGrid">
        
        {/* العمود الأيمن (الرئيسي): التفاصيل ثم الوصف ثم الصور */}
        <div className="mainCol">
          
          {/* التعديل الأول: تفاصيل الإعلان في الأعلى */}
          <ListingDetails item={item} listingId={id} />

          {/* الوصف */}
          <div className="sectionCard">
            <h2 className="sectionHeading">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              وصف العقار
            </h2>
            <div className="descriptionText">
              {item.description || 'لا يوجد وصف مضاف لهذا الإعلان.'}
            </div>
          </div>

          {/* معرض الصور تم نقله للأسفل */}
          <ImageGallery images={images} title={item.title} />

        </div>

        {/* العمود الأيسر (الجانبي): الخريطة ومعلومات إضافية */}
        <div className="sideCol">
          
          {/* التعديل الثاني: عرض الخريطة بدلاً من الملخص */}
          <div className="sectionCard" style={{position: 'sticky', top: '100px'}}>
            <h2 className="sectionHeading">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              موقع العقار
            </h2>
            
            {hasMapCoordinates ? (
              <div className="mapContainer">
                <iframe
                  title="موقع العقار"
                  src={`https://maps.google.com/maps?q=${item.lat},${item.lng}&hl=ar&z=15&output=embed`}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            ) : (
              <div className="noMapData">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin: '0 auto 10px', opacity: 0.5}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><line x1="9" y1="10" x2="15" y2="10"></line><line x1="12" y1="7" x2="12" y2="13"></line></svg>
                <p>الإحداثيات غير متوفرة لهذا العرض</p>
              </div>
            )}
            
            {hasMapCoordinates && (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btnPrimary"
                style={{width: '100%', marginTop: '15px'}}
              >
                فتح في خرائط جوجل
              </a>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
