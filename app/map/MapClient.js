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

/**
 * تنسيق السعر ليظهر بشكل مختصر (مثلاً 1.2M للمليون)
 */
function formatPrice(price) {
  if (price == null) return '?';
  const num = Number(price);
  if (isNaN(num)) return '?';
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
}

/**
 * لون العلامة حسب نوع الصفقة
 */
function getMarkerColor(dealType) {
  switch (dealType) {
    case 'sale': return '#f97316'; // برتقالي
    case 'rent': return '#3b82f6'; // أزرق
    default: return '#6b7280'; // رمادي
  }
}

/**
 * ✅ تحميل Google Maps مع مكتبة marker
 */
let __gmapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (__gmapsPromise) return __gmapsPromise;

  __gmapsPromise = new Promise((resolve, reject) => {
    const SCRIPT_ID = 'google-maps-js';
    const t = setTimeout(() => reject(new Error('maps-timeout')), 12000);

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.google && window.google.maps) {
        clearTimeout(t);
        return resolve(window.google.maps);
      }

      const onLoad = () => { clearTimeout(t); resolve(window.google.maps); };
      const onError = () => { clearTimeout(t); reject(new Error('maps-script-error')); };
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', onError, { once: true });

      setTimeout(() => {
        if (window.google && window.google.maps) {
          clearTimeout(t);
          resolve(window.google.maps);
        }
      }, 300);
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    // إضافة مكتبة marker لاستخدام AdvancedMarkerElement
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&libraries=marker`;

    script.onload = () => { clearTimeout(t); resolve(window.google.maps); };
    script.onerror = () => { clearTimeout(t); reject(new Error('maps-script-error')); };

    document.head.appendChild(script);
  });

  return __gmapsPromise;
}

export default function MapClient() {
  const sp = useSearchParams();
  const initialNeighborhood = sp.get('neighborhood') || '';
  const initialDealType = sp.get('dealType') || '';

  const [neighborhood, setNeighborhood] = useState(initialNeighborhood);
  const [dealType, setDealType] = useState(initialDealType); // '' = all, 'sale', 'rent'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markersRef = useRef([]);
  const markerByIdRef = useRef({});

  const prevBodyOverflowRef = useRef('');
  const prevHtmlOverflowRef = useRef('');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // الفلاتر
  const filters = useMemo(() => {
    const f = {};
    if (neighborhood) f.neighborhood = neighborhood;
    if (dealType) f.dealType = dealType;
    return f;
  }, [neighborhood, dealType]);

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
      const data = await fetchListings({
        onlyPublic: true,
        filters,
        includeLegacy: false,
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
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // تهيئة الخريطة
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!apiKey) { setMapReady(false); return; }
      if (!mapDivRef.current) return;
      if (mapRef.current && window.google?.maps) { setMapReady(true); return; }

      setMapReady(false);
      try {
        await loadGoogleMaps(apiKey);
        if (cancelled) return;

        mapRef.current = new window.google.maps.Map(mapDivRef.current, {
          center: { lat: 21.77, lng: 39.08 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        infoRef.current = new window.google.maps.InfoWindow();
        setMapReady(true);
        console.log('✅ الخريطة جاهزة');

        setTimeout(() => {
          try { window.google?.maps?.event?.trigger(mapRef.current, 'resize'); } catch {}
        }, 120);
      } catch (e) {
        if (!cancelled) {
          const msg = String(e?.message || '');
          if (msg.includes('timeout')) {
            setErr('تعذر تحميل خرائط Google (انتهت المهلة). تحقق من المفتاح/القيود.');
          } else {
            setErr('تعذر تحميل خريطة Google. تأكد من المفتاح وتفعيل Google Maps JavaScript API.');
          }
          setMapReady(false);
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, [apiKey]);

  // Fullscreen scroll lock
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
      setTimeout(() => {
        try { window.google?.maps?.event?.trigger(mapRef.current, 'resize'); } catch {}
      }, 120);
    } else {
      html.style.overflow = prevHtmlOverflowRef.current;
      body.style.overflow = prevBodyOverflowRef.current;
      body.classList.remove('isMapFullscreen');
      setTimeout(() => {
        try { window.google?.maps?.event?.trigger(mapRef.current, 'resize'); } catch {}
      }, 120);
    }
  }, [isFullscreen]);

  // إنشاء العلامات (AdvancedMarkerElement) مع عرض السعر
  useEffect(() => {
    // التأكد من أن الخريطة جاهزة والمراجع موجودة
    if (!mapReady || !mapRef.current || !window.google?.maps) {
      console.log('⏳ الخريطة ليست جاهزة بعد أو مكتبة google maps غير متاحة');
      return;
    }

    const map = mapRef.current;
    const list = filteredItemsWithCoords;
    console.log(`🔍 عدد العناصر بإحداثيات: ${list.length}`);

    // إزالة العلامات القديمة
    markersRef.current.forEach((m) => {
      try {
        if (typeof m.setMap === 'function') {
          m.setMap(null);
        } else {
          m.map = null;
        }
      } catch {}
    });
    markersRef.current = [];
    markerByIdRef.current = {};

    if (!list || list.length === 0) {
      console.log('ℹ️ لا توجد عناصر لإضافتها');
      return;
    }

    // التحقق من توفر AdvancedMarkerElement
    const AdvancedMarker = window.google.maps.marker?.AdvancedMarkerElement;
    if (!AdvancedMarker) {
      console.error('❌ AdvancedMarkerElement غير متوفر، تأكد من تحميل مكتبة marker.');
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();

    list.forEach((it) => {
      const pos = { lat: Number(it.lat), lng: Number(it.lng) };
      const priceText = formatPrice(it.price);
      const bgColor = getMarkerColor(it.dealType);

      // إنشاء عنصر HTML مخصص للعلامة
      const contentDiv = document.createElement('div');
      contentDiv.textContent = priceText;
      contentDiv.style.backgroundColor = bgColor;
      contentDiv.style.color = 'white';
      contentDiv.style.padding = '6px 12px';
      contentDiv.style.borderRadius = '20px';
      contentDiv.style.fontWeight = 'bold';
      contentDiv.style.fontSize = '14px';
      contentDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      contentDiv.style.border = '2px solid white';
      contentDiv.style.whiteSpace = 'nowrap';
      contentDiv.style.cursor = 'pointer';

      const marker = new AdvancedMarker({
        position: pos,
        map,
        content: contentDiv,
        title: it.title,
      });

      markerByIdRef.current[it.id] = marker;
      markersRef.current.push(marker);
      bounds.extend(pos);

      // فتح نافذة المعلومات عند النقر
      marker.addListener('click', () => {
        const html = `
          <div style="direction:rtl; font-family: Arial, sans-serif; max-width: 240px;">
            <div style="font-weight: 900; margin-bottom: 6px;">${escapeHtml(it.title || 'عرض')}</div>
            <div style="opacity: .85; font-size: 12px; margin-bottom: 8px;">
              ${escapeHtml(it.neighborhood || '')} ${escapeHtml(it.plan || '')} ${escapeHtml(it.part || '')}
            </div>
            <div style="font-size: 13px; margin-bottom: 8px;">
              النوع: ${it.dealType === 'sale' ? 'بيع' : it.dealType === 'rent' ? 'إيجار' : 'غير محدد'} 
              | السعر: ${priceText}
            </div>
            <a href="/listing/${encodeURIComponent(it.id)}" style="color:#0b57d0; text-decoration:none; font-weight:900;">فتح التفاصيل</a>
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
    console.log(`✅ تم إضافة ${list.length} علامة`);
  }, [filteredItemsWithCoords, mapReady]); // إضافة mapReady إلى التبعيات

  function focusOn(id) {
    const map = mapRef.current;
    const marker = markerByIdRef.current[id];
    if (!map || !marker || !window.google?.maps) return;
    map.setZoom(Math.max(map.getZoom(), 15));
    map.panTo(marker.position);
    window.google.maps.event.trigger(marker, 'click');
  }

  const neighborhoodOptions = useMemo(() => {
    return [{ value: '', label: 'كل الأحياء' }].concat(
      (NEIGHBORHOODS || []).map((n) => ({ value: n, label: n }))
    );
  }, []);

  const dealTypeOptions = [
    { value: '', label: 'كل الأنواع' },
    { value: 'sale', label: 'بيع' },
    { value: 'rent', label: 'إيجار' },
  ];

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="h1" style={{ margin: 0 }}>الخريطة</h1>
          <div className="muted" style={{ fontSize: 13 }}>
             تظهر فقط العروض التي تمت اضافة مواقعها على الخريطة
          </div>
        </div>

        <div className="row">
          <Link className="btn" href="/listings">رجوع</Link>
          <button className="btn" onClick={load} disabled={loading}>تحديث</button>
        </div>
      </div>

      {!apiKey && (
        <section className="card" style={{ marginTop: 12, padding: 14 }}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>مفتاح Google Maps غير موجود</div>
          <div className="muted">أضف <b>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</b> في Vercel/المحلي.</div>
        </section>
      )}

      {err && (
        <section className="card" style={{ marginTop: 12, padding: 14 }}>
          <div className="badge err">{err}</div>
        </section>
      )}

      <div className={`topBar ${isFullscreen ? 'topBarFs' : ''}`}>
        <button
          className="xBtn"
          onClick={() => (isFullscreen ? setIsFullscreen(false) : window.history.back())}
          aria-label="إغلاق"
        >
          ✕
        </button>

        <div className="barCenter">
          {/* شريط الأحياء */}
          <ChipsRow value={neighborhood} options={neighborhoodOptions} onChange={setNeighborhood} />
          {/* شريط أنواع الصفقات */}
          <div style={{ marginTop: 8 }}>
            <ChipsRow value={dealType} options={dealTypeOptions} onChange={setDealType} />
          </div>
        </div>

        <div style={{ width: 44 }} />
      </div>

      <div className={`mapHost ${isFullscreen ? 'mapHostFs' : ''}`}>
        <div ref={mapDivRef} className="mapBox" />

        {!mapReady && <div className="mapLoading">جاري تحميل الخريطة…</div>}

        {!isFullscreen && (
          <button
            type="button"
            className="mapTapFs"
            onClick={() => setIsFullscreen(true)}
            aria-label="فتح الخريطة ملء الشاشة"
          />
        )}
      </div>

      {!isFullscreen && (
        <section style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 950 }}>العروض</div>
            {loading ? (
              <div className="muted">تحميل…</div>
            ) : (
              <div className="muted">عدد العلامات: {filteredItemsWithCoords.length}</div>
            )}
          </div>

          {loading ? null : filteredItemsWithCoords.length === 0 ? (
            <div className="card muted" style={{ marginTop: 10, padding: 14 }}>
              لا توجد عروض بإحداثيات ضمن الحي والنوع المختار.
            </div>
          ) : (
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {filteredItemsWithCoords.slice(0, 25).map((it) => (
                <div key={it.id} className="card">
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 950 }}>{it.title || 'عرض'}</div>
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
      )}

      <style jsx>{`
        .topBar {
          margin-top: 12px;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 10px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
        }

        .topBarFs {
          position: fixed;
          top: calc(12px + env(safe-area-inset-top));
          left: calc(12px + env(safe-area-inset-left));
          right: calc(12px + env(safe-area-inset-right));
          z-index: 1000002;
          background: #ffffff;
          border: 1px solid var(--border);
        }

        .topBar :global(.chip) {
          background: #ffffff !important;
          color: #000000 !important;
          border: 1px solid #d1d5db !important;
          font-weight: 700 !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .topBar :global(.chip.active) {
          background: var(--primary) !important;
          color: #1e293b !important;
          border-color: var(--primary) !important;
        }

        .xBtn {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: #f8fafc;
          color: var(--text);
          font-weight: 950;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .xBtn:hover {
          background: #f1f5f9;
        }

        .barCenter {
          flex: 1;
          min-width: 0;
        }

        .mapHost {
          margin-top: 12px;
          height: 60vh;
          min-height: 380px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #f1f5f9;
          position: relative;
        }

        .mapHostFs {
          position: fixed;
          inset: 0;
          height: 100dvh;
          min-height: 100dvh;
          margin: 0;
          border-radius: 0;
          border: none;
          z-index: 1000000;
        }

        @supports not (height: 100dvh) {
          .mapHostFs { height: 100vh; min-height: 100vh; }
        }

        .mapBox { width: 100%; height: 100%; }

        .mapLoading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          color: var(--text);
          background: rgba(255,255,255,0.8);
          z-index: 5;
          backdrop-filter: blur(4px);
        }

        .mapTapFs {
          position: absolute;
          inset: 0;
          border: 0;
          padding: 0;
          margin: 0;
          background: transparent;
          cursor: zoom-in;
          z-index: 6;
        }

        @media (hover: hover) {
          .mapTapFs:hover { background: rgba(255, 255, 255, 0.05); }
        }
      `}</style>
    </div>
  );
}
