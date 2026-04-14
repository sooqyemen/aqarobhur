// components/HeroSection.jsx
import { formatPriceSAR, statusBadge } from '@/lib/format';
import InfoItem from './InfoItem';
import {
  normalizeDealTypeLabel,
  normalizeStatusLabel,
  formatArea,
  getLocationText,
  getMapHref,
} from '@/lib/listingUtils';

export default function HeroSection({ item, whatsappHref }) {
  const dealTypeLabel = normalizeDealTypeLabel(item?.dealType);
  const statusText = normalizeStatusLabel(item);
  const areaLabel = formatArea(item?.area);
  const locationText = getLocationText(item);
  const mapHref = getMapHref(item);

  return (
    <section className="heroCard card">
      <div className="heroMain">
        <div className="heroText">
          <div className="badgesRow">
            <div className="badgeWrap">
              {statusBadge(item.status)}
              <span className="pill">{statusText}</span>
            </div>
            {dealTypeLabel && <span className="pill deal">{dealTypeLabel}</span>}
            {item.direct && <span className="pill direct">مباشر</span>}
          </div>

          <h1 className="pageTitle">{item.title || 'عرض عقاري'}</h1>
          <div className="locationLine">{locationText}</div>

          <div className="priceBlock">
            {formatPriceSAR(item.price)}
            {String(item?.dealType || '').toLowerCase() === 'rent' && (
              <span className="rentHint"> / سنوي</span>
            )}
          </div>

          <div className="heroFacts">
            <InfoItem label="نوع العقار" value={item.propertyType} />
            <InfoItem label="المساحة" value={areaLabel} />
            <InfoItem label="الحي" value={item.neighborhood} />
            <InfoItem label="المخطط" value={item.plan} />
          </div>
        </div>

        <div className="heroActions">
          <a className="btn btnPrimary actionBtn" href={whatsappHref} target="_blank" rel="noreferrer">
            تواصل واتساب
          </a>
          {mapHref && (
            <a className="btn actionBtn" href={mapHref} target="_blank" rel="noreferrer">
              فتح الموقع على الخريطة
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
