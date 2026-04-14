// components/ImageGallery.jsx
'use client';

import { useState, useRef } from 'react';

function getMediaType(src) {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const lowerSrc = String(src || '').toLowerCase();
  return videoExtensions.some(ext => lowerSrc.includes(ext)) ? 'video' : 'image';
}

export default function ImageGallery({ images = [], title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  if (!images.length) {
    return <div className="emptyMedia">لا توجد وسائط لهذا الإعلان.</div>;
  }

  const activeSrc = images[activeIndex];
  const activeType = getMediaType(activeSrc);

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
            aria-label="الوسيط السابق"
          >
            ‹
          </button>

          <button
            type="button"
            className="imageButton"
            onClick={() => setLightboxOpen(true)}
            aria-label="فتح الوسيط"
          >
            {activeType === 'video' ? (
              <video
                src={activeSrc}
                controls
                className="mainImage"
                playsInline
                muted
                autoPlay={false}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeSrc} alt={title || 'صورة العقار'} className="mainImage" />
            )}
          </button>

          <button
            type="button"
            className="navBtn navNext desktopOnly"
            onClick={goNext}
            aria-label="الوسيط التالي"
          >
            ›
          </button>

          {images.length > 1 && (
            <div className="mobileSwipeHint">اسحب يمين أو يسار للتنقل بين الوسائط</div>
          )}
        </div>

        {images.length > 1 && (
          <div className="thumbsScroller">
            <div className="thumbsRow">
              {images.map((src, idx) => {
                const type = getMediaType(src);
                return (
                  <button
                    key={`${src}-${idx}`}
                    className={`thumbBtn ${idx === activeIndex ? 'active' : ''}`}
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`عرض الوسيط ${idx + 1}`}
                  >
                    {type === 'video' ? (
                      <video
                        src={src}
                        className="thumbImage"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={`وسيط ${idx + 1}`} className="thumbImage" />
                    )}
                  </button>
                );
              })}
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
            {activeType === 'video' ? (
              <video
                src={activeSrc}
                controls
                className="lightboxImage"
                playsInline
                autoPlay
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeSrc} alt={title || 'صورة العقار'} className="lightboxImage" />
            )}
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

      <style jsx>{`
        .galleryCard { padding: 14px; margin-bottom: 14px; }
        .mainImageWrap {
          position: relative;
          width: 100%;
          min-height: 340px;
          height: clamp(340px, 55vw, 620px);
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: pan-y;
        }
        .imageButton {
          width: 100%;
          height: 100%;
          display: block;
          border: 0;
          background: transparent;
          padding: 0;
          cursor: zoom-in;
        }
        .mainImage {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          background: #fff;
        }
        .mobileSwipeHint {
          position: absolute;
          bottom: 12px;
          right: 12px;
          left: 12px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.55);
          color: #fff;
          font-size: 12px;
          text-align: center;
          pointer-events: none;
          display: none;
        }
        .navBtn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
          width: 46px;
          height: 46px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.65);
          background: rgba(15, 23, 42, 0.45);
          color: #fff;
          font-size: 30px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(6px);
        }
        .navPrev { right: 14px; }
        .navNext { left: 14px; }
        .desktopOnly { display: inline-flex; }
        .emptyMedia {
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          text-align: center;
          color: var(--muted);
          border: 1px dashed var(--border2, var(--border));
          border-radius: 18px;
          background: #f8fafc;
        }
        .thumbsScroller {
          margin-top: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
        }
        .thumbsRow {
          display: flex;
          gap: 10px;
          min-width: max-content;
        }
        .thumbBtn {
          width: 92px;
          height: 72px;
          flex: 0 0 auto;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #fff;
          padding: 0;
          overflow: hidden;
          cursor: pointer;
        }
        .thumbBtn.active {
          border-color: rgba(15, 118, 110, 0.85);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
        }
        .thumbImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .lightbox {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .lightboxImageWrap {
          width: min(96vw, 1200px);
          height: min(88vh, 900px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lightboxImage {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }
        .lightboxClose {
          position: absolute;
          top: 18px;
          left: 18px;
          width: 46px;
          height: 46px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          font-size: 30px;
          cursor: pointer;
        }
        .lightboxNav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 52px;
          height: 52px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          font-size: 34px;
          cursor: pointer;
        }
        .lightboxPrev { right: 20px; }
        .lightboxNext { left: 20px; }

        @media (max-width: 640px) {
          .mainImageWrap {
            min-height: 260px;
            height: 56vw;
            max-height: 420px;
            border-radius: 14px;
          }
          .desktopOnly { display: none; }
          .mobileSwipeHint { display: block; }
          .thumbBtn { width: 78px; height: 62px; }
          .emptyMedia { min-height: 180px; }
          .lightbox { padding: 10px; }
          .lightboxImageWrap { width: 100%; height: 78vh; }
          .lightboxNav { width: 44px; height: 44px; font-size: 30px; }
          .lightboxPrev { right: 10px; }
          .lightboxNext { left: 10px; }
          .lightboxClose { top: 10px; left: 10px; }
        }
      `}</style>
    </>
  );
}
