'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import ListingCard from '@/components/ListingCard';
import NeighborhoodGrid from '@/components/NeighborhoodGrid';
import { fetchLatestListings } from '@/lib/listings';

const QUICK_LINKS = [
  { href: '/listings', label: 'كل العروض' },
  { href: '/listings?dealType=sale', label: 'بيع' },
  { href: '/listings?dealType=rent', label: 'إيجار' },
  { href: '/map', label: 'الخريطة' },
  { href: '/request', label: 'أرسل طلبك' },
];

function StatCard({ label, value, hint }) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        minHeight: 112,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ color: 'var(--muted)', fontWeight: 800, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 950, lineHeight: 1.1 }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>{hint}</div>
    </div>
  );
}

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetchLatestListings({ n: 9 });
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

  const stats = useMemo(() => {
    const total = safeItems.length;
    const sale = safeItems.filter((item) => String(item?.dealType || '') === 'sale').length;
    const rent = safeItems.filter((item) => String(item?.dealType || '') === 'rent').length;

    return {
      total,
      sale,
      rent,
    };
  }, [safeItems]);

  return (
    <div className="container" style={{ display: 'grid', gap: 18 }}>
      <section
        className="card"
        style={{
          padding: 22,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.94)), radial-gradient(circle at top right, rgba(214,179,91,0.18), transparent 34%)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(280px, 0.9fr)',
            gap: 18,
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                minHeight: 36,
                padding: '0 14px',
                borderRadius: 999,
                background: 'rgba(214, 179, 91, 0.16)',
                border: '1px solid rgba(214, 179, 91, 0.35)',
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              عقارات أبحر الشمالية وشمال جدة
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.25, fontWeight: 950 }}>
                واجهة أوضح لعرض العقارات والطلبات في مكان واحد
              </h1>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 16, lineHeight: 1.9 }}>
                استعرض أحدث العروض، انتقل إلى الخريطة، أو أرسل طلبك مباشرة ليصلك الأنسب حسب الحي ونوع العقار.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/listings" className="btn btnPrimary">
                تصفح العروض
              </Link>
              <Link href="/request" className="btn">
                أرسل طلبك
              </Link>
              <Link href="/map" className="btn">
                افتح الخريطة
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <StatCard
              label="العروض الظاهرة"
              value={loading ? '—' : stats.total}
              hint="أحدث العقارات المتاحة التي تم تحميلها في الصفحة الرئيسية."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <StatCard label="للبيع" value={loading ? '—' : stats.sale} hint="عروض البيع الحالية." />
              <StatCard label="للإيجار" value={loading ? '—' : stats.rent} hint="عروض الإيجار الحالية." />
            </div>
          </div>
        </div>
      </section>

      <NeighborhoodGrid title="تصفح حسب الحي" showViewAll />

      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div className="sectionTitle" style={{ margin: 0 }}>الوصول السريع</div>
            <div style={{ color: 'var(--muted)', marginTop: 6, lineHeight: 1.8 }}>
              اختصارات مباشرة للوصول إلى أكثر الأقسام استخدامًا داخل الموقع.
            </div>
          </div>

          <div className="quickBarHome" style={{ margin: 0 }}>
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="pill">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div className="sectionTitle" style={{ margin: 0 }}>أحدث العروض</div>
            <div style={{ color: 'var(--muted)', marginTop: 6, lineHeight: 1.8 }}>
              عرض مختصر لآخر الإعلانات المضافة، مع إمكانية الانتقال إلى جميع النتائج.
            </div>
          </div>

          <Link href="/listings" className="btn">
            عرض كل الإعلانات
          </Link>
        </div>

        {err ? (
          <div className="card" style={{ padding: 14 }}>{err}</div>
        ) : null}

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
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="sectionTitle" style={{ margin: 0 }}>هل تبحث عن عقار بمواصفات محددة؟</div>
          <div style={{ color: 'var(--muted)', lineHeight: 1.9 }}>
            يمكنك إرسال طلبك مع نوع العقار والحي والميزانية، ثم متابعة الخيارات المناسبة لك بشكل أسرع.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/request" className="btn btnPrimary">
              إنشاء طلب جديد
            </Link>
            <Link href="/neighborhoods" className="btn">
              استعراض الأحياء
            </Link>
          </div>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 900px) {
          section.card > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          h1 {
            font-size: 26px !important;
          }
        }
      `}</style>
    </div>
  );
}
