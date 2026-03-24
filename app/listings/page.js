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

function chipStyle(active) {
  return {
    border: active ? '1px solid rgba(214, 179, 91, 0.40)' : '1px solid var(--border)',
    background: active ? 'rgba(214, 179, 91, 0.12)' : '#fff',
    borderRadius: 999,
    padding: '9px 13px',
    cursor: 'pointer',
    fontWeight: 900,
    fontSize: 13,
    color: active ? '#8a6500' : 'var(--text)',
  };
}

export default function ListingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [neighborhood, setNeighborhood] = useState('');
  const [dealType, setDealType] = useState('');
  const [propertyClass, setPropertyClass] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [q, setQ] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const res = await fetchListings({ filters, onlyPublic: true, includeLegacy: true, max: 240 });
        if (active) setItems(res || []);
      } catch {
        if (active) setErr('تعذر تحميل العروض حالياً.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [filters]);

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
    if (dealType) chips.push({ key: 'dealType', label: DEAL_TYPES.find((d) => d.key === dealType)?.label || dealType });
    if (propertyClass) chips.push({ key: 'propertyClass', label: PROPERTY_CLASSES.find((c) => c.key === propertyClass)?.label || propertyClass });
    if (propertyType) chips.push({ key: 'propertyType', label: propertyType });
    return chips;
  }, [q, neighborhood, dealType, propertyClass, propertyType]);

  return (
    <div className="container" style={{ paddingTop: 8, paddingBottom: 18 }}>
      <div
        className="card"
        style={{
          padding: 16,
          background: 'linear-gradient(180deg, #ffffff, #fffdf8)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 340px' }}>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 8 }}>العقارات المتاحة</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 950 }}>كل العروض</h1>
            <div style={{ color: 'var(--muted)', marginTop: 8, lineHeight: 1.8 }}>
              تصفح العروض، وابحث بالحي أو نوع العقار أو نوع التعامل حتى تصل إلى النتيجة المناسبة بسرعة.
            </div>
          </div>

          <div
            style={{
              minWidth: 190,
              border: '1px solid var(--border)',
              background: '#fff',
              borderRadius: 18,
              padding: '14px 16px',
            }}
          >
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>عدد النتائج</div>
            <div style={{ fontWeight: 950, fontSize: 28 }}>{loading ? '...' : items.length}</div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 10,
            marginTop: 14,
          }}
        >
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم الحي أو المخطط أو جزء الأرض"
          />
          <button className="btn" type="button" onClick={() => setSheetOpen(true)}>
            الفلاتر
          </button>
        </div>
      </div>

      {activeChips.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              style={{
                border: '1px solid rgba(214, 179, 91, 0.35)',
                background: 'rgba(214, 179, 91, 0.10)',
                color: '#8a6500',
                borderRadius: 999,
                padding: '7px 12px',
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              {chip.label}
            </span>
          ))}
          <button className="btn" type="button" onClick={clearFilters}>
            مسح الكل
          </button>
        </div>
      ) : null}

      {err ? (
        <div className="card" style={{ padding: 16, marginTop: 14 }}>{err}</div>
      ) : null}

      {loading ? (
        <div className="card" style={{ padding: 18, marginTop: 14 }}>جاري تحميل العروض...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 18, marginTop: 14 }}>
          لا توجد نتائج مطابقة للفلاتر الحالية.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          {items.map((it, idx) => (
            <ListingCard key={it.id || it.docId || `idx-${idx}`} item={it} compact />
          ))}
        </div>
      )}

      {sheetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="الفلاتر"
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={() => setSheetOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.42)' }}
          />

          <div
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: '86vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              border: '1px solid var(--border)',
              boxShadow: '0 -18px 40px rgba(0,0,0,.16)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <strong>فلترة العروض</strong>
              <button className="btn" type="button" onClick={() => setSheetOpen(false)}>
                إغلاق
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 900 }}>الحي</label>
              <select className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
                <option value="">كل الأحياء</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <label style={{ display: 'block', marginTop: 14, marginBottom: 8, fontWeight: 900 }}>نوع التعامل</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DEAL_TYPES.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDealType(dealType === d.key ? '' : d.key)}
                    style={chipStyle(dealType === d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', marginTop: 14, marginBottom: 8, fontWeight: 900 }}>تصنيف العقار</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROPERTY_CLASSES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      const next = propertyClass === c.key ? '' : c.key;
                      setPropertyClass(next);
                      setPropertyType('');
                    }}
                    style={chipStyle(propertyClass === c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', marginTop: 14, marginBottom: 6, fontWeight: 900 }}>الفئة</label>
              <select
                className="input"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                disabled={!propertyClass}
              >
                <option value="">{propertyClass ? 'كل الفئات' : 'اختر التصنيف أولاً'}</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn" type="button" onClick={clearFilters} style={{ flex: 1 }}>
                  مسح
                </button>
                <button className="btn btnPrimary" type="button" onClick={() => setSheetOpen(false)} style={{ flex: 1 }}>
                  تطبيق
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @media (max-width: 760px) {
          div[style*='grid-template-columns: minmax(0, 1fr) auto'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
