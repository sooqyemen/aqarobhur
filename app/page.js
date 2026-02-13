'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import ListingCard from '@/components/ListingCard';
import NeighborhoodGrid from '@/components/NeighborhoodGrid';
import { fetchLatestListings } from '@/lib/listings';

function QuickLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dealType = searchParams.get('dealType') || '';

  const links = [
    { href: '/listings', label: 'كل العروض', value: '' },
    { href: '/listings?dealType=sale', label: 'بيع', value: 'sale' },
    { href: '/listings?dealType=rent', label: 'إيجار', value: 'rent' },
    { href: '/map', label: 'الخريطة', value: 'map' },
  ];

  const isActive = (link) => {
    if (link.href.startsWith('/listings')) {
      return pathname === '/listings' && dealType === link.value;
    }
    return pathname === link.href;
  };

  return (
    <div className="quickBar">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`pill ${isActive(link) ? 'active' : ''}`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
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
    return () => { alive = false; };
  }, []);

  const safeItems = useMemo(() => {
    return (items || []).map((it, index) => ({
      __key: it?.id || it?.docId || `idx-${index}`,
      ...it,
    }));
  }, [items]);

  const onSearch = (e) => {
    e.preventDefault();
    const value = (q || '').trim();
    router.push(value ? `/listings?q=${encodeURIComponent(value)}` : '/listings');
  };

  return (
    <div className="container" style={{ paddingBottom: 92 }}>
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
          <button className="btn btnPrimary" type="submit">بحث</button>
        </div>
      </form>

      <NeighborhoodGrid />

      <Suspense fallback={<div className="quickBar">جاري التحميل...</div>}>
        <QuickLinks />
      </Suspense>

      <div className="sectionHead">
        <h2 className="h2">أحدث العروض</h2>
        <Link href="/listings" className="more">تصفح الكل</Link>
      </div>

      {err && <div className="card" style={{ padding: 14 }}>{err}</div>}
      {loading && <div className="muted" style={{ padding: '10px 0' }}>جاري التحميل…</div>}
      {!loading && safeItems.length === 0 && (
        <div className="card" style={{ padding: 16 }}>لا توجد عروض حتى الآن.</div>
      )}
      {!loading && safeItems.length > 0 && (
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

        /* ========== تنسيقات الأزرار السريعة (شيبس) ========== */
        .quickBar {
          margin: 20px 0 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px !important;          /* مسافة أفقية بين الأزرار */
          row-gap: 12px;                  /* مسافة عمودية في حالة الالتفاف */
          justify-content: flex-start;    /* محاذاة لليسار (في RTL تلقائي) */
          align-items: center;
        }

        .pill {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          padding: 12px 28px !important;
          background: rgba(214, 179, 91, 0.1) !important;
          border: 1px solid rgba(214, 179, 91, 0.18) !important;
          border-radius: 999px !important;
          color: #f6f0df !important;
          font-weight: 950 !important;
          font-size: 16px !important;
          line-height: 1.2 !important;
          text-decoration: none !important;
          white-space: nowrap !important;      /* يمنع النص من الالتفاف */
          letter-spacing: 0.3px !important;    /* مسافة بسيطة بين الأحرف */
          transition: transform 120ms ease, background 120ms ease !important;
          cursor: pointer !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
          margin: 0 !important;                 /* إلغاء أي هوامش */
        }

        .pill.active {
          background: linear-gradient(135deg, var(--primary), var(--primary2)) !important;
          color: #1f2937 !important;
          border-color: transparent !important;
          box-shadow: 0 6px 14px rgba(214, 179, 91, 0.3) !important;
        }

        .pill:hover {
          transform: translateY(-2px) !important;
          background: #f3f4f6 !important;
          border-color: rgba(214, 179, 91, 0.3) !important;
        }

        .pill.active:hover {
          background: linear-gradient(135deg, var(--primary2), var(--primary)) !important;
          filter: brightness(1.02) !important;
        }

        /* ========== باقي التنسيقات ========== */
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
