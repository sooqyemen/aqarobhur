'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import ListingCard from '@/components/ListingCard';
import NeighborhoodGrid from '@/components/NeighborhoodGrid';
import { fetchLatestListings } from '@/lib/listings';

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

  const handleSearch = (e) => {
    e.preventDefault();
    const value = (q || '').trim();
    if (!value) {
      router.push('/listings');
      return;
    }
    router.push(`/listings?q=${encodeURIComponent(value)}`);
  };

  return (
    <div className="container" style={{ paddingBottom: 92 }}>
      <SearchBar q={q} setQ={setQ} onSubmit={handleSearch} />
      <NeighborhoodGrid />
      <QuickLinks />

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
          gap: 12px;
          flex-wrap: wrap;
        }
        .pill {
          background: rgba(30, 30, 40, 0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(214, 179, 91, 0.25);
          color: #f0e9d8;
          padding: 12px 24px;
          border-radius: 40px;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.3px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pill.active {
          background: linear-gradient(145deg, #d6b35b, #c09c44);
          color: #1a1a1a;
          border-color: transparent;
          font-weight: 700;
          box-shadow: 0 6px 14px rgba(214, 179, 91, 0.3);
        }
        .pill:hover {
          transform: translateY(-3px);
          background: rgba(50, 50, 60, 0.9);
          border-color: rgba(214, 179, 91, 0.5);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
        }
        .pill.active:hover {
          background: linear-gradient(145deg, #e0bc6c, #c9a74d);
          filter: brightness(1.02);
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

function SearchBar({ q, setQ, onSubmit }) {
  return (
    <form className="searchBar" onSubmit={onSubmit}>
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
  );
}

function QuickLinks() {
  const pathname = usePathname();

  const links = [
    { href: '/listings', label: 'كل العروض' },
    { href: '/listings?dealType=sale', label: 'بيع' },
    { href: '/listings?dealType=rent', label: 'إيجار' },
    { href: '/map', label: 'الخريطة' },
  ];

  // دالة بسيطة لتحديد إذا كان الرابط هو الرابط النشط (تجاهل query parameters)
  const isActive = (href) => {
    const baseHref = href.split('?')[0];
    return pathname === baseHref;
  };

  return (
    <div className="quickBar">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`pill ${isActive(link.href) ? 'active' : ''}`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
