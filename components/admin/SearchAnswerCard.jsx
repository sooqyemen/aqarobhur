'use client';

import Link from 'next/link';
import { formatPriceSAR } from '@/lib/format';
import SourceBadge from './SourceBadge';

export default function SearchAnswerCard({
  answer,
  results = [],
  isPublic = false,
  whatsappLink = '',
}) {
  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <div className="answerCardWrap">
        <div className="answerHeader">
          <div className="titleWrap">
            <span className="material-icons-outlined titleIcon">psychology</span>
            <h3>نتيجة البحث الذكي</h3>
          </div>
        </div>

        {answer && (
          <div className="aiResponseBox">
            <span className="material-icons-outlined quoteIcon">format_quote</span>
            <p>{answer}</p>
          </div>
        )}

        <div className="resultsContainer">
          {results.length > 0 ? results.map((item) => (
            <div key={item.id} className="resultCard">
              <div className="resultTop">
                <div className="resultMainInfo">
                  <h4 className="resultTitle">{item.title || 'عرض عقاري بدون عنوان'}</h4>
                  <div className="resultLocation">
                    <span className="material-icons-outlined">place</span>
                    {[item.neighborhood, item.plan, item.part].filter(Boolean).join(' — ') || 'موقع غير محدد بدقة'}
                  </div>
                </div>

                {!isPublic && (
                  <div className="sourceBadgeWrap">
                    <SourceBadge item={item} />
                  </div>
                )}
              </div>

              <div className="infoGrid">
                <Info label="نوع العقار" value={item.propertyType || '—'} icon="home" />
                <Info label="التصنيف" value={item.propertyClass || '—'} icon="category" />
                <Info label="السعر" value={item.price ? formatPriceSAR(item.price) : '—'} icon="payments" highlight />
                <Info label="المساحة" value={item.area ? `${item.area} م²` : '—'} icon="square_foot" />
                <Info label="مباشر؟" value={item.direct ? 'نعم (مباشر)' : 'لا'} icon="verified_user" isDirect={item.direct} />
              </div>

              {item.description && (
                <div className="descBox">
                  <div className="descLabel">الوصف والتفاصيل:</div>
                  <p className="descContent">{item.description}</p>
                </div>
              )}

              <div className="cardActions">
                {isPublic ? (
                  <a href={whatsappLink} className="btnPrimary" target="_blank" rel="noopener noreferrer">
                    <span className="material-icons-outlined">chat</span>
                    تواصل معنا بخصوص هذا العرض
                  </a>
                ) : (
                  <Link href={`/admin/listings/${item.id}`} className="btnOutline">
                    <span className="material-icons-outlined">open_in_new</span>
                    إدارة الإعلان
                  </Link>
                )}
              </div>
            </div>
          )) : (
            <div className="emptyState">
              <span className="material-icons-outlined">search_off</span>
              <p>لا توجد عروض عقارية تطابق هذا البحث حالياً.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Info({ label, value, icon, highlight, isDirect }) {
  return (
    <div className={`infoCard ${highlight ? 'highlight' : ''} ${isDirect ? 'direct' : ''}`}>
      <div className="infoLabel">
        {icon && <span className="material-icons-outlined infoIcon">{icon}</span>}
        {label}
      </div>
      <div className="infoValue">{value}</div>
    </div>
  );
}
