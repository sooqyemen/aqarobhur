'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ChipsRow from '@/components/ChipsRow';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

// عدّل/زِد الأحياء حسب شغلك
const NEIGHBORHOODS = [
  'الزمرد',
  'الياقوت',
  'الشراع',
  'الصواري',
  'اللؤلؤ',
  'النور',
  'الدرة',
];

const DEAL_OPTS = [
  { label: 'بيع', value: 'sale' },
  { label: 'إيجار', value: 'rent' },
];

const TYPE_OPTS = [
  { label: 'أرض', value: 'أرض' },
  { label: 'فيلا', value: 'فيلا' },
  { label: 'شقة', value: 'شقة' },
  { label: 'عمارة', value: 'عمارة' },
];

function waLink(listing) {
  const num = String(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').trim();
  const title = listing?.title || 'عرض عقاري';
  const n = listing?.neighborhood || '';
  const plan = listing?.plan ? `مخطط ${listing.plan}` : '';
  const part = listing?.part ? `جزء ${listing.part}` : '';
  const price = listing?.price ? `السعر: ${listing.price} ريال` : '';
  const url = listing?.id ? `${typeof window !== 'undefined' ? window.location.origin : ''}/listing/${listing.id}` : '';
  const msg = `السلام عليكم، مهتم بـ: ${title}\n${n}\n${plan} ${part}\n${price}\n${url}`.trim();
  return num ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : '#';
}

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

  const canQueryFirebase = useMemo(() => {
    return (
      !!firebaseConfig.apiKey &&
      !!firebaseConfig.authDomain &&
      !!firebaseConfig.projectId &&
      !!firebaseConfig.appId
    );
  }, []);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      if (!canQueryFirebase) {
        throw new Error('Firebase env ناقصة. تأكد من متغيرات NEXT_PUBLIC_FIREBASE_* في Vercel/المحلي.');
      }

      const db = getDb();
      const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(80));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const filtered = rows.filter((x) => {
        // لا نعرض المباع/الملغي
        if (x.status && ['sold', 'canceled'].includes(String(x.status))) return false;

        if (filters.neighborhood && String(x.neighborhood || '') !== filters.neighborhood) return false;
        if (filters.dealType && String(x.dealType || '') !== filters.dealType) return false;
        if (filters.propertyType && String(x.propertyType || '') !== filters.propertyType) return false;

        return true;
      });

      setItems(filtered);
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
  }, [filters.neighborhood, filters.dealType, filters.propertyType]);

  function clearAll() {
    setFilters({ neighborhood: '', dealType: '', propertyType: '' });
  }

  return (
    <main className="container" style={{ paddingTop: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: '6px 0 4px' }}>جميع العروض</h1>
          <div className="muted">اختر الحي ثم بيع/إيجار ثم نوع العقار</div>
        </div>
        <button className="btn" onClick={clearAll} disabled={!filters.neighborhood && !filters.dealType && !filters.propertyType}>
          مسح
        </button>
      </div>

      {/* ✅ شريط فلترة ثابت */}
      <section className="filterBar card">
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
              <option value="">اختر الحي</option>
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
        <section className="card" style={{ marginTop: 12, borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>
          {err}
        </section>
      ) : null}

      <section style={{ marginTop: 12 }}>
        {loading ? (
          <div className="card muted">جاري التحميل…</div>
        ) : items.length === 0 ? (
          <div className="card muted">لا توجد نتائج مطابقة.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((x) => (
              <div key={x.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 900 }}>
                    <Link href={`/listing/${x.id}`} style={{ textDecoration: 'none' }}>
                      {x.title || 'عرض'}
                    </Link>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {x.neighborhood || '—'}
                  </div>
                </div>

                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  {x.dealType === 'sale' ? 'بيع' : x.dealType === 'rent' ? 'إيجار' : '—'} • {x.propertyType || '—'}
                  {x.plan ? ` • مخطط ${x.plan}` : ''}
                  {x.part ? ` • جزء ${x.part}` : ''}
                </div>

                <div style={{ marginTop: 8, fontWeight: 900 }}>
                  {x.price ? `${x.price} ريال` : 'السعر: على السوم'}
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  <Link className="btn" href={`/listing/${x.id}`}>
                    التفاصيل
                  </Link>
                  <a className="btnPrimary" href={waLink(x)} target="_blank" rel="noreferrer">
                    واتساب
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .filterBar {
          margin-top: 12px;
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

        /* على الشاشات الأكبر نخليها صفوف منظمة */
        @media (min-width: 900px) {
          .filterGrid {
            grid-template-columns: 1.1fr 1fr 1fr;
            align-items: end;
          }
        }

        /* على الجوال نخليها مضغوطة */
        @media (max-width: 640px) {
          .filterBar {
            top: 0px;
          }
          .label {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
