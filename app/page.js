'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

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
    <div className="quickBarHome">
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    const loadListings = async () => {
      try {
        setLoading(true);
        const res = await fetchLatestListings(12);
        if (!alive) return;
        setItems(res || []);
      } catch (error) {
        if (!alive) return;
        setErr('تعذر تحميل أحدث العروض.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    
    loadListings();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="container">
      {/* ✅ أحياء */}
      <NeighborhoodGrid />

      {/* ✅ اختصارات سريعة */}
      <Suspense fallback={<div className="quickBarHome" style={{ opacity: 0.5 }}>جاري التحميل...</div>}>
        <QuickLinks />
      </Suspense>

      <div 
        className="row" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '24px', 
          marginBottom: '16px' 
        }}
      >
        <h2 className="sectionTitle" style={{ margin: 0, fontSize: '1.25rem' }}>
          أحدث العروض
        </h2>
        <Link href="/listings" className="btn">
          تصفح الكل
        </Link>
      </div>

      {err && (
        <div className="card" style={{ padding: 14, marginTop: 12, color: '#d32f2f', backgroundColor: '#fee' }}>
          {err}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          جاري تحميل العروض…
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          لا توجد عروض حتى الآن.
        </div>
      ) : (
        <div 
          style={{ 
            marginTop: 12, 
            display: 'grid', 
            gap: '16px',
            // هذا السطر يضمن تجاوب العروض مع جميع الشاشات (جوال، تابلت، كمبيوتر)
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
          }}
        >
          {items.map((it, index) => (
            <ListingCard key={it.id || it.docId || `idx-${index}`} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}
