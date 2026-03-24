'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR, statusBadge } from '@/lib/format';

function InfoItem({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="infoItem">
      <div className="infoLabel">{label}</div>
      <div className="infoValue">{value}</div>
    </div>
  );
}

function normalizeStatusLabel(item) {
  const status = String(item?.status || 'available');
  const isRent = String(item?.dealType || '').toLowerCase() === 'rent';
  if (status === 'sold') return isRent ? 'مؤجر' : 'مباع';
  if (status === 'reserved') return 'محجوز';
  if (status === 'canceled' || status === 'hidden') return 'غير متاح';
  return 'متاح';
}

export default function ListingDetails({ params }) {
  const routeParams = useParams();

  const raw = params?.id ?? routeParams?.id;
  const rawId = Array.isArray(raw) ? raw[0] : raw;

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
  const [activeImage, setActiveImage] = useState(0);

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

        if (!id) {
          if (live) {
            setItem(null);
            setErr('رابط العرض غير صحيح.');
          }
          return;
        }

        const data = await fetchListingById(id);
        if (live) {
          setItem(data || null);
          setActiveImage(0);
        }
      } catch (e) {
        const msg = String(e?.message || '');
        if (live) {
          setItem(null);
          if (msg.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
            setErr('لا توجد صلاحية لعرض هذا العرض الآن.');
          } else {
            setErr(msg || 'تعذر تحميل العرض حالياً.');
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

  const images = useMemo(() => {
    if (!Array.isArray(item?.images)) return [];
    return item.images.filter(Boolean);
  }, [item]);

  const selectedImage = images[activeImage] || images[0] || '';

  const whatsappHref = useMemo(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    const text = item
      ? [
          'السلام عليكم، أبغى استفسار عن العرض:',
          item.title || '',
          `الحي: ${item.neighborhood || '—'}`,
          `المخطط: ${item.plan || '—'}`,
          `الجزء: ${item.part || '—'}`,
          `السعر: ${formatPriceSAR(item.price)}`,
        ].join('\n')
      : 'السلام عليكم، أبغى استفسار عن عرض في عقار أبحر.';
    return buildWhatsAppLink({ phone, text });
  }, [item]);

  const mapHref = useMemo(() => {
    const lat = Number(item?.lat);
    const lng = Number(item?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }, [item]);

  const areaLabel = item?.area ? `${item.area} م²` : '';
  const dealTypeLabel =
    String(item?.dealType || '').toLowerCase() === 'rent'
      ? 'إيجار'
      : String(item?.dealType || '').toLowerCase() === 'sale'
        ? 'بيع'
        : '';

  return (
    <div className="container listingPageWrap">
      {loading ? (
        <div className="card stateCard">جاري التحميل…</div>
      ) : err ? (
        <div className="card stateCard">{err}</div>
      ) : !item ? (
        <div className="card stateCard">العرض غير موجود.</div>
      ) : (
        <>
          <section className="heroCard card">
            <div className="heroMain">
              <div className="heroText">
                <div className="topRow">
                  <div className="statusWrap">
                    {statusBadge(item.status)}
                    <span className="statusText">{normalizeStatusLabel(item)}</span>
                  </div>
                  {dealTypeLabel ? <span className="dealBadge">{dealTypeLabel}</span> : null}
                </div>

                <h1 className="pageTitle">{item.title || 'عرض عقاري'}</h1>

                <div className="locationLine">
                  {[item.neighborhood, item.plan, item.part].filter(Boolean).join(' • ') || '—'}
                </div>

                <div className="priceBlock">{formatPriceSAR(item.price)}</div>

                <div className="quickFacts">
                  <InfoItem label="النوع" value={item.propertyType} />
                  <InfoItem label="المساحة" value={areaLabel} />
                  <InfoItem label="الحي" value={item.neighborhood} />
                  <InfoItem label="المخطط" value={item.plan} />
                </div>
              </div>

              <div className="heroActions">
                <a className="btn btnPrimary actionBtn" href={whatsappHref} target="_blank" rel="noreferrer">
                  تواصل واتساب
                </a>
                {mapHref ? (
                  <a className="btn actionBtn" href={mapHref} target="_blank" rel="noreferrer">
                    فتح الموقع
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          <section className="contentGrid">
            <div className="mainCol">
              <div className="card galleryCard">
                {selectedImage ? (
                  <div className="mainImageWrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="mainImage" src={selectedImage} alt={item.title || 'صورة العرض'} />
                  </div>
                ) : (
                  <div className="emptyMedia">لا توجد صور لهذا العرض.</div>
                )}

                {images.length > 1 ? (
                  <div className="thumbsRow">
                    {images.map((src, idx) => (
                      <button
                        type="button"
                        key={`${src}-${idx}`}
                        className={`thumbBtn ${idx === activeImage ? 'active' : ''}`}
                        onClick={() => setActiveImage(idx)}
                        aria-label={`عرض الصورة ${idx + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`صورة ${idx + 1}`} className="thumbImage" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="card sectionCard">
                <h2 className="sectionHeading">تفاصيل الإعلان</h2>
                <div className="detailsGrid">
                  <InfoItem label="حالة العرض" value={normalizeStatusLabel(item)} />
                  <InfoItem label="نوع الصفقة" value={dealTypeLabel} />
                  <InfoItem label="نوع العقار" value={item.propertyType} />
                  <InfoItem label="المساحة" value={areaLabel} />
                  <InfoItem label="الحي" value={item.neighborhood} />
                  <InfoItem label="المخطط" value={item.plan} />
                  <InfoItem label="الجزء" value={item.part} />
                  <InfoItem label="رقم العرض" value={item.id || id} />
                </div>
              </div>

              <div className="card sectionCard">
                <h2 className="sectionHeading">وصف العقار</h2>
                <div className="descriptionText">{item.description || 'لا يوجد وصف مضاف لهذا العرض.'}</div>
              </div>
            </div>

            <aside className="sideCol">
              <div className="card sideCard">
                <h2 className="sideHeading">ملخص سريع</h2>
                <div className="sideList">
                  <div className="sideRow">
                    <span>السعر</span>
                    <strong>{formatPriceSAR(item.price)}</strong>
                  </div>
                  <div className="sideRow">
                    <span>الحالة</span>
                    <strong>{normalizeStatusLabel(item)}</strong>
                  </div>
                  {item.propertyType ? (
                    <div className="sideRow">
                      <span>النوع</span>
                      <strong>{item.propertyType}</strong>
                    </div>
                  ) : null}
                  {areaLabel ? (
                    <div className="sideRow">
                      <span>المساحة</span>
                      <strong>{areaLabel}</strong>
                    </div>
                  ) : null}
                  {item.neighborhood ? (
                    <div className="sideRow">
                      <span>الحي</span>
                      <strong>{item.neighborhood}</strong>
                    </div>
                  ) : null}
                </div>

                <div className="stickyActions">
                  <a className="btn btnPrimary actionBtn" href={whatsappHref} target="_blank" rel="noreferrer">
                    تواصل واتساب
                  </a>
                  {mapHref ? (
                    <a className="btn actionBtn" href={mapHref} target="_blank" rel="noreferrer">
                      فتح الموقع على الخريطة
                    </a>
                  ) : null}
                </div>
              </div>
            </aside>
          </section>
        </>
      )}

      <style jsx>{`
        .listingPageWrap {
          padding-top: 16px;
          padding-bottom: 8px;
        }

        .stateCard {
          padding: 18px;
        }

        .heroCard {
          padding: 18px;
          margin-bottom: 14px;
        }

        .heroMain {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .heroText {
          min-width: 0;
          flex: 1;
        }

        .topRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .statusWrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .statusText,
        .dealBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          font-weight: 800;
          font-size: 13px;
          background: #fff;
          color: var(--text);
        }

        .dealBadge {
          background: var(--primary-light);
          border-color: rgba(214, 179, 91, 0.2);
        }

        .pageTitle {
          margin: 0;
          font-size: clamp(22px, 3vw, 32px);
          line-height: 1.35;
          font-weight: 950;
        }

        .locationLine {
          margin-top: 8px;
          color: var(--muted);
          line-height: 1.8;
        }

        .priceBlock {
          margin-top: 14px;
          font-size: clamp(24px, 3.2vw, 34px);
          font-weight: 950;
          color: #0f172a;
        }

        .quickFacts {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .heroActions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 230px;
          flex-shrink: 0;
        }

        .actionBtn {
          width: 100%;
          text-align: center;
          text-decoration: none;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
          gap: 14px;
          align-items: start;
        }

        .mainCol,
        .sideCol {
          min-width: 0;
        }

        .galleryCard,
        .sectionCard,
        .sideCard {
          padding: 14px;
          margin-bottom: 14px;
        }

        .mainImageWrap {
          width: 100%;
          border-radius: 18px;
          overflow: hidden;
          background: #f1f5f9;
          border: 1px solid var(--border);
          aspect-ratio: 16 / 10;
        }

        .mainImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .emptyMedia {
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          border: 1px dashed var(--border2);
          background: #f8fafc;
          color: var(--muted);
          text-align: center;
          padding: 18px;
        }

        .thumbsRow {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .thumbBtn {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #fff;
          padding: 0;
          overflow: hidden;
          cursor: pointer;
          aspect-ratio: 1;
        }

        .thumbBtn.active {
          border-color: rgba(214, 179, 91, 0.8);
          box-shadow: 0 0 0 3px rgba(214, 179, 91, 0.18);
        }

        .thumbImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sectionHeading,
        .sideHeading {
          margin: 0 0 12px;
          font-size: 18px;
          font-weight: 900;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .infoItem {
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px;
          background: #fff;
          min-width: 0;
        }

        .infoLabel {
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 6px;
        }

        .infoValue {
          font-weight: 850;
          line-height: 1.65;
          word-break: break-word;
        }

        .descriptionText {
          white-space: pre-wrap;
          line-height: 1.95;
          color: var(--text);
        }

        .sideCard {
          position: sticky;
          top: 90px;
        }

        .sideList {
          display: grid;
          gap: 10px;
        }

        .sideRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 11px 0;
          border-bottom: 1px solid var(--border);
        }

        .sideRow:last-child {
          border-bottom: 0;
        }

        .stickyActions {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        @media (max-width: 900px) {
          .listingPageWrap {
            padding-top: 10px;
          }

          .heroCard {
            padding: 14px;
          }

          .heroMain {
            flex-direction: column;
          }

          .heroActions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .quickFacts {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .contentGrid {
            grid-template-columns: 1fr;
          }

          .sideCard {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .listingPageWrap {
            width: min(100%, calc(100% - 18px));
          }

          .heroCard,
          .galleryCard,
          .sectionCard,
          .sideCard {
            border-radius: 16px;
            padding: 12px;
          }

          .pageTitle {
            font-size: 21px;
          }

          .priceBlock {
            font-size: 26px;
            margin-top: 10px;
          }

          .quickFacts,
          .detailsGrid {
            grid-template-columns: 1fr;
          }

          .heroActions {
            grid-template-columns: 1fr;
          }

          .mainImageWrap {
            aspect-ratio: 4 / 3;
            border-radius: 14px;
          }

          .thumbsRow {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }

          .emptyMedia {
            min-height: 180px;
          }

          .sideRow {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}
