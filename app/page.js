'use client';

import { useEffect, useMemo, useState } from 'react';
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
        const res = await fetchLatestListings({ n: 8 });
        if (!alive) return;
        setItems(Array.isArray(res) ? res : []);
      } catch {
        if (!alive) return;
        setErr('تعذر تحميل أحدث العروض حاليًا.');
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

  return (
    <div className="container" style={{ display: 'grid', gap: 16 }}>
      <section className="card" style={{ padding: 20 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.35, fontWeight: 950 }}>
              عروض عقارية في أبحر الشمالية وشمال جدة
            </h1>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.9, fontSize: 15 }}>
              تصفح العروض بسهولة، انتقل للخريطة، أو أرسل طلبك مباشرة حسب الحي ونوع العقار والميزانية.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/listings" className="btn btnPrimary">
              كل العروض
            </Link>
            <Link href="/request" className="btn">
              أرسل طلبك
            </Link>
            <Link href="/map" className="btn">
              الخريطة
            </Link>
          </div>
        </div>
      </section>

      <NeighborhoodGrid title="الأحياء" showViewAll />

      <section style={{ display: 'grid', gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div className="sectionTitle" style={{ margin: 0 }}>أحدث العروض</div>
            <div style={{ color: 'var(--muted)', marginTop: 6, lineHeight: 1.8 }}>
              آخر الإعلانات المضافة بشكل مختصر وواضح.
            </div>
          </div>

          <Link href="/listings" className="btn">
            عرض الكل
          </Link>
        </div>

        {err ? <div className="card" style={{ padding: 14 }}>{err}</div> : null}

        {loading ? (
          <div className="card" style={{ padding: 18 }}>جاري تحميل العروض…</div>
        ) : safeItems.length === 0 ? (
          <div className="card" style={{ padding: 18 }}>لا توجد عروض متاحة حاليًا.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {safeItems.map((item) => (
              <ListingCard key={item.__key} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="sectionTitle" style={{ margin: 0 }}>هل تبحث عن عقار محدد؟</div>
          <div style={{ color: 'var(--muted)', lineHeight: 1.9 }}>
            أرسل تفاصيل طلبك وسنرتب لك الخيارات الأنسب بشكل أسرع.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/request" className="btn btnPrimary">
              إنشاء طلب
            </Link>
            <Link href="/neighborhoods" className="btn">
              استعراض الأحياء
            </Link>
          </div>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 640px) {
          h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
