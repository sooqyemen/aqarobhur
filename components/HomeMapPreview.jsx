'use client';

import Link from 'next/link';

export default function HomeMapPreview() {
  return (
    <article className="mapPreviewCard cleanMapPreviewCard">
      <div className="sectionHeading miniHeading">
        <div>
          <h2>
            <span className="material-icons-outlined">pin_drop</span>
            استعرض العقارات على الخريطة
          </h2>
          <p>افتح الخريطة العقارية لمشاهدة مواقع العروض المتاحة في أبحر الشمالية وشمال جدة.</p>
        </div>
      </div>

      <Link href="/map" className="cleanMapBox" aria-label="فتح الخريطة العقارية">
        <iframe
          title="خريطة أبحر الشمالية"
          src="https://www.google.com/maps?q=21.7628,39.0994&z=13&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <span className="cleanMapOverlay">
          <strong>الخريطة العقارية</strong>
          <small>اضغط لعرض العقارات على الخريطة</small>
        </span>
      </Link>

      <Link href="/map" className="goldAction mapAction">
        <span className="material-icons-outlined">map</span>
        فتح الخريطة
      </Link>

      <style jsx>{`
        .cleanMapPreviewCard {
          min-width: 0;
        }
        .cleanMapBox {
          position: relative;
          display: block;
          height: 210px;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(184, 132, 47, .20);
          background: #eef2f7;
          text-decoration: none;
        }
        .cleanMapBox iframe {
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
          pointer-events: none;
        }
        .cleanMapOverlay {
          position: absolute;
          inset: auto 14px 14px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, .94);
          border: 1px solid rgba(184, 132, 47, .20);
          box-shadow: 0 12px 28px rgba(15, 23, 42, .14);
          backdrop-filter: blur(10px);
        }
        .cleanMapOverlay strong {
          color: #111827;
          font-size: 14px;
          font-weight: 950;
        }
        .cleanMapOverlay small {
          color: #667085;
          font-size: 12px;
          font-weight: 850;
        }
        .mapAction {
          margin-top: 12px;
          width: 100%;
        }
        @media (max-width: 640px) {
          .cleanMapBox { height: 190px; }
          .cleanMapOverlay {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </article>
  );
}
