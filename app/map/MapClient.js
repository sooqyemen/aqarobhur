'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import ChipsRow from '@/components/ChipsRow';
import ListingCard from '@/components/ListingCard';
import { fetchListings } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatPrice(price) {
  if (price == null) return '?';
  const num = Number(price);
  if (Number.isNaN(num)) return '?';

  if (num >= 1_000_000) {
    const millions = (num / 1_000_000).toFixed(1);
    return `${millions} مليون`;
  }
  if (num >= 1_000) {
    const thousands = Math.round(num / 1_000);
    return `${thousands} ألف`;
  }
  return String(num);
}

function normalizeDealType(v) {
  if (v === 'sale' || v === 'rent') return v;
  return '';
}

let __gmapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);

  if (__gmapsPromise) return __gmapsPromise;

  __gmapsPromise = new Promise((resolve, reject) => {
    const cbName = `__gmaps_cb_${Date.now()}`;

    window[cbName] = () => {
      try {
        resolve(window.google.maps);
      } catch (e) {
        __gmapsPromise = null;
        reject(e);
      } finally {
        try {
          delete window[cbName];
        } catch {}
      }
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      __gmapsPromise = null;
      reject(new Error('تعذر تحميل سكربت Google Maps.'));
    };
    document.head.appendChild(script);
  });

  return __gmapsPromise;
}

export default function MapClient() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [neighborhood, setNeighborhood] = useState(searchParams.get('neighborhood') || '');
  const [dealType, setDealType] = useState(normalizeDealType(searchParams.get('dealType') || ''));

  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);
  const mapClickListenerRef = useRef(null);

  const prevHtmlOverflowRef = useRef('');
  const prevBodyOverflowRef = useRef('');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const filters = useMemo(() => {
    return {
      neighborhood: neighborhood || '',
      dealType: dealType || '',
    };
  }, [neighborhood, dealType]);

  const neighborhoodOptions = useMemo(() => {
    const opts = [{ value: '', label: 'كل الأحياء' }];
    (NEIGHBORHOODS || []).forEach((n) => opts.push({ value: n, label: n }));
    return opts;
  }, []);

  const dealTypeOptions = [
    { value: '', label: 'كل الأنواع' },
    { value: 'sale', label: 'بيع' },
    { value: 'rent', label: 'إيجار' },
  ];

  const topBarStyle = {
    marginTop: 12,
    background: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
    ...(isFullscreen
      ? {
          position: 'fixed',
          top: 'calc(12px + env(safe-area-inset-top))',
          left: 'calc(12px + env(safe-area-inset-left))',
          right: 'calc(12px + env(safe-area-inset-right))',
          zIndex: 1000002,
        }
      : null),
  };

  const closeBtnStyle = {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: '1px solid var(--border)',
    background: '#f8fafc',
    color: 'var(--text)',
    fontWeight: 950,
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 44px',
  };

  const barCenterStyle = { flex: 1, minWidth: 0 };

  const mapHostStyle = {
    marginTop: 12,
    height: isFullscreen ? '100dvh' : '60vh',
    minHeight: isFullscreen ? '100dvh' : 380,
    borderRadius: isFullscreen ? 0 : 16,
    overflow: 'hidden',
    border: isFullscreen ? 'none' : '1px solid var(--border)',
    background: '#f1f5f9',
    position: isFullscreen ? 'fixed' : 'relative',
    inset: isFullscreen ? 0 : undefined,
    zIndex: isFullscreen ? 1000000 : undefined,
  };

  const mapBoxStyle = { width: '100%', height: '100%' };

  const mapLoadingStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 950,
    color: 'var(--text)',
    background: 'rgba(255, 255, 255, 0.8)',
    zIndex: 5,
    backdropFilter: 'blur(4px)',
  };

  const satelliteBtnStyle = {
    position: 'absolute',
    right: 'calc(12px + env(safe-area-inset-right))',
    bottom: isFullscreen ? 'calc(12px + env(safe-area-inset-bottom))' : 12,
    zIndex: isFullscreen ? 1000002 : 8,
    border: '1px solid var(--border)',
    background: '#ffffff',
    color: 'var(--text)',
    borderRadius: 14,
    padding: '10px 14px',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
  };

  const mapItems = useMemo(() => {
    return (items || []).filter((it) => {
      const lat = Number(it.lat);
      const lng = Number(it.lng);
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
  }, [items]);

  async function load() {
    setErr('');
    setLoading(true);

    try {
      const data = await fetchListings({
        onlyPublic: true,
        filters,
        includeLegacy: true,
        max: 500,
      });

      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || 'حصل خطأ أثناء جلب العروض.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    let alive = true;

    async function initMap() {
      try {
        if (!apiKey) {
          throw new Error('تعذر تحميل خريطة Google. تأكد من المفتاح وتفعيل Google Maps JavaScript API.');
        }

        const maps = await loadGoogleMaps(apiKey);
        if (!alive) return;

        const mapDiv = mapDivRef.current;
        if (!mapDiv) return;

        const center = { lat: 21.7628, lng: 39.0994 };

        const map = new maps.Map(mapDiv, {
          center,
          zoom: 12,
          mapTypeId: maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          rotateControl: false,
          scaleControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });

        mapRef.current = map;
        infoRef.current = new maps.InfoWindow();
        setMapReady(true);

        setTimeout(() => {
          try {
            maps.event.trigger(map, 'resize');
            map.setCenter(center);
          } catch {}
        }, 250);
      } catch (e) {
        if (!alive) return;
        setErr(String(e?.message || 'تعذر تحميل الخريطة.'));
        setMapReady(false);
      }
    }

    initMap();

    return () => {
      alive = false;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current) return;
    if (!window.google || !window.google.maps) return;

    const maps = window.google.maps;
    const map = mapRef.current;
    map.setMapTypeId(isSatellite ? maps.MapTypeId.SATELLITE : maps.MapTypeId.ROADMAP);
  }, [mapReady, isSatellite]);

  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current) return;
    if (!window.google || !window.google.maps) return;

    const maps = window.google.maps;
    const map = mapRef.current;

    if (mapClickListenerRef.current) {
      try {
        maps.event.removeListener(mapClickListenerRef.current);
      } catch {}
      mapClickListenerRef.current = null;
    }

    mapClickListenerRef.current = map.addListener('click', () => {
      if (!isFullscreen) {
        setIsFullscreen(true);
      }
    });

    return () => {
      if (mapClickListenerRef.current) {
        try {
          maps.event.removeListener(mapClickListenerRef.current);
        } catch {}
        mapClickListenerRef.current = null;
      }
    };
  }, [mapReady, isFullscreen]);

  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current) return;
    if (!window.google || !window.google.maps) return;

    const maps = window.google.maps;
    const map = mapRef.current;

    markersRef.current.forEach((m) => {
      try {
        m.setMap(null);
      } catch {}
    });
    markersRef.current = [];

    const bounds = new maps.LatLngBounds();

    mapItems.forEach((it) => {
      const lat = Number(it.lat);
      const lng = Number(it.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const pos = { lat, lng };
      bounds.extend(pos);

      const priceText = formatPrice(it.price);

      const marker = new maps.Marker({
        position: pos,
        map,
        title: it.title || 'عرض',
        label: {
          text: priceText,
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: '900',
        },
        icon: {
          path: 'M -28 -16 H 28 A 16 16 0 0 1 28 16 H -28 A 16 16 0 0 1 -28 -16 Z',
          fillColor: '#16a34a',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1,
          anchor: new maps.Point(0, 0),
          labelOrigin: new maps.Point(0, 4),
        },
        optimized: false,
        zIndex: 1000,
      });

      marker.addListener('click', () => {
        try {
          const title = escapeHtml(it.title || 'عرض');
          const n = escapeHtml(it.neighborhood || '');
          const link = `/listing/${encodeURIComponent(String(it.id || it.docId || ''))}`;

          const html = `
            <div style="direction:rtl; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; min-width:220px">
              <div style="font-weight:900; margin:0 0 6px">${title}</div>
              <div style="color:#475569; font-weight:700; font-size:12px; margin:0 0 8px">
                ${n ? `الحي: ${n}` : ''}
              </div>
              <a href="${link}" style="display:inline-block; padding:8px 12px; border-radius:12px; text-decoration:none;
                 background: linear-gradient(135deg, var(--primary), var(--primary2)); color:#1f2937; font-weight:900;">
                 فتح التفاصيل
              </a>
            </div>
          `;

          infoRef.current.setContent(html);
          infoRef.current.open({ anchor: marker, map, shouldFocus: false });
        } catch {}
      });

      markersRef.current.push(marker);
    });

    if (mapItems.length) {
      try {
        map.fitBounds(bounds, 60);
      } catch {}
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, mapItems]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    if (isFullscreen) {
      prevHtmlOverflowRef.current = html.style.overflow || '';
      prevBodyOverflowRef.current = body.style.overflow || '';

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.classList.add('isMapFullscreen');
    } else {
      html.style.overflow = prevHtmlOverflowRef.current;
      body.style.overflow = prevBodyOverflowRef.current;
      body.classList.remove('isMapFullscreen');
    }

    const t = setTimeout(() => {
      try {
        window.google?.maps?.event?.trigger(mapRef.current, 'resize');
      } catch {}
    }, 200);

    return () => {
      clearTimeout(t);
      html.style.overflow = prevHtmlOverflowRef.current;
      body.style.overflow = prevBodyOverflowRef.current;
      body.classList.remove('isMapFullscreen');
    };
  }, [isFullscreen]);

  const hasItemsWithoutCoords = items.length > 0 && mapItems.length === 0;

  return (
    <div className="container">
      <h1 className="h1" style={{ marginTop: 14, marginBottom: 0 }}>
        الخريطة
      </h1>

      <div className="muted" style={{ marginTop: 6 }}>
        اختر الحي أو نوع الصفقة، ثم استعرض العروض على الخريطة.
      </div>

      {loading ? (
        <section className="card" style={{ marginTop: 12, padding: 14 }}>
          جاري التحميل…
        </section>
      ) : null}

      {err ? (
        <section className="card" style={{ marginTop: 12, padding: 14 }}>
          <div className="badge err">{err}</div>
        </section>
      ) : null}

      {!loading && !err ? (
        <section className="card" style={{ marginTop: 12, padding: 12 }}>
          <div className="muted" style={{ fontWeight: 800 }}>
            العروض المحملة: {items.length} — الظاهرة على الخريطة: {mapItems.length}
          </div>
          {hasItemsWithoutCoords ? (
            <div style={{ marginTop: 8, color: 'var(--muted)' }}>
              تم جلب عروض لكن لا تحتوي على إحداثيات صالحة لعرضها على الخريطة.
            </div>
          ) : null}
        </section>
      ) : null}

      <div style={topBarStyle}>
        {isFullscreen ? (
          <button
            type="button"
            style={closeBtnStyle}
            onClick={() => setIsFullscreen(false)}
            aria-label="إغلاق وضع ملء الشاشة"
          >
            ✕
          </button>
        ) : null}

        <div style={barCenterStyle}>
          <ChipsRow value={neighborhood} options={neighborhoodOptions} onChange={setNeighborhood} />
          <div style={{ marginTop: 8 }}>
            <ChipsRow value={dealType} options={dealTypeOptions} onChange={setDealType} />
          </div>
        </div>
      </div>

      <div style={mapHostStyle}>
        <div ref={mapDivRef} style={mapBoxStyle} />

        {!mapReady ? <div style={mapLoadingStyle}>جاري تحميل الخريطة…</div> : null}

        {mapReady ? (
          <button
            type="button"
            style={satelliteBtnStyle}
            onClick={() => setIsSatellite((v) => !v)}
            aria-label={isSatellite ? 'العودة إلى الخريطة العادية' : 'تفعيل القمر الصناعي'}
          >
            {isSatellite ? 'خريطة' : 'قمر صناعي'}
          </button>
        ) : null}
      </div>

      {!isFullscreen ? (
        <section style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 950 }}>
              العروض <span className="muted">({items.length})</span>
            </div>

            <Link className="btn" href="/listings">
              فتح كل العروض
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {(items || []).slice(0, 12).map((it, idx) => (
              <ListingCard key={it.id || it.docId || `idx-${idx}`} item={it} compact />
            ))}
          </div>

          {items.length > 12 ? (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Link className="btn btnPrimary" href="/listings">
                مشاهدة المزيد
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
