'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import ListingCard from '@/components/ListingCard';
import { fetchListings } from '@/lib/listings';
import {
  DEAL_TYPES,
  PROPERTY_CLASSES,
  getPropertyTypesByClass,
  normalizeNeighborhoodKey,
  neighborhoodLabelFromKey,
  inferPropertyClass,
  normalizeNeighborhoodName,
} from '@/lib/taxonomy';

function compactName(name) {
  return normalizeNeighborhoodName(String(name || ''))
    .replace(/^حي\s+/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export default function NeighborhoodPage({ params }) {
  const rawSlug = params?.slug || '';
  const neighborhoodKey = normalizeNeighborhoodKey(rawSlug);
  const neighborhoodLabel = neighborhoodLabelFromKey(neighborhoodKey) || decodeURIComponent(String(rawSlug));

  const [dealType, setDealType] = useState('');
  const [propertyClass, setPropertyClass] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [showClassFilter, setShowClassFilter] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

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

  // خيارات الفئات حسب فلتر سكني/تجاري
  const typeOptions = useMemo(() => getPropertyTypesByClass(propertyClass), [propertyClass]);

  // إعادة ضبط اختيار الفئة لو تغيرت قائمة الخيارات
  useEffect(() => {
    if (propertyType && !typeOptions.includes(propertyType)) {
      setPropertyType('');
    }
  }, [propertyType, typeOptions]);

  const filtered = useMemo(() => {
    const target = compactName(neighborhoodLabel);

    return (items || []).filter((x) => {
      // الحي
      const n = compactName(x.neighborhood);
      if (target && n && n !== target) return false;

      // بيع/إيجار
      if (dealType && String(x.dealType || '') !== dealType) return false;

      // سكني/تجاري
      if (propertyClass) {
        const cls = String(x.propertyClass || '').trim() || inferPropertyClass(x.propertyType);
        if (cls !== propertyClass) return false;
      }

      // الفئة
      if (propertyType && String(x.propertyType || '') !== propertyType) return false;

      return true;
    });
  }, [items, neighborhoodLabel, dealType, propertyClass, propertyType]);

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="muted" style={{ fontSize: 13 }}>حي</div>
          <h1 className="h1" style={{ margin: '4px 0 0' }}>{neighborhoodLabel}</h1>
        </div>
        <div className="row">
          <Link className="btn" href="/">الرئيسية</Link>
          <Link className="btn" href="/request">أرسل طلبك</Link>
        </div>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 950 }}>1) اختر بيع أو إيجار</div>
          <button className="btn" type="button" onClick={() => setShowClassFilter((v) => !v)} aria-expanded={showClassFilter ? 'true' : 'false'}>
            🎛️ فلاتر
          </button>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {DEAL_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={dealType === t.key ? 'btnPrimary' : 'btn'}
              onClick={() => {
                setDealType(t.key);
              }}
            >
              {t.label}
            </button>
          ))}
          {dealType ? (
            <button type="button" className="btn" onClick={() => { setDealType(''); setPropertyType(''); }}>
              مسح
            </button>
          ) : null}
        </div>

        {showClassFilter ? (
          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13 }}>فلتر العقار: سكني/تجاري</div>
            <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
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

        <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,.10)', paddingTop: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8, opacity: dealType ? 1 : 0.65 }}>2) اختر الفئة</div>

          {!dealType ? (
            <div className="muted" style={{ fontSize: 13 }}>اختر (بيع/إيجار) أولاً لعرض الفئات.</div>
          ) : (
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
                <button type="button" className="btn" onClick={() => setPropertyType('')}>مسح الفئة</button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 className="h2">العروض ({loading ? '—' : String(filtered.length)})</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              {dealType ? 'يمكنك تغيير الفلاتر لإظهار خيارات أكثر.' : 'اختر بيع/إيجار لبدء التصفية.'}
            </div>
          </div>
          <button className="btn" onClick={load} disabled={loading}>تحديث</button>
        </div>

        {err ? (
          <div className="card" style={{ marginTop: 10, borderColor: 'rgba(255,77,77,.25)', background: 'rgba(255,77,77,.08)' }}>
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="card muted" style={{ marginTop: 10 }}>جاري التحميل…</div>
        ) : filtered.length === 0 ? (
          <div className="card muted" style={{ marginTop: 10 }}>
            لا توجد عروض مطابقة حالياً.
            <div style={{ marginTop: 10 }}>
              <Link className="btnPrimary" href="/request">أرسل طلبك الآن</Link>
            </div>
          </div>
        ) : (
          <div className="cards" style={{ marginTop: 10 }}>
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
          font-size: 26px;
          font-weight: 950;
          line-height: 1.2;
        }
        .h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
        }
      `}</style>
    </div>
  );
}
