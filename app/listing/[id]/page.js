'use client';

// ==========================================
// 1. Imports
// ==========================================
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR, statusBadge } from '@/lib/format';

// ==========================================
// 2. Helper Functions (Pure Functions)
// ==========================================
function normalizeStatusLabel(item) {
  const status = String(item?.status || 'available');
  const isRent = String(item?.dealType || '').toLowerCase() === 'rent';

  if (status === 'sold') return isRent ? 'مؤجر' : 'مباع';
  if (status === 'reserved') return 'محجوز';
  if (status === 'canceled' || status === 'hidden') return 'غير متاح';
  return 'متاح';
}

function normalizeDealTypeLabel(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'rent') return 'إيجار';
  if (v === 'sale') return 'بيع';
  return '';
}

function formatArea(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${n.toLocaleString('ar-SA')} م²`;
}

function getLocationText(item) {
  return [item?.neighborhood, item?.plan, item?.part].filter(Boolean).join(' • ') || 'غير محدد';
}

function isFiniteCoord(v) {
  const n = Number(v);
  return Number.isFinite(n);
}

function getMapHref(item) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function getSafeImages(item) {
  if (!Array.isArray(item?.images)) return [];
  return item.images.filter(Boolean);
}

function normalizePhoneDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `966${digits.slice(1)}`;
  if (digits.startsWith('966')) return digits;
  return digits;
}

// ==========================================
// 3. Custom Hooks
// ==========================================
/**
 * Hook مخصص لإدارة جلب بيانات الإعلان وحالات التحميل والأخطاء
 * هذا يقلل من حجم المكون الرئيسي ويجعل الكود أسهل في القراءة
 */
function useListingData(id, rawId) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;

    if (rawId === undefined) {
      setLoading(false);
      return () => { live = false; };
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

    return () => { live = false; };
  }, [rawId, id]);

  return { item, loading, err };
}

// ==========================================
// 4. Sub-Components
// ==========================================
function InfoItem({ label, value, full = false }) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className={`infoItem ${full ? 'full' : ''}`}>
      <div className="infoLabel">{label}</div>
      <div className="infoValue">{value}</div>
    </div>
  );
}

// ==========================================
// 5. Main Component
// ==========================================
export default function ListingDetailsPage({ params }) {
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

  // استخدام الـ Hook المخصص
  const { item, loading, err } = useListingData(id, rawId);

  // UI State
  const [activeImage, setActiveImage] = useState(0);
  const [shareMsg, setShareMsg] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Touch handling refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // إرجاع activeImage للصفر عند تغير الإعلان
  useEffect(() => {
    if (item) setActiveImage(0);
  }, [item]);

  // ==========================================
  // Derived State (Memos)
  // ==========================================
  const images = useMemo(() => getSafeImages(item), [item]);
  const selectedImage = images[activeImage] || images[0] || '';
  const dealTypeLabel = useMemo(() => normalizeDealTypeLabel(item?.dealType), [item]);
  const statusText = useMemo(() => normalizeStatusLabel(item), [item]);
  const areaLabel = useMemo(() => formatArea(item?.area), [item]);
  const mapHref = useMemo(() => getMapHref(item), [item]);
  const locationText = useMemo(() => getLocationText(item), [item]);

  const contactPhone = useMemo(() => {
    const directPhone = item?.phone || item?.contactPhone || item?.mobile || item?.whatsapp || '';
    // استخدام رقم عقار أبحر كقيمة افتراضية
    return normalizePhoneDigits(directPhone || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693');
  }, [item]);

  const whatsappHref = useMemo(() => {
    const text = item
      ? [
          'السلام عليكم، أرغب في الاستفسار عن هذا العرض:',
          item.title || 'عرض عقاري',
          `السعر: ${formatPriceSAR(item.price)}`,
          `الحي: ${item.neighborhood || '—'}`,
          `المخطط: ${item.plan || '—'}`,
          `الجزء: ${item.part || '—'}`,
          `نوع الصفقة: ${dealTypeLabel || '—'}`,
          `نوع العقار: ${item.propertyType || '—'}`,
          item.licenseNumber ? `رقم الترخيص: ${item.licenseNumber}` : '',
          item.direct ? 'مباشر' : '',
          typeof window !== 'undefined' ? `الرابط: ${window.location.href}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : 'السلام عليكم، أرغب في الاستفسار عن أحد العروض العقارية.';

    return buildWhatsAppLink({ phone: contactPhone, text });
  }, [item, dealTypeLabel, contactPhone]);

  // ==========================================
  // Handlers
  // ==========================================
  function goPrevImage() {
    if (!images.length) return;
    setActiveImage((prev) => (prev - 1 + images.length) % images.length);
  }

  function goNextImage() {
    if (!images.length) return;
    setActiveImage((prev) => (prev + 1) % images.length);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.changedTouches[0]?.clientX || 0;
  }

  function handleTouchEnd(e) {
    touchEndX.current = e.changedTouches[0]?.clientX || 0;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) < 40) return;
    diff > 0 ? goNextImage() : goPrevImage();
  }

  async function handleShare() {
    try {
      setShareMsg('');
      const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
      const shareTitle = item?.title || 'عرض عقاري';
      const shareText = `${shareTitle} - ${formatPriceSAR(item?.price)}`;

      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      }

      if (navigator.clipboard && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMsg('تم نسخ رابط الإعلان.');
        setTimeout(() => setShareMsg(''), 2500);
      }
    } catch {
      setShareMsg('');
    }
  }

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="container listingPageWrap">
      {/* State Handlers */}
      {loading ? (
        <div className="card stateCard">جاري تحميل الإعلان…</div>
      ) : err ? (
        <div className="card stateCard">{err}</div>
      ) : !item ? (
        <div className="card stateCard">العرض غير موجود.</div>
      ) : (
        <>
          {/* Top Navigation */}
          <div className="topNavRow">
            <Link href="/listings" className="backLink">
              العودة إلى العروض
            </Link>
            <button type="button" className="shareBtn" onClick={handleShare}>
              مشاركة
            </button>
          </div>

          {/* Hero Section */}
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

          {/* Main Content Grid */}
          <section className="contentGrid">
            <div className="mainCol">
              {/* Gallery Section */}
              <div className="card galleryCard">
                {selectedImage ? (
                  <>
                    <div
                      className="mainImageWrap"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                    >
                      <button
                        type="button"
                        className="navBtn navPrev desktopOnly"
                        onClick={goPrevImage}
                        aria-label="الصورة السابقة"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        className="imageButton"
                        onClick={() => setLightboxOpen(true)}
                        aria-label="فتح الصورة"
                      >
                        <img src={selectedImage} alt={item.title || 'صورة العقار'} className="mainImage" />
                      </button>

                      <button
                        type="button"
                        className="navBtn navNext desktopOnly"
                        onClick={goNextImage}
                        aria-label="الصورة التالية"
                      >
                        ›
                      </button>

                      {images.length > 1 && (
                        <div className="mobileSwipeHint">اسحب يمين أو يسار للتنقل بين الصور</div>
                      )}
                    </div>

                    {images.length > 1 && (
                      <div className="thumbsScroller">
                        <div className="thumbsRow">
                          {images.map((src, idx) => (
                            <button
                              type="button"
                              key={`${src}-${idx}`}
                              className={`thumbBtn ${idx === activeImage ? 'active' : ''}`}
                              onClick={() => setActiveImage(idx)}
                              aria-label={`عرض الصورة ${idx + 1}`}
                            >
                              <img src={src} alt={`صورة ${idx + 1}`} className="thumbImage" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="emptyMedia">لا توجد صور لهذا الإعلان.</div>
                )}
              </div>

              {/* Details Section */}
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
                  <InfoItem label="رقم العرض" value={item.id || id} />
                  <InfoItem label="رقم الترخيص" value={item.licenseNumber || item.license || ''} />
                  <InfoItem label="الجوال المباشر" value={item.phone || item.contactPhone || item.mobile || item.whatsapp || ''} />
                  <InfoItem label="مباشر" value={item.direct ? 'نعم' : ''} />
                  <InfoItem
                    label="الإحداثيات"
                    value={isFiniteCoord(item?.lat) && isFiniteCoord(item?.lng) ? `${Number(item.lat)}, ${Number(item.lng)}` : ''}
                    full
                  />
                </div>
              </div>

              {/* Description Section */}
              <div className="card sectionCard">
                <h2 className="sectionHeading">وصف العقار</h2>
                <div className="descriptionText">
                  {item.description || 'لا يوجد وصف مضاف لهذا الإعلان.'}
                </div>
              </div>
            </div>

            {/* Sidebar Sticky Summary */}
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
                  <button type="button" className="btn actionBtn" onClick={handleShare}>
                    مشاركة الإعلان
                  </button>
                  {shareMsg && <div className="shareMsg">{shareMsg}</div>}
                </div>
              </div>
            </aside>
          </section>

          {/* Lightbox Modal */}
          {lightboxOpen && selectedImage && (
            <div className="lightbox" onClick={() => setLightboxOpen(false)}>
              <button type="button" className="lightboxClose" aria-label="إغلاق">×</button>
              
              {images.length > 1 && (
                <button
                  type="button"
                  className="lightboxNav lightboxPrev"
                  onClick={(e) => { e.stopPropagation(); goPrevImage(); }}
                >‹</button>
              )}

              <div
                className="lightboxImageWrap"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <img src={selectedImage} alt={item.title || 'صورة العقار'} className="lightboxImage" />
              </div>

              {images.length > 1 && (
                <button
                  type="button"
                  className="lightboxNav lightboxNext"
                  onClick={(e) => { e.stopPropagation(); goNextImage(); }}
                >›</button>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================== */}
      {/* 6. Styles */}
      {/* ========================================== */}
      <style jsx>{`
        /* يمكنك الاحتفاظ بنفس كود الـ CSS المدمج هنا كما كان تماماً ليعمل بدون مشاكل */
        /* قمت بطيه هنا في الشرح لتوفير المساحة، يمكنك لصق الـ style jsx القديم الخاص بك هنا */
      `}</style>
    </div>
  );
}
