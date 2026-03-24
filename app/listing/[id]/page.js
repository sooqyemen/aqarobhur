'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR, statusBadge } from '@/lib/format';

let __detailMapPromise = null;
function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (__detailMapPromise) return __detailMapPromise;

  __detailMapPromise = new Promise((resolve, reject) => {
    const cbName = `__detail_gmaps_cb_${Date.now()}`;
    window[cbName] = () => {
      try {
        resolve(window.google.maps);
      } catch (e) {
        reject(e);
      } finally {
        try {
          delete window[cbName];
        } catch {}
      }
    };

    const old = document.querySelector('script[data-aqarobhur-gmaps="1"]');
    if (old) {
      const started = Date.now();
      const timer = window.setInterval(() => {
        if (window.google && window.google.maps) {
          window.clearInterval(timer);
          resolve(window.google.maps);
          return;
        }
        if (Date.now() - started > 15000) {
          window.clearInterval(timer);
          reject(new Error('تعذر تحميل سكربت Google Maps.'));
        }
      }, 120);
      old.addEventListener('error', () => {
        window.clearInterval(timer);
        reject(new Error('تعذر تحميل سكربت Google Maps.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-aqarobhur-gmaps', '1');
    script.onerror = () => reject(new Error('تعذر تحميل سكربت Google Maps.'));
    document.head.appendChild(script);
  });

  return __detailMapPromise;
}

export default function ListingDetails({ params }) {
  const routeParams = useParams();

  // بعض الأحيان params ما توصل في صفحات الـ client، فنأخذها من useParams()
  const raw = params?.id ?? routeParams?.id;
  const rawId = Array.isArray(raw) ? raw[0] : raw;

  const id = useMemo(() => {
    try {
      return rawId ? decodeURIComponent(String(rawId)) : '';
    } catch {
      return rawId ? String(rawId) : '';
    }
  }, [rawId]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [isSmall, setIsSmall] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapErr, setMapErr] = useState('');
  const [mapType, setMapType] = useState('hybrid');

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 900px)');
    const apply = () => setIsSmall(!!mq.matches);
    apply();

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    mq.addListener?.(apply);
    return () => mq.removeListener?.(apply);
  }, []);

  useEffect(() => {
    let live = true;

    // انتظر حتى تتوفر قيمة الـ id (لتفادي false negative)
    if (rawId === undefined) {
      setLoading(false);
      return () => {
        live = false;
      };
    }

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
        if (live) setItem(data || null);
      } catch (e) {
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

  useEffect(() => {
    let alive = true;

    async function initMap() {
      if (!hasCoords) {
        setMapReady(false);
        setMapErr('');
        return;
      }

      if (!apiKey) {
        setMapReady(false);
        setMapErr('مفتاح Google Maps غير مضاف في البيئة.');
        return;
      }

      try {
        setMapErr('');
        const maps = await loadGoogleMaps(apiKey);
        if (!alive) return;

        const host = mapDivRef.current;
        if (!host) return;

        const center = { lat, lng };

        if (!mapRef.current) {
          mapRef.current = new maps.Map(host, {
            center,
            zoom: 16,
            mapTypeId: mapType,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            rotateControl: false,
            scaleControl: false,
            clickableIcons: false,
            gestureHandling: 'greedy',
          });
        } else {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(16);
          mapRef.current.setMapTypeId(mapType);
        }

        if (markerRef.current) {
          try {
            markerRef.current.setMap(null);
          } catch {}
        }

        markerRef.current = new maps.Marker({
          position: center,
          map: mapRef.current,
          title: item?.title || 'موقع العقار',
        });

        setMapReady(true);

        setTimeout(() => {
          try {
            maps.event.trigger(mapRef.current, 'resize');
            mapRef.current.setCenter(center);
          } catch {}
        }, 250);
      } catch (e) {
        if (!alive) return;
        setMapReady(false);
        setMapErr(String(e?.message || 'تعذر تحميل الخريطة.'));
      }
    }

    initMap();

    return () => {
      alive = false;
    };
  }, [apiKey, hasCoords, lat, lng, item?.title, mapType]);

  const whatsappHref = useMemo(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    const text = item
      ? [
          'السلام عليكم، أبغى استفسار عن العرض:',
          item.title || '',
          `الحي: ${item.neighborhood || '—'}`,
          `المخطط: ${item.plan || '—'}`,
          `الجزء: ${item.part || '—'}`,
          `السعر: ${formatPriceSAR(item.price)}`,
        ].join('\n')
      : 'السلام عليكم، أبغى استفسار عن عرض في عقار أبحر.';
    return buildWhatsAppLink({ phone, text });
  }, [item]);

  const wrapStyle = {
    display: 'grid',
    gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr',
    gap: 12,
    marginTop: 12,
  };

  const cardPad = { padding: 14 };
  const mapHostStyle = {
    position: 'relative',
    width: '100%',
    height: 340,
    minHeight: 340,
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid var(--border)',
    background: '#f1f5f9',
  };

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      {loading ? (
        <div className="card" style={cardPad}>
          جاري التحميل…
        </div>
      ) : err ? (
        <div className="card" style={cardPad}>
          {err}
        </div>
      ) : !item ? (
        <div className="card" style={cardPad}>
          العرض غير موجود.
        </div>
      ) : (
        <>
          <div style={wrapStyle}>
            {/* تفاصيل */}
            <div className="card" style={cardPad}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 950, lineHeight: 1.25 }}>
                  {item.title || 'عرض عقاري'}
                </h1>
                <div>{statusBadge(item.status)}</div>
              </div>

              <div className="muted" style={{ marginTop: 8 }}>
                {(item.neighborhood || '—') + ' • ' + (item.plan || '—') + ' • ' + (item.part || '—')}
              </div>

              <div
                className="row"
                style={{
                  marginTop: 12,
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 950 }}>{formatPriceSAR(item.price)}</div>

                <a className="btn btnPrimary" href={whatsappHref} target="_blank" rel="noreferrer">
                  تواصل واتساب
                </a>
              </div>

              {item.area ? (
                <div className="muted" style={{ marginTop: 10 }}>
                  المساحة: {item.area} م²
                </div>
              ) : null}

              {item.propertyType ? (
                <div className="muted" style={{ marginTop: 6 }}>
                  النوع: {item.propertyType}
                </div>
              ) : null}

              {item.description ? (
                <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.9 }}>
                  {item.description}
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 12 }}>
                  لا يوجد وصف.
                </div>
              )}
            </div>

            {/* الصور */}
            <div className="card" style={cardPad}>
              {Array.isArray(item.images) && item.images.length ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr',
                    gap: 10,
                  }}
                >
                  {item.images.map((src, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${idx}`}
                      src={src}
                      alt={`صورة ${idx + 1}`}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 220,
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: '#f1f5f9',
                        display: 'block',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="muted">لا توجد صور.</div>
              )}
            </div>
          </div>

          <div className="card" style={{ ...cardPad, marginTop: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>الموقع على الخريطة</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {hasCoords ? `الإحداثيات: ${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'هذا الإعلان لا يحتوي على إحداثيات محفوظة.'}
                </div>
              </div>

              {hasCoords ? (
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setMapType('roadmap')}
                    style={mapType === 'roadmap' ? { fontWeight: 950 } : undefined}
                  >
                    عادي
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setMapType('hybrid')}
                    style={mapType === 'hybrid' ? { fontWeight: 950 } : undefined}
                  >
                    قمر صناعي
                  </button>
                  <a
                    className="btn btnPrimary"
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    فتح في خرائط Google
                  </a>
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>
              {!hasCoords ? (
                <div className="muted">أضف lat و lng لهذا الإعلان من لوحة الإضافة/التعديل حتى تظهر الخريطة هنا.</div>
              ) : (
                <div style={mapHostStyle}>
                  <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
                  {!mapReady && !mapErr ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.82)',
                        backdropFilter: 'blur(4px)',
                        fontWeight: 900,
                        zIndex: 2,
                      }}
                    >
                      جاري تحميل الخريطة…
                    </div>
                  ) : null}
                  {mapErr ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.92)',
                        padding: 16,
                        textAlign: 'center',
                        lineHeight: 1.8,
                        zIndex: 3,
                      }}
                    >
                      {mapErr}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
