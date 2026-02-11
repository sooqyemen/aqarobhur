'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

// ✅ نقطة لونية صغيرة (بدون رموز)
const NEIGHBORHOOD_COLORS = {
  الزمرد: '#34A853',
  الياقوت: '#4285F4',
  الصواري: '#EA4335',
  الشراع: '#FBBC05',
  اللؤلؤ: '#7B1FA2',
  النور: '#00796B',
  الفنار: '#0B57D0',
  البحيرات: '#6D4C41',
};

export default function MapPage() {
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

  // ✅ Fullscreen مثل سوق اليمن
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastViewportRef = useRef({ bounds: null, center: null, zoom: null });

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);
  const markerByIdRef = useRef({});

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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

  // تهيئة Google Map
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey) return;
      if (!mapElRef.current) return;

      try {
        await loadGoogleMaps(apiKey);
        if (cancelled) return;

        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(mapElRef.current, {
            center: { lat: 21.543333, lng: 39.172778 },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            // ✅ نستخدم Fullscreen خاص بنا
            fullscreenControl: false,
          });
          infoRef.current = new window.google.maps.InfoWindow();
        }
      } catch (e) {
        if (cancelled) return;
        setErr('تعذر تحميل خريطة Google. تأكد من المفتاح وتفعيل Google Maps JavaScript API.');
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // ✅ عند فتح/إغلاق Fullscreen: نخفي تمرير الصفحة + نضيف class لخفاء MobileNav
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const prevOverflow = document.body.style.overflow;
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('isMapFullscreen');
    } else {
      document.body.style.overflow = prevOverflow || '';
      document.body.classList.remove('isMapFullscreen');
    }

    const map = mapRef.current;
    if (map && window.google && window.google.maps) {
      const t = setTimeout(() => {
        try {
          window.google.maps.event.trigger(map, 'resize');
          const vp = lastViewportRef.current || {};
          if (vp.bounds) map.fitBounds(vp.bounds);
          if (vp.center && typeof vp.zoom === 'number') {
            map.setCenter(vp.center);
            map.setZoom(vp.zoom);
          }
        } catch {}
      }, 80);

      return () => clearTimeout(t);
    }
  }, [isFullscreen]);

  // تحديث الماركرز
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    markerByIdRef.current = {};

    const list = filteredItemsWithCoords;
    if (!list || list.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    list.forEach((it) => {
      const lat = Number(it.lat);
      const lng = Number(it.lng);
      const pos = { lat, lng };

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
            <div style="opacity: .8; font-size: 12px; margin-bottom: 6px;">${escapeHtml(it.neighborhood || '')} ${escapeHtml(it.plan || '')} ${escapeHtml(it.part || '')}</div>
            <a href="/listing/${encodeURIComponent(it.id)}" style="color:#0b57d0; text-decoration:none; font-weight:700;">فتح التفاصيل</a>
          </div>
        `;
        infoRef.current.setContent(html);
        infoRef.current.open({ anchor: marker, map });
      });
    });

    map.fitBounds(bounds);

    try {
      lastViewportRef.current = {
        bounds,
        center: map.getCenter() ? { lat: map.getCenter().lat(), lng: map.getCenter().lng() } : null,
        zoom: map.getZoom(),
      };
    } catch {}

    if (list.length === 1) {
      map.setZoom(15);
      map.setCenter({ lat: Number(list[0].lat), lng: Number(list[0].lng) });
      try {
        lastViewportRef.current = {
          bounds: null,
          center: { lat: Number(list[0].lat), lng: Number(list[0].lng) },
          zoom: 15,
        };
      } catch {}
    }
  }, [filteredItemsWithCoords]);

  function focusOn(id) {
    const map = mapRef.current;
    const marker = markerByIdRef.current[id];
    if (!map || !marker) return;

    map.setZoom(Math.max(map.getZoom(), 15));
    map.panTo(marker.getPosition());
    window.google.maps.event.trigger(marker, 'click');
  }

  // ✅ خيارات الأحياء مع نقطة ملوّنة
  const neighborhoodOptions = useMemo(() => {
    const base = [{ value: '', label: 'كل الأحياء' }];

    const opts = NEIGHBORHOODS.map((n) => {
      const col = NEIGHBORHOOD_COLORS[n] || '#94A3B8';
      return {
        value: n,
        label: (
          <span className="chipLabel">
            <span className="dot" style={{ background: col }} />
            <span>{n}</span>
          </span>
        ),
      };
    });

    return base.concat(opts);
  }, []);

  // (اختياري) تبقيها – أو نلغيها بالكامل إذا تبغى نفس سوق اليمن 100%
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

  return (
    <div className="container" style={{ paddingTop: 14 }}>
      {/* ✅ شريط علوي نظيف (مثل سوق اليمن) */}
      <div className={`topBar ${isFullscreen ? 'topBarFs' : ''}`}>
        <button className="xBtn" onClick={() => (isFullscreen ? setIsFullscreen(false) : window.history.back())} aria-label="إغلاق">
          ✕
        </button>

        <div className="barCenter">
          <ChipsRow value={neighborhood} options={neighborhoodOptions} onChange={setNeighborhood} />
        </div>

        <button className="fsBtn" onClick={() => setIsFullscreen(true)}>ملء الشاشة</button>
      </div>

      {err ? (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="badge err">{err}</div>
        </section>
      ) : null}

      {/* ✅ الخريطة هي الأساس (بدون لوحة فلاتر ضخمة) */}
      <div className={`mapShell ${isFullscreen ? 'mapShellFs' : ''}`}>
        <div
          ref={mapElRef}
          className="mapBox"
          onClick={() => {
            if (!isFullscreen) setIsFullscreen(true);
          }}
        />
      </div>

      {/* ✅ قائمة عروض مصغرة تحت الخريطة (خارج وضع الملء الكامل) */}
      {!isFullscreen ? (
        <section style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900 }}>العروض</div>
            {loading ? <div className="muted">تحميل…</div> : <div className="muted">عدد العلامات: {filteredItemsWithCoords.length}</div>}
          </div>

          {loading ? null : filteredItemsWithCoords.length === 0 ? (
            <div className="card muted" style={{ marginTop: 10 }}>
              لا توجد عروض بإحداثيات ضمن الحي المختار.
            </div>
          ) : (
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {filteredItemsWithCoords.slice(0, 20).map((it) => (
                <div key={it.id} className="card">
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 900 }}>{it.title || 'عرض'}</div>
                    <button className="btn" onClick={() => focusOn(it.id)}>عرض على الخريطة</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <ListingCard item={it} compact />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <style jsx>{`
        .topBar {
          position: sticky;
          top: 10px;
          z-index: 50;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        }
        .topBarFs {
          position: fixed;
          left: 12px;
          right: 12px;
          top: 12px;
          z-index: 9999;
        }
        .xBtn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--card);
          font-weight: 900;
          cursor: pointer;
        }
        .barCenter {
          flex: 1;
          min-width: 0;
        }
        .fsBtn {
          border: 1px solid var(--border);
          background: var(--card);
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .mapShell {
          margin-top: 10px;
          height: 60vh;
          min-height: 360px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #f1f5f9;
        }
        .mapShellFs {
          position: fixed;
          inset: 0;
          margin: 0;
          height: 100vh;
          border-radius: 0;
          border: none;
          z-index: 9990;
        }
        .mapBox {
          width: 100%;
          height: 100%;
        }

        .chipLabel {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.03);
        }
      `}</style>
    </div>
  );
}
