// components/SidebarSummary.jsx
import { formatPriceSAR } from '@/lib/format';
import {
  normalizeDealTypeLabel,
  normalizeStatusLabel,
  formatArea,
  getMapHref,
} from '@/lib/listingUtils';

export default function SidebarSummary({ item, whatsappHref, onShare, shareMsg }) {
  const dealTypeLabel = normalizeDealTypeLabel(item?.dealType);
  const statusText = normalizeStatusLabel(item);
  const areaLabel = formatArea(item?.area);
  const mapHref = getMapHref(item);

  return (
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
            <strong>{statusText}</strong>
          </div>
          {dealTypeLabel && (
            <div className="sideRow">
              <span>الصفقة</span>
              <strong>{dealTypeLabel}</strong>
            </div>
          )}
          {item.propertyType && (
            <div className="sideRow">
              <span>النوع</span>
              <strong>{item.propertyType}</strong>
            </div>
          )}
          {areaLabel && (
            <div className="sideRow">
              <span>المساحة</span>
              <strong>{areaLabel}</strong>
            </div>
          )}
          {item.neighborhood && (
            <div className="sideRow">
              <span>الحي</span>
              <strong>{item.neighborhood}</strong>
            </div>
          )}
          {(item.licenseNumber || item.license) && (
            <div className="sideRow">
              <span>الترخيص</span>
              <strong>{item.licenseNumber || item.license}</strong>
            </div>
          )}
          {(item.phone || item.contactPhone || item.mobile || item.whatsapp) && (
            <div className="sideRow">
              <span>جوال المعلن</span>
              <strong>{item.phone || item.contactPhone || item.mobile || item.whatsapp}</strong>
            </div>
          )}
        </div>

        <div className="stickyActions">
          <a className="btn btnPrimary actionBtn" href={whatsappHref} target="_blank" rel="noreferrer">
            تواصل واتساب
          </a>
          {mapHref && (
            <a className="btn actionBtn" href={mapHref} target="_blank" rel="noreferrer">
              فتح الخريطة
            </a>
          )}
          <button type="button" className="btn actionBtn" onClick={onShare}>
            مشاركة الإعلان
          </button>
          {shareMsg && <div className="shareMsg">{shareMsg}</div>}
        </div>
      </div>
    </aside>
  );
}
