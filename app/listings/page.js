'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ListingCard from '@/components/ListingCard';
import ChipsRow from '@/components/ChipsRow';
import { fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES } from '@/lib/taxonomy';

const DEAL_OPTS = DEAL_TYPES.map((d) => ({ label: d.label, value: d.key }));
const TYPE_OPTS = PROPERTY_TYPES.map((p) => ({ label: p, value: p }));

function ListingsContent() {
  const searchParams = useSearchParams();

  // الحالة الأولية للفلاتر (تأتي من الرابط إذا تم التحويل من الصفحة الرئيسية)
  const [filters, setFilters] = useState({
    neighborhood: searchParams.get('neighborhood') || '',
    dealType: searchParams.get('dealType') || '',
    propertyType: searchParams.get('propertyType') || '',
    search: '', // بحث نصي (رقم العرض، المخطط، العنوان)
  });

  const [sortOrder, setSortOrder] = useState('newest'); // newest, price_asc, price_desc
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // التحقق هل يوجد فلاتر مفعلة لتنشيط زر "مسح"
  const hasFilter = !!(filters.neighborhood || filters.dealType || filters.propertyType || filters.search);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      // نجلب كمية أكبر من البيانات (بدون فلترة السيرفر) ثم نفلتر في المتصفح
      // هذا يضمن أن اختلاف التسميات البسيط لا يخفي النتائج
      const data = await fetchListings({ filters: {}, onlyPublic: false });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || '');
      if (msg.includes('Missing or insufficient permissions')) {
        setErr('تعذر تحميل العروض (صلاحيات). تأكد من تسجيل دخول الأدمن أو إعدادات القواعد.');
      } else {
        setErr('حدث خطأ أثناء تحميل البيانات.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // منطق الفلترة "الذكي" والترتيب
  const filtered = useMemo(() => {
    let res = items.filter((x) => {
      // 1. استبعاد المباع/الملغي للزوار
      if (!['available', 'reserved'].includes(String(x.status || ''))) return false;

      // 2. فلتر الحي (بحث مرن: هل النص يحتوي على الآخر؟)
      if (filters.neighborhood) {
        const itemNeigh = String(x.neighborhood || '').trim();
        const filterNeigh = filters.neighborhood.trim();
        // المطابقة المرنة: "الشراع" يطابق "حي الشراع" والعكس
        if (!itemNeigh.includes(filterNeigh) && !filterNeigh.includes(itemNeigh)) {
           return false;
        }
      }

      // 3. فلتر نوع الصفقة (بيع/إيجار)
      if (filters.dealType && x.dealType !== filters.dealType) return false;

      // 4. فلتر نوع العقار (بحث جزئي لضمان عدم فقدان النتائج)
      if (filters.propertyType) {
         const itemType = String(x.propertyType || '');
         if (!itemType.includes(filters.propertyType)) return false;
      }

      // 5. البحث النصي (شامل: العنوان، المعرف، المرجع، المخطط)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const title = (x.title || '').toLowerCase();
        const id = String(x.id || '');
        const ref = String(x.ref || ''); 
        const plan = String(x.plan || '');
        
        if (!title.includes(q) && !id.includes(q) && !ref.includes(q) && !plan.includes(q)) return false;
      }

      return true;
    });

    // الترتيب
    res.sort((a, b) => {
      if (sortOrder === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortOrder === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      // الافتراضي: الأحدث (بناءً على تاريخ الإنشاء)
      // إذا كانت التواريخ كـ Timestamps من Firebase
      const tA = a.createdAt?.seconds || 0;
      const tB = b.createdAt?.seconds || 0;
      return tB - tA; 
    });

    return res;
  }, [items, filters, sortOrder]);

  function clearAll() {
    setFilters({ neighborhood: '', dealType: '', propertyType: '', search: '' });
  }

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
      
      {/* رأس الصفحة مع البحث النصي */}
      <div className="topHeader">
        <div>
          <h1 className="pageTitle">كل العروض</h1>
          <div className="muted" style={{fontSize: 13}}>ابحث وتصفح العقارات المتاحة</div>
        </div>
        
        {/* مربع بحث سريع */}
        <div className="searchBox">
          <input 
            type="text" 
            placeholder="بحث برقم العرض، المخطط..." 
            className="input"
            value={filters.search}
            onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
          />
          {/* أيقونة بحث بسيطة */}
          <svg className="searchIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      {/* شريط الفلاتر */}
      <section className="filterBar card">
        <div className="filterGrid">
          
          {/* فلتر الحي */}
          <div className="filterGroup">
            <label className="muted label">الحي</label>
            <select
              className="select"
              value={filters.neighborhood}
              onChange={(e) => setFilters(p => ({ ...p, neighborhood: e.target.value }))}
            >
              <option value="">كل الأحياء</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* فلتر نوع الصفقة */}
          <div className="filterGroup">
            <label className="muted label">نوع العرض</label>
            <ChipsRow
              value={filters.dealType}
              options={DEAL_OPTS}
              onChange={(v) => setFilters((p) => ({ ...p, dealType: v }))}
            />
          </div>

          {/* فلتر نوع العقار */}
          <div className="filterGroup">
            <label className="muted label">نوع العقار</label>
            <ChipsRow
              value={filters.propertyType}
              options={TYPE_OPTS}
              onChange={(v) => setFilters((p) => ({ ...p, propertyType: v }))}
            />
          </div>
        </div>
        
        {/* أدوات التحكم (الترتيب + التحديث) */}
        <div className="filterActions">
           <div className="sortGroup">
             <span className="muted label" style={{marginBottom:0}}>الترتيب:</span>
             <select 
               className="sortSelect"
               value={sortOrder}
               onChange={(e) => setSortOrder(e.target.value)}
             >
               <option value="newest">الأحدث</option>
               <option value="price_asc">السعر: الأقل أولاً</option>
               <option value="price_desc">السعر: الأعلى أولاً</option>
             </select>
           </div>

           <div className="btnsGroup">
             <button className="btnText" onClick={clearAll} disabled={!hasFilter}>
               مسح الفلاتر ✕
             </button>
             <button className="btnText" onClick={load} disabled={loading}>
               تحديث ↻
             </button>
           </div>
        </div>
      </section>

      {/* منطقة النتائج */}
      <section style={{ marginTop: 20 }}>
        {err ? (
          <div className="card" style={{ background: 'rgba(255,77,77,0.1)', borderColor: 'rgba(255,77,77,0.2)' }}>
            {err}
          </div>
        ) : loading ? (
          <div className="card muted" style={{textAlign:'center', padding:40}}>جاري تحميل العروض...</div>
        ) : filtered.length === 0 ? (
          <div className="card muted" style={{textAlign:'center', padding:40}}>
            لا توجد نتائج تطابق بحثك.
            {hasFilter && (
              <div style={{marginTop:10, color:'var(--gold)', cursor:'pointer', fontWeight:'bold'}} onClick={clearAll}>
                مسح جميع الفلاتر
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="muted" style={{ marginBottom: 12, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>تم العثور على <strong>{filtered.length}</strong> عقار</span>
            </div>
            <div className="cards">
              {filtered.map((item) => (
                <div key={item.id} className="cardItem">
                  <ListingCard item={item} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <style jsx>{`
        .topHeader {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (min-width: 768px) {
          .topHeader {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
        }
        
        .searchBox {
          position: relative;
          width: 100%;
          max-width: 350px;
        }
        .searchBox .input {
          padding-left: 40px; 
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
        }
        .searchIcon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          opacity: 0.7;
          pointer-events: none;
        }

        .filterBar {
          position: sticky;
          top: 10px;
          z-index: 50;
          background: rgba(10, 13, 18, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 18px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        
        .filterGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 16px;
          margin-bottom: 14px;
        }
        @media (min-width: 900px) {
          .filterGrid {
            grid-template-columns: 1fr 1fr 1.2fr;
            align-items: start;
          }
        }

        .label {
          display: block;
          font-size: 12px;
          margin-bottom: 8px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .filterActions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .sortGroup {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sortSelect {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.15);
          color: var(--text);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }
        .sortSelect:focus {
          border-color: var(--gold);
        }

        .btnsGroup {
          display: flex;
          gap: 16px;
        }
        .btnText {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 13px;
          cursor: pointer;
          transition: color 0.2s;
          padding: 0;
        }
        .btnText:hover:not(:disabled) {
          color: var(--gold);
        }
        .btnText:disabled {
          opacity: 0.4;
          cursor: default;
        }
      `}</style>
    </div>
  );
}

// ✅ المكون الرئيسي الذي يغلف المحتوى بـ Suspense لتجنب أخطاء البناء في Next.js
export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="container" style={{padding:40, textAlign:'center'}}>جاري تحميل الصفحة...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
