'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import WhatsAppBar from '@/components/WhatsAppBar';
import ListingCard from '@/components/ListingCard';
import ChipsRow from '@/components/ChipsRow';
import { fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES } from '@/lib/taxonomy';

const DEAL_OPTS = DEAL_TYPES.map((d) => ({ label: d.label, value: d.key }));
const TYPE_OPTS = PROPERTY_TYPES.map((p) => ({ label: p, value: p }));

export default function ListingsPage() {
  const [filters, setFilters] = useState({
    neighborhood: '',
    dealType: '',
    propertyType: '',
  });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const hasNeighborhood = !!filters.neighborhood;
  const hasDeal = !!filters.dealType;

  async function load() {
    setLoading(true);
    setErr('');
    try {
      // نجلب قائمة محدودة ثم نفلتر على الواجهة لتجنب مشاكل الـIndexes
      // نجلب بدون فلترة Firestore لتجنب مشاكل الـIndexes، ثم نخفي العروض غير العامة بالواجهة
      const data = await fetchListings({ filters: {}, onlyPublic: false });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'حصل خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return items.filter((x) => {
      // إخفاء "مباع/ملغي" للزوار
      if (!['available', 'reserved'].includes(String(x.status || ''))) return false;
      if (filters.neighborhood && String(x.neighborhood || '') !== filters.neighborhood) return false;
      if (filters.dealType && String(x.dealType || '') !== filters.dealType) return false;
      if (filters.propertyType && String(x.propertyType || '') !== filters.propertyType) return false;
      return true;
    });
  }, [items, filters]);

  function clearAll() {
    setFilters({ neighborhood: '', dealType: '', propertyType: '' });
  }

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: '6px 0 4px' }}>كل العروض</h1>
            <div className="muted">فلترة سريعة: الحي ← بيع/إيجار ← نوع العقار</div>
          </div>
          <div className="row">
            <button className="btn" onClick={load} disabled={loading}>تحديث</button>
            <button className="btn" onClick={clearAll} disabled={!filters.neighborhood && !filters.dealType && !filters.propertyType}>
              مسح
            </button>
          </div>
        </div>

        <section className="filterBar card" style={{ marginTop: 12 }}>
          <div className="filterGrid">
            <div className="neigh">
              <div className="muted label">الحي</div>
              <select
                className="select"
                value={filters.neighborhood}
                onChange={(e) =>
                  setFilters({
                    neighborhood: e.target.value,
                    dealType: '',
                    propertyType: '',
                  })
                }
              >
                <option value="">كل الأحياء</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="deal">
              <div className="muted label">بيع / إيجار</div>
              <ChipsRow
                value={filters.dealType}
                options={DEAL_OPTS}
                disabled={!hasNeighborhood}
                onChange={(v) => setFilters((p) => ({ ...p, dealType: v, propertyType: '' }))}
              />
            </div>

            <div className="ptype">
              <div className="muted label">نوع العقار</div>
              <ChipsRow
                value={filters.propertyType}
                options={TYPE_OPTS}
                disabled={!hasNeighborhood || !hasDeal}
                onChange={(v) => setFilters((p) => ({ ...p, propertyType: v }))}
              />
            </div>
          </div>
        </section>

        {err ? (
          <section
            className="card"
            style={{
              marginTop: 12,
              borderColor: 'rgba(180,35,24,.25)',
              background: 'rgba(180,35,24,.05)',
            }}
          >
            {err}
          </section>
        ) : null}

        <section style={{ marginTop: 12 }}>
          {loading ? (
            <div className="card muted">جاري التحميل…</div>
          ) : filtered.length === 0 ? (
            <div className="card muted">لا توجد نتائج مطابقة.</div>
          ) : (
            <>
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>النتائج: {filtered.length}</div>
              <div className="cards">
                {filtered.map((item) => (
                  <div key={item.id} className="cardItem">
                    <ListingCard item={item} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <footer className="footer muted">إذا ما لقيت اللي تبيه، أرسل طلبك وسنجهز لك خيارات مناسبة.</footer>
      </main>

      <WhatsAppBar />

      <style jsx>{`
        .filterBar {
          position: sticky;
          top: 10px;
          z-index: 20;
          backdrop-filter: blur(6px);
        }
        .filterGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .label {
          font-size: 12px;
          margin-bottom: 6px;
        }
        @media (min-width: 900px) {
          .filterGrid {
            grid-template-columns: 1.1fr 1fr 1fr;
            align-items: end;
          }
        }
        @media (max-width: 640px) {
          .filterBar {
            top: 0px;
          }
          .label {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
