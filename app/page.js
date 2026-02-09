'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ListingCard from '@/components/ListingCard';
import HomeSmartSearch from '@/components/HomeSmartSearch'; // ✅ استيراد مكون البحث الجديد
import { fetchLatestListings } from '@/lib/listings';

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      // ✅ جلب البيانات بدون Legacy لتجنب مشاكل الصلاحيات
      const data = await fetchLatestListings({ n: 12, onlyPublic: false, includeLegacy: false });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || '');
      if (msg.includes('Missing or insufficient permissions')) {
        setErr('تعذر تحميل العروض حالياً (صلاحيات). إذا كنت الأدمن سجّل دخولك، أو انتظر اكتمال الإعدادات.');
      } else if (msg.includes('requires an index') || msg.includes('create it here')) {
        setErr('تعذر تحميل العروض حالياً لأن قاعدة البيانات تحتاج فهرس (Index). افتح الرابط في رسالة الخطأ وأنشئ الفهرس ثم انتظر تفعيله.');
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

  const publicItems = useMemo(() => {
    return items.filter((x) => ['available', 'reserved'].includes(String(x.status || '')));
  }, [items]);

  return (
    <div className="container" style={{ paddingTop: 16 }}>
        <section className="hero card">
          <div className="heroTop">
            <div className="heroContent">
              <div className="kicker">عروض مباشرة • شمال جدة</div>
              <h1 className="h1">عقار أبحر</h1>
              <p className="muted p">
                الوجهة الأولى للعقارات المميزة في شمال جدة. تصفح أحدث الفرص أو ابحث في حيك المفضل.
              </p>

              {/* ✅ تم استبدال الأزرار القديمة بمكون البحث الذكي */}
              <div style={{ marginTop: 24, marginBottom: 10 }}>
                <HomeSmartSearch />
              </div>
            </div>
          </div>
        </section>

        {err ? (
          <section className="card errBox">
            {err}
          </section>
        ) : null}

        <section style={{ marginTop: 24 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 className="h2">أحدث العروض</h2>
              <div className="muted" style={{ fontSize: 13 }}>آخر ما تم إضافته في قاعدة البيانات</div>
            </div>
            <div className="row">
               <button className="btn" onClick={load} disabled={loading}>تحديث</button>
               <Link className="btn" href="/listings">عرض الكل</Link>
            </div>
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

        <section className="cta card" style={{ marginTop: 24 }}>
          <div className="ctaInner">
            <div>
              <h2 className="h2" style={{ margin: 0 }}>ما لقيت اللي تبيه؟</h2>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.8 }}>
                ارسل طلبك الآن (الحي/الجزء/نوع العقار/الميزانية) ونجهز لك خيارات مناسبة.
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
          padding: 24px;
          background:
            radial-gradient(circle at 12% 5%, rgba(214,179,91,.15), transparent 55%),
            radial-gradient(circle at 88% 40%, rgba(79,117,255,.12), transparent 58%),
            rgba(255,255,255,.02);
          border: 1px solid rgba(255,255,255,.10);
          min-height: 420px; /* زيادة الارتفاع ليستوعب البحث */
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .heroContent {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }
        .kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 900;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(214,179,91,.30);
          background: rgba(214,179,91,.08);
          color: var(--gold);
          margin-bottom: 12px;
        }
        .h1 {
          margin: 10px 0 10px;
          font-size: 36px;
          line-height: 1.15;
          font-weight: 950;
        }
        .h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 950;
        }
        .p {
          margin: 0 auto;
          font-size: 16px;
          line-height: 1.8;
          max-width: 500px;
          color: var(--muted);
        }
        .errBox {
          margin-top: 12px;
          border-color: rgba(255,77,77, 0.25);
          background: rgba(255,77,77, 0.08);
          color: #ffcccc;
          padding: 12px;
        }
        .cta {
          background: linear-gradient(135deg, rgba(214,179,91,.10), rgba(255,255,255,.03));
          border-color: rgba(214,179,91,.18);
          padding: 30px;
        }
        .ctaInner {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
          text-align: center;
        }
        @media (min-width: 768px) {
          .ctaInner {
            flex-direction: row;
            text-align: right;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
