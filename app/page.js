'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import WhatsAppBar from '@/components/WhatsAppBar';
import ListingCard from '@/components/ListingCard';
import { fetchLatestListings } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [neighborhood, setNeighborhood] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchLatestListings({ onlyAvailable: true, n: 12 });
        if (live) setItems(data);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!neighborhood) return items;
    return items.filter(x => x.neighborhood === neighborhood);
  }, [items, neighborhood]);

  return (
    <>
      <Header />
      <main className="container">
        <section className="hero">
          <div className="wave" />
          <h1 style={{ margin: '14px 0 6px' }}>عقار أبحر</h1>
          <div className="muted">عروض عقارية موثوقة في أبحر الشمالية وشمال جدة</div>

          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btnPrimary" href="/request">أرسل طلبك الآن</Link>
            <Link className="btn" href="/listings">تصفح كل العروض</Link>
          </div>
        </section>

        <section className="card" style={{ marginTop: 12 }}>
          <div className="grid">
            <div className="col-6">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>فلترة سريعة بالحي</div>
              <select className="select" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
                <option value="">كل الأحياء</option>
                {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="col-6">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>معلومة</div>
              <div className="muted">العروض الظاهرة للزوار: “متاح / محجوز”. العروض “المباعة” لا تظهر.</div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: '8px 0' }}>أحدث العروض</h2>
            <Link className="btn" href="/listings">عرض الكل</Link>
          </div>
          {loading ? (
            <div className="muted">جاري تحميل العروض…</div>
          ) : filtered.length === 0 ? (
            <div className="card muted">لا توجد عروض مطابقة الآن.</div>
          ) : (
            <div className="cards">
              {filtered.map(item => (
                <div key={item.id} className="cardItem">
                  <ListingCard item={item} />
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="footer muted">© {new Date().getFullYear()} عقار أبحر</footer>
      </main>
      <WhatsAppBar />
    </>
  );
}
