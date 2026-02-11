'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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
    // ✅ loading=async + async/defer (أفضل ممارسة + يقلل التحذيرات)
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
  const router = useRouter();
  const sp = useSearchParams();
  const initialNeighborhood = sp.get('neighborhood') || '';

  const [neighborhood, setNeighborhood] = useState(initialNeighborhood);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // ✅ بدل الاعتماد على mapRef (لا يسبب re-render)
  const [mapReady, setMapReady] = useState(false);

  // ✅ Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ✅ قائمة العروض (مخفية افتراضيًا على الجوال لتكون أول لقطة مثل الفيديو)
  const [showList, setShowList] = useState(false);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markersRef = useRef([]);
  const markerByIdRef = useRef({});

  const prevBodyOverflowRef = useRef('');
  const prevHtmlOverflowRef = useRef('');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const neighborhoodOptions = useMemo(() => {
    return [{ value: '', label: 'كل الأحياء' }].concat(
      (NEIGHBORHOODS || []).map((n) => ({ value: n, label: n }))
    );
  }, []);

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

  // ✅ افتراضياً: نخفي قائمة العروض على الجوال (مثل الفيديو)
  useEffect(() => {
    try {
      const mq = window.matchMedia('(min-width: 900px)');
      const apply = () => setShowList(Boolean(mq.matches));
      apply();
      if (mq.addEventListener) mq.addEventListener('change', apply);
      else mq.addListener(apply);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', apply);
        else mq.removeListener(apply);
      };
    } catch {}
  }, []);

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
            center: { lat: 21.543333, lng: 39.172778 },
            zoom: 11,
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
          <div style="direction:rtl; font-family: Arial, sans-serif; max-width: 240px;">
            <div style="font-weight: 900; margin-bottom: 6px;">${escapeHtml(it.title || 'عرض')}</div>
            <div style="opacity: .85; font-size: 12px; margin-bottom: 8px;">
              ${escapeHtml(it.neighborhood || '')} ${escapeHtml(it.plan || '')} ${escapeHtml(it.part || '')}
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
  }, [filteredItemsWithCoords]);

  function focusOn(id) {
    const map = mapRef.current;
    const marker = markerByIdRef.current[id];
    if (!map || !marker || !window.google?.maps) return;

    map.setZoom(Math.max(map.getZoom(), 15));
    map.panTo(marker.getPosition());
    window.google.maps.event.trigger(marker, 'click');
  }

  function handleCloseBar() {
    if (isFullscreen) {
      setIsFullscreen(false);
      return;
    }
    if (neighborhood) {
      setNeighborhood('');
      return;
    }
    router.push('/listings');
  }

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      {/* ✅ الهيدر الخاص بالصفحة (مثل الفيديو) */}
      <section className="mapHero">
        <div className="heroContent">
          <h1 className="heroTitle">الخريطة</h1>
          <div className="heroSub muted">تظهر فقط العروض التي تحتوي على إحداثيات (lat/lng).</div>

          <div className="heroActions">
            <Link className="btn" href="/listings">رجوع</Link>
            <button className="btn" onClick={load} disabled={loading}>تحديث</button>
          </div>
        </div>
      </section>

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

      {/* ✅ شريط الأحياء + ملء الشاشة (نفس تصميم الفيديو) */}
      <div className={`filterBar ${isFullscreen ? 'filterBarFs' : ''}`}>
        <button className="closeBtn" onClick={handleCloseBar} aria-label="إغلاق">
          ✕
        </button>

        <div className="chipsWrap" aria-label="فلترة الأحياء">
          <div className="chipsScroll">
            {!isFullscreen ? (
              <button
                type="button"
                className="chip"
                onClick={() => setIsFullscreen(true)}
                aria-label="ملء الشاشة"
              >
                ملء الشاشة
              </button>
            ) : null}

            {neighborhoodOptions.map((opt) => {
              const active = neighborhood === opt.value;
              return (
                <button
                  key={opt.value || '__all__'}
                  type="button"
                  className={`chip ${active ? 'chipActive' : ''}`}
                  onClick={() => setNeighborhood(active ? '' : opt.value)}
                  disabled={loading}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ✅ الخريطة */}
      <div className={`mapHost ${isFullscreen ? 'mapHostFs' : ''}`}>
        <div ref={mapDivRef} className="mapBox" />

        {/* ✅ يظهر فقط إذا الخريطة غير جاهزة */}
        {!mapReady ? <div className="mapLoading">جاري تحميل الخريطة…</div> : null}
      </div>

      {/* ✅ قائمة العروض (اختيارية / مخفية افتراضياً للجوال) */}
      {!isFullscreen ? (
        <section style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 950 }}>العروض</div>

            <div className="row" style={{ gap: 10 }}>
              {loading ? (
                <div className="muted">تحميل…</div>
              ) : (
                <div className="muted">عدد العلامات: {filteredItemsWithCoords.length}</div>
              )}

              <button
                className="btn"
                type="button"
                onClick={() => setShowList((v) => !v)}
                disabled={loading}
              >
                {showList ? 'إخفاء' : 'عرض'}
              </button>
            </div>
          </div>

          {!showList ? null : loading ? null : filteredItemsWithCoords.length === 0 ? (
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
        /* ===== Hero (مثل الفيديو) ===== */
        .mapHero {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(10, 13, 18, 0.55);
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(16px);
          position: relative;
          overflow: hidden;
          padding: 18px 18px 16px;
        }

        .mapHero::before {
          content: '';
          position: absolute;
          inset: -40px -30px auto -30px;
          height: 160px;
          background: radial-gradient(circle at 20% 20%, rgba(214, 179, 91, 0.22), transparent 55%),
                      radial-gradient(circle at 80% 30%, rgba(79, 117, 255, 0.14), transparent 52%);
          pointer-events: none;
          filter: blur(2px);
        }

        .heroContent {
          position: relative;
          z-index: 1;
        }

        .heroTitle {
          margin: 0;
          font-weight: 950;
          letter-spacing: -0.6px;
          line-height: 1.05;
          font-size: clamp(34px, 7vw, 48px);
        }

        .heroSub {
          margin-top: 8px;
          font-size: 13px;
        }

        .heroActions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-start;
        }

        /* ===== Filter Bar (الشريط) ===== */
        .filterBar {
          margin-top: 12px;
          background: rgba(10, 13, 18, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(14px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        /* ✅ في وضع ملء الشاشة: يطفو أعلى الخريطة */
        .filterBarFs {
          position: fixed;
          top: calc(12px + env(safe-area-inset-top));
          left: calc(12px + env(safe-area-inset-left));
          right: calc(12px + env(safe-area-inset-right));
          z-index: 1000002;
          margin-top: 0;
        }

        .closeBtn {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-weight: 950;
          cursor: pointer;
          flex: 0 0 auto;
        }

        .chipsWrap {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .chipsScroll {
          display: flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
        }

        .chip {
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.05);
          color: #f8fafc;
          font-weight: 900;
          padding: 10px 14px;
          border-radius: 999px;
          cursor: pointer;
          user-select: none;
        }

        .chip:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.22);
        }

        .chipActive {
          border-color: rgba(30, 115, 216, 0.55);
          background: rgba(30, 115, 216, 0.14);
          color: #dbeafe;
        }

        .chip:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ===== Map ===== */
        .mapHost {
          margin-top: 12px;
          height: 55vh;
          min-height: 360px;
          border-radius: 22px;
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

        .mapLoading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          color: #e2e8f0;
          background: rgba(0, 0, 0, 0.18);
        }

        
        :global(.badge.err) {
          border-color: rgba(239, 68, 68, 0.25);
          background: rgba(239, 68, 68, 0.08);
          color: var(--danger);
        }
@media (max-width: 480px) {
          .filterBar {
            border-radius: 16px;
          }
          .closeBtn {
            width: 52px;
            height: 52px;
            border-radius: 16px;
          }
          .chip {
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
}
