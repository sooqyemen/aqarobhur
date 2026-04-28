import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR } from '@/lib/format';
import {
  normalizePhoneDigits,
  normalizeDealTypeLabel,
  isFiniteCoord,
  normalizeStatusLabel,
  getLocationText,
} from '@/lib/listingUtils';
import { collectMediaEntries } from '@/lib/media';
import { getAreaSeoLinks, buildListingsHref } from '@/lib/areaCatalog';

import HeroSection from '@/components/HeroSection';
import ImageGallery from '@/components/ImageGallery';

export const revalidate = 60;

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ''));
  } catch (_) {
    return String(value || '');
  }
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('ar-SA');
}

function normalizePropertyClassLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw.toLowerCase();
  const map = {
    residential: 'سكني',
    commercial: 'تجاري',
    residential_commercial: 'سكني تجاري',
    'residential-commercial': 'سكني تجاري',
    mixed: 'سكني تجاري',
    administrative: 'إداري',
    office: 'مكتبي',
    industrial: 'صناعي',
    agricultural: 'زراعي',
    hospitality: 'فندقي',
    سكني: 'سكني',
    تجاري: 'تجاري',
    'سكني تجاري': 'سكني تجاري',
    إداري: 'إداري',
    مكتبي: 'مكتبي',
    صناعي: 'صناعي',
    زراعي: 'زراعي',
  };

  return map[normalized] || map[raw] || raw;
}

function getPrimaryArea(item) {
  return item?.neighborhood || item?.plan || '';
}

function getSeoLinksForListing(item) {
  const areaName = getPrimaryArea(item);
  const baseLinks = getAreaSeoLinks(areaName, 9);

  const related = [];
  if (item?.propertyType || item?.dealType || item?.neighborhood || item?.plan) {
    related.push({
      label: 'عروض مشابهة لهذا الإعلان',
      href: buildListingsHref({
        neighborhood: item?.neighborhood,
        plan: item?.plan,
        propertyType: item?.propertyType,
        dealType: item?.dealType,
      }),
    });
  }

  const merged = [...related, ...baseLinks];
  const seen = new Set();

  return merged.filter((link) => {
    if (!link?.label || !link?.href) return false;
    const key = `${link.label}-${link.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function getPhoneHref(phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return '';
  return `tel:+${digits}`;
}

function buildWhatsAppHref({ phone, text }) {
  const digits = normalizePhoneDigits(phone || '966597520693');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text || '')}`;
}

function DetailItem({ label, value, highlight = false }) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className={`detailItem ${highlight ? 'highlight' : ''}`}>
      <span className="detailLabel">{label}</span>
      <span className="detailValue">{value}</span>
    </div>
  );
}

async function resolveParams(params) {
  if (!params) return {};
  if (typeof params.then === 'function') return await params;
  return params;
}

export default async function ListingDetailsPage({ params }) {
  const resolvedParams = await resolveParams(params);
  const id = safeDecode(resolvedParams?.id);

  if (!id) notFound();

  const item = await fetchListingById(id, { includeLegacy: true });
  if (!item) notFound();

  const media = collectMediaEntries(item);
  const dealTypeLabel = normalizeDealTypeLabel(item?.dealType);
  const directPhone = item?.phone || item?.contactPhone || item?.mobile || item?.whatsapp || '';
  const contactPhone = normalizePhoneDigits(directPhone || '966597520693');
  const phoneHref = getPhoneHref(contactPhone);

  const listingUrl = `https://aqarobhur.com/listing/${encodeURIComponent(id)}`;
  const whatsappText = [
    'السلام عليكم، أرغب في الاستفسار عن هذا العرض:',
    item.title || 'عرض عقاري',
    `السعر: ${formatPriceSAR(item.price)}`,
    `الحي: ${item.neighborhood || item.plan || '—'}`,
    item.licenseNumber ? `رقم الترخيص: ${item.licenseNumber}` : '',
    `الرابط: ${listingUrl}`,
  ].filter(Boolean).join('\n');

  const whatsappHref = buildWhatsAppHref({ phone: contactPhone, text: whatsappText });

  const hasMapCoordinates = isFiniteCoord(item.lat) && isFiniteCoord(item.lng);
  const area = numberOrNull(item.area);
  const price = numberOrNull(item.price);
  const pricePerMeter = area && price ? Math.round(price / area) : null;
  const statusText = normalizeStatusLabel(item);
  const locationText = getLocationText(item);
  const seoLinks = getSeoLinksForListing(item);

  const licenseNumber = item.licenseNumber || item.adLicenseNumber || item.license || '';
  const brokerName = item.brokerName || item.officeName || item.agencyName || 'عقار أبحر';
  const advertiserType = item.advertiserType || item.brokerType || 'وسيط عقاري';
  const propertyClassLabel = normalizePropertyClassLabel(item.propertyClass);

  return (
    <div className="container listingPageWrap">
      <style>{`
        .listingPageWrap {
          padding: 18px 16px 96px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .listingPageWrap * {
          box-sizing: border-box;
        }

        .topNavRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .backLink,
        .shareBtn {
          padding: 10px 18px;
          background: #fff;
          border: 1px solid var(--border, #dde5ef);
          border-radius: 12px;
          font-weight: 850;
          color: var(--text, #0f172a);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1.5;
          white-space: nowrap;
        }

        .backLink:hover,
        .shareBtn:hover {
          border-color: var(--primary, #0f766e);
          color: var(--primary, #0f766e);
        }

        .premiumSummary {
          margin: 18px 0 22px;
          padding: 20px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(214, 179, 91, 0.16), transparent 32%),
            linear-gradient(180deg, #ffffff, #f8fafc);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.07);
          overflow: hidden;
        }

        .summaryHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .summaryTitleWrap {
          min-width: 0;
          flex: 1;
        }

        .summaryPills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .miniPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          color: #475569;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.4;
          white-space: nowrap;
        }

        .miniPill.ok {
          background: #ecfdf5;
          color: #047857;
          border-color: #bbf7d0;
        }

        .summaryTitle {
          margin: 0;
          color: #111827;
          font-size: clamp(24px, 5vw, 36px);
          font-weight: 950;
          line-height: 1.45;
          letter-spacing: -0.01em;
          word-break: normal;
          overflow-wrap: anywhere;
        }

        .summaryLocation {
          margin-top: 9px;
          color: #64748b;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.7;
        }

        .summaryPriceBox {
          flex: 0 0 auto;
          min-width: 230px;
          padding: 16px;
          border-radius: 20px;
          background: #111827;
          color: #fff;
          text-align: center;
        }

        .summaryPriceLabel {
          display: block;
          color: rgba(255,255,255,.72);
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .summaryPrice {
          display: block;
          font-size: 24px;
          font-weight: 950;
          line-height: 1.45;
        }

        .priceMeter {
          display: block;
          margin-top: 7px;
          color: rgba(255,255,255,.78);
          font-size: 13px;
          font-weight: 800;
        }

        .summaryFacts {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .summaryFact {
          padding: 14px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(226, 232, 240, 0.95);
          min-width: 0;
        }

        .summaryFact span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
          line-height: 1.5;
        }

        .summaryFact strong {
          display: block;
          color: #111827;
          font-size: 16px;
          font-weight: 950;
          line-height: 1.55;
          word-break: normal;
          overflow-wrap: anywhere;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.85fr);
          gap: 24px;
          align-items: start;
        }

        .mainCol,
        .sideCol {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .sectionCard {
          background: var(--card, #fff);
          padding: 24px;
          border-radius: 22px;
          border: 1px solid var(--border, #e2e8f0);
          box-shadow: var(--shadow-sm, 0 10px 25px rgba(15, 23, 42, 0.06));
          min-width: 0;
        }

        .sectionHeading {
          font-size: 21px;
          font-weight: 950;
          margin: 0 0 18px 0;
          color: var(--text, #111827);
          display: flex;
          align-items: center;
          gap: 10px;
          line-height: 1.5;
        }

        .descriptionText {
          white-space: pre-wrap;
          line-height: 1.95;
          color: var(--text, #111827);
          font-size: 16px;
          word-break: normal;
          overflow-wrap: anywhere;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 12px;
          align-items: stretch;
        }

        .detailItem {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 7px;
          min-height: 86px;
          padding: 15px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          min-width: 0;
        }

        .detailItem.highlight {
          background: #fffaf0;
          border-color: rgba(214, 179, 91, 0.55);
        }

        .detailLabel {
          display: block;
          font-size: 12px;
          color: #64748b;
          font-weight: 850;
          line-height: 1.5;
        }

        .detailValue {
          display: block;
          font-size: 16px;
          font-weight: 950;
          color: #111827;
          line-height: 1.65;
          word-break: normal;
          overflow-wrap: anywhere;
        }

        .trustList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trustRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid #eef2f7;
        }

        .trustRow:last-child {
          border-bottom: 0;
        }

        .trustRow span {
          color: #64748b;
          font-weight: 800;
          font-size: 13px;
        }

        .trustRow strong {
          color: #111827;
          font-weight: 950;
          text-align: left;
          direction: ltr;
          line-height: 1.6;
        }

        .actionStack {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .actionBtnBig {
          display: flex;
          width: 100%;
          min-height: 52px;
          border: none;
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 950;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          transition: 0.2s;
          cursor: pointer;
          line-height: 1.5;
        }

        .whatsappBtn { background: #25d366; color: #fff; }
        .callBtn { background: #111827; color: #fff; }
        .mapBtn { background: var(--primary, #d6b35b); color: #111827; }
        .actionBtnBig:hover { transform: translateY(-1px); filter: brightness(.98); }

        .mapContainer {
          width: 100%;
          height: 330px;
          border-radius: 18px;
          overflow: hidden;
          background: #f1f5f9;
          border: 1px solid var(--border, #e2e8f0);
        }

        .mapContainer iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .noMapData {
          padding: 36px 20px;
          text-align: center;
          background: #f8fafc;
          border-radius: 18px;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          font-weight: 800;
        }

        .stickyBox {
          position: sticky;
          top: 96px;
        }

        .seoLinksGrid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .seoLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 12px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid #e2e8f0;
          color: #334155;
          text-decoration: none;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.5;
        }

        .seoLink:hover {
          border-color: #d6b35b;
          color: #111827;
          background: #fffaf0;
        }

        .mobileBottomActions {
          position: fixed;
          right: 0;
          left: 0;
          bottom: 0;
          z-index: 50;
          display: none;
          gap: 10px;
          padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
          background: rgba(255, 255, 255, .94);
          border-top: 1px solid rgba(226, 232, 240, .95);
          backdrop-filter: blur(12px);
        }

        .mobileBottomActions a,
        .mobileBottomActions button {
          min-height: 48px;
          border-radius: 14px;
          font-size: 15px;
        }

        @media (max-width: 900px) {
          .contentGrid { grid-template-columns: 1fr; }
          .stickyBox { position: static; }
          .summaryHead { flex-direction: column; }
          .summaryPriceBox { width: 100%; min-width: 0; }
          .summaryFacts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 640px) {
          .listingPageWrap {
            padding: 10px 12px 94px;
          }

          .topNavRow {
            flex-wrap: wrap;
            margin-bottom: 12px;
          }

          .backLink,
          .shareBtn {
            flex: 1 1 40%;
            padding: 11px 10px;
            font-size: 14px;
            text-align: center;
          }

          .premiumSummary {
            padding: 16px;
            border-radius: 20px;
          }

          .summaryTitle {
            font-size: 27px;
            line-height: 1.55;
            letter-spacing: 0;
          }

          .summaryFacts {
            gap: 8px;
          }

          .summaryFact {
            padding: 12px;
          }

          .summaryFact strong {
            font-size: 15px;
          }

          .sectionCard {
            padding: 16px;
            border-radius: 18px;
          }

          .sectionHeading {
            font-size: 18px;
            margin-bottom: 16px;
          }

          .detailsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .detailItem {
            min-height: 78px;
            padding: 12px;
          }

          .detailValue {
            font-size: 14px;
          }

          .mapContainer {
            height: 250px;
          }

          .descriptionText {
            font-size: 15px;
          }

          .mobileBottomActions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .sideContactCard {
            display: none;
          }
        }
      `}</style>

      <div className="topNavRow">
        <Link href="/listings" className="backLink">
          &rarr; العودة للعروض
        </Link>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${item.title || 'عرض عقاري'}\n${listingUrl}`)}`} target="_blank" rel="noopener noreferrer" className="shareBtn">
          مشاركة الإعلان
        </a>
      </div>

      <ImageGallery images={media} title={item.title} />

      <section className="premiumSummary">
        <div className="summaryHead">
          <div className="summaryTitleWrap">
            <div className="summaryPills">
              <span className="miniPill ok">{statusText}</span>
              {dealTypeLabel && <span className="miniPill">{dealTypeLabel}</span>}
              {item.direct && <span className="miniPill">مباشر</span>}
              {licenseNumber && <span className="miniPill">مرخص</span>}
            </div>

            <h1 className="summaryTitle">{item.title || 'عرض عقاري'}</h1>
            <div className="summaryLocation">{locationText}</div>
          </div>

          <div className="summaryPriceBox">
            <span className="summaryPriceLabel">السعر</span>
            <strong className="summaryPrice">
              {formatPriceSAR(item.price)}
              {String(item?.dealType || '').toLowerCase() === 'rent' && <span> / سنوي</span>}
            </strong>
            {pricePerMeter && <span className="priceMeter">{formatNumber(pricePerMeter)} ر.س / م²</span>}
          </div>
        </div>

        <div className="summaryFacts">
          <div className="summaryFact">
            <span>نوع العقار</span>
            <strong>{item.propertyType || 'غير محدد'}</strong>
          </div>
          <div className="summaryFact">
            <span>المساحة</span>
            <strong>{item.area ? `${formatNumber(item.area)} م²` : 'غير محدد'}</strong>
          </div>
          <div className="summaryFact">
            <span>الحي</span>
            <strong>{item.neighborhood || 'غير محدد'}</strong>
          </div>
          <div className="summaryFact">
            <span>المخطط</span>
            <strong>{item.plan || 'غير محدد'}</strong>
          </div>
        </div>
      </section>

      <div className="contentGrid">
        <div className="mainCol">
          <div className="sectionCard">
            <h2 className="sectionHeading">أهم التفاصيل</h2>
            <div className="detailsGrid">
              <DetailItem label="حالة العرض" value={statusText} highlight />
              <DetailItem label="السعر" value={formatPriceSAR(item.price)} highlight />
              {pricePerMeter && <DetailItem label="سعر المتر" value={`${formatNumber(pricePerMeter)} ر.س / م²`} />}
              <DetailItem label="نوع العقار" value={item.propertyType} />
              <DetailItem label="تصنيف العقار" value={propertyClassLabel} />
              <DetailItem label="نوع الصفقة" value={dealTypeLabel} />
              <DetailItem label="المساحة" value={item.area ? `${formatNumber(item.area)} م²` : ''} />
              <DetailItem label="عرض الشارع" value={item.streetWidth ? `${item.streetWidth} متر` : ''} />
              <DetailItem label="الواجهة" value={item.facade || item.frontage} />
              <DetailItem label="رقم المخطط" value={item.planNumber || item.plan} />
              <DetailItem label="رقم القطعة" value={item.part || item.plotNumber} />
              <DetailItem label="رقم الترخيص" value={licenseNumber} highlight />
            </div>
          </div>

          <div className="sectionCard">
            <h2 className="sectionHeading">وصف العقار</h2>
            <div className="descriptionText">{item.description || 'لا يوجد وصف مضاف لهذا الإعلان.'}</div>
          </div>

          <div className="sectionCard">
            <h2 className="sectionHeading">روابط بحث مرتبطة</h2>
            <div className="seoLinksGrid">
              {seoLinks.map((link) => (
                <Link key={`${link.label}-${link.href}`} href={link.href} className="seoLink">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <HeroSection item={item} whatsappHref={whatsappHref} />
        </div>

        <div className="sideCol">
          <div className="sectionCard sideContactCard stickyBox">
            <h2 className="sectionHeading">التواصل والاستفسار</h2>
            <div className="actionStack">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="actionBtnBig whatsappBtn">تواصل واتساب</a>
              {phoneHref && <a href={phoneHref} className="actionBtnBig callBtn">اتصال مباشر</a>}
              {hasMapCoordinates && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`} target="_blank" rel="noopener noreferrer" className="actionBtnBig mapBtn">
                  فتح في خرائط جوجل
                </a>
              )}
            </div>
          </div>

          <div className="sectionCard">
            <h2 className="sectionHeading">بيانات الإعلان والرخصة</h2>
            <div className="trustList">
              <div className="trustRow"><span>اسم الجهة</span><strong>{brokerName}</strong></div>
              <div className="trustRow"><span>صفة المعلن</span><strong>{advertiserType}</strong></div>
              <div className="trustRow"><span>رقم الترخيص</span><strong>{licenseNumber || 'غير مضاف'}</strong></div>
              <div className="trustRow"><span>حالة الإعلان</span><strong>{statusText}</strong></div>
              <div className="trustRow"><span>المدينة</span><strong>{item.city || 'جدة'}</strong></div>
            </div>
          </div>

          <div className="sectionCard">
            <h2 className="sectionHeading">موقع العقار</h2>
            {hasMapCoordinates ? (
              <div className="mapContainer">
                <iframe title="موقع العقار" src={`https://maps.google.com/maps?q=${item.lat},${item.lng}&hl=ar&z=15&output=embed`} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            ) : (
              <div className="noMapData"><p>الإحداثيات غير متوفرة لهذا العرض</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="mobileBottomActions">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="actionBtnBig whatsappBtn">واتساب</a>
        {phoneHref ? <a href={phoneHref} className="actionBtnBig callBtn">اتصال</a> : <a href={`https://wa.me/?text=${encodeURIComponent(listingUrl)}`} target="_blank" rel="noopener noreferrer" className="actionBtnBig callBtn">مشاركة</a>}
      </div>
    </div>
  );
}
