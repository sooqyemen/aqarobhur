'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import ListingCard from '@/components/ListingCard';

import { fetchLatestListings } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await fetchLatestListings({ n: 12, onlyPublic: true, includeLegacy: true });
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

  const publicItems = useMemo(() => {
    return items.filter((x) => ['available', 'reserved'].includes(String(x.status || '')));
  }, [items]);

  return (
    <div className="container" style={{ paddingTop: 16 }}>
        <section className="hero card">
          <div className="heroTop">
            <div>
              <div className="kicker">عروض مباشرة • شمال جدة</div>
              <h1 className="h1">عقار أبحر</h1>
              <p className="muted p">
                تصفح أحدث العروض أو أرسل طلبك (حي/جزء/ميزانية) ونرجع لك بخيارات مناسبة.
              </p>

              <div className="heroBtns">
                <Link className="btnPrimary" href="/listings">تصفح كل العروض</Link>
                <Link className="btn" href="/request">أرسل طلبك</Link>
                <button className="btn" onClick={load} disabled={loading}>تحديث</button>
              </div>

              <div className="wave" aria-hidden="true" />
            </div>

            <div className="stats">
              <div className="stat card">
                <div className="muted">أحدث العروض</div>
                <div className="num">{loading ? '—' : String(publicItems.length)}</div>
              </div>
              <div className="stat card">
                <div className="muted">الأحياء</div>
                <div className="num">{NEIGHBORHOODS.length}</div>
              </div>
              <div className="stat card">
                <div className="muted">الرد</div>
                <div className="num">سريع</div>
              </div>
            </div>
          </div>

          <div className="heroNotes">
            <span className="badge ok">مباشر</span>
            <span className="badge">بيع / إيجار</span>
            <span className="badge warn">محجوز</span>
            <span className="badge sold">مباع (مخفي للزوار)</span>
          </div>
        </section>

        {err ? (
          <section className="card errBox">
            {err}
          </section>
        ) : null}

        <section style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 className="h2">أحدث العروض</h2>
              <div className="muted" style={{ fontSize: 13 }}>آخر ما تم إضافته في قاعدة البيانات</div>
            </div>
            <Link className="btn" href="/listings">عرض الكل</Link>
          </div>

          {loading ? (
            <div className="card muted" style={{ marginTop: 10 }}>جاري التحميل…</div>
          ) : publicItems.length === 0 ? (
            <div className="card muted" style={{ marginTop: 10 }}>لا توجد عروض متاحة حالياً.</div>
          ) : (
            <div className="cards" style={{ marginTop: 10 }}>
              {publicItems.map((item) => (
                <div key={item.id} className="cardItem">
                  <ListingCard item={item} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cta card" style={{ marginTop: 12 }}>
          <div className="ctaInner">
            <div>
              <h2 className="h2" style={{ margin: 0 }}>ما لقيت اللي تبيه؟</h2>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.8 }}>
                ارسل طلبك الآن (الحي/الجزء/نوع العقار/الميزانية) ونجهز لك 3–4 خيارات مناسبة.
              </div>
            </div>
            <div className="row">
              <Link className="btnPrimary" href="/request">أرسل طلبك الآن</Link>
              <Link className="btn" href="/listings">تصفح العروض</Link>
            </div>
          </div>
        </section>

      
      <style jsx>{`
        .hero {
          padding: 14px;
          background:
            radial-gradient(circle at 12% 5%, rgba(214,179,91,.18), transparent 55%),
            radial-gradient(circle at 88% 40%, rgba(79,117,255,.16), transparent 58%),
            rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.10);
        }
        .heroTop {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 900px) {
          .heroTop {
            grid-template-columns: 1.4fr 0.9fr;
            align-items: start;
          }
        }
        .kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 900;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(214,179,91,.30);
          background: rgba(214,179,91,.08);
          width: fit-content;
        }
        .h1 {
          margin: 10px 0 6px;
          font-size: 32px;
          line-height: 1.15;
          font-weight: 950;
        }
        .h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
        }
        .p {
          margin: 0;
          font-size: 14px;
          line-height: 1.8;
        }
        .heroBtns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .wave {
          margin-top: 12px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .stat {
          padding: 12px;
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.10);
        }
        .num {
          margin-top: 6px;
          font-weight: 950;
          font-size: 22px;
        }
        .heroNotes {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .errBox {
          margin-top: 12px;
          border-color: rgba(255,77,77, 0.25);
          background: rgba(255,77,77, 0.08);
        }
        .cta {
          background: linear-gradient(135deg, rgba(214,179,91,.10), rgba(255,255,255,.03));
          border-color: rgba(214,179,91,.18);
        }
        .ctaInner {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          align-items: center;
        }
        @media (min-width: 900px) {
          .ctaInner {
            grid-template-columns: 1.2fr 0.8fr;
          }
        }
      `}</style>
    </div>
  );
}
