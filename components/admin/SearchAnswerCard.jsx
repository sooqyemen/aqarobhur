'use client';

import Link from 'next/link';
import { formatPriceSAR } from '@/lib/format';
import SourceBadge from './SourceBadge';

export default function SearchAnswerCard({ answer, results = [] }) {
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
                <div className="sourceBadgeWrap">
                  <SourceBadge item={item} />
                </div>
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
                <Link href={`/admin/listings/${item.id}`} className="btnOutline">
                  <span className="material-icons-outlined">open_in_new</span> إدارة الإعلان
                </Link>
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

      <style jsx>{`
        .answerCardWrap { background: white; border-radius: 18px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; animation: slideUp 0.4s ease-out; }
        
        .answerHeader { padding: 20px 20px 15px; border-bottom: 1px solid #edf2f7; }
        .titleWrap { display: flex; align-items: center; gap: 10px; }
        .titleIcon { color: var(--primary); background: rgba(15, 118, 110, 0.1); padding: 8px; border-radius: 10px; font-size: 22px; }
        .titleWrap h3 { margin: 0; font-size: 18px; font-weight: 800; color: #1a202c; }

        .aiResponseBox { margin: 20px; padding: 15px 20px; background: #f8fafc; border-right: 4px solid var(--primary); border-radius: 12px; display: flex; gap: 15px; align-items: flex-start; }
        .quoteIcon { color: var(--primary); opacity: 0.5; font-size: 28px; transform: scaleX(-1); }
        .aiResponseBox p { margin: 0; color: #334155; line-height: 1.8; font-size: 15px; font-weight: 600; flex: 1; }

        .resultsContainer { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 15px; }
        
        .resultCard { border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; background: #fff; transition: box-shadow 0.2s, border-color 0.2s; }
        .resultCard:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.03); border-color: #cbd5e0; }

        .resultTop { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; margin-bottom: 15px; }
        .resultMainInfo { flex: 1; min-width: 200px; }
        .resultTitle { margin: 0 0 6px 0; font-size: 17px; font-weight: 800; color: #1a202c; }
        .resultLocation { display: flex; align-items: center; gap: 4px; color: #718096; font-size: 13px; font-weight: 500; }
        .resultLocation .material-icons-outlined { font-size: 16px; }

        .infoGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 15px; }

        .descBox { background: #fcfcfd; border: 1px solid #edf2f7; border-radius: 10px; padding: 12px 15px; margin-bottom: 15px; }
        .descLabel { font-size: 12px; font-weight: 700; color: #a0aec0; margin-bottom: 6px; }
        .descContent { margin: 0; color: #4a5568; font-size: 13px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; }

        .cardActions { display: flex; justify-content: flex-end; padding-top: 15px; border-top: 1px dashed #e2e8f0; }
        .btnOutline { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; border: 1px solid #cbd5e0; background: white; color: #4a5568; font-size: 13px; font-weight: 700; text-decoration: none; transition: all 0.2s; }
        .btnOutline:hover { background: #f7fafc; color: #1a202c; border-color: #a0aec0; }
        .btnOutline .material-icons-outlined { font-size: 16px; }

        .emptyState { text-align: center; padding: 40px 20px; color: #a0aec0; }
        .emptyState .material-icons-outlined { font-size: 40px; margin-bottom: 10px; opacity: 0.5; }
        .emptyState p { margin: 0; font-size: 14px; font-weight: 600; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
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
      
      <style jsx>{`
        .infoCard { background: #f8fafc; border: 1px solid #edf2f7; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
        .infoCard.highlight { background: #f0fff4; border-color: #c6f6d5; }
        .infoCard.direct { background: rgba(15, 118, 110, 0.05); border-color: rgba(15, 118, 110, 0.2); }
        
        .infoLabel { display: flex; align-items: center; gap: 4px; color: #718096; font-size: 12px; font-weight: 600; }
        .infoIcon { font-size: 14px; opacity: 0.7; }
        
        .infoValue { color: #1a202c; font-size: 14px; font-weight: 800; }
        .highlight .infoValue { color: #2f855a; }
        .direct .infoValue { color: var(--primary); }
      `}</style>
    </div>
  );
}
