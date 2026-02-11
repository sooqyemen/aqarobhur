'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import ChipsRow from '@/components/ChipsRow';
import ListingCard from '@/components/ListingCard';
import { fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_CLASSES, PROPERTY_TYPES } from '@/lib/taxonomy';

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no-window'));
    if (window.google && window.google.maps) return resolve(window.google.maps);

    const existing = document.querySelector('script[data-google-maps="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', () => reject(new Error('maps-load-failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = '1';
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('maps-load-failed'));
    document.head.appendChild(script);
  });
}

export default function MapClient() {
  const sp = useSearchParams();

  const initialNeighborhood = sp.get('neighborhood') || '';
  const initialDealType = sp.get('dealType') || '';
  const initialPropertyType = sp.get('propertyType') || '';
  const initialPropertyClass = sp.get('propertyClass') || '';

  const [neighborhood, setNeighborhood] = useState(initialNeighborhood);
  const [dealType, setDealType] = useState(initialDealType);
  const [propertyType, setPropertyType] = useState(initialPropertyType);
  const [propertyClass, setPropertyClass] = useState(initialPropertyClass);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // ✅ Fullscreen Overlay
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canPortal, setCanPortal] = useState(false);

  const mapHostRef = useRef(null);
  const mapDivRef = useRef(null);
  const placeholderRef = useRef(null);
  const lastParentRef = useRef(null);
  const lastNextSiblingRef = useRef(null);

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);
  const markerByIdRef = useRef({});

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => setCanPortal(true), []);

  const filters = useMemo(() => {
    const f = {};
    if (neighborhood) f.neighborhood = neighborhood;
    if (dealType) f.dealType = dealType;
    if (propertyType) f.propertyType = propertyType;
    if (propertyClass) f.propertyClass = propertyClass;
    return f;
  }, [neighborhood, dealType, propertyType, propertyClass]);

  const filteredItemsWithCoords = useMemo(() => {
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
      const data = await fetchListings({ onlyPublic: true, filters, includeLegacy: false, max: 500 });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = String(e?.message || '');
      setErr(msg || 'حصل خطأ أثناء جلب العروض.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ✅ init map
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey) return;
      if (!mapDivRef.current) return;

      try {
        await loadGoogleMaps(apiKey);
        if (cancelled) return;

        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(mapDivRef.current, {
            center: { lat: 21.543333, lng: 39.172778 },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
          infoRef.current = new window.google.maps.InfoWindow();
        }
      } catch {
        if (!cancelled) {
          setErr('تعذر تحميل خريطة Google. تأكد من المفتاح وتفعيل Google Maps JavaScript API.');
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // ✅ markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    markerByIdRef.current = {};

    const list = filteredItemsWithCoords;
    if (!list || list.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    list.forEach((it) => {
      const pos = { lat: Number(it.lat), lng: Number(it.lng) };

      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: String(it.title || 'عرض'),
      });

      markerByIdRef.current[it.id] = marker;
      markersRef.current.push(marker);
      bounds.extend(pos);

      marker.addListener('click', () => {
        const html = `
          <div style="direction:rtl; font-family: Arial, sans-serif; max-width: 220px;">
            <div style="font-weight: 800; margin-bottom: 6px;">${escapeHtml(it.title || 'عرض')}</div>
            <div style="opacity: .85; font-size: 12px; margin-bottom: 6px;">
              ${escapeHtml(it.neighborhood || '')} ${escapeHtml(it.plan || '')} ${escapeHtml(it.part || '')}
            </div>
            <a href="/listing/${encodeURIComponent(it.id)}" style="color:#0b57d0; text-decoration:none; font-weight:700;">فتح التفاصيل</a>
          </div>
        `;
        infoRef.current.setContent(html);
        infoRef.current.open({ anchor: marker, map });
      });
    });

    map.fitBounds(bounds);
    if (list.length === 1) {
      map.setZoom(15);
      map.setCenter({ lat: Number(list[0].lat), lng: Number(list[0].lng) });
    }
  }, [filteredItemsWithCoords]);

  function focusOn(id) {
    const map = mapRef.current;
    const marker = markerByIdRef.current[id];
    if (!map || !marker || !window.google?.maps) return;
    map.setZoom(Math.max(map.getZoom(), 15));
    map.panTo(marker.getPosition());
    window.google.maps.event.trigger(marker, 'click');
  }

  // ✅ move mapHost to body in fullscreen
  useEffect(() => {
    if (!canPortal) return;
    if (typeof document === 'undefined') return;
    if (!mapHostRef.current) return;

    const mapHost = mapHostRef.current;
    const map = mapRef.current;

    if (isFullscreen) {
      lastParentRef.current = mapHost.parentNode;
      lastNextSiblingRef.current = mapHost.nextSibling;

      document.body.classList.add('isMapFullscreen');
      document.body.style.overflow = 'hidden';

      document.body.appendChild(mapHost);

      const t = setTimeout(() => {
        try {
          window.google?.maps?.event?.trigger(map, 'resize');
        } catch {}
      }, 120);
      return () => clearTimeout(t);
    }

    document.body.classList.remove('isMapFullscreen');
    document.body.style.overflow = '';

    const parent = lastParentRef.current;
    if (parent) {
      if (lastNextSiblingRef.current) parent.insertBefore(mapHost, lastNextSiblingRef.current);
      else parent.appendChild(mapHost);
    } else if (placeholderRef.current) {
      placeholderRef.current.appendChild(mapHost);
    }

    const t = setTimeout(() => {
      try {
        window.google?.maps?.event?.trigger(map, 'resize');
      } catch {}
    }, 120);
    return () => clearTimeout(t);
  }, [isFullscreen, canPortal]);

  const neighborhoodOptions = useMemo(
    () => [{ value: '', label: 'كل الأحياء' }, ...NEIGHBORHOODS.map((n) => ({ value: n, label: n }))],
    []
  );
  const dealTypeOptions = useMemo(
    () => [{ value: '', label: 'بيع/إيجار' }, ...DEAL_TYPES.map((d) => ({ value: d.key, label: d.label }))],
    []
  );
  const classOptions = useMemo(
    () => [{ value: '', label: 'سكني/تجاري' }, ...PROPERTY_CLASSES.map((c) => ({ value: c.key, label: c.label }))],
    []
  );
  const typeOptions = useMemo(
    () => [{ value: '', label: 'كل الأنواع' }, ...PROPERTY_TYPES.map((t) => ({ value: t, label: t }))],
    []
  );

  const Overlay = () => {
    if (!canPortal) return null;
    return createPortal(
      <div className="fsOverlay" role="dialog" aria-label="الخريطة ملء الشاشة">
        <div className="fsTop">
          <button className="xBtn" onClick={() => setIsFullscreen(false)} aria-label="إغلاق">✕</button>
          <div className="topCenter">
            <ChipsRow value={neighborhood} options={neighborhoodOptions} onChange={setNeighborhood} />
          </div>
          <div className="topRight" />
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="h1">الخريطة</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            تظهر فقط العروض التي تحتوي على إحداثيات (lat/lng).
          </div>
        </div>
        <div className="row">
          <Link className="btn" href="/listings">رجوع</Link>
          <button className="btn" onClick={load} disabled={loading}>تحديث</button>
        </div>
      </div>

      {!apiKey ? (
        <section className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>مفتاح Google Maps غير موجود</div>
          <div className="muted" style={{ lineHeight: 1.7 }}>
            أضف <b>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</b> في Vercel/المحلي.
          </div>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>الفلاتر</div>

        <div className="grid" style={{ alignItems: 'end' }}>
          <div className="col-12">
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الحي</div>
            <ChipsRow value={neighborhood} options={neighborhoodOptions} onChange={setNeighborhood} />
          </div>

          <div className="col-12" style={{ marginTop: 10 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>بيع/إيجار</div>
            <ChipsRow value={dealType} options={dealTypeOptions} onChange={setDealType} />
          </div>

          <div className="col-12" style={{ marginTop: 10 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>سكني/تجاري</div>
            <ChipsRow
              value={propertyClass}
              options={classOptions}
              onChange={(v) => {
                setPropertyClass(v);
                setPropertyType('');
              }}
            />
          </div>

          <div className="col-12" style={{ marginTop: 10 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>نوع العقار</div>
            <ChipsRow value={propertyType} options={typeOptions} onChange={setPropertyType} />
          </div>
        </div>
      </section>

      {err ? (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="badge err">{err}</div>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900 }}>الخريطة</div>
          <div className="row" style={{ gap: 10 }}>
            <div className="muted" style={{ fontSize: 13 }}>عدد العلامات: {filteredItemsWithCoords.length}</div>
            <button className="btn" onClick={() => setIsFullscreen(true)}>ملء الشاشة</button>
          </div>
        </div>

        <div ref={placeholderRef} />

        <div ref={mapHostRef} className="mapHost">
          <div ref={mapDivRef} className="mapBox" />
          {!mapRef.current ? <div className="mapLoading">جاري تحميل الخريطة…</div> : null}
        </div>
      </section>

      <section style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900 }}>العروض على الخريطة</div>
          {loading ? <div className="muted">تحميل…</div> : null}
        </div>

        {loading ? null : filteredItemsWithCoords.length === 0 ? (
          <div className="card muted" style={{ marginTop: 10 }}>
            لا توجد عروض بإحداثيات ضمن الفلاتر الحالية.
          </div>
        ) : (
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {filteredItemsWithCoords.slice(0, 40).map((it) => (
              <div key={it.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 900 }}>{it.title || 'عرض'}</div>
                  <button className="btn" onClick={() => focusOn(it.id)}>عرض</button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <ListingCard item={it} compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isFullscreen ? <Overlay /> : null}

      <style jsx>{`
        .mapHost {
          margin-top: 10px;
          height: 60vh;
          min-height: 360px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #0b1220;
          position: relative;
        }

        /* ✅ عندما تكون الخريطة ملء الشاشة (العنصر انتقل للـbody) */
        :global(body.isMapFullscreen .mapHost) {
          position: fixed;
          inset: 0;
          height: 100vh;
          min-height: 100vh;
          margin: 0;
          border-radius: 0;
          border: none;
          z-index: 999998;
        }

        .mapBox {
          width: 100%;
          height: 100%;
        }

        .mapLoading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: #e2e8f0;
          background: rgba(0, 0, 0, 0.35);
        }

        :global(.fsOverlay) {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(10, 13, 18, 0.92);
        }

        :global(.fsTop) {
          position: fixed;
          left: 12px;
          right: 12px;
          top: 12px;
          z-index: 1000000;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 16px;
          background: rgba(10, 13, 18, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(16px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }

        :global(.xBtn) {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          font-weight: 900;
          cursor: pointer;
        }

        :global(.topCenter) {
          flex: 1;
          min-width: 0;
        }

        :global(.topRight) {
          width: 44px;
          height: 44px;
        }
      `}</style>
    </div>
  );
}
