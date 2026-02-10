'use client';

import { useEffect, useMemo, useState } from 'react';

import ListingCard from '@/components/ListingCard';
import { fetchListings } from '@/lib/listings';
import {
  DEAL_TYPES,
  NEIGHBORHOODS,
  PROPERTY_CLASSES,
  getPropertyTypesByClass,
  inferPropertyClass,
} from '@/lib/taxonomy';

function parseQuery() {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  return {
    neighborhood: sp.get('neighborhood') || '',
    dealType: sp.get('dealType') || '',
    propertyClass: sp.get('propertyClass') || '',
    propertyType: sp.get('propertyType') || '',
    q: sp.get('q') || '',
  };
}

export default function ListingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // filters
  const [neighborhood, setNeighborhood] = useState('');
  const [dealType, setDealType] = useState('');
  const [propertyClass, setPropertyClass] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [q, setQ] = useState('');

  const [sheetOpen, setSheetOpen] = useState(false);

  // init from url once
  useEffect(() => {
    const init = parseQuery();
    setNeighborhood(init.neighborhood);
    setDealType(init.dealType);
    setPropertyClass(init.propertyClass);
    setPropertyType(init.propertyType);
    setQ(init.q);
  }, []);

  const propertyTypes = useMemo(() => getPropertyTypesByClass(propertyClass), [propertyClass]);

  const filters = useMemo(() => {
    const cls = propertyClass || (propertyType ? inferPropertyClass(propertyType) : '');
    return {
      neighborhood: neighborhood || '',
      dealType: dealType || '',
      propertyClass: cls || '',
      propertyType: propertyType || '',
      q: q || '',
    };
  }, [neighborhood, dealType, propertyClass, propertyType, q]);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetchListings({ filters, onlyPublic: true, includeLegacy: true, max: 240 });
      setItems(res || []);
    } catch (e) {
      setErr('تعذر تحميل العروض.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // لا تبدأ قبل ما نقرأ params
    const t = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.neighborhood, filters.dealType, filters.propertyClass, filters.propertyType, filters.q]);

  function clearFilters() {
    setNeighborhood('');
    setDealType('');
    setPropertyClass('');
    setPropertyType('');
    setQ('');
  }

  const activeChips = useMemo(() => {
    const chips = [];
    if (q) chips.push({ key: 'q', label: `بحث: ${q}` });
    if (neighborhood) chips.push({ key: 'neighborhood', label: neighborhood });
    if (dealType) chips.push({ key: 'dealType', label: (DEAL_TYPES.find(d => d.key === dealType)?.label || dealType) });
    if (propertyClass) chips.push({ key: 'propertyClass', label: (PROPERTY_CLASSES.find(c => c.key === propertyClass)?.label || propertyClass) });
    if (propertyType) chips.push({ key: 'propertyType', label: propertyType });
    return chips;
  }, [q, neighborhood, dealType, propertyClass, propertyType]);

  return (
    <div className="container">
      <div className="head">
        <h1 className="h1">كل العروض</h1>
        <button className="btn" onClick={() => setSheetOpen(true)}>فلترة</button>
      </div>

      {activeChips.length ? (
        <div className="chips">
          {activeChips.map((c) => (
            <span key={c.key} className="chip">{c.label}</span>
          ))}
          <button className="chipBtn" onClick={clearFilters}>مسح</button>
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 6 }}>اختر فلترًا أو ابحث من شريط البحث بالأعلى.</div>
      )}

      {err ? <div className="card" style={{ padding: 14, marginTop: 12 }}>{err}</div> : null}

      {loading ? (
        <div className="muted" style={{ padding: '12px 0' }}>جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 16, marginTop: 12 }}>لا توجد إعلانات ضمن الفلاتر الحالية.</div>
      ) : (
        <div className="list">
          {items.map((it) => (
            <ListingCard key={it.id || it.docId || Math.random()} item={it} />
          ))}
        </div>
      )}

      {/* Bottom Sheet */}
      {sheetOpen ? (
        <div className="sheetWrap" role="dialog" aria-modal="true" aria-label="فلترة">
          <div className="backdrop" onClick={() => setSheetOpen(false)} />
          <div className="sheet">
            <div className="sheetHead">
              <div className="sheetTitle">فلترة</div>
              <button className="close" onClick={() => setSheetOpen(false)} aria-label="إغلاق">✕</button>
            </div>

            <div className="sheetBody">
              <label className="lbl">بحث</label>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: 99جس أو الياقوت..." />

              <label className="lbl">الحي</label>
              <select className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
                <option value="">كل الأحياء</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              <label className="lbl">نوع التعامل</label>
              <div className="seg">
                {DEAL_TYPES.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    className={dealType === d.key ? 'segBtn active' : 'segBtn'}
                    onClick={() => setDealType(dealType === d.key ? '' : d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <label className="lbl">تصنيف العقار</label>
              <div className="seg">
                {PROPERTY_CLASSES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={propertyClass === c.key ? 'segBtn active' : 'segBtn'}
                    onClick={() => {
                      const next = propertyClass === c.key ? '' : c.key;
                      setPropertyClass(next);
                      setPropertyType('');
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <label className="lbl">الفئة</label>
              <select
                className="input"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                disabled={!propertyClass}
              >
                <option value="">{propertyClass ? 'كل الفئات' : 'اختر التصنيف أولاً'}</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <div className="actions">
                <button className="btn" type="button" onClick={clearFilters}>مسح</button>
                <button className="btn btnPrimary" type="button" onClick={() => setSheetOpen(false)}>تطبيق</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .head{margin:16px 0 10px;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .h1{margin:0;font-size:18px;font-weight:900}
        .chips{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .chip{
          background: rgba(30,115,216,.10);
          border:1px solid rgba(30,115,216,.18);
          color: var(--primary2);
          padding:6px 10px;
          border-radius:999px;
          font-weight:900;
          font-size:12px;
        }
        .chipBtn{
          background: transparent;
          border:1px dashed rgba(15,23,42,.25);
          padding:6px 10px;
          border-radius:999px;
          font-weight:900;
          font-size:12px;
          cursor:pointer;
          color: rgba(15,23,42,.7);
        }
        .list{margin-top:12px;display:flex;flex-direction:column;gap:10px;margin-bottom:18px}

        .sheetWrap{position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end}
        .backdrop{position:absolute;inset:0;background: rgba(0,0,0,.45)}
        .sheet{
          position:relative;
          width:100%;
          max-height: 86vh;
          background: var(--bg2);
          border-radius: 18px 18px 0 0;
          border:1px solid var(--border);
          box-shadow: 0 -18px 40px rgba(0,0,0,.16);
          overflow:auto;
        }
        .sheetHead{
          display:flex;align-items:center;justify-content:space-between;gap:10px;
          padding:14px 14px 10px;
          border-bottom:1px solid var(--border);
        }
        .sheetTitle{font-weight:900}
        .close{
          width:36px;height:36px;border-radius:12px;
          border:1px solid var(--border);
          background: var(--card);
          cursor:pointer;
          font-weight:900;
        }
        .sheetBody{padding:14px}
        .lbl{display:block;margin-top:10px;margin-bottom:6px;font-weight:900}
        .seg{display:flex;gap:8px;flex-wrap:wrap}
        .segBtn{
          border:1px solid var(--border);
          background: var(--card);
          border-radius:999px;
          padding:8px 12px;
          cursor:pointer;
          font-weight:900;
          font-size:13px;
          color: var(--text);
        }
        .segBtn.active{
          background: rgba(30,115,216,.10);
          border-color: rgba(30,115,216,.26);
          color: var(--primary2);
        }
        .actions{display:flex;gap:10px;margin-top:14px}
        .actions .btn{flex:1}
      `}</style>
    </div>
  );
}
