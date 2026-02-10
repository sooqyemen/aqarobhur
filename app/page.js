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
      {/* ✅ شبكات الأحياء */}
      <NeighborhoodGrid />

      {/* ✅ شريط سريع */}
      <div className="quickBar">
        <Link href="/listings" className="pill">كل العروض</Link>
        <Link href="/listings?dealType=sale" className="pill">بيع</Link>
        <Link href="/listings?dealType=rent" className="pill">إيجار</Link>
        <Link href="/map" className="pill">الخريطة</Link>
      </div>

      {/* ✅ شريط البحث */}
      <div className="searchBar">
        <input 
          type="text" 
          placeholder="أبحث عن حي / مخطط / جزء..." 
          className="searchInput"
        />
      </div>

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
        
        .searchBar {
          margin: 20px 0;
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
        
        .quickBar{
          margin-top:14px;
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        }
        .pill{
          background: rgba(30,115,216,.10);
          border:1px solid rgba(30,115,216,.18);
          color: var(--primary2);
          padding:8px 12px;
          border-radius:999px;
          text-decoration:none;
          font-weight:900;
          font-size:13px;
        }
        .sectionHead{
          margin-top:18px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .h2{margin:0;font-size:16px;font-weight:900}
        .more{text-decoration:none;color:var(--primary);font-weight:900;font-size:13px}
        .list{margin-top:12px;display:flex;flex-direction:column;gap:10px;margin-bottom:18px}
        
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
      `}</style>
    </div>
  );
}
