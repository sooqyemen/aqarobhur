// components/ImageGallery.jsx
'use client';

import { useState, useRef } from 'react';

export default function ImageGallery({ images, title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  if (!images.length) {
    return <div className="emptyMedia">لا توجد صور لهذا الإعلان.</div>;
  }

  const selectedImage = images[activeIndex];

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % images.length);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0]?.clientX || 0;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0]?.clientX || 0;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) < 40) return;
    diff > 0 ? goNext() : goPrev();
  };

  return (
    <>
      <div className="galleryCard card">
        <div className="mainImageWrap" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <button
            type="button"
            className="navBtn navPrev desktopOnly"
            onClick={goPrev}
            aria-label="الصورة السابقة"
          >
            ‹
          </button>

          <button
            type="button"
            className="imageButton"
            onClick={() => setLightboxOpen(true)}
            aria-label="فتح الصورة"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt={title || 'صورة العقار'} className="mainImage" />
          </button>

          <button
            type="button"
            className="navBtn navNext desktopOnly"
            onClick={goNext}
            aria-label="الصورة التالية"
          >
            ›
          </button>

          {images.length > 1 && (
            <div className="mobileSwipeHint">اسحب يمين أو يسار للتنقل بين الصور</div>
          )}
        </div>

        {images.length > 1 && (
          <div className="thumbsScroller">
            <div className="thumbsRow">
              {images.map((src, idx) => (
                <button
                  key={`${src}-${idx}`}
                  className={`thumbBtn ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`عرض الصورة ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`صورة ${idx + 1}`} className="thumbImage" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className="lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="lightboxClose" onClick={() => setLightboxOpen(false)} aria-label="إغلاق">
            ×
          </button>

          {images.length > 1 && (
            <button
              className="lightboxNav lightboxPrev"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="السابق"
            >
              ‹
            </button>
          )}

          <div
            className="lightboxImageWrap"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img src={selectedImage} alt={title || 'صورة العقار'} className="lightboxImage" />
          </div>

          {images.length > 1 && (
            <button
              className="lightboxNav lightboxNext"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="التالي"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
