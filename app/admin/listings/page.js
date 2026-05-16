'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import { formatPriceSAR, statusBadge } from '@/lib/format';
import { adminBoostListing, fetchListings } from '@/lib/listings';

const VIEW_TABS = [
  { key: 'public', label: 'العروض المعروضة في الموقع', icon: 'public' },
  { key: 'internal', label: 'عروض الوارد الداخلي', icon: 'inventory_2' },
  { key: 'all', label: 'كل العروض', icon: 'apps' },
];

function getListingMedia(item) {
  if (Array.isArray(item?.imagesMeta) && item.imagesMeta.length > 0) return item.imagesMeta;
  if (Array.isArray(item?.images) && item.images.length > 0) return item.images.map((url) => ({ url, kind: 'image' }));
  return [];
}

function isVideo(entry) {
  const url = String(entry?.url || '').toLowerCase();
  const kind = String(entry?.kind || '').toLowerCase();
  return kind === 'video' || ['.mp4', '.mov', '.webm', '.m4v'].some((ext) => url.includes(ext));
}

function formatDate(value) {
  try {
    if (!value) return '';
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ar-SA', {
      calendar: 'gregory',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (_) {
    return '';
  }
}

function isInternalListing(item = {}) {
  const status = String(item.status || '').trim();
  return (
    status === 'hidden' ||
    !!item.rawText ||
    !!item.duplicateKey ||
    !!item.sourceHash ||
    !!item.sourceContactPhone ||
    !!item.sourceContactName ||
    String(item.sourceType || '').includes('الوارد')
  );
}

function isPublicListing(item = {}) {
  const status = String(item.status || '').trim() || 'available';
  return ['available', 'reserved'].includes(status) && !isInternalListing(item);
}

function getSourceLabel(item = {}) {
  if (isInternalListing(item)) return 'وارد ذكي / داخلي';
  return 'منشور في الموقع';
}

function ListingCard({ item, boostingId, onBoost }) {
  const media = getListingMedia(item);
  const coverEntry = media[0] || null;
  const cover = coverEntry?.url || '/placeholder-image.jpg';
  const count = media.length;
  const isBoosting = boostingId === item.id;
  const freshDate = formatDate(item.boostedAt || item.updatedAt || item.createdAt);
  const internal = isInternalListing(item);

  return (
    <article className={`listingCard ${internal ? 'internalCard' : ''}`}>
      <div className="thumbWrap">
        {isVideo(coverEntry) ? (
          <video src={cover} className="thumbMedia" preload="metadata" muted />
        ) : (
          <img src={cover} alt={item.title || 'صورة الإعلان'} className="thumbMedia" loading="lazy" />
        )}

        <div className="mediaCountBadge">
          <span className="material-icons-outlined" style={{ fontSize: '14px' }}>collections</span>
          {count}
        </div>

        <div className={`sourceBadge ${internal ? 'internalBadge' : 'publicBadge'}`}>
          {internal ? 'داخلي' : 'موقع'}
        </div>
      </div>

      <div className="cardBody">
        <div className="cardHeader">
          <h3 className="cardTitle" title={item.title}>{item.title || 'عرض عقاري بدون عنوان'}</h3>
          <div className="cardLocation">
            <span className="material-icons-outlined">place</span>
            {[item.neighborhood, item.plan, item.part].filter(Boolean).join('، ') || 'موقع غير محدد'}
          </div>
        </div>

        <div className="cardTags">
          <span className="tagPill propertyTypeTag">{item.propertyType || 'غير مصنف'}</span>
          <span className="tagPill">{item.area ? `${item.area} م²` : '—'}</span>
          <span className="tagPill sourceTag">{getSourceLabel(item)}</span>
          <span>{statusBadge(item.status)}</span>
        </div>

        {internal && (item.sourceContactName || item.sourceContactPhone) ? (
          <div className="sourceLine">
            <span className="material-icons-outlined">contact_phone</span>
            {[item.sourceContactName, item.sourceContactPhone].filter(Boolean).join(' - ')}
          </div>
        ) : null}

        {freshDate && (
          <div className="freshDate">
            <span className="material-icons-outlined">update</span>
            آخر تحديث: {freshDate}
          </div>
        )}

        <div className="cardPrice">{formatPriceSAR(item.price)}</div>

        <div className="cardActions">
          {!internal ? (
            <button
              type="button"
              className="btnBoost actionBtn"
              onClick={() => onBoost(item)}
              disabled={isBoosting}
              title="تحديث تاريخ العرض ورفعه للأعلى في الصفحة الأولى"
            >
              <span className={`material-icons-outlined ${isBoosting ? 'spin' : ''}`}>{isBoosting ? 'autorenew' : 'north'}</span>
              {isBoosting ? 'جاري التحديث' : 'تحديث العرض'}
            </button>
          ) : (
            <div className="internalHint">
              مخفي عن الزوار — يظهر للإدارة فقط ويمكن تعديله أو حذفه.
            </div>
          )}

          <Link href={`/admin/listings/${item.id}`} className="btnPrimary actionBtn">
            <span className="material-icons-outlined">edit</span> إدارة
          </Link>
          {!internal ? (
            <Link href={`/listing/${item.id}`} target="_blank" className="btnOutline actionBtn">
              <span className="material-icons-outlined">visibility</span> فتح
            </Link>
          ) : (
            <Link href={`/admin/listings/${item.id}`} className="btnOutline actionBtn">
              <span className="material-icons-outlined">lock</span> داخلي
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AdminListingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boostingId, setBoostingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [queryText, setQueryText] = useState('');
  const [viewMode, setViewMode] = useState('public');

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchListings({ onlyPublic: false, max: 500 });
      setItems(data || []);
    } catch (_) {
      setError('تعذر تحميل بيانات العروض. يرجى التأكد من اتصالك بالإنترنت أو صلاحيات حسابك.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    if (!success && !error) return undefined;
    const timer = setTimeout(() => {
      setSuccess('');
      setError('');
    }, 4500);
    return () => clearTimeout(timer);
  }, [success, error]);

  const handleBoost = async (item) => {
    if (!item?.id || boostingId) return;
    const ok = window.confirm('هل تريد تحديث هذا العرض ورفعه للأعلى في الصفحة الأولى؟');
    if (!ok) return;

    setBoostingId(item.id);
    setError('');
    setSuccess('');
    try {
      await adminBoostListing(item.id);
      setSuccess('تم تحديث العرض ورفعه للأعلى بنجاح.');
      await loadListings();
    } catch (e) {
      console.error(e);
      setError('تعذر تحديث العرض. تأكد من صلاحيات حساب الأدمن وحاول مرة أخرى.');
    } finally {
      setBoostingId('');
    }
  };

  const counts = useMemo(() => {
    const publicCount = items.filter(isPublicListing).length;
    const internalCount = items.filter(isInternalListing).length;
    return {
      public: publicCount,
      internal: internalCount,
      all: items.length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = String(queryText || '').trim().toLowerCase();

    return items.filter((item) => {
      if (viewMode === 'public' && !isPublicListing(item)) return false;
      if (viewMode === 'internal' && !isInternalListing(item)) return false;

      if (!q) return true;
      const hay = [
        item.title,
        item.neighborhood,
        item.plan,
        item.part,
        item.propertyType,
        item.status,
        item.sourceType,
        item.sourceContactName,
        item.sourceContactPhone,
        item.dealType === 'rent' ? 'ايجار' : 'بيع',
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, queryText, viewMode]);

  const activeTab = VIEW_TABS.find((tab) => tab.key === viewMode) || VIEW_TABS[0];

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <AdminGuard title="إدارة العروض العقارية">
        <AdminShell
          title="سجل العروض العقارية"
          description="افصل بين العروض المنشورة للزوار والعروض الداخلية القادمة من الوارد الذكي حتى يسهل تعديلها أو حذفها."
          actions={[
            <Link key="dashboard" href="/admin" className="headerBtnOutline">
              <span className="material-icons-outlined">dashboard</span> لوحة التحكم
            </Link>,
            <Link key="add" href="/add" className="headerBtnPrimary">
              <span className="material-icons-outlined">add_circle</span> إعلان جديد
            </Link>,
          ]}
        >
          <section className="tabsPanel panel">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tabBtn ${viewMode === tab.key ? 'active' : ''}`}
                onClick={() => setViewMode(tab.key)}
              >
                <span className="material-icons-outlined">{tab.icon}</span>
                <strong>{tab.label}</strong>
                <small>{loading ? '...' : counts[tab.key]}</small>
              </button>
            ))}
          </section>

          <section className="searchPanel panel">
            <div className="searchWrap">
              <div className="searchIcon">
                <span className="material-icons-outlined">search</span>
              </div>
              <input
                className="searchInput"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder={viewMode === 'internal' ? 'ابحث في عروض الوارد الذكي، رقم الجوال، اسم صاحب العرض...' : 'ابحث عن إعلان، حي، نوع عقار...'}
              />
              {queryText && (
                <button className="clearBtn" onClick={() => setQueryText('')} title="مسح البحث">
                  <span className="material-icons-outlined">close</span>
                </button>
              )}
            </div>

            <div className="statsBadge">
              {activeTab.label}: <strong>{loading ? '...' : filtered.length}</strong> عرض
            </div>
          </section>

          {error && (
            <div className="alert alertError">
              <span className="material-icons-outlined">error</span> {error}
            </div>
          )}

          {success && (
            <div className="alert alertSuccess">
              <span className="material-icons-outlined">check_circle</span> {success}
            </div>
          )}

          {loading ? (
            <div className="listingsGrid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeletonCard"></div>
              ))}
            </div>
          ) : !filtered.length ? (
            <section className="panel emptyStatePanel">
              <span className="material-icons-outlined emptyIcon">search_off</span>
              <h3>لا توجد نتائج!</h3>
              <p>
                {queryText
                  ? 'لم نعثر على أي عرض يطابق كلمة البحث الخاصة بك.'
                  : viewMode === 'internal'
                    ? 'لا توجد عروض داخلية محفوظة من الوارد الذكي حالياً.'
                    : viewMode === 'public'
                      ? 'لا توجد عروض منشورة للزوار حالياً.'
                      : 'لا توجد عقارات مضافة في المنصة حتى الآن.'}
              </p>
              {queryText && (
                <button className="btnPrimary" onClick={() => setQueryText('')} style={{ marginTop: '10px' }}>
                  مسح نتيجة البحث
                </button>
              )}
            </section>
          ) : (
            <div className="listingsGrid">
              {filtered.map((item) => (
                <ListingCard key={item.id} item={item} boostingId={boostingId} onBoost={handleBoost} />
              ))}
            </div>
          )}
        </AdminShell>
      </AdminGuard>

      <style jsx>{`
        .panel {
          background: white;
          border-radius: 16px;
          border: 1px solid #edf2f7;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
          margin-bottom: 20px;
          padding: 20px;
        }
        .headerBtnOutline,
        .headerBtnPrimary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s;
        }
        .headerBtnOutline {
          border: 1px solid #cbd5e0;
          background: white;
          color: #4a5568;
        }
        .headerBtnOutline:hover { background: #f7fafc; }
        .headerBtnPrimary {
          background: var(--primary);
          color: white;
          border: none;
        }
        .headerBtnPrimary:hover { background: #0d665f; }
        .tabsPanel {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .tabBtn {
          min-height: 74px;
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          text-align: right;
          cursor: pointer;
          transition: all .2s;
        }
        .tabBtn:hover,
        .tabBtn.active {
          background: #fff7e8;
          border-color: rgba(184,132,47,.42);
          color: #9a6a21;
        }
        .tabBtn .material-icons-outlined { color: #b8842f; }
        .tabBtn strong {
          font-size: 14px;
          font-weight: 950;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tabBtn small {
          min-width: 34px;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: white;
          border: 1px solid #ead8b7;
          color: #111827;
          font-size: 14px;
          font-weight: 950;
        }
        .searchPanel {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          align-items: center;
          justify-content: space-between;
        }
        .searchWrap {
          position: relative;
          flex-grow: 1;
          max-width: 560px;
          display: flex;
          align-items: center;
        }
        .searchIcon {
          position: absolute;
          left: 15px;
          color: #a0aec0;
          display: flex;
        }
        .searchInput {
          width: 100%;
          padding: 14px 45px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-size: 15px;
          transition: border-color 0.2s;
          background: #f7fafc;
          color: #2d3748;
        }
        .searchInput:focus {
          outline: none;
          border-color: var(--primary);
          background: white;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
        }
        .clearBtn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          display: flex;
          padding: 5px;
          border-radius: 50%;
        }
        .clearBtn:hover { background: #edf2f7; color: #e53e3e; }
        .statsBadge {
          background: rgba(15, 118, 110, 0.1);
          color: var(--primary);
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 15px;
          border: 1px solid rgba(15, 118, 110, 0.2);
          font-weight: 800;
        }
        .alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-weight: 700;
        }
        .alertError { background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; }
        .alertSuccess { background: #f0fff4; color: #2f855a; border: 1px solid #c6f6d5; }
        .listingsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .listingCard {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .internalCard {
          border-color: rgba(184,132,47,.34);
          background: linear-gradient(180deg, #fffdf8, #fff);
        }
        .listingCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -5px rgba(0,0,0,0.08);
          border-color: #cbd5e0;
        }
        .thumbWrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          background: #f7fafc;
          overflow: hidden;
          border-bottom: 1px solid #edf2f7;
        }
        .thumbMedia {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s;
        }
        .listingCard:hover .thumbMedia { transform: scale(1.05); }
        .mediaCountBadge,
        .sourceBadge {
          position: absolute;
          top: 12px;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 4px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 900;
          backdrop-filter: blur(4px);
        }
        .mediaCountBadge {
          left: 12px;
          background: rgba(0,0,0,0.65);
          color: white;
          padding: 4px 10px;
        }
        .sourceBadge {
          right: 12px;
          padding: 5px 12px;
        }
        .publicBadge { background: #0f766e; color: white; }
        .internalBadge { background: #fff7e8; color: #9a6a21; border: 1px solid rgba(184,132,47,.36); }
        .cardBody {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 12px;
        }
        .cardTitle {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          color: #1a202c;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .cardLocation,
        .freshDate,
        .sourceLine {
          color: #718096;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 750;
        }
        .cardLocation .material-icons-outlined,
        .freshDate .material-icons-outlined,
        .sourceLine .material-icons-outlined { font-size: 16px; }
        .cardTags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .tagPill {
          padding: 4px 10px;
          border-radius: 8px;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          color: #4a5568;
          font-size: 12px;
          font-weight: 700;
        }
        .propertyTypeTag {
          color: var(--primary);
          background: rgba(15, 118, 110, 0.1);
          border-color: rgba(15, 118, 110, 0.2);
        }
        .sourceTag { color: #9a6a21; background: #fff7e8; border-color: #ead8b7; }
        .cardPrice {
          font-size: 20px;
          font-weight: 950;
          color: #2f855a;
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px dashed #e2e8f0;
        }
        .cardActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 5px;
        }
        .actionBtn,
        .internalHint {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          padding: 10px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 850;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
        }
        .btnBoost,
        .internalHint {
          grid-column: span 2;
        }
        .btnBoost {
          background: #fffaf0;
          color: #b7791f;
          border: 1px solid #f6e05e;
        }
        .btnBoost:hover:not(:disabled) { background: #feebc8; }
        .btnBoost:disabled { opacity: 0.75; cursor: wait; }
        .internalHint {
          background: #f8fafc;
          color: #64748b;
          border: 1px dashed #cbd5e1;
          cursor: default;
          text-align: center;
        }
        .btnPrimary { background: #1a202c; color: white; border: none; }
        .btnPrimary:hover { background: #2d3748; }
        .btnOutline {
          background: white;
          border: 1px solid #cbd5e0;
          color: #4a5568;
        }
        .btnOutline:hover {
          background: #f7fafc;
          border-color: #a0aec0;
          color: #1a202c;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .skeletonCard {
          background: linear-gradient(110deg, #eef3f8 8%, #f8fafc 18%, #eef3f8 33%);
          background-size: 200% 100%;
          border-radius: 16px;
          min-height: 420px;
          animation: loadingShimmer 1.1s linear infinite;
        }
        @keyframes loadingShimmer { to { background-position-x: -200%; } }
        .emptyStatePanel {
          text-align: center;
          padding: 60px 20px;
          color: #718096;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .emptyIcon {
          font-size: 50px;
          color: #cbd5e0;
          margin-bottom: 15px;
        }
        .emptyStatePanel h3 {
          margin: 0 0 8px 0;
          color: #2d3748;
          font-size: 22px;
        }
        .emptyStatePanel p { margin: 0; }
        @media (max-width: 760px) {
          .tabsPanel { grid-template-columns: 1fr; }
          .tabBtn { min-height: 60px; }
          .searchWrap { max-width: none; }
          .statsBadge { width: 100%; }
        }
      `}</style>
    </>
  );
}
