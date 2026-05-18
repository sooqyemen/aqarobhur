'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { fetchListings } from '@/lib/listings';

const CENTER = { lat: 21.7648, lng: 39.1288 };
const ZOOM = 12;
const BOUNDS = { south: 21.56, west: 38.99, north: 22.02, east: 39.3 };

const HOME_NEIGHBORHOODS = [
  'أبحر الشمالية', 'الفردوس', 'الشراع', 'الأمواج', 'الصواري', 'الياقوت', 'اللؤلؤ', 'الزمرد',
  'المنارات', 'الفنار', 'البحيرات', 'النور', 'المروج', 'الخليج', 'النجمة', 'الزهور',
  'الغربية', 'الشويضي', 'الغدير', 'الربيع', 'الدرة', 'العبير', 'العقيق', 'المجامع',
  'الفرقان', 'اليسر', 'الجزيرة', 'الوداد', 'التوفيق', 'الندى', 'البيان', 'المجد',
  'رضوى', 'البوادر', 'أم سدرة', 'الهجرة', 'العويجاء', 'الشرائع',
];

let mapsPromise = null;

function insideArea(item) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= BOUNDS.south && lat <= BOUNDS.north && lng >= BOUNDS.west && lng <= BOUNDS.east;
}

function xml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function priceText(price) {
  const num = Number(price);
  if (!Number.isFinite(num)) return 'السعر';
  if (num >= 1_000_000) {
    const value = num / 1_000_000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} مليون`;
  }
  if (num >= 1_000) return `${Math.round(num / 1_000)} ألف`;
  return String(num);
}

function badgeIcon(maps, text) {
  const label = String(text || 'السعر');
  const width = Math.max(68, Math.min(172, label.length * 8 + 28));
  const height = 34;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="14" fill="#0f766e" stroke="#fff" stroke-width="3"/><text x="${width / 2}" y="22" text-anchor="middle" font-family="system-ui, Arial" font-size="14" font-weight="900" fill="#fff" direction="rtl" unicode-bidi="plaintext">${xml(label)}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(width, height),
    anchor: new maps.Point(Math.round(width / 2), height),
  };
}

function hotspot(items) {
  const groups = new Map();
  items.forEach((item) => {
    const lat = Number(item?.lat);
    const lng = Number(item?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const neighborhood = String(item?.neighborhood || '').trim();
    const key = neighborhood || `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const group = groups.get(key) || { count: 0, lat: 0, lng: 0 };
    group.count += 1;
    group.lat += lat;
    group.lng += lng;
    groups.set(key, group);
  });

  const top = [...groups.values()].sort((a, b) => b.count - a.count)[0];
  if (!top) return { center: CENTER, zoom: ZOOM, href: '/map' };

  const center = { lat: top.lat / top.count, lng: top.lng / top.count };
  const zoom = top.count >= 8 ? 13 : 12;
  return {
    center,
    zoom,
    href: `/map?lat=${center.lat.toFixed(6)}&lng=${center.lng.toFixed(6)}&zoom=${zoom}`,
  };
}

function loadMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__home_map_v2_${Date.now()}`;
    window[callbackName] = () => {
      resolve(window.google.maps);
      try { delete window[callbackName]; } catch {}
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('تعذر تحميل الخريطة'));
    document.head.appendChild(script);
  });

  return mapsPromise;
}

function patchNeighborhoods() {
  const strip = document.querySelector('.premiumHome .neighborhoodsBand .chipsScroller');
  if (strip && strip.dataset.neighborhoodsReady !== '1') {
    strip.dataset.neighborhoodsReady = '1';
    strip.innerHTML = '';
    strip.style.display = 'flex';
    strip.style.flexWrap = 'nowrap';
    strip.style.gap = '10px';
    strip.style.overflowX = 'auto';
    strip.style.padding = '4px 2px 14px';
    strip.style.scrollbarWidth = 'none';

    HOME_NEIGHBORHOODS.forEach((name) => {
      const link = document.createElement('a');
      link.href = `/listings?neighborhood=${encodeURIComponent(name)}`;
      link.className = 'neighborhoodChip';
      link.textContent = name;
      strip.appendChild(link);
    });
  }

  const select = document.querySelector('.premiumHome .heroSearch select');
  if (select && select.dataset.neighborhoodsReady !== '1') {
    select.dataset.neighborhoodsReady = '1';
    select.innerHTML = '<option value="">اختر الحي</option>';
    HOME_NEIGHBORHOODS.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  }
}

export default function HomeMapRuntimePatchV2() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (pathname !== '/' || typeof document === 'undefined') return undefined;

    let cancelled = false;
    let observer = null;
    let mapMarkers = [];

    async function drawMap(mapBox) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      if (!apiKey) {
        mapBox.innerHTML = '<a class="homeLiveMapFallback" href="/map"><strong>الخريطة العقارية</strong><small>افتح الخريطة لعرض العقارات المتاحة</small></a>';
        return;
      }

      mapBox.innerHTML = '<div class="homeLiveMapCanvas" aria-label="خريطة العروض العقارية"></div>';
      const canvas = mapBox.querySelector('.homeLiveMapCanvas');
      if (!canvas) return;

      try {
        const maps = await loadMaps(apiKey);
        const data = await fetchListings({ onlyPublic: true, includeLegacy: true, max: 160 });
        if (cancelled) return;

        const listings = (Array.isArray(data) ? data : [])
          .filter(insideArea)
          .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)));
        const focus = hotspot(listings);

        const map = new maps.Map(canvas, {
          center: focus.center,
          zoom: focus.zoom,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          ],
        });

        const action = document.querySelector('.premiumHome .mapPreviewCard .mapAction');
        if (action) action.setAttribute('href', focus.href);

        listings.slice(0, 120).forEach((item) => {
          const marker = new maps.Marker({
            position: { lat: Number(item.lat), lng: Number(item.lng) },
            map,
            title: item.title || 'عرض عقاري',
            icon: badgeIcon(maps, priceText(item.price)),
            optimized: true,
          });
          marker.addListener('click', () => {
            const id = item.id || item.docId || item.listingId || '';
            window.location.href = id ? `/listing/${encodeURIComponent(String(id))}` : focus.href;
          });
          mapMarkers.push(marker);
        });

        map.setCenter(focus.center);
        map.setZoom(focus.zoom);
        setTimeout(() => {
          try { maps.event.trigger(map, 'resize'); } catch {}
        }, 250);
      } catch {
        if (!cancelled) {
          mapBox.innerHTML = '<a class="homeLiveMapFallback" href="/map"><strong>الخريطة العقارية</strong><small>افتح الخريطة لعرض العقارات المتاحة</small></a>';
        }
      }
    }

    function patchMap() {
      patchNeighborhoods();
      const mapBox = document.querySelector('.premiumHome .mapMock');
      if (!mapBox || mapBox.dataset.homeMapV2Ready === '1') return;
      mapBox.dataset.homeMapV2Ready = '1';
      mapBox.classList.add('cleanGoogleMapPreview', 'homeLiveListingsMap');
      mapBox.setAttribute('aria-hidden', 'false');
      drawMap(mapBox);
    }

    patchMap();
    observer = new MutationObserver(patchMap);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      mapMarkers.forEach((marker) => {
        try { marker.setMap(null); } catch {}
      });
      mapMarkers = [];
      if (observer) observer.disconnect();
    };
  }, [pathname]);

  return null;
}
