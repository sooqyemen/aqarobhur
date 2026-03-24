'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import ListingCard from '@/components/ListingCard';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { formatPriceSAR } from '@/lib/format';
import { fetchListingById, fetchListings } from '@/lib/listings';

function getSafeString(value) {
  return String(value || '').trim();
}

function getStatusMeta(item) {
  const status = String(item?.status || 'available');
  const dealType = String(item?.dealType || 'sale');

  if (status === 'reserved') {
    return { label: 'محجوز', className: 'warn' };
  }
  if (status === 'sold') {
    return { label: dealType === 'rent' ? 'مؤجر' : 'مباع', className: 'danger' };
  }
  if (status === 'canceled' || status === 'hidden' || status === 'inactive') {
    return { label: 'غير متاح', className: 'muted' };
  }
  return { label: 'متاح', className: 'ok' };
}

function getDealTypeLabel(value) {
  return value === 'rent' ? 'إيجار' : 'بيع';
}

function getMapUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function waitForGoogleMaps() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tick = () => {
      if (typeof window !== 'undefined' && window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      if (Date.now() - startedAt > 12000) {
        reject(new Error('تعذر تحميل خرائط Google.'));
        return;
      }
      window.setTimeout(tick, 120);
    };

    tick();
  });
}

function loadGoogleMaps() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('يجب تشغيل الصفحة داخل المتصفح.'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__aqarobhurMapsPromise) {
    return window.__aqarobhurMapsPromise;
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error('مفتاح خرائط Google غير موجود.'));
  }

  const existing = document.querySelector('script[data-aqarobhur-google-maps="1"]');
  if (existing) {
    window.__aqarobhurMapsPromise = waitForGoogleMaps();
    return window.__aqarobhurMapsPromise;
  }

  window.__aqarobhurMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&language=ar&region=SA`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-aqarobhur-google-maps', '1');
    script.onload = () => {
      waitForGoogleMaps().then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error('تعذر تحميل خرائط Google.'));
    document.head.appendChild(script);
  });

  return window.__aqarobhurMapsPromise;
}

function useIsSmallScreen() {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mq = window.matchMedia('(max-width: 980px)');
    const apply = () => setIsSmall(!!mq.matches);
    apply();

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }

    mq.addListener?.(apply);
    return () => mq.removeListener?.(apply);
  }, []);

  return isSmall;
}

function ImageGallery({ images, title }) {
  const safeImages = useMemo(() => {
    if (!Array.isArray(images)) return [];
    return images.filter(Boolean);
  }, [images]);

  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [safeImages.length]);

  if (!safeImages.length) {
    return (
      <div className="detailsCard detailsGalleryEmpty">
        <div className="detailsSectionTitle">الصور</div>
        <div className="detailsEmptyBox">لا توجد صور مضافة لهذا العرض.</div>
      </div>
    );
  }

  const mainImage = safeImages[active] || safeImages[0];

  return (
    <div className="detailsCard detailsGalleryCard">
      <div className="detailsSectionTitle">الصور</div>

      <div className="detailsMainImageWrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="detailsMainImage" src={mainImage} alt={title || 'صورة العقار'} />
      </div>

      {safeImages.length > 1 ? (
        <div className="detailsThumbs" aria-label="صور العرض">
          {safeImages.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              className={`detailsThumbBtn ${idx === active ? 'active' : ''}`}
              onClick={() => setActive(idx)}
              aria-label={`عرض الصورة ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="detailsThumbImg" src={src} alt={`صورة ${idx + 1}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DetailsMap({ item }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapType, setMapType] = useState('roadmap');
  const [mapErr, setMapErr] = useState('');
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    let canceled = false;

    if (!hasCoords || !mapRef.current) return undefined;

    loadGoogleMaps()
      .then((maps) => {
        if (canceled || !mapRef.current) return;

        const center = { lat, lng };

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center,
            zoom: 15,
            mapTypeId: mapType,
            streetViewControl: false,
            fullscreenControl: false,
            mapTypeControl: false,
            clickableIcons: false,
            gestureHandling: 'greedy',
          });

          markerRef.current = new maps.Marker({
            position: center,
            map: mapInstanceRef.current,
            title: item?.title || 'موقع العقار',
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setMapTypeId(mapType);
          markerRef.current?.setPosition(center);
        }

        setMapErr('');
      })
      .catch((error) => {
        if (!canceled) setMapErr(String(error?.message || 'تعذر تحميل الخريطة.'));
      });

    return () => {
      canceled = true;
    };
  }, [hasCoords, item?.title, lat, lng, mapType]);

  if (!hasCoords) {
    return (
      <div className="detailsCard detailsMapCard">
        <div className="detailsSectionHead">
          <div className="detailsSectionTitle">الموقع</div>
        </div>
        <div className="detailsEmptyBox">هذا الإعلان لا يحتوي على إحداثيات محفوظة لعرض الخريطة.</div>
      </div>
    );
  }

  return (
    <div className="detailsCard detailsMapCard">
      <div className="detailsSectionHead">
        <div className="detailsSectionTitle">الموقع</div>

        <div className="detailsMapActions">
          <button
            type="button"
            className={`detailsMapSwitch ${mapType === 'roadmap' ? 'active' : ''}`}
            onClick={() => setMapType('roadmap')}
          >
            عادي
          </button>
          <button
            type="button"
            className={`detailsMapSwitch ${mapType === 'satellite' ? 'active' : ''}`}
            onClick={() => setMapType('satellite')}
          >
            قمر صناعي
          </button>
          <a
            className="detailsMapLink"
            href={getMapUrl(lat, lng)}
            target="_blank"
            rel="noreferrer"
          >
            فتح في خرائط Google
          </a>
        </div>
      </div>

      {mapErr ? <div className="detailsMapError">{mapErr}</div> : null}
      <div ref={mapRef} className="detailsMapCanvas" />
    </div>
  );
}

export default function ListingDetails({ params }) {
  const routeParams = useParams();
  const raw = params?.id ?? routeParams?.id;
  const rawId = Array.isArray(raw) ? raw[0] : raw;
  const isSmall = useIsSmallScreen();

  const id = useMemo(() => {
    try {
      return rawId ? decodeURIComponent(String(rawId)) : '';
    } catch {
      return rawId ? String(rawId) : '';
    }
  }, [rawId]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [shareDone, setShareDone] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    let live = true;

    if (rawId === undefined) {
      setLoading(false);
      return () => {
        live = false;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setErr('');
        setItem(null);

        if (!id) {
          if (live) setErr('رابط العرض غير صحيح.');
          return;
        }

        const data = await fetchListingById(id);
        if (live) setItem(data || null);
      } catch (error) {
        const msg = String(error?.message || '');
        if (live) {
          setItem(null);
          if (msg.includes('Missing or insufficient permissions') || error?.code === 'permission-denied') {
            setErr('لا توجد صلاحية لعرض هذا الإعلان الآن.');
          } else {
            setErr(msg || 'تعذر تحميل الإعلان حاليًا.');
          }
        }
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [rawId, id]);

  useEffect(() => {
    let live = true;

    if (!item?.id || !item?.neighborhood) {
      setSimilar([]);
      return () => {
        live = false;
      };
    }

    (async () => {
      try {
        setSimilarLoading(true);
        const rows = await fetchListings({
          filters: { neighborhood: item.neighborhood },
          onlyPublic: true,
          max: 40,
        });

        if (!live) return;

        const next = (Array.isArray(rows) ? rows : [])
          .filter((row) => row?.id && row.id !== item.id)
          .slice(0, 4);

        setSimilar(next);
      } catch {
        if (live) setSimilar([]);
      } finally {
        if (live) setSimilarLoading(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [item?.id, item?.neighborhood]);

  const statusMeta = useMemo(() => getStatusMeta(item), [item]);

  const pageUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, [id]);

  const whatsappHref = useMemo(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    const text = item
      ? [
          'السلام عليكم، أرغب في الاستفسار عن هذا العرض:',
          item.title || 'عرض عقاري',
          `الحي: ${item.neighborhood || '—'}`,
          `المخطط: ${item.plan || '—'}`,
          `الجزء: ${item.part || '—'}`,
          `السعر: ${formatPriceSAR(item.price)}`,
          pageUrl || '',
        ]
          .filter(Boolean)
          .join('\n')
      : 'السلام عليكم، أريد الاستفسار عن عرض في عقار أبحر.';

    return buildWhatsAppLink({ phone, text });
  }, [item, pageUrl]);

  const facts = useMemo(() => {
    if (!item) return [];

    return [
      { label: 'حالة العرض', value: statusMeta.label },
      { label: 'نوع الصفقة', value: getDealTypeLabel(item.dealType) },
      { label: 'نوع العقار', value: getSafeString(item.propertyType) || '—' },
      { label: 'المساحة', value: item.area ? `${item.area} م²` : '—' },
      { label: 'الحي', value: getSafeString(item.neighborhood) || '—' },
      { label: 'المخطط', value: getSafeString(item.plan) || '—' },
      { label: 'الجزء', value: getSafeString(item.part) || '—' },
      { label: 'المرجع', value: getSafeString(item.id) || '—' },
    ];
  }, [item, statusMeta.label]);

  const locationLine = [item?.neighborhood, item?.plan, item?.part].filter(Boolean).join(' • ');

  async function handleShare() {
    try {
      const title = item?.title || 'عرض عقاري';
      const text = `${title} - ${formatPriceSAR(item?.price)}`;
      const url = pageUrl || (typeof window !== 'undefined' ? window.location.href : '');

      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareDone(true);
        window.setTimeout(() => setShareDone(false), 1800);
      }
    } catch {
      // تجاهل إلغاء المستخدم للمشاركة
    }
  }

  return (
    <>
      <div className="container detailsPageWrap">
        {loading ? (
          <div className="detailsCard detailsStateCard">جاري تحميل تفاصيل الإعلان…</div>
        ) : err ? (
          <div className="detailsCard detailsStateCard">{err}</div>
        ) : !item ? (
          <div className="detailsCard detailsStateCard">العرض غير موجود.</div>
        ) : (
          <>
            <section className="detailsHero detailsCard">
              <div className="detailsHeroTop">
                <div className="detailsHeroText">
                  <div className="detailsHeroKicker">تفاصيل الإعلان</div>
                  <h1 className="detailsHeroTitle">{item.title || 'عرض عقاري'}</h1>
                  <div className="detailsHeroMeta">{locationLine || 'الموقع غير محدد'}</div>
                </div>

                <div className={`detailsStatusBadge ${statusMeta.className}`}>{statusMeta.label}</div>
              </div>

              <div className="detailsHeroBottom">
                <div>
                  <div className="detailsPriceLabel">السعر</div>
                  <div className="detailsPriceValue">{formatPriceSAR(item.price)}</div>
                </div>

                <div className="detailsHeroButtons">
                  <a className="btn btnPrimary" href={whatsappHref} target="_blank" rel="noreferrer">
                    تواصل واتساب
                  </a>
                  <button type="button" className="btn" onClick={handleShare}>
                    {shareDone ? 'تم نسخ الرابط' : 'مشاركة'}
                  </button>
                  <Link className="btn" href="/request">
                    أرسل طلب مشابه
                  </Link>
                </div>
              </div>
            </section>

            <div className={`detailsLayout ${isSmall ? 'isSmall' : ''}`}>
              <div className="detailsMainCol">
                <ImageGallery images={item.images} title={item.title} />

                <section className="detailsCard detailsSpecsCard">
                  <div className="detailsSectionTitle">معلومات سريعة</div>
                  <div className="detailsFactsGrid">
                    {facts.map((fact) => (
                      <div key={fact.label} className="detailsFactItem">
                        <div className="detailsFactLabel">{fact.label}</div>
                        <div className="detailsFactValue">{fact.value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="detailsCard detailsDescriptionCard">
                  <div className="detailsSectionTitle">وصف العقار</div>
                  <div className="detailsDescriptionText">
                    {getSafeString(item.description) || 'لا يوجد وصف مضاف لهذا الإعلان حتى الآن.'}
                  </div>
                </section>

                <DetailsMap item={item} />

                <section className="detailsCard detailsSimilarCard">
                  <div className="detailsSectionHead">
                    <div className="detailsSectionTitle">عروض مشابهة</div>
                    {item.neighborhood ? (
                      <Link href={`/listings?neighborhood=${encodeURIComponent(item.neighborhood)}`} className="detailsTextLink">
                        عرض المزيد
                      </Link>
                    ) : null}
                  </div>

                  {similarLoading ? (
                    <div className="detailsInlineState">جاري تحميل العروض المشابهة…</div>
                  ) : similar.length ? (
                    <div className="detailsSimilarGrid">
                      {similar.map((row) => (
                        <ListingCard key={row.id} item={row} />
                      ))}
                    </div>
                  ) : (
                    <div className="detailsInlineState">لا توجد عروض مشابهة متاحة حاليًا.</div>
                  )}
                </section>
              </div>

              <aside className="detailsSideCol">
                <section className="detailsCard detailsSidebarCard">
                  <div className="detailsSidebarTitle">ملخص الإعلان</div>
                  <div className="detailsSidebarPrice">{formatPriceSAR(item.price)}</div>
                  <div className="detailsSidebarLocation">{locationLine || 'الموقع غير محدد'}</div>

                  <div className="detailsSidebarList">
                    {facts.slice(0, 6).map((fact) => (
                      <div key={fact.label} className="detailsSidebarRow">
                        <span>{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="detailsSidebarActions">
                    <a className="btn btnPrimary" href={whatsappHref} target="_blank" rel="noreferrer">
                      تواصل واتساب
                    </a>
                    {Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)) ? (
                      <a
                        className="btn"
                        href={getMapUrl(Number(item.lat), Number(item.lng))}
                        target="_blank"
                        rel="noreferrer"
                      >
                        فتح الموقع
                      </a>
                    ) : null}
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .detailsPageWrap {
          padding-top: 16px;
          padding-bottom: 8px;
        }

        .detailsCard {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 22px;
          box-shadow: var(--shadow);
        }

        .detailsStateCard {
          padding: 20px;
        }

        .detailsHero {
          padding: 22px;
          margin-bottom: 16px;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(214, 179, 91, 0.1), rgba(214, 179, 91, 0.03)),
            var(--card);
        }

        .detailsHeroTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .detailsHeroKicker {
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 8px;
        }

        .detailsHeroTitle {
          margin: 0;
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.25;
          font-weight: 950;
        }

        .detailsHeroMeta {
          margin-top: 10px;
          color: var(--muted);
          font-size: 15px;
        }

        .detailsStatusBadge {
          flex: 0 0 auto;
          min-width: 92px;
          text-align: center;
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 900;
          border: 1px solid transparent;
          background: #f8fafc;
        }

        .detailsStatusBadge.ok {
          color: #166534;
          background: rgba(22, 163, 74, 0.1);
          border-color: rgba(22, 163, 74, 0.18);
        }

        .detailsStatusBadge.warn {
          color: #92400e;
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.2);
        }

        .detailsStatusBadge.danger {
          color: #991b1b;
          background: rgba(220, 38, 38, 0.1);
          border-color: rgba(220, 38, 38, 0.18);
        }

        .detailsStatusBadge.muted {
          color: #334155;
          background: rgba(148, 163, 184, 0.16);
          border-color: rgba(148, 163, 184, 0.24);
        }

        .detailsHeroBottom {
          margin-top: 20px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .detailsPriceLabel {
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 4px;
        }

        .detailsPriceValue {
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1.2;
          font-weight: 950;
        }

        .detailsHeroButtons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .detailsLayout {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.72fr);
          gap: 16px;
          align-items: start;
        }

        .detailsLayout.isSmall {
          grid-template-columns: 1fr;
        }

        .detailsMainCol,
        .detailsSideCol {
          display: grid;
          gap: 16px;
        }

        .detailsSidebarCard {
          padding: 18px;
          position: sticky;
          top: 16px;
        }

        .detailsSidebarTitle {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 14px;
        }

        .detailsSidebarPrice {
          font-size: 30px;
          font-weight: 950;
          line-height: 1.2;
        }

        .detailsSidebarLocation {
          color: var(--muted);
          margin-top: 8px;
          line-height: 1.8;
        }

        .detailsSidebarList {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }

        .detailsSidebarRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          color: var(--muted);
        }

        .detailsSidebarRow strong {
          color: var(--text);
          font-weight: 900;
          text-align: left;
        }

        .detailsSidebarActions {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }

        .detailsSectionTitle {
          font-size: 18px;
          font-weight: 950;
          margin-bottom: 14px;
        }

        .detailsSectionHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .detailsTextLink {
          color: var(--muted);
          text-decoration: none;
          font-weight: 800;
        }

        .detailsGalleryCard,
        .detailsSpecsCard,
        .detailsDescriptionCard,
        .detailsMapCard,
        .detailsSimilarCard {
          padding: 18px;
        }

        .detailsMainImageWrap {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: #f8fafc;
        }

        .detailsMainImage {
          width: 100%;
          height: min(58vw, 500px);
          min-height: 300px;
          display: block;
          object-fit: cover;
          background: #f8fafc;
        }

        .detailsThumbs {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(82px, 1fr));
          gap: 10px;
        }

        .detailsThumbBtn {
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          cursor: pointer;
        }

        .detailsThumbBtn.active {
          border-color: rgba(214, 179, 91, 0.85);
          box-shadow: 0 0 0 3px rgba(214, 179, 91, 0.15);
        }

        .detailsThumbImg {
          width: 100%;
          height: 82px;
          object-fit: cover;
          display: block;
        }

        .detailsEmptyBox {
          border: 1px dashed var(--border2);
          border-radius: 18px;
          background: #f8fafc;
          color: var(--muted);
          padding: 20px;
          line-height: 1.9;
        }

        .detailsFactsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .detailsFactItem {
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 14px;
          background: linear-gradient(180deg, #fff, #fcfcfd);
        }

        .detailsFactLabel {
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 8px;
        }

        .detailsFactValue {
          font-size: 16px;
          font-weight: 900;
          line-height: 1.5;
        }

        .detailsDescriptionText {
          white-space: pre-wrap;
          line-height: 2;
          color: var(--text);
          font-size: 15px;
        }

        .detailsMapActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .detailsMapSwitch,
        .detailsMapLink {
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
          padding: 9px 12px;
          border-radius: 12px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        .detailsMapSwitch.active {
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          border-color: transparent;
        }

        .detailsMapError {
          color: #991b1b;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .detailsMapCanvas {
          width: 100%;
          height: 360px;
          border-radius: 18px;
          border: 1px solid var(--border);
          overflow: hidden;
          background: #f1f5f9;
        }

        .detailsSimilarGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .detailsInlineState {
          color: var(--muted);
          line-height: 1.8;
        }

        @media (max-width: 980px) {
          .detailsSidebarCard {
            position: static;
          }
        }

        @media (max-width: 720px) {
          .detailsHero {
            padding: 18px;
          }

          .detailsHeroTop {
            flex-direction: column;
            align-items: stretch;
          }

          .detailsStatusBadge {
            width: fit-content;
          }

          .detailsMainImage {
            height: 300px;
            min-height: 300px;
          }

          .detailsMapCanvas {
            height: 300px;
          }

          .detailsSimilarGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
