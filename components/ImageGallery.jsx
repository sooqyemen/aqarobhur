'use client';

import { useMemo, useRef, useState } from 'react';
import { isVideoLike } from '@/lib/media';

export default function ImageGallery({ images = [], title }) {
  const media = useMemo(() => {
    if (Array.isArray(images) && images.length && typeof images[0] !== 'string' && typeof images[0] === 'object') {
      return images
        .map((entry) => ({
          url: String(entry?.url || '').trim(),
          kind: isVideoLike(entry) ? 'video' : 'image',
          refPath: String(entry?.refPath || '').trim(),
        }))
        .filter((entry) => entry.url);
    }

    return (Array.isArray(images) ? images : [])
      .map((entry) => ({
        url: String(entry || '').trim(),
        kind: isVideoLike(entry) ? 'video' : 'image',
        refPath: '',
      }))
      .filter((entry) => entry.url);
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  if (!media.length) {
    return <div className="emptyMedia">لا توجد وسائط لهذا الإعلان.</div>;
  }

  const activeEntry = media[Math.min(activeIndex, media.length - 1)] || media[0];
  const activeSrc = activeEntry.url;
  const activeType = activeEntry.kind;

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % media.length);

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
          <button type="button" className="navBtn navPrev desktopOnly" onClick={goPrev} aria-label="الوسيط السابق">
            ‹
          </button>

          {activeType === 'video' ? (
            <div className="mediaFrame">
              <video src={activeSrc} controls className="mainImage" playsInline preload="metadata" />
              <button type="button" className="zoomBtn" onClick={() => setLightboxOpen(true)} aria-label="فتح الفيديو">
                ⤢
              </button>
            </div>
          ) : (
            <button type="button" className="imageButton" onClick={() => setLightboxOpen(true)} aria-label="فتح الصورة">
              <img src={activeSrc} alt={title || 'صورة العقار'} className="mainImage" />
            </button>
          )}

          <button type="button" className="navBtn navNext desktopOnly" onClick={goNext} aria-label="الوسيط التالي">
            ›
          </button>

          {media.length > 1 && <div className="mobileSwipeHint">اسحب يمين أو يسار للتنقل بين الوسائط</div>}
          {activeType === 'video' ? <div className="typeBadge">فيديو</div> : null}
        </div>

        {media.length > 1 && (
          <div className="thumbsScroller">
            <div className="thumbsRow">
              {media.map((entry, idx) => {
                const type = entry.kind;
                const key = entry.refPath || entry.url || String(idx);
                return (
                  <button
                    key={key}
                    className={`thumbBtn ${idx === activeIndex ? 'active' : ''}`}
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`عرض الوسيط ${idx + 1}`}
                  >
                    {type === 'video' ? (
                      <div className="thumbVideoWrap">
                        <video src={entry.url} className="thumbImage" muted playsInline preload="metadata" />
                        <span className="thumbVideoIcon">▶</span>
                      </div>
                    ) : (
                      <img src={entry.url} alt={`وسيط ${idx + 1}`} className="thumbImage" />
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

          {media.length > 1 && (
            <button className="lightboxNav lightboxPrev" onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="السابق">
              ‹
            </button>
          )}

          <div className="lightboxImageWrap" onClick={(e) => e.stopPropagation()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {activeType === 'video' ? (
              <video src={activeSrc} controls className="lightboxImage" playsInline autoPlay preload="metadata" />
            ) : (
              <img src={activeSrc} alt={title || 'صورة العقار'} className="lightboxImage" />
            )}
          </div>

          {media.length > 1 && (
            <button className="lightboxNav lightboxNext" onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="التالي">
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
        .imageButton,
        .mediaFrame {
          width: 100%;
          height: 100%;
          display: block;
          border: 0;
          background: transparent;
          padding: 0;
        }
        .imageButton { cursor: zoom-in; }
        .mainImage {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          background: #fff;
        }
        .zoomBtn {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 4;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.55);
          background: rgba(15, 23, 42, .48);
          color: white;
          cursor: pointer;
          backdrop-filter: blur(6px);
        }
        .typeBadge {
          position: absolute;
          bottom: 14px;
          left: 14px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, .65);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          pointer-events: none;
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
          height: 92px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #fff;
          overflow: hidden;
          padding: 0;
          cursor: pointer;
          flex: 0 0 auto;
        }
        .thumbBtn.active {
          border-color: rgba(15, 118, 110, 0.85);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
        }
        .thumbImage,
        .thumbVideoWrap {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          position: relative;
          background: #0f172a;
        }
        .thumbVideoIcon {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          color: white;
          background: rgba(15, 23, 42, .5);
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          pointer-events: none;
        }
        .lightbox {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.88);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .lightboxClose {
          position: absolute;
          top: 14px;
          left: 14px;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,.12);
          color: #fff;
          font-size: 30px;
          cursor: pointer;
        }
        .lightboxImageWrap {
          width: min(100%, 1200px);
          height: min(86vh, 900px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lightboxImage {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
          background: transparent;
        }
        .lightboxNav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.2);
          background: rgba(255,255,255,.08);
          color: #fff;
          font-size: 32px;
          cursor: pointer;
        }
        .lightboxPrev { right: 20px; }
        .lightboxNext { left: 20px; }

        @media (max-width: 900px) {
          .desktopOnly { display: none; }
          .mobileSwipeHint { display: block; }
          .mainImageWrap { min-height: 260px; height: min(72vw, 440px); }
          .thumbBtn { width: 78px; height: 78px; }
        }
      `}</style>
    </>
  );
}
