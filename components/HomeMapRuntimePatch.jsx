'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { fetchListings } from '@/lib/listings';

const NORTH_JEDDAH_CENTER = { lat: 21.7648, lng: 39.1288 };
const NORTH_JEDDAH_ZOOM = 12;
const NORTH_JEDDAH_BOUNDS = {
  south: 21.5600,
  west: 38.9900,
  north: 22.0200,
  east: 39.3000,
};

const HOME_NEIGHBORHOODS = [
  'أبحر الشمالية',
  'الفردوس',
  'الشراع',
  'الأمواج',
  'الصواري',
  'الياقوت',
  'اللؤلؤ',
  'الزمرد',
  'المنارات',
  'الفنار',
  'البحيرات',
  'النور',
  'المروج',
  'الخليج',
  'النجمة',
  'الزهور',
  'الغربية',
  'الشويضي',
  'الغدير',
  'الربيع',
  'الدرة',
  'العبير',
  'العقيق',
  'المجامع',
  'الفرقان',
  'اليسر',
  'الجزيرة',
  'الوداد',
  'التوفيق',
  'الندى',
  'البيان',
  'المجد',
  'رضوى',
  'البوادر',
  'أم سدرة',
  'الهجرة',
  'العويجاء',
  'الشرائع',
];

let gmapsPromise = null;

function isInsideNorthJeddah(item) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= NORTH_JEDDAH_BOUNDS.south
    && lat <= NORTH_JEDDAH_BOUNDS.north
    && lng >= NORTH_JEDDAH_BOUNDS.west
    && lng <= NORTH_JEDDAH_BOUNDS.east;
}

function escapeXml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPrice(price) {
  if (price == null || price === '') return 'السعر';
  const num = Number(price);
  if (Number.isNaN(num)) return 'السعر';
  if (num >= 1_000_000) {
    const value = num / 1_000_000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} مليون`;
  }
  if (num >= 1_000) return `${Math.round(num / 1_000)} ألف`;
  return String(num);
}

function buildPriceBadgeIcon(maps, priceText) {
  const text = String(priceText || 'السعر');
  const charW = 8;
  const padX = 14;
  const height = 34;
  const width = Math.max(68, Math.min(172, text.length * charW + padX * 2));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="14" fill="#0f766e" stroke="#ffffff" stroke-width="3"/>
      <text x="${width / 2}" y="22" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="14" font-weight="900" fill="#ffffff" direction="rtl" unicode-bidi="plaintext">${escapeXml(text)}</text>
    </svg>
  `.trim();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(width, height),
    anchor: new maps.Point(Math.round(width / 2), height),
  };
}

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (gmapsPromise) return gmapsPromise;

  gmapsPromise = new Promise((resolve, reject) => {
    const cbName = `__home_map_cb_${Date.now()}`;
    window[cbName] = () => {
      try {
        resolve(window.google.maps);
      } catch (error) {
        reject(error);
      } finally {
        try { delete window[cbName]; } catch {}
      }
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('تعذر تحميل الخريطة.'));
    document.head.appendChild(script);
  });

  return gmapsPromise;
}

function patchHomeNeighborhoods() {
  const strip = document.querySelector('.premiumHome .neighborhoodsBand .chipsScroller');
  if (!strip || strip.dataset.neighborhoodsReady === '1') return;

  strip.dataset.neighborhoodsReady = '1';
  strip.innerHTML = '';
  strip.style.display = 'flex';
  strip.style.flexWrap = 'nowrap';
  strip.style.gap = '10px';
  strip.style.overflowX = 'auto';
  strip.style.overflowY = 'hidden';
  strip.style.padding = '4px 2px 14px';
  strip.style.webkitOverflowScrolling = 'touch';
  strip.style.scrollbarWidth = 'none';

  HOME_NEIGHBORHOODS.forEach((name) => {
    const link = document.createElement('a');
    link.href = `/listings?neighborhood=${encodeURIComponent(name)}`;
    link.className = 'neighborhoodChip';
    link.textContent = name;
    link.style.flex = '0 0 auto';
    link.style.display = 'inline-flex';
    link.style.alignItems = 'center';
    link.style.justifyContent = 'center';
    link.style.minHeight = '42px';
    link.style.padding = '0 15px';
    link.style.borderRadius = '999px';
    link.style.whiteSpace = 'nowrap';
    link.style.background = '#fff';
    link.style.border = '1px solid rgba(216,178,95,.38)';
    link.style.color = '#1f2937';
    link.style.fontSize = '14px';
    link.style.fontWeight = '850';
    link.style.textDecoration = 'none';
    link.style.boxShadow = '0 8px 22px rgba(15,23,42,.05)';
    strip.appendChild(link);
  });

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

export default function HomeMapRuntimePatch() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (pathname !== '/') return undefined;
    if (typeof document === 'undefined') return undefined;

    let disposed = false;
    let observer = null;
    let markers = [];

    async function renderLiveMap(oldMap) {
      if (disposed || !oldMap) return;

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      if (!apiKey) {
        oldMap.innerHTML = `
          <a class="homeLiveMapFallback" href="/map">
            <strong>الخريطة العقارية</strong>
            <small>افتح الخريطة لعرض العقارات المتاحة</small>
          </a>
        `;
        return;
      }

      oldMap.innerHTML = '<div class="homeLiveMapCanvas" aria-label="خريطة العروض العقارية"></div>';
      const canvas = oldMap.querySelector('.homeLiveMapCanvas');
      if (!canvas) return;

      try {
        const maps = await loadGoogleMaps(apiKey);
        if (disposed) return;

        const map = new maps.Map(canvas, {
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
          styles: [
            { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          ],
        });

        const data = await fetchListings({ onlyPublic: true, includeLegacy: true, max: 80 });
        if (disposed) return;

        const listingItems = (Array.isArray(data) ? data : [])
          .filter(isInsideNorthJeddah)
          .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
          .slice(0, 35);

        if (listingItems.length) {
          const bounds = new maps.LatLngBounds();
          listingItems.forEach((item) => {
            const position = { lat: Number(item.lat), lng: Number(item.lng) };
            bounds.extend(position);
            const marker = new maps.Marker({
              position,
              map,
              title: item.title || 'عرض عقاري',
              icon: buildPriceBadgeIcon(maps, formatPrice(item.price)),
              optimized: true,
            });
            marker.addListener('click', () => {
              const id = item.id || item.docId || item.listingId || '';
              window.location.href = id ? `/listing/${encodeURIComponent(String(id))}` : '/map';
            });
            markers.push(marker);
          });

          try {
            map.fitBounds(bounds, 58);
            setTimeout(() => {
              const zoom = map.getZoom();
              if (zoom && zoom < NORTH_JEDDAH_ZOOM) map.setZoom(NORTH_JEDDAH_ZOOM);
              if (zoom && zoom > 15) map.setZoom(15);
            }, 120);
          } catch {
            map.setCenter(NORTH_JEDDAH_CENTER);
            map.setZoom(NORTH_JEDDAH_ZOOM);
          }
        } else {
          map.setCenter(NORTH_JEDDAH_CENTER);
          map.setZoom(NORTH_JEDDAH_ZOOM);
        }

        setTimeout(() => {
          try { maps.event.trigger(map, 'resize'); } catch {}
        }, 250);
      } catch {
        if (disposed) return;
        oldMap.innerHTML = `
          <a class="homeLiveMapFallback" href="/map">
            <strong>الخريطة العقارية</strong>
            <small>افتح الخريطة لعرض العقارات المتاحة</small>
          </a>
        `;
      }
    }

    function patchMapCard() {
      if (disposed) return;
      const oldMap = document.querySelector('.premiumHome .mapMock');
      if (!oldMap || oldMap.dataset.cleanMapReady === '1') return;

      const card = oldMap.closest('.mapPreviewCard');
      if (!card) return;

      oldMap.dataset.cleanMapReady = '1';
      oldMap.classList.add('cleanGoogleMapPreview', 'homeLiveListingsMap');
      oldMap.setAttribute('aria-hidden', 'false');
      renderLiveMap(oldMap);
    }

    function patchHome() {
      patchHomeNeighborhoods();
      patchMapCard();
    }

    patchHome();
    observer = new MutationObserver(patchHome);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      markers.forEach((marker) => {
        try { marker.setMap(null); } catch {}
      });
      markers = [];
      if (observer) observer.disconnect();
    };
  }, [pathname]);

  return null;
}
