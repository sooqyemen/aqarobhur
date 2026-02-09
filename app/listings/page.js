'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ListingCard from '@/components/ListingCard';
import ChipsRow from '@/components/ChipsRow';
import { fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES } from '@/lib/taxonomy';

const DEAL_OPTS = DEAL_TYPES.map((d) => ({ label: d.label, value: d.key }));
const TYPE_OPTS = PROPERTY_TYPES.map((p) => ({ label: p, value: p }));

// مكون داخلي لقراءة الباراميترز من الرابط بأمان
function ListingsContent() {
  const searchParams = useSearchParams();

  // الحالة الأولية تأتي من الرابط (عشان الربط مع الصفحة الرئيسية)
  const [filters, setFilters] = useState({
    neighborhood: searchParams.get('neighborhood') || '',
    dealType: searchParams.get('dealType') || '',
    propertyType: searchParams.get('propertyType') || '',
    search: '', // بحث نصي (رقم العرض أو العنوان)
  });

  const [sortOrder, setSortOrder] = useState('newest'); // newest, price_asc, price_desc
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // هل الفلاتر مفعلة؟
  const hasFilter = !!(filters.neighborhood || filters.dealType || filters.propertyType || filters.search);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      // نجلب الكل ثم نفلتر في المتصفح (Client-side) لسرعة التجاوب وتفادي تعقيد الفهارس
      const data = await fetchListings({ filters: {}, onlyPublic: false });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || '');
      if (msg.includes('Missing or insufficient permissions')) {
        setErr('تعذر تحميل العروض (صلاحيات). تأكد من تسجيل دخول الأدمن أو قواعد البيانات.');
      } else {
        setErr('حدث خطأ أثناء تحميل البيانات.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // منطق الفلترة والترتيب
  const filtered = useMemo(() => {
    let res = items.filter((x) => {
      // 1. استبعاد المباع/الملغي للزوار (إلا لو حبيت تظهرهم)
      if (!['available', 'reserved'].includes(String(x.status || ''))) return false;

      // 2. فلتر الحي
      if (filters.neighborhood && x.neighborhood !== filters.neighborhood) return false;

      // 3. فلتر نوع الصفقة
      if (filters.dealType && x.dealType !== filters.dealType) return false;

      // 4. فلتر نوع العقار
      if (filters.propertyType && x.propertyType !== filters.propertyType) return false;

      // 5. البحث النصي (العنوان أو رقم العرض)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const title = (x.title || '').toLowerCase();
        const id = String(x.id || '');
        const ref = String(x.ref || ''); // لو عندك حقل مرجع
        if (!title.includes(q) && !id.includes(q) && !ref.includes(q)) return false;
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
      // الافتراضي: الأحدث (بناءً على createdAt)
      // نفترض أن البيانات القادمة من Firebase مرتبة، أو نرتبها يدوياً هنا لو احتجنا
      // return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      return 0; 
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
            placeholder="بحث برقم العرض أو العنوان..." 
            className="input"
            value={filters.search}
            onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
          />
          <svg className="searchIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </div>

      {/* شريط الفلاتر */}
      <section className="filterBar card">
        <div className="filterGrid">
          
          {/* الحي */}
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

          {/* نوع الصفقة */}
          <div className="filterGroup">
            <label className="muted label">نوع العرض</label>
            <ChipsRow
              value={filters.dealType}
              options={DEAL_OPTS}
              onChange={(v) => setFilters((p) => ({ ...p, dealType: v }))}
            />
          </div>

          {/* نوع العقار */}
          <div className="filterGroup">
            <label className="muted label">نوع العقار</label>
            <ChipsRow
              value={filters.propertyType}
              options={TYPE_OPTS}
              onChange={(v) => setFilters((p) => ({ ...p, propertyType: v }))}
            />
          </div>
        </div>
        
        {/* سطر التحكم الإضافي (الترتيب + مسح الفلاتر) */}
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

      {/* منطقة عرض النتائج */}
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
            {hasFilter && <div style={{marginTop:10, color:'var(--gold)', cursor:'pointer'}} onClick={clearAll}>مسح جميع الفلاتر</div>}
          </div>
        ) : (
          <>
            <div className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
              تم العثور على {filtered.length} عقار
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
          margin-bottom: 16px;
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
          max-width: 320px;
        }
        .searchBox .input {
          padding-left: 40px; /* مكان الأيقونة */
        }
        .searchIcon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          opacity: 0.7;
        }

        .filterBar {
          position: sticky;
          top: 20px; /* Sticky effect */
          z-index: 20;
          background: rgba(10, 13, 18, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          padding: 16px;
        }
        
        .filterGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 16px;
          margin-bottom: 12px;
        }
        @media (min-width: 900px) {
          .filterGrid {
            grid-template-columns: 1fr 1fr 1fr;
            align-items: start;
          }
        }

        .label {
          display: block;
          font-size: 12px;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .filterActions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .sortGroup {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sortSelect {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 6px 10px;
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
          gap: 12px;
        }
        .btnText {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 13px;
          cursor: pointer;
          transition: color 0.2s;
        }
        .btnText:hover:not(:disabled) {
          color: var(--gold);
          text-decoration: underline;
        }
        .btnText:disabled {
          opacity: 0.4;
          cursor: default;
        }
      `}</style>
    </div>
  );
}

// ✅ المكون الرئيسي الذي يغلف المحتوى بـ Suspense
// هذا ضروري في Next.js عند استخدام useSearchParams لتجنب أخطاء البناء
export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="container" style={{padding:20}}>جاري التحميل...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
