'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR, statusBadge } from '@/lib/format';

export default function ListingDetails({ params }) {
  const routeParams = useParams();

  // ✅ بعض الأحيان params ما توصل في صفحات الـ client، فنأخذها من useParams()
  const raw = params?.id ?? routeParams?.id;
  const rawId = Array.isArray(raw) ? raw[0] : raw;

  const id = useMemo(() => {
    try {
      return rawId ? decodeURIComponent(String(rawId)) : '';
    } catch (_) {
      return rawId ? String(rawId) : '';
    }
  }, [rawId]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;

    // ✅ انتظر حتى تتوفر قيمة الـ id (لتفادي false negative)
    if (rawId === undefined) return () => { live = false; };

    (async () => {
      try {
        setLoading(true);
        setErr('');

        if (!id) {
          if (live) {
            setItem(null);
            setErr('رابط العرض غير صحيح.');
          }
          return;
        }

        const data = await fetchListingById(id);
        if (live) setItem(data);
      } catch (e) {
        console.error(e);
        const msg = String(e?.message || '');
        if (live) {
          setItem(null);
          if (msg.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
            setErr('لا توجد صلاحية لعرض هذا العرض الآن.');
          } else {
            setErr(msg || 'تعذر تحميل العرض حالياً.');
          }
        }
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [rawId, id]);

  const whatsappHref = useMemo(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    const text = item
      ? `السلام عليكم، أبغى استفسار عن العرض: ${item.title || ''}\nالحي: ${item.neighborhood || ''}\nالمخطط: ${item.plan || ''}\nالجزء: ${item.part || ''}\nالسعر: ${formatPriceSAR(item.price)}`
      : 'السلام عليكم، أبغى استفسار عن عرض في عقار أبحر.';
    return buildWhatsAppLink({ phone, text });
  }, [item]);

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      {loading ? (
        <div className="muted">جاري التحميل…</div>
      ) : err ? (
        <div className="card">{err}</div>
      ) : !item ? (
        <div className="card">العرض غير موجود.</div>
      ) : (
        <div className="grid">
          <div className="col-6">
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h1 style={{ margin: 0 }}>{item.title || 'عرض عقاري'}</h1>
                {statusBadge(item.status)}
              </div>

              <div className="muted" style={{ marginTop: 6 }}>
                {item.neighborhood || '—'} • {item.plan || '—'} • {item.part || '—'}
              </div>

              <div className="row" style={{ marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {formatPriceSAR(item.price)}
                </div>
                <a className="btn btnPrimary" href={whatsappHref} target="_blank" rel="noreferrer">
                  تواصل واتساب
                </a>
              </div>

              {item.area ? (
                <div className="muted" style={{ marginTop: 10 }}>
                  المساحة: {item.area} م²
                </div>
              ) : null}

              {item.description ? (
                <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.9 }}>
                  {item.description}
                </div>
              ) : null}
            </div>
          </div>

          <div className="col-6">
            <div className="card">
              {Array.isArray(item.images) && item.images.length ? (
                <div className="grid" style={{ gap: 10 }}>
                  {item.images.map((src, idx) => (
                    <img
                      key={`${src}-${idx}`}
                      src={src}
                      alt={`صورة ${idx + 1}`}
                      style={{ width: '100%', borderRadius: 12, display: 'block' }}
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : (
                <div className="muted">لا توجد صور.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
