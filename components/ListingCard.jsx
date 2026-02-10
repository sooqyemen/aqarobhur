'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import ListingCard from '@/components/ListingCard';
import NeighborhoodGrid from '@/components/NeighborhoodGrid';

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
      {/* ✅ شريط البحث */}
      <div className="searchBar">
        <input 
          type="text" 
          placeholder="أبحث عن حي / مخطط / جزء..." 
          className="searchInput"
        />
      </div>

      {/* ✅ أحياء مميزة */}
      <NeighborhoodGrid />

      {/* ✅ شريط سريع */}
      <div className="quickBar">
        <Link href="/listings" className="pill active">كل العروض</Link>
        <Link href="/listings?dealType=sale" className="pill">بيع</Link>
        <Link href="/listings?dealType=rent" className="pill">إيجار</Link>
        <Link href="/map" className="pill">الخريطة</Link>
      </div>

      {/* ✅ أحدث العروض */}
      <div className="sectionHead">
        <h2 className="h2">أحدث العروض</h2>
        <Link href="/listings" className="more">تصفح الكل</Link>
      </div>

      {err ? <div className="card" style={{ padding: 14 }}>{err}</div> : null}

      {loading ? (
        <div className="muted" style={{ padding: '10px 0' }}>جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>لا توجد عروض حتى الآن.</div>
      ) : (
        <div className="list">
          {items.map((it) => (
            <ListingCard key={it.id || it.docId || Math.random()} item={it} />
          ))}
        </div>
      )}

      {/* ✅ معلومات الاتصال */}
      <div className="contactInfo">
        <div className="contactText">
          <strong>واتساب:</strong> 966597520693
        </div>
        <div className="copyright">© 2026 عقار أبحر</div>
      </div>

      {/* ✅ قائمة التصفح السفلية */}
      <nav className="bottomNav">
        <Link href="/" className="navLink active">الرئيسية</Link>
        <Link href="/listings" className="navLink">كل العروض</Link>
        <Link href="/request" className="navLink">أرسل طلبك</Link>
        <Link href="/map" className="navLink">الخريطة</Link>
        <Link href="/account" className="navLink">الحساب</Link>
      </nav>

      <style jsx>{`
        .container {
          direction: rtl;
          padding: 16px;
          max-width: 1200px;
          margin: 0 auto;
          min-height: 100vh;
          background: #f8f9fa;
        }
        
        .searchBar {
          margin: 10px 0 20px 0;
        }
        
        .searchInput {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          font-size: 16px;
          background: #fff;
          direction: rtl;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .searchInput:focus {
          outline: none;
          border-color: #1a73e8;
          box-shadow: 0 2px 12px rgba(30, 115, 216, 0.15);
        }
        
        .quickBar{
          margin: 20px 0;
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }
        .pill{
          background: rgba(30,115,216,.10);
          border:1px solid rgba(30,115,216,.18);
          color: #1a73e8;
          padding:10px 16px;
          border-radius:999px;
          text-decoration:none;
          font-weight:700;
          font-size:14px;
          transition: all 0.2s;
        }
        .pill.active {
          background: #1a73e8;
          color: white;
        }
        .pill:hover {
          background: rgba(30,115,216,0.15);
        }
        .pill.active:hover {
          background: #0d62d9;
        }
        
        .sectionHead{
          margin: 24px 0 16px 0;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .h2{
          margin:0;
          font-size:18px;
          font-weight:900;
          color: #111;
        }
        .more{
          text-decoration:none;
          color: #1a73e8;
          font-weight:700;
          font-size:14px;
        }
        
        .list{
          margin-top: 12px;
          display:flex;
          flex-direction:column;
          gap:12px;
          margin-bottom: 24px;
        }
        
        .card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          margin: 10px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .muted {
          color: #666;
          text-align: center;
          font-size: 14px;
          padding: 20px;
        }
        
        .contactInfo {
          margin: 40px 0 80px 0;
          padding: 20px;
          background: #fff;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border: 1px solid #e0e0e0;
        }
        
        .contactText {
          font-size: 16px;
          color: #333;
          margin-bottom: 10px;
        }
        
        .copyright {
          font-size: 14px;
          color: #666;
        }
        
        .bottomNav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          border-top: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-around;
          padding: 12px 0;
          z-index: 1000;
        }
        
        .navLink {
          text-decoration: none;
          color: #666;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          flex: 1;
        }
        
        .navLink.active {
          color: #1a73e8;
          font-weight: 700;
        }
        
        @media (min-width: 768px) {
          .bottomNav {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
