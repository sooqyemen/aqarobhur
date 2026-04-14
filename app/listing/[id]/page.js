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
  isFiniteCoord,
  normalizeStatusLabel
} from '@/lib/listingUtils';

import HeroSection from '@/components/HeroSection';
import ImageGallery from '@/components/ImageGallery';

// دمج الصور والفيديوهات (إذا كان لديك حقل videos)
function getAllMedia(item) {
  const images = Array.isArray(item?.images) ? item.images.filter(Boolean) : [];
  const videos = Array.isArray(item?.videos) ? item.videos.filter(Boolean) : [];
  return [...images, ...videos];
}

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

  const media = useMemo(() => getAllMedia(item), [item]);
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

  if (loading) return <div className="container stateContainer">جاري تحميل الإعلان...</div>;
  if (error) return <div className="container stateContainer">{error}</div>;
  if (!item) return <div className="container stateContainer">العرض غير موجود.</div>;

  const hasMapCoordinates = isFiniteCoord(item.lat) && isFiniteCoord(item.lng);

  return (
    <div className="container listingPageWrap">
      <style jsx>{`
        /* الأساسيات */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
          width: 100%;
          box-sizing: border-box;
        }
        .listingPageWrap {
          padding: 20px 0;
        }
        .stateContainer {
          padding: 50px 20px;
          text-align: center;
          font-size: 18px;
        }
        .topNavRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .backLink, .shareBtn {
          padding: 10px 20px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 12px;
          font-weight: 700;
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }
        .backLink:hover, .shareBtn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .shareMsg {
          background: #e6f7e6;
          color: var(--success);
          padding: 10px;
          border-radius: 12px;
          margin-bottom: 16px;
          text-align: center;
          font-weight: 600;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr);
          gap: 24px;
          align-items: start;
        }

        .mainCol, .sideCol {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .sectionCard {
          background: var(--card);
          padding: 24px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }

        .sectionHeading {
          font-size: 22px;
          font-weight: 900;
          margin: 0 0 20px 0;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .descriptionText {
          white-space: pre-wrap;
          line-height: 1.9;
          color: var(--text);
          font-size: 16px;
          word-break: break-word;
        }

        .customDetailsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }

        .detailItem {
          background: var(--bg-soft);
          padding: 16px;
          border-radius: 14px;
          border: 1px solid var(--border);
        }
        .detailLabel {
          display: block;
          font-size: 13px;
          color: var(--muted);
          font-weight: 700;
          margin-bottom: 6px;
        }
        .detailValue {
          display: block;
          font-size: 18px;
          font-weight: 900;
          color: var(--text);
        }

        .whatsappBigBtn {
          display: flex;
          width: 100%;
          background: #25D366;
          color: #fff;
          font-size: 18px;
          border: none;
          padding: 16px;
          border-radius: 16px;
          font-weight: 700;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          margin-top: 20px;
          transition: 0.2s;
        }
        .whatsappBigBtn:hover {
          background: #1da851;
        }

        .mapContainer {
          width: 100%;
          height: 350px;
          border-radius: 16px;
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
          border-radius: 16px;
          border: 1px dashed var(--border-strong);
          color: var(--muted);
          font-weight: 600;
        }

        .stickyMap {
          position: sticky;
          top: 100px;
        }

        /* استجابة الجوال */
        @media (max-width: 900px) {
          .contentGrid {
            grid-template-columns: 1fr;
          }
          .stickyMap {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .listingPageWrap {
            padding: 10px 0;
          }
          .topNavRow {
            flex-wrap: wrap;
          }
          .backLink, .shareBtn {
            flex: 1 1 40%;
            padding: 12px 10px;
            font-size: 14px;
            text-align: center;
          }
          .sectionCard {
            padding: 16px;
            border-radius: 18px;
          }
          .sectionHeading {
            font-size: 18px;
            margin-bottom: 16px;
          }
          .customDetailsGrid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .detailItem {
            padding: 12px;
          }
          .detailValue {
            font-size: 16px;
          }
          .whatsappBigBtn {
            font-size: 16px;
            padding: 14px;
          }
          .mapContainer {
            height: 250px;
          }
          .descriptionText {
            font-size: 15px;
          }
        }

        /* معالجة تجاوز النصوص */
        * {
          word-break: break-word;
          overflow-wrap: break-word;
        }
        img, video {
          max-width: 100%;
          height: auto;
        }
      `}</style>

      <div className="topNavRow">
        <Link href="/listings" className="backLink">
          &rarr; العودة للعروض
        </Link>
        <button onClick={handleShare} className="shareBtn">
          مشاركة الإعلان
        </button>
      </div>

      {shareMsg && <div className="shareMsg">{shareMsg}</div>}

      <HeroSection item={item} whatsappHref={whatsappHref} />

      <div className="contentGrid">
        <div className="mainCol">
          <div className="sectionCard">
            <h2 className="sectionHeading">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--primary)'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              أهم التفاصيل
            </h2>

            <div className="customDetailsGrid">
              <div className="detailItem">
                <span className="detailLabel">حالة العرض</span>
                <span className="detailValue" style={{color: 'var(--success)'}}>{normalizeStatusLabel(item)}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">السعر</span>
                <span className="detailValue">{formatPriceSAR(item.price)}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">نوع العقار</span>
                <span className="detailValue">{item.propertyType}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">المساحة</span>
                <span className="detailValue">{item.area ? `${item.area} م²` : 'غير محدد'}</span>
              </div>
              {item.streetWidth && (
                <div className="detailItem">
                  <span className="detailLabel">عرض الشارع</span>
                  <span className="detailValue">{item.streetWidth} متر</span>
                </div>
              )}
              {item.licenseNumber && (
                <div className="detailItem">
                  <span className="detailLabel">رقم الترخيص</span>
                  <span className="detailValue">{item.licenseNumber}</span>
                </div>
              )}
            </div>

            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="whatsappBigBtn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              تواصل للاستفسار عبر واتساب
            </a>
          </div>

          <div className="sectionCard">
            <h2 className="sectionHeading">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--primary)'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              وصف العقار
            </h2>
            <div className="descriptionText">
              {item.description || 'لا يوجد وصف مضاف لهذا الإعلان.'}
            </div>
          </div>

          {/* معرض الصور والفيديوهات */}
          <ImageGallery images={media} title={item.title} />
        </div>

        <div className="sideCol">
          <div className={`sectionCard ${hasMapCoordinates ? 'stickyMap' : ''}`}>
            <h2 className="sectionHeading">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--primary)'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              موقع العقار
            </h2>

            {hasMapCoordinates ? (
              <>
                <div className="mapContainer">
                  <iframe
                    title="موقع العقار"
                    src={`https://maps.google.com/maps?q=${item.lat},${item.lng}&hl=ar&z=15&output=embed`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsappBigBtn"
                  style={{ background: 'var(--primary)', marginTop: '16px' }}
                >
                  فتح في خرائط جوجل
                </a>
              </>
            ) : (
              <div className="noMapData">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin: '0 auto 10px', opacity: 0.5}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><line x1="9" y1="10" x2="15" y2="10"></line><line x1="12" y1="7" x2="12" y2="13"></line></svg>
                <p>الإحداثيات غير متوفرة لهذا العرض</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
