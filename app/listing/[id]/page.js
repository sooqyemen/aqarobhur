'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR, statusBadge } from '@/lib/format';

export default function ListingDetails({ params }) {
  const rawId = params?.id;
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
    (async () => {
      try {
        setLoading(true);
        setErr('');
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
            setErr(msg || 'تعذر تحميل العرض حالياً');
          }
        }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [id]);

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

                <div style={{ marginTop: 10, fontSize: 22, fontWeight: 900 }}>
                  {formatPriceSAR(item.price)}
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  {item.area ? <span className="badge">{item.area} م²</span> : null}
                  {item.dealType ? <span className="badge">{item.dealType === 'sale' ? 'بيع' : 'إيجار'}</span> : null}
                  {item.propertyType ? <span className="badge">{item.propertyType}</span> : null}
                  {item.direct ? <span className="badge ok">مباشر</span> : null}
                </div>

                {item.description ? (
                  <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{item.description}</p>
                ) : (
                  <p className="muted" style={{ marginTop: 12 }}>لا يوجد وصف إضافي.</p>
                )}

                <div className="row" style={{ marginTop: 12 }}>
                  <a className="btnPrimary" href={whatsappHref} target="_blank" rel="noreferrer">
                    تواصل واتساب عن هذا العرض
                  </a>
                </div>
              </div>
            </div>

            <div className="col-6">
              <div className="card">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>الصور</div>
                {Array.isArray(item.images) && item.images.length ? (
                  <div className="grid">
                    {item.images.slice(0, 6).map((src, idx) => (
                      <div key={idx} className="col-6">
                        <div className="listingThumb"><img src={src} alt={`صورة ${idx + 1}`} /></div>
                      </div>
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
