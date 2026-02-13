'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import ListingCard from '@/components/ListingCard';
import NeighborhoodGrid from '@/components/NeighborhoodGrid';
import { fetchLatestListings } from '@/lib/listings';

// مكون منفصل للشيبس حتى نتمكن من استخدام useSearchParams بأمان
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

  // تحديد الرابط النشط
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

    return () => {
      alive = false;
    };
  }, []);

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
      {/* بحث */}
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

      {/* الأحياء */}
      <NeighborhoodGrid />

      {/* الشيبس - نلفها بـ Suspense لأنها تستخدم useSearchParams */}
      <Suspense fallback={<div className="quickBar">جاري التحميل...</div>}>
        <QuickLinks />
      </Suspense>

      {/* أحدث العروض */}
      <div className="sectionHead">
        <h2 className="h2">أحدث العروض</h2>
        <Link href="/listings" className="more">
          تصفح الكل
        </Link>
      </div>

      {err && (
        <div className="card" style={{ padding: 14 }}>
          {err}
        </div>
      )}

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
          white-space: nowrap; /* يمنع النص من الالتفاف */
        }
        .pill.active {
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          color: #1f2937;
          border-color: transparent;
        }
        .pill:hover {
          transform: translateY(-1px);
          background: #f3f4f6;
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
