// components/ListingDetails.jsx
import InfoItem from './InfoItem';
import {
  normalizeDealTypeLabel,
  normalizeStatusLabel,
  formatArea,
  isFiniteCoord,
} from '@/lib/listingUtils';

export default function ListingDetails({ item, listingId }) {
  const dealTypeLabel = normalizeDealTypeLabel(item?.dealType);
  const statusText = normalizeStatusLabel(item);
  const areaLabel = formatArea(item?.area);

  return (
    <div className="card sectionCard">
      <h2 className="sectionHeading">تفاصيل الإعلان</h2>
      <div className="detailsGrid">
        <InfoItem label="حالة العرض" value={statusText} />
        <InfoItem label="نوع الصفقة" value={dealTypeLabel} />
        <InfoItem label="نوع العقار" value={item.propertyType} />
        <InfoItem label="المساحة" value={areaLabel} />
        <InfoItem label="الحي" value={item.neighborhood} />
        <InfoItem label="المخطط" value={item.plan} />
        <InfoItem label="الجزء" value={item.part} />
        <InfoItem label="رقم العرض" value={item.id || listingId} />
        <InfoItem label="رقم الترخيص" value={item.licenseNumber || item.license || ''} />
        <InfoItem label="الجوال المباشر" value={item.phone || item.contactPhone || item.mobile || item.whatsapp || ''} />
        <InfoItem label="مباشر" value={item.direct ? 'نعم' : ''} />
        <InfoItem
          label="الإحداثيات"
          value={
            isFiniteCoord(item?.lat) && isFiniteCoord(item?.lng)
              ? `${Number(item.lat)}, ${Number(item.lng)}`
              : ''
          }
          full
        />
      </div>
    </div>
  );
}
