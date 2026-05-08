'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import ChipsRow from '@/components/ChipsRow';
import ListingCard from '@/components/ListingCard';
import { fetchListings } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

const NORTH_JEDDAH_CENTER = { lat: 21.7648, lng: 39.1288 };
const NORTH_JEDDAH_ZOOM = 12;
const NORTH_JEDDAH_BOUNDS = {
  south: 21.5600,
  west: 38.9900,
  north: 22.0200,
  east: 39.3000,
};

function isInsideNorthJeddah(item) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= NORTH_JEDDAH_BOUNDS.south
    && lat <= NORTH_JEDDAH_BOUNDS.north
    && lng >= NORTH_JEDDAH_BOUNDS.west
    && lng <= NORTH_JEDDAH_BOUNDS.east;
}

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
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} مليون`;
  if (num >= 1_000) return `${Math.round(num / 1_000)} ألف`;
  return String(num);
}

function normalizeDealType(v) {
  if (v === 'sale' || v === 'rent') return v;
  return '';
}

function escapeXml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildPriceBadgeIcon(maps, priceText) {
  const text = String(priceText || '?');
  const charW = 8;
  const padX = 12;
  const h = 30;
  const minW = 56;
  const maxW = 160;
  const w = Math.max(minW, Math.min(maxW, text.length * charW + padX * 2));

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="#0f766e" stroke="rgba(255,255,255,0.95)" stroke-width="2"/>
      <text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="13" font-weight="900" fill="#ffffff" direction="rtl" unicode-bidi="plaintext">${escapeXml(text)}</text>
    </svg>
  `.trim();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(w, h),
    anchor: new maps.Point(Math.round(w / 2), h),
  };
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
        reject(e);
      } finally {
        try { delete window[cbName]; } catch {}
      }
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('تعذر تحميل سكربت Google Maps.'));
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

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);
  const prevHtmlOverflowRef = useRef('');
  const prevBodyOverflowRef = useRef('');
  const didFocusNorthJeddahRef = useRef(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const filters = useMemo(() => ({ neighborhood: neighborhood || '', dealType: dealType || '' }), [neighborhood, dealType]);

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
    boxShadow: 'var(--shadow-md)',
    ...(isFullscreen ? { position: 'fixed', top: 'calc(12px + env(safe-area-inset-top))', left: 'calc(12px + env(safe-area-inset-left))', right: 'calc(12px + env(safe-area-inset-right))', zIndex: 1000002 } : null),
  };

  const xBtnStyle = {
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
  };

  const mapHostStyle = {
    marginTop: 12,
    height: isFullscreen ? '100dvh' : '60vh',
    minHeight: isFullscreen ? '100dvh' : 400,
    borderRadius: isFullscreen ? 0 : 20,
    overflow: 'hidden',
    border: isFullscreen ? 'none' : '1px solid var(--border)',
    background: '#f1f5f9',
    position: isFullscreen ? 'fixed' : 'relative',
    inset: isFullscreen ? 0 : undefined,
    zIndex: isFullscreen ? 1000000 : undefined,
    boxShadow: isFullscreen ? 'none' : 'var(--shadow-sm)',
  };

  const mapItems = useMemo(() => {
    return (items || []).filter((it) => Number.isFinite(Number(it.lat)) && Number.isFinite(Number(it.lng)));
  }, [items]);

  const focusedMapItems = useMemo(() => {
    const northItems = mapItems.filter(isInsideNorthJeddah);
    return northItems.length ? northItems : mapItems;
  }, [mapItems]);

  useEffect(() => {
    let active = true;
    async function load() {
      setErr('');
      setLoading(true);
      try {
        const data = await fetchListings({ onlyPublic: true, filters, includeLegacy: true, max: 1000 });
        if (active) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (active) {
          setErr(String(e?.message || 'حصل خطأ أثناء جلب العروض.'));
          setItems([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    didFocusNorthJeddahRef.current = false;
    load();
    return () => { active = false; };
  }, [filters]);

  useEffect(() => {
    let alive = true;
    async function initMap() {
      try {
        if (!apiKey) throw new Error('تعذر تحميل خريطة Google. تأكد من المفتاح وتفعيل Google Maps JavaScript API.');
        const maps = await loadGoogleMaps(apiKey);
        if (!alive || !mapDivRef.current) return;
        const map = new maps.Map(mapDivRef.current, {
          center: NORTH_JEDDAH_CENTER,
          zoom: NORTH_JEDDAH_ZOOM,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          rotateControl: false,
          scaleControl: false,
          panControl: false,
          keyboardShortcuts: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
          restriction: {
            latLngBounds: {
              north: 22.1800,
              south: 21.3600,
              east: 39.5200,
              west: 38.7600,
            },
            strictBounds: false,
          },
          styles: [
            { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          ],
        });
        mapRef.current = map;
        infoRef.current = new maps.InfoWindow();
        setMapReady(true);
        setTimeout(() => {
          try {
            maps.event.trigger(map, 'resize');
            map.setCenter(NORTH_JEDDAH_CENTER);
            map.setZoom(NORTH_JEDDAH_ZOOM);
          } catch {}
        }, 250);
      } catch (e) {
        if (!alive) return;
        setErr(String(e?.message || 'تعذر تحميل الخريطة.'));
        setMapReady(false);
      }
    }
    initMap();
    return () => { alive = false; };
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const maps = window.google.maps;
    const map = mapRef.current;
    markersRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
    markersRef.current = [];
    const bounds = new maps.LatLngBounds();

    mapItems.forEach((it) => {
      const pos = { lat: Number(it.lat), lng: Number(it.lng) };
      const insideFocusArea = isInsideNorthJeddah(it);
      bounds.extend(pos);
      const marker = new maps.Marker({
        position: pos,
        map,
        title: it.title || 'عرض عقاري',
        icon: buildPriceBadgeIcon(maps, formatPrice(it.price)),
        optimized: true,
        opacity: insideFocusArea ? 1 : 0.82,
      });
      marker.addListener('click', () => {
        try {
          const title = escapeHtml(it.title || 'عرض عقاري');
          const n = escapeHtml(it.neighborhood || '');
          const link = `/listing/${encodeURIComponent(String(it.id || it.docId || ''))}`;
          infoRef.current.setContent(`
            <div style="direction:rtl; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; min-width:240px; padding:4px;">
              <div style="font-weight:900; margin:0 0 6px; font-size:15px; color:#0f172a;">${title}</div>
              <div style="color:#5b6474; font-weight:700; font-size:13px; margin:0 0 12px"><span style="color:#0f766e; margin-left:4px;">📍</span>${n || 'حي غير محدد'}</div>
              <a href="${link}" style="display:block; text-align:center; padding:10px 14px; border-radius:12px; text-decoration:none; background:#0f766e; color:#fff; font-weight:800; font-size:14px;">استعراض التفاصيل</a>
            </div>
          `);
          infoRef.current.open({ anchor: marker, map, shouldFocus: false });
        } catch {}
      });
      markersRef.current.push(marker);
    });

    if (!didFocusNorthJeddahRef.current) {
      try {
        if (focusedMapItems.length >= 2) {
          const focusedBounds = new maps.LatLngBounds();
          focusedMapItems.forEach((it) => focusedBounds.extend({ lat: Number(it.lat), lng: Number(it.lng) }));
          map.fitBounds(focusedBounds, 70);
          const currentZoom = map.getZoom();
          if (currentZoom && currentZoom < NORTH_JEDDAH_ZOOM) map.setZoom(NORTH_JEDDAH_ZOOM);
          if (currentZoom && currentZoom > 15) map.setZoom(15);
        } else {
          map.setCenter(NORTH_JEDDAH_CENTER);
          map.setZoom(NORTH_JEDDAH_ZOOM);
        }
        didFocusNorthJeddahRef.current = true;
      } catch {
        try {
          map.setCenter(NORTH_JEDDAH_CENTER);
          map.setZoom(NORTH_JEDDAH_ZOOM);
          didFocusNorthJeddahRef.current = true;
        } catch {}
      }
    }
  }, [mapReady, mapItems, focusedMapItems]);

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
    setTimeout(() => { try { window.google?.maps?.event?.trigger(mapRef.current, 'resize'); } catch {} }, 200);
    return () => {
      html.style.overflow = prevHtmlOverflowRef.current;
      body.style.overflow = prevBodyOverflowRef.current;
      body.classList.remove('isMapFullscreen');
    };
  }, [isFullscreen]);

  return (
    <div className="container" style={{ paddingBottom: '30px' }}>
      <h1 style={{ marginTop: 24, marginBottom: 5, fontSize: '28px', fontWeight: 900, color: 'var(--text)' }}>الخريطة العقارية</h1>
      <div style={{ color: 'var(--muted)', fontSize: '15px' }}>تصفح العقارات المتاحة في أبحر الشمالية وشمال جدة مباشرة عبر الخريطة.</div>

      {err ? <section className="card" style={{ marginTop: 15, padding: 16, background: '#fef2f2', borderColor: '#f87171' }}><div style={{ color: '#dc2626', fontWeight: 700 }}>{err}</div></section> : null}

      <div style={topBarStyle}>
        <button style={xBtnStyle} onClick={() => (isFullscreen ? setIsFullscreen(false) : window.history.back())} aria-label="العودة">{isFullscreen ? '✕' : '←'}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ChipsRow value={neighborhood} options={neighborhoodOptions} onChange={setNeighborhood} />
          <div style={{ marginTop: 10 }}><ChipsRow value={dealType} options={dealTypeOptions} onChange={setDealType} /></div>
        </div>
        <div style={{ width: 44 }} />
      </div>

      <div style={mapHostStyle}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        {!mapReady && !err ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, color: 'var(--primary)', background: 'rgba(255,255,255,.85)', zIndex: 5 }}>جاري تهيئة الخريطة…</div> : null}
        {!isFullscreen && mapReady ? <button type="button" style={{ position: 'absolute', inset: 0, border: 0, padding: 0, margin: 0, background: 'transparent', cursor: 'zoom-in', zIndex: 6 }} onClick={() => setIsFullscreen(true)} aria-label="فتح الخريطة بكامل الشاشة" title="انقر لتكبير الخريطة" /> : null}
      </div>

      {!isFullscreen ? (
        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>العروض المطابقة <span style={{ color: 'var(--muted)', fontSize: 14 }}>({loading ? '...' : items.length})</span></div>
            <Link href="/listings" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>تصفح القائمة ‹</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15 }}>
            {(items || []).slice(0, 12).map((it, idx) => <ListingCard key={it.id || it.docId || `idx-${idx}`} item={it} compact />)}
          </div>
          {items.length > 12 ? <div style={{ marginTop: 20, textAlign: 'center' }}><Link className="btn btnPrimary" href="/listings">مشاهدة المزيد من العروض</Link></div> : null}
        </section>
      ) : null}
    </div>
  );
}
