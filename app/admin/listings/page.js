'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import { formatPriceSAR, statusBadge } from '@/lib/format'; 
import { fetchListings } from '@/lib/listings';

// الدالة التي كانت مفقودة (تمت إضافتها هنا)
function getListingMedia(item) {
  if (Array.isArray(item?.imagesMeta) && item.imagesMeta.length > 0) return item.imagesMeta;
  if (Array.isArray(item?.images) && item.images.length > 0) return item.images.map(url => ({ url, kind: 'image' }));
  return [];
}

function isVideo(entry) {
  const url = String(entry?.url || '').toLowerCase();
  const kind = String(entry?.kind || '').toLowerCase();
  return kind === 'video' || ['.mp4', '.mov', '.webm', '.m4v'].some((ext) => url.includes(ext));
}

function ListingCard({ item }) {
  const media = getListingMedia(item);
  const coverEntry = media[0] || null;
  const cover = coverEntry?.url || '/placeholder-image.jpg'; 
  const count = media.length;

  return (
    <article className="listingCard">
      <div className="thumbWrap">
        {isVideo(coverEntry) ? (
          <video src={cover} className="thumbMedia" preload="metadata" muted />
        ) : (
          <img src={cover} alt={item.title || 'صورة الإعلان'} className="thumbMedia" loading="lazy" />
        )}
        
        <div className="mediaCountBadge">
            <span className="material-icons-outlined" style={{fontSize: '14px'}}>collections</span>
            {count}
        </div>
        
        <div className={`dealBadge ${item.dealType === 'rent' ? 'rentBadge' : 'saleBadge'}`}>
            {item.dealType === 'rent' ? 'للإيجار' : 'للبيع'}
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
          <span>{statusBadge(item.status)}</span>
        </div>

        <div className="cardPrice">{formatPriceSAR(item.price)}</div>

        <div className="cardActions">
          <Link href={`/admin/listings/${item.id}`} className="btnPrimary actionBtn">
             <span className="material-icons-outlined">edit</span> إدارة
          </Link>
          <Link href={`/listing/${item.id}`} target="_blank" className="btnOutline actionBtn">
            <span className="material-icons-outlined">visibility</span> فتح
          </Link>
        </div>
      </div>
      
      <style jsx>{`
         .listingCard { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
         .listingCard:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.08); border-color: #cbd5e0; }
         
         .thumbWrap { position: relative; width: 100%; aspect-ratio: 16/10; background: #f7fafc; overflow: hidden; border-bottom: 1px solid #edf2f7; }
         .thumbMedia { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
         .listingCard:hover .thumbMedia { transform: scale(1.05); }
         
         .mediaCountBadge { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.65); color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(4px); }
         .dealBadge { position: absolute; top: 12px; right: 12px; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
         .saleBadge { background: var(--primary); color: white; }
         .rentBadge { background: #dd6b20; color: white; }

         .cardBody { padding: 16px; display: flex; flex-direction: column; flex-grow: 1; gap: 12px; }
         
         .cardHeader { display: flex; flex-direction: column; gap: 4px; }
         .cardTitle { margin: 0; font-size: 16px; font-weight: 800; color: #1a202c; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
         .cardLocation { color: #718096; font-size: 13px; display: flex; align-items: center; gap: 4px; }
         .cardLocation .material-icons-outlined { font-size: 16px; }

         .cardTags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
         .tagPill { padding: 4px 10px; border-radius: 8px; background: #f7fafc; border: 1px solid #e2e8f0; color: #4a5568; font-size: 12px; font-weight: 600; }
         .propertyTypeTag { color: var(--primary); background: rgba(15, 118, 110, 0.1); border-color: rgba(15, 118, 110, 0.2); }

         .cardPrice { font-size: 20px; font-weight: 900; color: #2f855a; margin-top: auto; padding-top: 8px; border-top: 1px dashed #e2e8f0; }

         .cardActions { display: flex; gap: 8px; margin-top: 5px; }
         .actionBtn { flex: 1; display: flex; justify-content: center; align-items: center; gap: 6px; padding: 10px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; transition: all 0.2s; }
         .btnPrimary { background: #1a202c; color: white; }
         .btnPrimary:hover { background: #2d3748; }
         .btnOutline { background: white; border: 1px solid #cbd5e0; color: #4a5568; }
         .btnOutline:hover { background: #f7fafc; border-color: #a0aec0; color: #1a202c; }
      `}</style>
    </article>
  );
}

export default function AdminListingsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchListings({ onlyPublic: false, max: 300 });
        if (mounted) setItems(data || []);
      } catch (_) {
        if (mounted) setError('تعذر تحميل بيانات العروض. يرجى التأكد من اتصالك بالإنترنت أو صلاحيات حسابك.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = String(queryText || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.title || ''} ${item.neighborhood || ''} ${item.plan || ''} ${item.part || ''} ${item.propertyType || ''} ${item.dealType === 'rent' ? 'ايجار' : 'بيع'}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, queryText]);

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <AdminGuard title="إدارة العروض العقارية">
        <AdminShell
          title="سجل العروض العقارية"
          description="تصفح جميع العقارات المنشورة في المنصة، ابحث عنها بسهولة، وقم بإدارتها بالكامل."
          actions={[
            <Link key="dashboard" href="/admin" className="headerBtnOutline">
                <span className="material-icons-outlined">dashboard</span> لوحة التحكم
            </Link>,
            <Link key="add" href="/add" className="headerBtnPrimary">
                <span className="material-icons-outlined">add_circle</span> إعلان جديد
            </Link>,
          ]}
        >
          <section className="searchPanel panel">
            <div className="searchWrap">
                <div className="searchIcon"><span className="material-icons-outlined">search</span></div>
                <input
                    className="searchInput"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="ابحث عن إعلان، حي، نوع عقار..."
                />
                {queryText && (
                    <button className="clearBtn" onClick={() => setQueryText('')} title="مسح البحث">
                        <span className="material-icons-outlined">close</span>
                    </button>
                )}
            </div>
            
            <div className="statsBadge">
                الإجمالي: <strong>{loading ? '...' : filtered.length}</strong> عقار
            </div>
          </section>

          {error && <div className="alert alertError"><span className="material-icons-outlined">error</span> {error}</div>}

          {loading ? (
              <div className="listingsGrid">
                  {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeletonCard"></div>)}
              </div>
          ) : !filtered.length ? (
            <section className="panel emptyStatePanel">
               <span className="material-icons-outlined emptyIcon">search_off</span>
               <h3>لا توجد نتائج!</h3>
               <p>{queryText ? 'لم نعثر على أي عقار يطابق كلمة البحث الخاصة بك.' : 'لا توجد عقارات مضافة في المنصة حتى الآن.'}</p>
               {queryText && <button className="btnPrimary" onClick={() => setQueryText('')} style={{marginTop: '10px'}}>مسح نتيجة البحث</button>}
            </section>
          ) : (
            <div className="listingsGrid">
              {filtered.map((item) => (
                <ListingCard key={item.id} item={item} />
              ))}
            </div>
          )}

        </AdminShell>
      </AdminGuard>

      <style jsx>{`
        .panel { background: white; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 25px; padding: 20px; }
        
        .headerBtnOutline { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e0; background: white; color: #4a5568; text-decoration: none; font-weight: 600; transition: all 0.2s; }
        .headerBtnOutline:hover { background: #f7fafc; }
        .headerBtnPrimary { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; background: var(--primary); color: white; text-decoration: none; font-weight: 600; transition: background 0.2s; border: none; }
        .headerBtnPrimary:hover { background: #0d665f; }

        .searchPanel { display: flex; flex-wrap: wrap; gap: 15px; align-items: center; justify-content: space-between; }
        
        .searchWrap { position: relative; flex-grow: 1; max-width: 500px; display: flex; align-items: center; }
        .searchIcon { position: absolute; left: 15px; color: #a0aec0; display: flex; }
        .searchInput { width: 100%; padding: 14px 45px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 15px; transition: border-color 0.2s; background: #f7fafc; color: #2d3748; }
        .searchInput:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); }
        .clearBtn { position: absolute; right: 10px; background: none; border: none; color: #a0aec0; cursor: pointer; display: flex; padding: 5px; border-radius: 50%; }
        .clearBtn:hover { background: #edf2f7; color: #e53e3e; }

        .statsBadge { background: rgba(15, 118, 110, 0.1); color: var(--primary); padding: 10px 20px; border-radius: 12px; font-size: 15px; border: 1px solid rgba(15, 118, 110, 0.2); }

        .alert { display: flex; align-items: center; gap: 10px; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-weight: 600; }
        .alertError { background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; }

        .listingsGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        
        .skeletonCard { background: linear-gradient(110deg, #eef3f8 8%, #f8fafc 18%, #eef3f8 33%); background-size: 200% 100%; border-radius: 16px; min-height: 380px; animation: loadingShimmer 1.1s linear infinite; }
        @keyframes loadingShimmer { to { background-position-x: -200%; } }

        .emptyStatePanel { text-align: center; padding: 60px 20px; color: #718096; display: flex; flex-direction: column; align-items: center; }
        .emptyIcon { font-size: 50px; color: #cbd5e0; margin-bottom: 15px; }
        .emptyStatePanel h3 { margin: 0 0 8px 0; color: #2d3748; font-size: 22px; }
        .emptyStatePanel p { margin: 0; }
      `}</style>
    </>
  );
}
