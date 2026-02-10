'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import ListingCard from '@/components/ListingCard';

import { fetchListings } from '@/lib/listings';
import {
  DEAL_TYPES,
  NEIGHBORHOODS,
  PROPERTY_CLASSES,
  getPropertyTypesByClass,
  inferPropertyClass,
  normalizeNeighborhoodName,
} from '@/lib/taxonomy';

export default function ListingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // filters
  const [neighborhood, setNeighborhood] = useState('');
  const [dealType, setDealType] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyClass, setPropertyClass] = useState('');
  const [showClassFilter, setShowClassFilter] = useState(false);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await fetchListings({ onlyPublic: true, includeLegacy: false, max: 260 });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || '');
      if (msg.includes('Missing or insufficient permissions')) {
        setErr('تعذر تحميل العروض حالياً (صلاحيات).');
      } else {
        setErr(msg || 'حصل خطأ غير متوقع');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeOptions = useMemo(() => getPropertyTypesByClass(propertyClass), [propertyClass]);

  // إذا تغيرت سكني/تجاري واحتمال الفئة الحالية صارت غير موجودة
  useEffect(() => {
    if (propertyType && !typeOptions.includes(propertyType)) {
      setPropertyType('');
    }
  }, [propertyType, typeOptions]);

  const filtered = useMemo(() => {
    const nTarget = normalizeNeighborhoodName(neighborhood);

    return (items || []).filter((x) => {
      if (nTarget && normalizeNeighborhoodName(x.neighborhood) !== nTarget) return false;
      if (dealType && String(x.dealType || '') !== dealType) return false;

      if (propertyClass) {
        const cls = String(x.propertyClass || '').trim() || inferPropertyClass(x.propertyType);
        if (cls !== propertyClass) return false;
      }

      if (propertyType && String(x.propertyType || '') !== propertyType) return false;
      return true;
    });
  }, [items, neighborhood, dealType, propertyType, propertyClass]);

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="h1">كل العروض</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            المتاح/المحجوز فقط يظهر للزوار.
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={load} disabled={loading}>تحديث</button>
          <Link className="btn" href={`/map?neighborhood=${encodeURIComponent(neighborhood)}&dealType=${encodeURIComponent(dealType)}&propertyType=${encodeURIComponent(propertyType)}&propertyClass=${encodeURIComponent(propertyClass)}`}>الخريطة</Link>
          <Link className="btn" href="/request">أرسل طلبك</Link>
        </div>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 950 }}>الفلاتر</div>
          <button className="btn" type="button" onClick={() => setShowClassFilter((v) => !v)} aria-expanded={showClassFilter ? 'true' : 'false'}>
            🎛️ سكني/تجاري
          </button>
        </div>

        <div className="grid" style={{ marginTop: 10, gap: 10 }}>
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الحي</div>
            <select className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
              <option value="">الكل</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>بيع/إيجار</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {DEAL_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={dealType === t.key ? 'btnPrimary' : 'btn'}
                  onClick={() => setDealType((v) => (v === t.key ? '' : t.key))}
                >
                  {t.label}
                </button>
              ))}
              {dealType ? (
                <button type="button" className="btn" onClick={() => setDealType('')}>مسح</button>
              ) : null}
            </div>
          </div>

          {showClassFilter ? (
            <div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>نوع العقار</div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={!propertyClass ? 'btnPrimary' : 'btn'}
                  onClick={() => setPropertyClass('')}
                >
                  الكل
                </button>
                {PROPERTY_CLASSES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={propertyClass === c.key ? 'btnPrimary' : 'btn'}
                    onClick={() => setPropertyClass(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الفئة</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {typeOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={propertyType === t ? 'btnPrimary' : 'btn'}
                  onClick={() => setPropertyType((v) => (v === t ? '' : t))}
                >
                  {t}
                </button>
              ))}
              {propertyType ? (
                <button type="button" className="btn" onClick={() => setPropertyType('')}>مسح</button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13 }}>النتائج: {loading ? '—' : String(filtered.length)}</div>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setNeighborhood('');
              setDealType('');
              setPropertyType('');
              setPropertyClass('');
            }}
          >
            مسح كل الفلاتر
          </button>
        </div>
      </section>

      {err ? (
        <section className="card" style={{ marginTop: 12, borderColor: 'rgba(255,77,77,.25)', background: 'rgba(255,77,77,.08)' }}>
          {err}
        </section>
      ) : null}

      <section style={{ marginTop: 12 }}>
        {loading ? (
          <div className="card muted">جاري التحميل…</div>
        ) : filtered.length === 0 ? (
          <div className="card muted">
            لا توجد عروض مطابقة.
            <div style={{ marginTop: 10 }}>
              <Link className="btnPrimary" href="/request">أرسل طلبك الآن</Link>
            </div>
          </div>
        ) : (
          <div className="cards">
            {filtered.map((item) => (
              <div key={item.id} className="cardItem">
                <ListingCard item={item} />
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 950;
        }
      `}</style>
    </div>
  );
}
