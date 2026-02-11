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

function formatPriceTag(price, isRent) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return '—';
  let short = '';
  if (n >= 1000000) {
    const v = n / 1000000;
    short = (v >= 10 ? v.toFixed(0) : v.toFixed(1)).replace(/\.0$/, '') + 'م';
  } else if (n >= 1000) {
    const v = n / 1000;
    short = (v >= 10 ? v.toFixed(0) : v.toFixed(1)).replace(/\.0$/, '') + 'ألف';
  } else {
    short = String(Math.round(n));
  }
  return `${short} ر.س${isRent ? ' شهري' : ''}`;
}

function buildInfoHtml(it) {
  return `
    <div style="direction:rtl; font-family: Arial, sans-serif; max-width: 240px;">
      <div style="font-weight: 900; margin-bottom: 6px;">${escapeHtml(it?.title || 'عرض')}</div>
      <div style="opacity: .85; font-size: 12px; margin-bottom: 8px;">
        ${escapeHtml(it?.neighborhood || '')} ${escapeHtml(it?.plan || '')} ${escapeHtml(it?.part || '')}
      </div>
      <a href="/listing/${encodeURIComponent(it?.id || '')}" style="color:#0b57d0; text-decoration:none; font-weight:900;">فتح التفاصيل</a>
    </div>
  `;
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&libraries=marker`;
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

  const [neighborhood, setNeighborhood] = useState(initialNeighborhood);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // ✅ مهم: بدل الاعتماد على mapRef (لا يسبب re-render)
  const [mapReady, setMapReady] = useState(false);

  // ✅ Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markersRef = useRef([]);
  const markerByIdRef = useRef({});

  const prevBodyOverflowRef = useRef('');
  const prevHtmlOverflowRef = useRef('');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const filters = useMemo(() => {
    const f = {};
    if (neighborhood) f.neighborhood = neighborhood;
    return f;
  }, [neighborhood]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // ✅ init map
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey) return;
      if (!mapDivRef.current) return;

      setMapReady(false);

      try {
        await loadGoogleMaps(apiKey);
        if (cancelled) return;

        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(mapDivRef.current, {
            center: { lat: 21.77, lng: 39.08 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
          infoRef.current = new window.google.maps.InfoWindow();
        }

        // ✅ الآن الخريطة جاهزة (نخفي “جاري التحميل…”)
        setMapReady(true);

        // ✅ resize آمن بعد أول رسم (مهم للجوال)
        setTimeout(() => {
          try {
            window.google?.maps?.event?.trigger(mapRef.current, 'resize');
          } catch {}
        }, 120);
      } catch {
        if (!cancelled) {
          setErr('تعذر تحميل خريطة Google. تأكد من المفتاح وتفعيل Google Maps JavaScript API.');
          setMapReady(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // ✅ Fullscreen: نقفل التمرير فقط وقت الملء ونرجعه مضبوط
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

      // resize للخرائط بعد الانتقال لملء الشاشة
      setTimeout(() => {
        try {
          window.google?.maps?.event?.trigger(mapRef.current, 'resize');
        } catch {}
      }, 120);
    } else {
      html.style.overflow = prevHtmlOverflowRef.current;
      body.style.overflow = prevBodyOverflowRef.current;
      body.classList.remove('isMapFullscreen');

      setTimeout(() => {
        try {
          window.google?.maps?.event?.trigger(mapRef.current, 'resize');
        } catch {}
      }, 120);
    }
  }, [isFullscreen]);

  // ✅ markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((m) => {
      try {
        if (m?.setMap) m.setMap(null); // Marker
        else if (m && 'map' in m) m.map = null; // AdvancedMarkerElement
        else if (m?.remove) m.remove();
      } catch {}
    });
    markersRef.current = [];
    markerByIdRef.current = {};

    const list = filteredItemsWithCoords;
    if (!list || list.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

        list.forEach((it) => {
      const pos = { lat: Number(it.lat), lng: Number(it.lng) };

      const canAdvanced = !!window.google?.maps?.marker?.AdvancedMarkerElement;

      let marker;
      if (canAdvanced) {
        const tag = document.createElement('div');
        tag.className = 'gmPriceTag';
        tag.textContent = formatPriceTag(it.price, it.dealType === 'rent');

        marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: pos,
          map,
          title: String(it.title || 'عرض'),
          gmpClickable: true,
        });

        // AdvancedMarkerElement هو DOM element
        try {
          marker.append(tag);
        } catch {
          // احتياط لو اختلفت الواجهة
          try {
            marker.content = tag;
          } catch {}
        }
      } else {
        // fallback: Marker عادي (بدون شكل دبوس + نص فقط)
        marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: String(it.title || 'عرض'),
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 0 }, // نخفي الدائرة
          label: {
            text: formatPriceTag(it.price, it.dealType === 'rent'),
            color: '#ffffff',
            fontWeight: '900',
            fontSize: '12px',
          },
        });
      }

      markerByIdRef.current[it.id] = marker;
      markersRef.current.push(marker);
      bounds.extend(pos);

      const onOpen = () => {
        const html = buildInfoHtml(it);
        infoRef.current.setContent(html);

        // AdvancedMarkerElement قد لا يدعم anchor في بعض الإصدارات، لذلك نفتح على position احتياط
        if (canAdvanced) {
          try {
            infoRef.current.setPosition(pos);
            infoRef.current.open({ map });
          } catch {
            try {
              infoRef.current.open({ anchor: marker, map });
            } catch {}
          }
        } else {
          infoRef.current.open({ anchor: marker, map });
        }
      };

      if (canAdvanced && marker?.addListener) {
        marker.addListener('gmp-click', onOpen);
      } else if (marker?.addListener) {
        marker.addListener('click', onOpen);
      } else {
        try {
          window.google.maps.event.addListener(marker, canAdvanced ? 'gmp-click' : 'click', onOpen);
        } catch {}
      }
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

    const it = (filteredItemsWithCoords || []).find((x) => x.id === id);

    const pos =
      (marker?.getPosition && marker.getPosition()) ||
      marker?.position ||
      (it ? { lat: Number(it.lat), lng: Number(it.lng) } : null);

    if (!pos) return;

    map.setZoom(Math.max(map.getZoom(), 15));
    map.panTo(pos);

    if (it && infoRef.current) {
      infoRef.current.setContent(buildInfoHtml(it));
      // فتح آمن: AdvancedMarkerElement نستخدم position
      if (marker?.position && !marker?.getPosition) {
        try {
          infoRef.current.setPosition(pos);
          infoRef.current.open({ map });
        } catch {}
      } else {
        try {
          infoRef.current.open({ anchor: marker, map });
        } catch {
          try {
            infoRef.current.setPosition(pos);
            infoRef.current.open({ map });
          } catch {}
        }
      }
    }
  }

  const neighborhoodOptions = useMemo(() => {
    return [{ value: '', label: 'كل الأحياء' }].concat(
      (NEIGHBORHOODS || []).map((n) => ({ value: n, label: n }))
    );
  }, []);

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="h1" style={{ margin: 0 }}>الخريطة</h1>
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
        <section className="card" style={{ marginTop: 12, padding: 14 }}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>مفتاح Google Maps غير موجود</div>
          <div className="muted">أضف <b>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</b> في Vercel/المحلي.</div>
        </section>
      ) : null}

      {err ? (
        <section className="card" style={{ marginTop: 12, padding: 14 }}>
          <div className="badge err">{err}</div>
        </section>
      ) : null}

      {/* ✅ شريط علوي بدون أي تظليل فوق الخريطة */}
      <div className={`topBar ${isFullscreen ? 'topBarFs' : ''}`}>
        <button
          className="xBtn"
          onClick={() => (isFullscreen ? setIsFullscreen(false) : window.history.back())}
          aria-label="إغلاق"
        >
          ✕
        </button>

        <div className="barCenter">
          <ChipsRow value={neighborhood} options={neighborhoodOptions} onChange={setNeighborhood} />
        </div>

        <div style={{ width: 44 }} />
      </div>

      {/* ✅ الخريطة */}
      <div className={`mapHost ${isFullscreen ? 'mapHostFs' : ''}`}>
        <div ref={mapDivRef} className="mapBox" />

        {/* ✅ يظهر فقط إذا الخريطة غير جاهزة */}
        {!mapReady ? <div className="mapLoading">جاري تحميل الخريطة…</div> : null}

        {/* ✅ فتح ملء الشاشة تلقائيًا عند الضغط على الخريطة (في الوضع العادي فقط) */}
        {!isFullscreen ? (
          <button
            type="button"
            className="mapTapFs"
            onClick={() => setIsFullscreen(true)}
            aria-label="فتح الخريطة ملء الشاشة"
          />
        ) : null}
      </div>

      {/* ✅ قائمة مصغرة (تختفي في fullscreen) */}
      {!isFullscreen ? (
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
              لا توجد عروض بإحداثيات ضمن الحي المختار.
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
      ) : null}

      <style jsx>{`
        .topBar {
          margin-top: 12px;
          background: rgba(10, 13, 18, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 16px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(14px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        /* ✅ ثابت فوق الخريطة (بدون Overlay) + safe area */
        .topBarFs {
          position: fixed;
          top: calc(12px + env(safe-area-inset-top));
          left: calc(12px + env(safe-area-inset-left));
          right: calc(12px + env(safe-area-inset-right));
          z-index: 1000002;
        }

        .xBtn {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-weight: 950;
          cursor: pointer;
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
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: #0b1220;
          position: relative;
        }

        /* ✅ Fullscreen ثابت + dVH للجوال */
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

        /* fallback لو متصفح ما يدعم dvh */
        @supports not (height: 100dvh) {
          .mapHostFs {
            height: 100vh;
            min-height: 100vh;
          }
        }

        .mapBox {
          width: 100%;
          height: 100%;
        }

        /* ✅ لا يوجد تظليل دائم على الخريطة */
        .mapLoading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          color: #e2e8f0;
          background: rgba(0, 0, 0, 0.18); /* خفيف فقط أثناء التحميل */
          z-index: 5;
        }

        /* ✅ طبقة شفافة تلتقط أول ضغطة لفتح ملء الشاشة */
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

        /* على الجوال: ما نحتاج hover */
        @media (hover: hover) {
          .mapTapFs:hover {
            background: rgba(255, 255, 255, 0.03);
          }
        }
      `}</style>


      <style jsx global>{`
        .gmPriceTag {
          position: relative;
          background: rgba(10, 13, 18, 0.92);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 950;
          font-size: 13px;
          line-height: 1;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.30);
          transform: translateY(-6px);
          cursor: pointer;
          user-select: none;
        }
        .gmPriceTag::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -6px;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid rgba(10, 13, 18, 0.92);
        }
      `}</style>
    </div>
  );
}
