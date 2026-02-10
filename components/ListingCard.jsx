'use client';

export default function ListingCardHaraj({ href, title, district, createdText, priceText, imageUrl, tags = [] }) {
  return (
    <a href={href} className="harajCard" aria-label={title}>
      <div className="harajCardInner">
        {/* النص (يمين) */}
        <div className="harajBody">
          <div className="harajTitle">{title || 'بدون عنوان'}</div>

          <div className="harajMeta">
            <span className="harajMetaItem">{district || '—'}</span>
            <span className="harajDot">•</span>
            <span className="harajMetaItem">{createdText || '—'}</span>
          </div>

          {tags?.length ? (
            <div className="harajTags">
              {tags.slice(0, 3).map((t, i) => (
                <span key={i} className="harajTag">{t}</span>
              ))}
            </div>
          ) : null}

          <div className="harajPrice">{priceText || ''}</div>
        </div>

        {/* الصورة (يسار) */}
        <div className="harajThumb">
          {imageUrl ? (
            // استخدم img عشان ما ندخل next/image
            <img src={imageUrl} alt="" loading="lazy" />
          ) : (
            <div className="harajNoImg">
              <span>بدون صورة</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .harajCard {
          display: block;
          text-decoration: none;
          color: inherit;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 14px;
          overflow: hidden;
        }
        .harajCardInner {
          display: flex;
          flex-direction: row-reverse; /* RTL: النص يمين، الصورة يسار */
          gap: 12px;
          padding: 12px;
          align-items: stretch;
        }

        .harajBody {
          flex: 1;
          min-width: 0;
          direction: rtl;
          text-align: right;
        }

        .harajTitle {
          font-size: 16px;
          font-weight: 800;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .harajMeta {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .harajDot { opacity: 0.7; }
        .harajMetaItem { white-space: nowrap; }

        .harajTags {
          margin-top: 8px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .harajTag {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
        }

        .harajPrice {
          margin-top: 10px;
          font-size: 15px;
          font-weight: 900;
          color: #111;
        }

        .harajThumb {
          width: 110px;
          flex: 0 0 110px;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .harajThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .harajNoImg {
          width: 100%;
          height: 100%;
          min-height: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0,0,0,0.55);
          font-size: 12px;
          font-weight: 700;
        }

        /* لمسة مثل حراج: hover */
        .harajCard:active {
          transform: scale(0.995);
        }
      `}</style>
    </a>
  );
}
