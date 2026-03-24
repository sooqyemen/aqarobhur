'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR } from '@/lib/format';

const MAP_SCRIPT_ID = 'aqarobhur-google-maps';

function getStatusLabel(status, dealType) {
  const s = String(status || 'available');
  if (s === 'reserved') return 'محجوز';
  if (s === 'sold') return dealType === 'rent' ? 'مؤجر' : 'مباع';
  if (s === 'canceled' || s === 'hidden' || s === 'inactive') return 'غير متاح';
  return 'متاح';
}

function getStatusStyles(status) {
  const s = String(status || 'available');
  if (s === 'reserved') {
    return {
      background: 'rgba(217, 119, 6, 0.10)',
      color: '#92400e',
      border: '1px solid rgba(217, 119, 6, 0.18)',
    };
  }
  if (s === 'sold') {
    return {
      background: 'rgba(220, 38, 38, 0.08)',
      color: '#b91c1c',
      border: '1px solid rgba(220, 38, 38, 0.15)',
    };
  }
  if (s === 'canceled' || s === 'hidden' || s === 'inactive') {
    return {
      background: 'rgba(71, 85, 105, 0.08)',
      color: '#334155',
      border: '1px solid rgba(71, 85, 105, 0.14)',
    };
  }
  return {
    background: 'rgba(22, 163, 74, 0.08)',
    color: '#166534',
    border: '1px solid rgba(22, 163, 74, 0.15)',
  };
}

function getPriceSuffix(dealType) {
  return dealType === 'rent' ? 'سنوي' : '';
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images.filter(Boolean);
}

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is undefined'));
  if (!apiKey) return Promise.reject(new Error('missing-api-key'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__aqarobhurMapsPromise) return window.__aqarobhurMapsPromise;

  window.__aqarobhurMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(MAP_SCRIPT_ID);

    const onReady = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('google-maps-not-ready'));
    };

    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', () => reject(new Error('google-maps-load-error')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = MAP_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = onReady;
    script.onerror = () => reject(new Error('google-maps-load-error'));
    document.head.appendChild(script);
  });

  return window.__aqarobhurMapsPromise;
}

function InfoCell({ label, value }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '14px 14px 12px',
        background: '#fff',
      }}
    >
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.5 }}>{value || '—'}</div>
    </div>
  );
}

export default function ListingDetailsPage({ params }) {
  const routeParams = useParams();
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
  const [selectedImage, setSelectedImage] = useState('');
  const [mapMode, setMapMode] = useState('roadmap');
  const [mapErr, setMapErr] = useState('');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let active = true;

    if (rawId === undefined) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setErr('');

        if (!id) {
          if (active) {
            setItem(null);
            setErr('رابط العرض غير صحيح.');
          }
          return;
        }

        const data = await fetchListingById(id);
        if (!active) return;

        if (!data) {
          setItem(null);
          setSelectedImage('');
          return;
        }

        const nextImages = normalizeImages(data.images);
        setItem({ ...data, images: nextImages });
        setSelectedImage(nextImages[0] || '');
      } catch (error) {
        if (!active) return;
        const msg = String(error?.message || '');
        if (msg.includes('Missing or insufficient permissions') || error?.code === 'permission-denied') {
          setErr('لا توجد صلاحية لعرض هذا الإعلان الآن.');
        } else {
          setErr(msg || 'تعذر تحميل الإعلان حالياً.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, rawId]);

  useEffect(() => {
    const images = normalizeImages(item?.images);
    if (!images.length) {
      setSelectedImage('');
      return;
    }
    if (!selectedImage || !images.includes(selectedImage)) {
      setSelectedImage(images[0]);
    }
  }, [item, selectedImage]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!item) return;
      if (!mapRef.current) return;

      const lat = Number(item.lat);
      const lng = Number(item.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      if (!apiKey) {
        setMapErr('مفتاح خرائط Google غير مضاف في متغيرات البيئة.');
        return;
      }

      try {
        setMapErr('');
        const maps = await loadGoogleMaps(apiKey);
        if (cancelled || !mapRef.current) return;

        const center = { lat, lng };

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center,
            zoom: 15,
            mapTypeId: mapMode,
            fullscreenControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            clickableIcons: false,
            gestureHandling: 'greedy',
          });

          markerRef.current = new maps.Marker({
            position: center,
            map: mapInstanceRef.current,
            title: item.title || 'موقع العقار',
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setMapTypeId(mapMode);
          markerRef.current?.setPosition(center);
        }
      } catch (error) {
        if (!cancelled) {
          setMapErr('تعذر تحميل الخريطة داخل صفحة التفاصيل.');
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [item, mapMode]);

  const images = useMemo(() => normalizeImages(item?.images), [item]);
  const selected = selectedImage || images[0] || '';
  const statusLabel = getStatusLabel(item?.status, item?.dealType);
  const statusStyles = getStatusStyles(item?.status);
  const priceSuffix = getPriceSuffix(item?.dealType);
  const mapLink = useMemo(() => {
    const lat = Number(item?.lat);
    const lng = Number(item?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }, [item]);

  const whatsappHref = useMemo(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    const text = item
      ? [
          'السلام عليكم، أرغب بالاستفسار عن هذا العرض:',
          item.title || 'عرض عقاري',
          `الحي: ${item.neighborhood || '—'}`,
          `المخطط: ${item.plan || '—'}`,
          `الجزء: ${item.part || '—'}`,
          `السعر: ${formatPriceSAR(item.price)}`,
        ].join('\n')
      : 'السلام عليكم، أرغب بالاستفسار عن أحد العروض.';
    return buildWhatsAppLink({ phone, text });
  }, [item]);

  const topMeta = [item?.neighborhood, item?.plan, item?.part].filter(Boolean).join(' • ');

  return (
    <div className="container" style={{ paddingTop: 10, paddingBottom: 22 }}>
      {loading ? (
        <div className="card" style={{ padding: 18 }}>جاري تحميل تفاصيل الإعلان...</div>
      ) : err ? (
        <div className="card" style={{ padding: 18 }}>{err}</div>
      ) : !item ? (
        <div className="card" style={{ padding: 18 }}>الإعلان غير موجود.</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            className="card"
            style={{
              padding: 18,
              display: 'grid',
              gap: 14,
              background: 'linear-gradient(180deg, #ffffff, #fffdf7)',
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
                <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 8 }}>
                  {topMeta || 'تفاصيل العقار'}
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 'clamp(24px, 4vw, 32px)',
                    lineHeight: 1.3,
                    fontWeight: 950,
                  }}
                >
                  {item.title || 'عرض عقاري'}
                </h1>
              </div>

              <span
                style={{
                  ...statusStyles,
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontWeight: 900,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                {statusLabel}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>السعر المطلوب</div>
                <div style={{ fontSize: 'clamp(28px, 4.8vw, 38px)', fontWeight: 950, lineHeight: 1.1 }}>
                  {formatPriceSAR(item.price)}
                </div>
                {priceSuffix ? (
                  <div style={{ color: 'var(--muted)', marginTop: 6, fontWeight: 800 }}>{priceSuffix}</div>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn btnPrimary" href={whatsappHref} target="_blank" rel="noreferrer">
                  تواصل واتساب
                </a>
                {mapLink ? (
                  <a className="btn" href={mapLink} target="_blank" rel="noreferrer">
                    فتح الموقع
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 0.95fr)',
              gap: 16,
            }}
          >
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="card" style={{ padding: 14 }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    minHeight: 320,
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: '#f8fafc',
                    border: '1px solid var(--border)',
                  }}
                >
                  {selected ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected}
                      alt={item.title || 'صورة العقار'}
                      style={{ width: '100%', height: '100%', minHeight: 320, objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div
                      style={{
                        minHeight: 320,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--muted)',
                        fontWeight: 800,
                      }}
                    >
                      لا توجد صور لهذا العرض
                    </div>
                  )}
                </div>

                {images.length > 1 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    {images.map((src, index) => {
                      const active = src === selected;
                      return (
                        <button
                          key={`${src}-${index}`}
                          type="button"
                          onClick={() => setSelectedImage(src)}
                          style={{
                            padding: 0,
                            borderRadius: 14,
                            overflow: 'hidden',
                            border: active ? '2px solid rgba(214, 179, 91, 0.8)' : '1px solid var(--border)',
                            background: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`صورة ${index + 1}`}
                            style={{ width: '100%', height: 82, objectFit: 'cover', display: 'block' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 14 }}>المعلومات الأساسية</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 12,
                  }}
                >
                  <InfoCell label="نوع العقار" value={item.propertyType || '—'} />
                  <InfoCell label="نوع التعامل" value={item.dealType === 'rent' ? 'إيجار' : 'بيع'} />
                  <InfoCell label="المساحة" value={item.area ? `${item.area} م²` : '—'} />
                  <InfoCell label="الحي" value={item.neighborhood || '—'} />
                  <InfoCell label="المخطط" value={item.plan || '—'} />
                  <InfoCell label="الجزء" value={item.part || '—'} />
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 12 }}>وصف العقار</div>
                <div style={{ lineHeight: 2, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                  {item.description || 'لا يوجد وصف مضاف لهذا الإعلان حتى الآن.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 14 }}>ملخص سريع</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span className="muted">حالة العرض</span>
                    <strong>{statusLabel}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span className="muted">السعر</span>
                    <strong>{formatPriceSAR(item.price)}</strong>
                  </div>
                  {priceSuffix ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span className="muted">آلية السعر</span>
                      <strong>{priceSuffix}</strong>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span className="muted">نوع العقار</span>
                    <strong>{item.propertyType || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span className="muted">الموقع</span>
                    <strong>{item.neighborhood || '—'}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  <a className="btn btnPrimary" href={whatsappHref} target="_blank" rel="noreferrer">
                    إرسال استفسار عبر واتساب
                  </a>
                  <Link className="btn" href="/listings">
                    العودة إلى كل العروض
                  </Link>
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 950 }}>الموقع على الخريطة</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setMapMode('roadmap')}
                      style={{ background: mapMode === 'roadmap' ? '#fff8e8' : '#fff' }}
                    >
                      عادي
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setMapMode('satellite')}
                      style={{ background: mapMode === 'satellite' ? '#fff8e8' : '#fff' }}
                    >
                      قمر صناعي
                    </button>
                  </div>
                </div>

                {Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)) ? (
                  <>
                    <div
                      ref={mapRef}
                      style={{
                        height: 340,
                        width: '100%',
                        borderRadius: 18,
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        background: '#f8fafc',
                      }}
                    />
                    {mapErr ? (
                      <div className="muted" style={{ marginTop: 10 }}>
                        {mapErr}
                      </div>
                    ) : null}
                    {mapLink ? (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn"
                        style={{ marginTop: 12, display: 'inline-flex' }}
                      >
                        فتح الموقع في خرائط Google
                      </a>
                    ) : null}
                  </>
                ) : (
                  <div
                    style={{
                      minHeight: 180,
                      borderRadius: 18,
                      border: '1px dashed var(--border2)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--muted)',
                      padding: 18,
                      textAlign: 'center',
                      background: '#fafafa',
                    }}
                  >
                    لا توجد إحداثيات محفوظة لهذا الإعلان، لذلك لن تظهر الخريطة حتى يتم تحديد الموقع من لوحة الإضافة.
                  </div>
                )}
              </div>
            </div>
          </div>

          <style jsx>{`
            @media (max-width: 980px) {
              div[style*='grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.95fr)'] {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
