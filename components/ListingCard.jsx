'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatPriceSAR, statusBadge } from '@/lib/format';

export default function ListingCard({ item, compact = false }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!item) return null;

  // استخراج البيانات الأساسية
  const {
    id,
    title = 'عرض عقاري',
    price,
    neighborhood = '',
    plan = '',
    part = '',
    area,
    dealType,
    propertyType,
    status = 'available',
    images = [],
    direct = false,
    description = '',
    lat,
    lng
  } = item;

  // معالجة الصور
  const mainImage = images?.[0] || '/placeholder-image.jpg';
  const hasMultipleImages = images?.length > 1;
  const displayPrice = formatPriceSAR(price);
  const isRent = dealType === 'rent';

  // توليد رابط التفاصيل
  const detailLink = `/listings/${id || 'unknown'}`;

  // توليد نص الواتساب
  const whatsappText = `السلام عليكم، أريد استفسار عن العرض:
${title}
الحي: ${neighborhood || '—'}
المخطط: ${plan || '—'}
الجزء: ${part || '—'}
السعر: ${displayPrice}`;

  // رابط الواتساب
  const whatsappHref = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693'}?text=${encodeURIComponent(whatsappText)}`;

  // نسخة مدمجة للعرض
  if (compact) {
    return (
      <Link href={detailLink} className="listingCard compact" aria-label={`عرض ${title} في ${neighborhood}`}>
        <div className="cardImageContainer">
          <div 
            className="cardImage"
            style={{ backgroundImage: `url(${mainImage})` }}
            role="img"
            aria-label={`صورة ${title}`}
          />
          {hasMultipleImages && (
            <div className="imageCountBadge">
              <span className="imageCount">+{images.length}</span>
            </div>
          )}
          <div className="imageOverlay" />
          <div className="cardStatus">
            {statusBadge(status)}
          </div>
        </div>

        <div className="cardContent">
          <div className="cardHeader">
            <h3 className="cardTitle" title={title}>
              {title}
            </h3>
            <div className="cardPrice">
              {displayPrice}
              {isRent && <span className="rentPeriod">/شهرياً</span>}
            </div>
          </div>

          <div className="cardLocation">
            <span className="locationText">
              {[neighborhood, plan, part].filter(Boolean).join(' • ') || 'موقع غير محدد'}
            </span>
          </div>

          <div className="cardFeatures">
            {area && <span className="featureBadge">{area} م²</span>}
            {propertyType && <span className="featureBadge">{propertyType}</span>}
            {direct && <span className="featureBadge direct">مباشر</span>}
          </div>
        </div>

        <style jsx>{`
          .listingCard.compact {
            display: block;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            text-decoration: none;
            color: var(--text);
            transition: all 0.25s ease;
            box-shadow: var(--shadow);
            height: 100%;
          }

          .listingCard.compact:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
            border-color: var(--primary);
          }

          .cardImageContainer {
            position: relative;
            width: 100%;
            height: 180px;
            overflow: hidden;
          }

          .cardImage {
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center;
            transition: transform 0.5s ease;
          }

          .listingCard.compact:hover .cardImage {
            transform: scale(1.05);
          }

          .imageOverlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%);
          }

          .imageCountBadge {
            position: absolute;
            top: 12px;
            left: 12px;
            background: rgba(0,0,0,0.7);
            color: white;
            border-radius: 20px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 700;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
          }

          .cardStatus {
            position: absolute;
            top: 12px;
            right: 12px;
          }

          .cardContent {
            padding: 16px;
          }

          .cardHeader {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 8px;
          }

          .cardTitle {
            font-size: 15px;
            font-weight: 800;
            margin: 0;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            line-height: 1.3;
          }

          .cardPrice {
            font-size: 16px;
            font-weight: 900;
            color: var(--primary);
            white-space: nowrap;
          }

          .rentPeriod {
            font-size: 10px;
            color: var(--muted);
            margin-right: 4px;
            font-weight: 700;
          }

          .cardLocation {
            margin-bottom: 12px;
          }

          .locationText {
            font-size: 13px;
            color: var(--muted);
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .cardFeatures {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .featureBadge {
            padding: 4px 10px;
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border);
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
          }

          .featureBadge.direct {
            background: rgba(214, 179, 91, 0.1);
            border-color: rgba(214, 179, 91, 0.3);
            color: var(--primary);
          }

          @media (max-width: 768px) {
            .cardImageContainer {
              height: 160px;
            }
            
            .cardContent {
              padding: 14px;
            }
            
            .cardTitle {
              font-size: 14px;
            }
            
            .cardPrice {
              font-size: 15px;
            }
          }
        `}</style>
      </Link>
    );
  }

  // النسخة الكاملة
  return (
    <div className="listingCard full">
      <div className="cardMain">
        <div className="cardImageSection">
          <div 
            className="mainImage"
            style={{ backgroundImage: `url(${mainImage})` }}
            role="img"
            aria-label={`صورة رئيسية لـ ${title}`}
          />
          
          {hasMultipleImages && (
            <div className="imageGalleryPreview">
              <div className="galleryThumbnails">
                {images.slice(0, 3).map((img, index) => (
                  <div 
                    key={index}
                    className="thumbnail"
                    style={{ backgroundImage: `url(${img})` }}
                    role="img"
                    aria-label={`صورة ${index + 1}`}
                  />
                ))}
                {images.length > 3 && (
                  <div className="thumbnail more">
                    <span className="moreText">+{images.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="imageOverlay" />
          <div className="cardStatus">
            {statusBadge(status)}
          </div>
          
          {direct && (
            <div className="directBadge">
              <span className="directIcon">⭐</span>
              <span className="directText">عرض مباشر</span>
            </div>
          )}
        </div>

        <div className="cardInfoSection">
          <div className="infoHeader">
            <div className="titleSection">
              <h3 className="cardTitle" title={title}>
                {title}
              </h3>
              <div className="propertyType">
                {propertyType && (
                  <span className="typeBadge">{propertyType}</span>
                )}
                {isRent ? 'إيجار' : 'بيع'}
              </div>
            </div>
            
            <div className="priceSection">
              <div className="priceDisplay">
                <span className="priceValue">{displayPrice}</span>
                {isRent && <span className="pricePeriod">/شهرياً</span>}
              </div>
              {area && (
                <div className="areaInfo">
                  <span className="areaIcon">📐</span>
                  <span className="areaValue">{area} م²</span>
                </div>
              )}
            </div>
          </div>

          <div className="locationInfo">
            <div className="locationItem">
              <span className="locationIcon">📍</span>
              <span className="locationText" title={neighborhood}>
                {neighborhood || 'حي غير محدد'}
              </span>
            </div>
            {(plan || part) && (
              <div className="locationDetails">
                {plan && <span className="detailItem">{plan}</span>}
                {part && <span className="detailItem">{part}</span>}
              </div>
            )}
          </div>

          {description && (
            <div className="descriptionSection">
              <p className="descriptionText" title={description}>
                {description.length > 120 ? `${description.substring(0, 120)}...` : description}
              </p>
            </div>
          )}

          <div className="cardCoordinates">
            {lat && lng ? (
              <div className="coordinatesItem">
                <span className="coordinatesIcon">🗺️</span>
                <span className="coordinatesText">الإحداثيات: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
            ) : (
              <div className="coordinatesItem muted">
                <span className="coordinatesIcon">🗺️</span>
                <span className="coordinatesText">لا توجد إحداثيات</span>
              </div>
            )}
          </div>

          <div className="cardActions">
            <Link href={detailLink} className="actionButton detailButton">
              <span className="buttonIcon">👁️</span>
              <span className="buttonText">عرض التفاصيل</span>
            </Link>
            
            <a 
              href={whatsappHref} 
              className="actionButton whatsappButton"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="تواصل عبر واتساب"
            >
              <span className="buttonIcon">💬</span>
              <span className="buttonText">تواصل واتساب</span>
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .listingCard.full {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow);
          transition: all 0.3s ease;
        }

        .listingCard.full:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary);
        }

        .cardMain {
          display: flex;
          min-height: 320px;
        }

        /* قسم الصور */
        .cardImageSection {
          flex: 0 0 320px;
          position: relative;
          overflow: hidden;
          background: rgba(0,0,0,0.1);
        }

        .mainImage {
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          transition: transform 0.5s ease;
        }

        .listingCard.full:hover .mainImage {
          transform: scale(1.03);
        }

        .imageOverlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to right, rgba(0,0,0,0.1) 0%, transparent 30%);
        }

        .imageGalleryPreview {
          position: absolute;
          bottom: 16px;
          right: 16px;
          left: 16px;
        }

        .galleryThumbnails {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .thumbnail {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          background-size: cover;
          background-position: center;
          border: 2px solid rgba(255,255,255,0.3);
          backdrop-filter: blur(5px);
          position: relative;
          overflow: hidden;
        }

        .thumbnail.more {
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--primary);
        }

        .moreText {
          color: var(--primary);
          font-weight: 900;
          font-size: 14px;
        }

        .directBadge {
          position: absolute;
          top: 16px;
          left: 16px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          color: #000;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 900;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(214, 179, 91, 0.3);
          border: 1px solid rgba(255,255,255,0.3);
        }

        .directIcon {
          font-size: 14px;
        }

        /* قسم المعلومات */
        .cardInfoSection {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .infoHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          gap: 20px;
        }

        .titleSection {
          flex: 1;
        }

        .cardTitle {
          font-size: 20px;
          font-weight: 900;
          margin: 0 0 8px 0;
          color: var(--text);
          line-height: 1.3;
        }

        .propertyType {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 700;
        }

        .typeBadge {
          background: var(--primary-light);
          color: var(--primary);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          border: 1px solid rgba(214, 179, 91, 0.3);
        }

        .priceSection {
          text-align: left;
          min-width: 150px;
        }

        .priceDisplay {
          margin-bottom: 8px;
        }

        .priceValue {
          font-size: 24px;
          font-weight: 900;
          color: var(--primary);
          display: block;
        }

        .pricePeriod {
          font-size: 12px;
          color: var(--muted);
          font-weight: 700;
        }

        .areaInfo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 700;
        }

        .areaIcon {
          font-size: 16px;
        }

        /* معلومات الموقع */
        .locationInfo {
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
        }

        .locationItem {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .locationIcon {
          font-size: 18px;
          color: var(--primary);
        }

        .locationText {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        .locationDetails {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .detailItem {
          background: rgba(255,255,255,0.05);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid var(--border);
        }

        /* الوصف */
        .descriptionSection {
          margin-bottom: 16px;
          flex: 1;
        }

        .descriptionText {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
        }

        /* الإحداثيات */
        .cardCoordinates {
          margin-bottom: 20px;
        }

        .coordinatesItem {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text);
        }

        .coordinatesItem.muted {
          color: var(--muted);
        }

        .coordinatesIcon {
          font-size: 16px;
        }

        /* أزرار الإجراءات */
        .cardActions {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }

        .actionButton {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .detailButton {
          background: rgba(255,255,255,0.05);
          color: var(--text);
          border-color: var(--border);
        }

        .detailButton:hover {
          background: rgba(255,255,255,0.09);
          border-color: var(--border2);
          transform: translateY(-2px);
        }

        .whatsappButton {
          background: linear-gradient(135deg, #25D366, #128C7E);
          color: white;
          border-color: rgba(37, 211, 102, 0.3);
        }

        .whatsappButton:hover {
          background: linear-gradient(135deg, #1ea952, #0d6d5c);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 211, 102, 0.3);
        }

        .buttonIcon {
          font-size: 16px;
        }

        /* التجاوب مع الشاشات المختلفة */
        @media (max-width: 1024px) {
          .cardMain {
            flex-direction: column;
            min-height: auto;
          }
          
          .cardImageSection {
            flex: 0 0 280px;
          }
          
          .infoHeader {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
          
          .priceSection {
            text-align: right;
          }
        }

        @media (max-width: 768px) {
          .cardImageSection {
            flex: 0 0 240px;
          }
          
          .cardInfoSection {
            padding: 20px;
          }
          
          .cardTitle {
            font-size: 18px;
          }
          
          .priceValue {
            font-size: 22px;
          }
          
          .cardActions {
            flex-direction: column;
          }
          
          .galleryThumbnails {
            justify-content: flex-start;
          }
          
          .thumbnail {
            width: 50px;
            height: 50px;
          }
        }

        @media (max-width: 480px) {
          .cardImageSection {
            flex: 0 0 200px;
          }
          
          .cardInfoSection {
            padding: 16px;
          }
          
          .cardTitle {
            font-size: 16px;
          }
          
          .priceValue {
            font-size: 20px;
          }
          
          .locationText {
            font-size: 14px;
          }
          
          .directBadge {
            top: 12px;
            left: 12px;
            font-size: 11px;
            padding: 5px 10px;
          }
        }

        /* تحسينات للوصول */
        .actionButton:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* تأثيرات التحميل */
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .loading {
          background: linear-gradient(90deg, 
            rgba(255,255,255,0.05) 25%, 
            rgba(255,255,255,0.1) 50%, 
            rgba(255,255,255,0.05) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
