'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import Header from '@/components/Header';
import WhatsAppFloat from '@/components/WhatsAppFloat'; // تغيير الاسم
import Footer from '@/components/Footer';
import ListingCard from '@/components/ListingCard';

import { fetchLatestListings } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await fetchLatestListings({ n: 12, onlyPublic: true, includeLegacy: true });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'حصل خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publicItems = useMemo(() => {
    return items.filter((x) => ['available', 'reserved'].includes(String(x.status || '')));
  }, [items]);

  return (
    <>
      <Header />

      <main className="container" style={{ paddingTop: 24 }}>
        {/* قسم الهيرو */}
        <section className="hero card">
          <div className="heroContent">
            <div className="heroText">
              <div className="kicker">
                <span className="kickerIcon">🎯</span>
                <span>عروض مباشرة • شمال جدة</span>
              </div>
              
              <h1 className="h1">
                <span className="gradient-text">عقار أبحر</span>
                <br />
                <span className="h1Sub">وجهتك العقارية المميزة</span>
              </h1>
              
              <p className="heroDescription">
                تصفح أحدث العروض الحصرية في أبحر الشمالية وشمال جدة، أو أرسل طلبك المخصص (حي/جزء/ميزانية) 
                وسنقدم لك أفضل الخيارات المناسبة.
              </p>

              <div className="heroActions">
                <Link className="btnPrimary heroBtn" href="/listings">
                  <span className="btnIcon">📋</span>
                  <span>تصفح كل العروض</span>
                </Link>
                <Link className="btn heroBtn" href="/request">
                  <span className="btnIcon">📨</span>
                  <span>أرسل طلبك</span>
                </Link>
                <button 
                  className="btn heroBtn" 
                  onClick={load} 
                  disabled={loading}
                >
                  <span className="btnIcon">🔄</span>
                  <span>{loading ? 'جاري التحديث...' : 'تحديث'}</span>
                </button>
              </div>
            </div>

            <div className="heroStats">
              <div className="statCard">
                <div className="statIcon">🏘️</div>
                <div className="statContent">
                  <div className="statValue">{loading ? '—' : String(publicItems.length)}</div>
                  <div className="statLabel">عرض حالي</div>
                </div>
              </div>
              
              <div className="statCard">
                <div className="statIcon">📍</div>
                <div className="statContent">
                  <div className="statValue">{NEIGHBORHOODS.length}</div>
                  <div className="statLabel">حي متاح</div>
                </div>
              </div>
              
              <div className="statCard">
                <div className="statIcon">⚡</div>
                <div className="statContent">
                  <div className="statValue">سريع</div>
                  <div className="statLabel">وقت الرد</div>
                </div>
              </div>
              
              <div className="statCard highlight">
                <div className="statIcon">💎</div>
                <div className="statContent">
                  <div className="statValue">مباشر</div>
                  <div className="statLabel">بدون وسيط</div>
                </div>
              </div>
            </div>
          </div>

          <div className="wave" aria-hidden="true" />
        </section>

        {/* إشعارات الحالة */}
        {err ? (
          <section className="card errorSection">
            <div className="errorContent">
              <span className="errorIcon">⚠️</span>
              <span>{err}</span>
            </div>
          </section>
        ) : null}

        {/* قسم أحدث العروض */}
        <section className="listingsSection">
          <div className="sectionHeader">
            <div className="sectionTitle">
              <h2 className="h2">
                <span className="titleMain">أحدث العروض</span>
                <span className="titleSub">عقارات حصرية في أبحر الشمالية</span>
              </h2>
              <div className="sectionDescription">
                آخر ما تم إضافته في قاعدة البيانات - عروض حقيقية مباشرة من المالك
              </div>
            </div>
            
            <Link className="btn viewAllBtn" href="/listings">
              <span className="btnIcon">👁️</span>
              <span>عرض الكل</span>
              <span className="arrow">←</span>
            </Link>
          </div>

          {loading ? (
            <div className="loadingState">
              <div className="loadingSpinner"></div>
              <div className="loadingText">جاري تحميل العروض...</div>
            </div>
          ) : publicItems.length === 0 ? (
            <div className="emptyState card">
              <div className="emptyIcon">🏠</div>
              <div className="emptyTitle">لا توجد عروض متاحة حالياً</div>
              <div className="emptyDescription muted">
                سيتم إضافة عروض جديدة قريباً. يمكنك إرسال طلب مخصص لنتواصل معك عند توفر ما يناسبك.
              </div>
              <Link className="btnPrimary emptyBtn" href="/request">
                إرسال طلب مخصص
              </Link>
            </div>
          ) : (
            <div className="listingsGrid">
              {publicItems.map((item) => (
                <div key={item.id} className="listingItem">
                  <ListingCard item={item} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* قسم CTA */}
        <section className="ctaSection">
          <div className="ctaCard">
            <div className="ctaContent">
              <div className="ctaIcon">🔍</div>
              <div>
                <h2 className="ctaTitle">ما لقيت اللي تبيه؟</h2>
                <p className="ctaDescription">
                  ارسل طلبك المخصص الآن (الحي/الجزء/نوع العقار/الميزانية) 
                  وسنقوم بتجهيز 3–4 خيارات مناسبة خصيصاً لك.
                </p>
              </div>
            </div>
            
            <div className="ctaActions">
              <Link className="btnPrimary ctaBtn" href="/request">
                <span className="btnIcon">🚀</span>
                <span>أرسل طلبك الآن</span>
              </Link>
              <Link className="btn ctaBtnAlt" href="/listings">
                <span>تصفح العروض</span>
              </Link>
            </div>
          </div>
        </section>

        {/* دليل الحالات */}
        <section className="legendSection card">
          <div className="legendHeader">
            <h3 className="legendTitle">دليل العروض</h3>
            <div className="muted">فهم حالة العقارات المعروضة</div>
          </div>
          
          <div className="legendItems">
            <div className="legendItem">
              <span className="badge ok">مباشر</span>
              <span className="legendText">عرض مباشر من المالك</span>
            </div>
            
            <div className="legendItem">
              <span className="badge">بيع / إيجار</span>
              <span className="legendText">نوع الصفقة</span>
            </div>
            
            <div className="legendItem">
              <span className="badge warn">محجوز</span>
              <span className="legendText">العرض قيد الحجز</span>
            </div>
            
            <div className="legendItem">
              <span className="badge sold">مباع</span>
              <span className="legendText">تم البيع (مخفي للزوار)</span>
            </div>
          </div>
        </section>

        <Footer />
      </main>

      {/* زر واتساب عائم */}
      <WhatsAppFloat />

      <style jsx>{`
        .hero {
          padding: 28px 24px;
          background: linear-gradient(135deg, 
            rgba(29, 78, 216, 0.08) 0%, 
            rgba(255, 255, 255, 0) 50%,
            rgba(201, 162, 39, 0.06) 100%);
          border: 1px solid rgba(29, 78, 216, 0.1);
          position: relative;
          overflow: hidden;
        }
        
        .hero:before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle at 70% 30%, rgba(29, 78, 216, 0.1), transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        
        .hero:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle at 30% 70%, rgba(201, 162, 39, 0.08), transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        
        .heroContent {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          position: relative;
          z-index: 1;
        }
        
        @media (min-width: 992px) {
          .heroContent {
            grid-template-columns: 1.4fr 1fr;
            align-items: start;
          }
        }
        
        .kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid rgba(29, 78, 216, 0.2);
          background: rgba(29, 78, 216, 0.05);
          backdrop-filter: blur(10px);
          margin-bottom: 20px;
        }
        
        .kickerIcon {
          font-size: 14px;
        }
        
        .h1 {
          margin: 0 0 12px;
          font-size: 42px;
          line-height: 1.1;
          font-weight: 950;
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #1d4ed8, #0ea5e9, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .h1Sub {
          display: block;
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
          margin-top: 8px;
          opacity: 0.9;
        }
        
        .heroDescription {
          margin: 0 0 28px;
          font-size: 16px;
          line-height: 1.7;
          color: var(--text);
          opacity: 0.9;
          max-width: 600px;
        }
        
        .heroActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        
        .heroBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          font-weight: 700;
          border-radius: 14px;
          transition: all 0.3s ease;
        }
        
        .btnIcon {
          font-size: 16px;
        }
        
        .heroStats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        
        @media (min-width: 768px) {
          .heroStats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .statCard {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(229, 231, 235, 0.8);
          border-radius: 18px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        
        .statCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(16, 24, 40, 0.1);
          border-color: rgba(29, 78, 216, 0.2);
        }
        
        .statCard.highlight {
          background: linear-gradient(135deg, rgba(29, 78, 216, 0.1), rgba(29, 78, 216, 0.05));
          border-color: rgba(29, 78, 216, 0.2);
          grid-column: span 2;
        }
        
        .statIcon {
          font-size: 28px;
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(29, 78, 216, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .statCard.highlight .statIcon {
          background: rgba(29, 78, 216, 0.15);
        }
        
        .statValue {
          font-weight: 950;
          font-size: 24px;
          margin-bottom: 4px;
        }
        
        .statLabel {
          font-size: 13px;
          color: var(--muted);
          font-weight: 500;
        }
        
        .wave {
          margin-top: 32px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, 
            #1d4ed8 0%, 
            #3b82f6 25%, 
            #0ea5e9 50%, 
            #3b82f6 75%, 
            #1d4ed8 100%);
          opacity: 0.7;
          position: relative;
          overflow: hidden;
        }
        
        .wave:after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .errorSection {
          margin-top: 24px;
          border-color: rgba(180, 35, 24, 0.3);
          background: linear-gradient(135deg, rgba(180, 35, 24, 0.08), rgba(180, 35, 24, 0.04));
          padding: 20px;
        }
        
        .errorContent {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          color: var(--danger);
        }
        
        .errorIcon {
          font-size: 20px;
        }
        
        .listingsSection {
          margin-top: 48px;
        }
        
        .sectionHeader {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 32px;
        }
        
        @media (min-width: 768px) {
          .sectionHeader {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
        }
        
        .sectionTitle {
          flex: 1;
        }
        
        .h2 {
          margin: 0 0 8px;
          font-size: 28px;
          font-weight: 950;
          line-height: 1.2;
        }
        
        .titleMain {
          display: block;
          color: var(--text);
        }
        
        .titleSub {
          display: block;
          font-size: 18px;
          font-weight: 600;
          color: var(--muted);
          margin-top: 4px;
        }
        
        .sectionDescription {
          font-size: 15px;
          color: var(--muted);
          max-width: 600px;
          line-height: 1.6;
        }
        
        .viewAllBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          font-weight: 700;
          border-radius: 14px;
          white-space: nowrap;
        }
        
        .arrow {
          font-size: 18px;
          transition: transform 0.2s ease;
        }
        
        .viewAllBtn:hover .arrow {
          transform: translateX(-4px);
        }
        
        .loadingState {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 20px;
          border: 2px dashed var(--border);
        }
        
        .loadingSpinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(29, 78, 216, 0.1);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .loadingText {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }
        
        .emptyState {
          padding: 48px 32px;
          text-align: center;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 2px dashed var(--border);
        }
        
        .emptyIcon {
          font-size: 48px;
          margin-bottom: 20px;
          opacity: 0.3;
        }
        
        .emptyTitle {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--text);
        }
        
        .emptyDescription {
          font-size: 15px;
          line-height: 1.6;
          max-width: 400px;
          margin: 0 auto 24px;
        }
        
        .emptyBtn {
          padding: 14px 32px;
          font-weight: 700;
          border-radius: 14px;
        }
        
        .listingsGrid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 24px;
          margin-top: 20px;
        }
        
        @media (min-width: 768px) {
          .listingsGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1200px) {
          .listingsGrid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        .listingItem {
          transition: transform 0.3s ease;
        }
        
        .listingItem:hover {
          transform: translateY(-4px);
        }
        
        .ctaSection {
          margin-top: 60px;
        }
        
        .ctaCard {
          background: linear-gradient(135deg, 
            rgba(29, 78, 216, 0.1) 0%, 
            rgba(29, 78, 216, 0.05) 50%,
            rgba(201, 162, 39, 0.05) 100%);
          border: 1px solid rgba(29, 78, 216, 0.15);
          border-radius: 24px;
          padding: 40px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        
        @media (min-width: 992px) {
          .ctaCard {
            grid-template-columns: 1.5fr 1fr;
          }
        }
        
        .ctaContent {
          display: flex;
          align-items: flex-start;
          gap: 24px;
        }
        
        .ctaIcon {
          font-size: 48px;
          flex-shrink: 0;
        }
        
        .ctaTitle {
          margin: 0 0 12px;
          font-size: 28px;
          font-weight: 950;
          color: var(--text);
        }
        
        .ctaDescription {
          margin: 0;
          font-size: 16px;
          line-height: 1.7;
          color: var(--text);
          opacity: 0.9;
          max-width: 500px;
        }
        
        .ctaActions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: stretch;
        }
        
        @media (min-width: 576px) {
          .ctaActions {
            flex-direction: row;
            align-items: center;
          }
        }
        
        .ctaBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 32px;
          font-weight: 700;
          border-radius: 16px;
          font-size: 16px;
        }
        
        .ctaBtnAlt {
          padding: 16px 32px;
          font-weight: 700;
          border-radius: 16px;
          text-align: center;
        }
        
        .legendSection {
          margin-top: 40px;
          padding: 28px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }
        
        .legendHeader {
          margin-bottom: 24px;
          text-align: center;
        }
        
        .legendTitle {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 900;
          color: var(--text);
        }
        
        .legendItems {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        
        @media (min-width: 768px) {
          .legendItems {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        .legendItem {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }
        
        .legendText {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
      `}</style>
    </>
  );
}
