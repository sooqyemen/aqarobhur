'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import ListingCardHaraj from '@/components/ListingCardHaraj';

import { fetchLatestListings } from '@/lib/listings';

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetchLatestListings(12);
        if (!alive) return;
        setItems(res || []);
      } catch (e) {
        if (!alive) return;
        setErr('تعذر تحميل أحدث العروض.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="container">
      {/* الأحياء المميزة */}
      <div className="sectionHead">
        <h2 className="h2">الأحياء المميزة</h2>
        <Link href="/neighborhoods" className="more">عرض الكل</Link>
      </div>
      <div className="neighborhoodList">
        <Link href="/neighborhood/الزمر" className="neighborhoodItem">الزمر</Link>
        <Link href="/neighborhood/الباقوت" className="neighborhoodItem">الباقوت</Link>
        <Link href="/neighborhood/الشائع" className="neighborhoodItem">الشائع</Link>
        <Link href="/neighborhood/الصواري" className="neighborhoodItem">الصواري</Link>
      </div>

      {/* شريط البحث */}
      <div className="searchBar">
        <input 
          type="text" 
          placeholder="أبحث عن حي / مخطط / جزء..." 
          className="searchInput"
        />
      </div>

      {/* شريط التصفية السريع */}
      <div className="quickBar">
        <Link href="/listings" className="pill active">كل العروض</Link>
        <Link href="/listings?dealType=sale" className="pill">بيع</Link>
        <Link href="/listings?dealType=rent" className="pill">إيجار</Link>
        <Link href="/map" className="pill">الخريطة</Link>
      </div>

      {/* أحدث العروض */}
      <div className="sectionHead">
        <h2 className="h2">أحدث العروض</h2>
      </div>

      {err ? <div className="card" style={{ padding: 14 }}>{err}</div> : null}

      {loading ? (
        <div className="muted" style={{ padding: '10px 0' }}>جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>لا توجد عروض حتى الآن.</div>
      ) : (
        <div className="listingsGrid">
          {items.map((it) => (
            <ListingCardHaraj
              key={it.id || it.docId || Math.random()}
              href={`/listing/${it.id}`}
              title={it.title || 'بدون عنوان'}
              district={it.district || '—'}
              createdText={it.createdAt ? new Date(it.createdAt).toLocaleDateString('ar-SA') : '—'}
              priceText={it.price ? `${it.price.toLocaleString()} ريال` : '—'}
              imageUrl={it.imageUrl || null}
              tags={it.tags || []}
            />
          ))}
        </div>
      )}

      {/* معلومات الاتصال */}
      <div className="contactInfo">
        <div className="contactText">واتساب: 966597520693</div>
        <div className="copyright">© 2026 عقار أبحر</div>
      </div>

      <style jsx>{`
        .container {
          direction: rtl;
          padding: 16px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .sectionHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 24px;
          margin-bottom: 12px;
        }
        
        .h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          color: #111;
        }
        
        .more {
          text-decoration: none;
          color: var(--primary);
          font-weight: 700;
          font-size: 14px;
        }
        
        .neighborhoodList {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        
        .neighborhoodItem {
          background: #f5f5f5;
          border: 1px solid #e0e0e0;
          padding: 10px 16px;
          border-radius: 8px;
          text-decoration: none;
          color: #333;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .neighborhoodItem:hover {
          background: #e8f0fe;
          border-color: #1a73e8;
          color: #1a73e8;
        }
        
        .searchBar {
          margin: 16px 0;
        }
        
        .searchInput {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #ddd;
          border-radius: 12px;
          font-size: 16px;
          background: #f9f9f9;
          direction: rtl;
        }
        
        .searchInput:focus {
          outline: none;
          border-color: #1a73e8;
          background: #fff;
        }
        
        .quickBar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin: 20px 0;
        }
        
        .pill {
          background: rgba(30, 115, 216, 0.10);
          border: 1px solid rgba(30, 115, 216, 0.18);
          color: var(--primary2);
          padding: 10px 16px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .pill.active {
          background: #1a73e8;
          color: white;
          border-color: #1a73e8;
        }
        
        .pill:hover {
          background: rgba(30, 115, 216, 0.15);
        }
        
        .pill.active:hover {
          background: #0d62d9;
        }
        
        .listingsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }
        
        .card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          margin: 10px 0;
        }
        
        .muted {
          color: #666;
          text-align: center;
          font-size: 14px;
        }
        
        .contactInfo {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
        }
        
        .contactText {
          font-size: 16px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
        }
        
        .copyright {
          font-size: 14px;
          color: #666;
        }
        
        @media (max-width: 768px) {
          .listingsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
