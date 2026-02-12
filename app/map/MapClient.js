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
 * ✅ تحميل Google Maps بشكل ثابت (Singleton) + Timeout
 * يمنع تعليق "جاري التحميل..." بسبب race condition في App Router
 */
let __gmapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);

  if (__gmapsPromise) return __gmapsPromise;

  __gmapsPromise = new Promise((resolve, reject) => {
    const SCRIPT_ID = 'google-maps-js';

    const finishResolve = () => {
      try {
        if (window.google && window.google.maps) resolve(window.google.maps);
        else reject(new Error('maps-loaded-but-not-available'));
      } catch (e) {
        reject(e);
      }
    };

    const finishReject = (err) => reject(err || new Error('maps-load-failed'));

    // Timeout يمنع التحميل الأبدي
    const t = setTimeout(() => finishReject(new Error('maps-timeout')), 12000);

    // لو كان السكربت موجود مسبقًا
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      // لو كان حمل خلاص لكن google.maps ما ظهر (نادر) نعطيه فرصة بسيطة
      if (window.google && window.google.maps) {
        clearTimeout(t);
        return resolve(window.google.maps);
      }

      const onLoad = () => {
        clearTimeout(t);
        finishResolve();
      };
      const onError = () => {
        clearTimeout(t);
        finishReject(new Error('maps-script-error'));
      };

      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', onError, { once: true });

      // احتياط: لو السكربت فعليًا جاهز لكن 이벤트 load انتهى
      setTimeout(() => {
        if (window.google && window.google.maps) {
          clearTimeout(t);
          resolve(window.google.maps);
        }
      }, 300);

      return;
    }

    // إنشاء السكربت لأول مرة
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async`;

    script.onload = () => {
      clearTimeout(t);
      finishResolve();
    };
    script.onerror = () => {
      clearTimeout(t);
      finishReject(new Error('maps-script-error'));
    };

    document.head.appendChild(script);
  });

  return __gmapsPromise;
}

export default function MapClient() {
  const sp = useSearchParams();
  const initialNeighborhood = sp.get('neighborhood') || '';

  const [neighborhood, setNeighborhood] = useState(initialNeighborhood);
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

  // ✅ init map (ثابت)
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!apiKey) {
        setMapReady(false);
        return;
      }
      if (!mapDivRef.current) return;

      // لو الخريطة موجودة أصلاً، اعتبرها جاهزة فورًا
      if (mapRef.current && window.google?.maps) {
        setMapReady(true);
        return;
      }

      setMapReady(false);

      try {
        await loadGoogleMaps(apiKey);
        if (cancelled) return;

        // إنشاء الخريطة
        mapRef.current = new window.google.maps.Map(mapDivRef.current, {
          center: { lat: 21.77, lng: 39.08 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        infoRef.current = new window.google.maps.InfoWindow();

        setMapReady(true);

        setTimeout(() => {
          try {
            window.google?.maps?.event?.trigger(mapRef.current, 'resize');
          } catch {}
        }, 120);
      } catch (e) {
        if (!cancelled) {
          const msg = String(e?.message || '');
          if (msg.includes('timeout')) {
            setErr('تعذر تحميل خرائط Google (انتهت المهلة). تحقق من المفتاح/القيود أو وجود مانع إعلانات.');
          } else {
            setErr('تعذر تحميل خريطة Google. تأكد من المفتاح وتفعيل Google Maps JavaScript API.');
          }
          setMapReady(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // ✅ Fullscreen scroll lock
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

  // ✅ markers (Marker عادي ثابت)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((m) => {
      try { m.setMap(null); } catch {}
    });
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
          <div style="direction:rtl; font-family: Arial, sans-serif; max-width: 240px;">
            <div style="font-weight: 900; margin-bottom: 6px;">${escapeHtml(it.title || 'عرض')}</div>
            <div style="opacity: .85; font-size: 12px; margin-bottom: 8px;">
              ${escapeHtml(it.neighborhood || '')} ${escapeHtml(it.plan || '')} ${escapeHtml(it.part || '')}
            </div>
            <a href="/listings/${encodeURIComponent(it.id)}" style="color:#0b57d0; text-decoration:none; font-weight:900;">فتح التفاصيل</a>
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

      <div className={`mapHost ${isFullscreen ? 'mapHostFs' : ''}`}>
        <div ref={mapDivRef} className="mapBox" />

        {!mapReady ? <div className="mapLoading">جاري تحميل الخريطة…</div> : null}

        {!isFullscreen ? (
          <button
            type="button"
            className="mapTapFs"
            onClick={() => setIsFullscreen(true)}
            aria-label="فتح الخريطة ملء الشاشة"
          />
        ) : null}
      </div>

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
          color: #e2e8f0;
          background: rgba(0, 0, 0, 0.18);
          z-index: 5;
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
          .mapTapFs:hover { background: rgba(255, 255, 255, 0.03); }
        }
      `}</style>
    </div>
  );
}
