'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import WhatsAppBar from '@/components/WhatsAppBar';
import ListingCard from '@/components/ListingCard';
import { fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES } from '@/lib/taxonomy';

export default function ListingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    neighborhood: '',
    dealType: '',
    propertyType: '',
    plan: '',
    part: '',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await fetchListings({ filters, onlyPublic: true });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 14 }}>
        <h1 style={{ margin: '6px 0 4px' }}>كل العروض</h1>
        <div className="muted">فلترة العروض حسب الحي/النوع/المخطط/الجزء</div>

        <section className="card" style={{ marginTop: 12 }}>
          <div className="grid">
            <div className="col-3">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الحي</div>
              <select className="select" value={filters.neighborhood} onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}>
                <option value="">الكل</option>
                {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="col-3">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>نوع العملية</div>
              <select className="select" value={filters.dealType} onChange={(e) => setFilters({ ...filters, dealType: e.target.value })}>
                <option value="">الكل</option>
                {DEAL_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>

            <div className="col-3">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>نوع العقار</div>
              <select className="select" value={filters.propertyType} onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}>
                <option value="">الكل</option>
                {PROPERTY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="col-3">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>المخطط</div>
              <input className="input" placeholder="مثال: 505 أو 99جس" value={filters.plan} onChange={(e) => setFilters({ ...filters, plan: e.target.value })} />
            </div>

            <div className="col-3">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الجزء</div>
              <input className="input" placeholder="مثال: 1ط أو 2ر" value={filters.part} onChange={(e) => setFilters({ ...filters, part: e.target.value })} />
            </div>

            <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setFilters({ neighborhood:'', dealType:'', propertyType:'', plan:'', part:'' }); }}>
                مسح
              </button>
              <button className="btnPrimary" onClick={load}>بحث</button>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 12 }}>
          {loading ? (
            <div className="muted">جاري تحميل…</div>
          ) : items.length === 0 ? (
            <div className="card muted">لا توجد عروض مطابقة.</div>
          ) : (
            <div className="cards">
              {items.map(item => (
                <div key={item.id} className="cardItem">
                  <ListingCard item={item} />
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="footer muted">ملاحظة: يتم إخفاء “مباع” عن الزوار تلقائيًا.</footer>
      </main>
      <WhatsAppBar />
    </>
  );
}
