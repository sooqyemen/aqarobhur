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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = '1';
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('maps-load-failed'));
    document.head.appendChild(script);
  });
}

export default function MapPage() {
  const sp = useSearchParams();

  // ✅ دعم query params القادمة من صفحة /listings
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

  // جلب البيانات عند تغيّر الفلاتر
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
          // ✅ مركز جدة الافتراضي
          mapRef.current = new window.google.maps.Map(mapElRef.current, {
            center: { lat: 21.543333, lng: 39.172778 },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
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

  // تحديث الماركرز مع تغيّر البيانات
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // امسح القديم
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

    // زوم على كل العلامات
    map.fitBounds(bounds);

    // إذا كانت علامة واحدة فقط
    if (list.length === 1) {
      map.setZoom(15);
      map.setCenter({ lat: Number(list[0].lat), lng: Number(list[0].lng) });
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

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="h1">خريطة العروض</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            تظهر فقط العروض التي تحتوي على إحداثيات (lat/lng). أضفها من صفحة الأدمن عند إنشاء العرض.
          </div>
        </div>
        <div className="row">
          <Link className="btn" href="/listings">رجوع للعروض</Link>
          <button className="btn" onClick={load} disabled={loading}>تحديث</button>
        </div>
      </div>

      {!apiKey ? (
        <section className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>مفتاح Google Maps غير موجود</div>
          <div className="muted" style={{ lineHeight: 1.7 }}>
            أضف متغير البيئة <b>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</b> في Vercel/المحلي، وفعّل Google Maps JavaScript API في Google Cloud.
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
            <ChipsRow value={propertyClass} options={classOptions} onChange={(v) => {
              setPropertyClass(v);
              // لو غيّر التصنيف، نفضي النوع لتفادي تعارض (اختياري)
              setPropertyType('');
            }} />
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
          <div className="muted" style={{ fontSize: 13 }}>
            عدد العلامات: {filteredItemsWithCoords.length}
          </div>
        </div>

        <div
          ref={mapElRef}
          className="mapBox"
          style={{ marginTop: 10, height: '60vh', minHeight: 360, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}
        />
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
    </div>
  );
}
