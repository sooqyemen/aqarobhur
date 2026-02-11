'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import ListingCard from '@/components/ListingCard';
import NeighborhoodGrid from '@/components/NeighborhoodGrid';
import { fetchLatestListings } from '@/lib/listings';

export default function HomePage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // ✅ بحث بسيط
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetchLatestListings(12);
        if (!alive) return;
        setItems(res || []);
      } catch {
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

  // ✅ مفاتيح ثابتة تمنع التهنيق (بدون Math.random)
  const safeItems = useMemo(() => {
    return (items || []).map((it, index) => ({
      __key: it?.id || it?.docId || `idx-${index}`,
      ...it,
    }));
  }, [items]);

  function onSearch(e) {
    e.preventDefault();
    const value = (q || '').trim();
    if (!value) {
      router.push('/listings');
      return;
    }
    router.push(`/listings?q=${encodeURIComponent(value)}`);
  }

  return (
    <div className="container" style={{ paddingBottom: 92 }}>
      {/* ✅ بحث */}
      <form className="searchBar" onSubmit={onSearch}>
        <div className="searchTitle">بحث</div>
        <div className="searchRow">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث (مثلاً: الزمرد، 99جس، أرض، شقة...)"
            aria-label="بحث"
          />
          <button className="btn btnPrimary" type="submit">
            بحث
          </button>
        </div>
      </form>

      {/* ✅ الأحياء (شريط أفقي بسيط) */}
      <NeighborhoodGrid />

      {/* ✅ اختصارات سريعة */}
      <div className="quickBar">
        <Link href="/listings" className="pill active">
          كل العروض
        </Link>
        <Link href="/listings?dealType=sale" className="pill">
          بيع
        </Link>
        <Link href="/listings?dealType=rent" className="pill">
          إيجار
        </Link>
        <Link href="/map" className="pill">
          الخريطة
        </Link>
      </div>

      {/* ✅ أحدث العروض */}
      <div className="sectionHead">
        <h2 className="h2">أحدث العروض</h2>
        <Link href="/listings" className="more">
          تصفح الكل
        </Link>
      </div>

      {err ? (
        <div className="card" style={{ padding: 14 }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="muted" style={{ padding: '10px 0' }}>
          جاري التحميل…
        </div>
      ) : safeItems.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          لا توجد عروض حتى الآن.
        </div>
      ) : (
        <div className="list">
          {safeItems.map((it) => (
            <ListingCard key={it.__key} item={it} />
          ))}
        </div>
      )}

      <style jsx>{`
        .searchBar {
          margin: 14px 0 12px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.04);
        }
        .searchTitle {
          font-weight: 950;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .searchRow {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .searchRow :global(.input) {
          flex: 1;
          min-width: 0;
        }

        .quickBar {
          margin: 12px 0 18px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .pill {
          background: rgba(214, 179, 91, 0.1);
          border: 1px solid rgba(214, 179, 91, 0.18);
          color: #f6f0df;
          padding: 10px 16px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 950;
          font-size: 14px;
          transition: transform 120ms ease, background 120ms ease;
        }
        .pill.active {
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          color: #0a0d12;
          border-color: transparent;
        }
        .pill:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.09);
        }
        .pill.active:hover {
          filter: brightness(0.98);
        }

        .sectionHead {
          margin: 18px 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
        }
        .more {
          text-decoration: none;
          color: var(--primary);
          font-weight: 950;
          font-size: 14px;
        }
        .list {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  );
}
