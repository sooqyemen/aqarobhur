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
